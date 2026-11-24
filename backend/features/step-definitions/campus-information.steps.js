const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { BeforeAll, After, AfterAll, Given, When, Then, setDefaultTimeout } = require("@cucumber/cucumber");
const mongoose = require("mongoose");

const databaseName = "campus_bdd_test_" + randomBytes(8).toString("hex");
process.env.MONGO_DB_NAME = databaseName;
const { app } = require("../../server");
const connectDB = require("../../config/db");
const User = require("../../models/User");
const Session = require("../../models/Session");
const Location = require("../../models/CampusLocation");

let server;
let base;
let isolated = false;
setDefaultTimeout(20000);

BeforeAll(async function () {
  const localUri = /^mongodb:\/\/(?:[^/?#@]+@)?(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:[/?]|$)/i;
  assert.ok(localUri.test(process.env.MONGO_URI || ""), "A single local MongoDB endpoint is required");
  try {
    await connectDB();
  } catch {
    throw new Error("Unable to connect to the isolated local MongoDB database");
  }
  assert.equal(mongoose.connection.name, databaseName);
  isolated = true;
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = "http://127.0.0.1:" + server.address().port + "/api";
});

After(async function () {
  if (!isolated) return;
  if (this.locationId) await Location.deleteOne({ _id: this.locationId });
  if (this.userIds?.length) {
    await Session.deleteMany({ user: { $in: this.userIds } });
    await User.deleteMany({ _id: { $in: this.userIds } });
  }
});

AfterAll(async function () {
  try {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } finally {
    await mongoose.disconnect();
  }
});

async function request(method, path, status, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
  assert.equal(response.status, status, method + " " + path);
  const result = await response.json();
  assert.equal(result.success, true);
  return result;
}

async function createAccount(world, role) {
  const email = role + "-" + randomBytes(6).toString("hex") + "@bdd.example.test";
  const password = "CampusBddFixture123";
  const registered = await request("POST", "/auth/register", 201, {
    body: { email, password, name: "BDD " + role },
  });
  world.userIds ??= [];
  world.userIds.push(registered.user.id);
  if (role === "admin") {
    const updated = await User.updateOne({ _id: registered.user.id }, { $set: { role } });
    assert.equal(updated.modifiedCount, 1);
  }
  const login = await request("POST", "/auth/login", 200, { body: { email, password } });
  assert.equal(login.user.role, role);
  return login.token;
}

Given("an administrator and a student are signed in", async function () {
  this.admin = await createAccount(this, "admin");
  this.student = await createAccount(this, "student");
});

Given("the campus library opens from {string}", async function (openingHours) {
  const { location } = await request("POST", "/locations", 201, {
    token: this.admin,
    body: {
      name: "BDD Main Library", building: "Main Building", description: "Study space",
      category: "Library", openingHours, directions: "Ground floor",
    },
  });
  this.locationId = location._id;
  this.oldHours = openingHours;
  assert.equal(location.openingHours, openingHours);
});

When("the administrator updates the library hours to {string}", async function (openingHours) {
  const { location } = await request("PUT", "/locations/" + this.locationId, 200, {
    token: this.admin, body: { openingHours },
  });
  assert.equal(location._id, this.locationId);
  assert.equal(location.openingHours, openingHours);
});

Then("the student sees {string} in the campus locations feed", async function (openingHours) {
  const { locations } = await request("GET", "/locations", 200, { token: this.student });
  assert.equal(locations.find(location => location._id === this.locationId)?.openingHours, openingHours);
});

Then("the student receives {string} from the assistant for that library", async function (openingHours) {
  const { reply, sources } = await request("POST", "/assistant/chat", 200, {
    token: this.student, body: { message: "What are the library hours?" },
  });
  assert.ok(reply.includes("BDD Main Library: " + openingHours));
  assert.ok(!reply.includes(this.oldHours));
  assert.ok(sources.some(source => source.collection === "Library hours" && source.id === this.locationId));
});

Given("a student is signed in and the event catalogue is empty", async function () {
  this.student = await createAccount(this, "student");
  const { events } = await request("GET", "/events", 200);
  assert.deepEqual(events, []);
});

When("the student asks about upcoming events", async function () {
  this.chat = await request("POST", "/assistant/chat", 200, {
    token: this.student, body: { message: "What are the upcoming events?" },
  });
});

Then("the assistant reports no upcoming events without promising a list", function () {
  assert.equal(this.chat.reply, "Events:\nThere are no upcoming events at the moment.");
});

Then("the assistant returns no event sources", function () {
  assert.deepEqual(this.chat.sources, []);
});
