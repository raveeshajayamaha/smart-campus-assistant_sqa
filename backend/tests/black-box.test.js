const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, createHash } = require("node:crypto");
const { once } = require("node:events");
const mongoose = require("mongoose");

const databaseName = "campus_blackbox_test_" + randomBytes(8).toString("hex");
process.env.MONGO_DB_NAME = databaseName;
const { app } = require("../server");
const connectDB = require("../config/db");
const User = require("../models/User");
const Session = require("../models/Session");
const Event = require("../models/event");

const password = "CampusDemo123";
const validationMessage = "Provide name, valid email and a password of 6 to 72 characters";
const chatValidationMessage = "Enter a message of 1 to 2000 characters";
const inactiveSessionMessage = "Session expired. Please log in again";

test("EC4206 black-box HTTP tests", { timeout: 60000 }, async t => {
  let server;
  let isolated = false;
  const userIds = [];
  const eventIds = [];

  try {
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
    const base = "http://127.0.0.1:" + server.address().port + "/api";

    async function request(method, path, body, token) {
      const headers = { "Content-Type": "application/json" };
      if (token !== undefined) headers.Authorization = "Bearer " + token;
      const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    }

    async function register(email, candidatePassword = password) {
      const response = await request("POST", "/auth/register", { name: "EC4206 Fixture", email, password: candidatePassword });
      if (response.status === 201) userIds.push(response.data.user.id);
      return response;
    }

    function expectError(response, status, message) {
      assert.equal(response.status, status);
      assert.deepEqual(response.data, { success: false, message });
    }

    async function login(email) {
      const response = await request("POST", "/auth/login", { email, password });
      assert.equal(response.status, 200);
      assert.ok(/^[a-f0-9]{64}$/.test(response.data.token), "Expected a valid session token");
      return response.data.token;
    }

    const studentEmail = "blackbox-student@example.test";
    const adminEmail = "blackbox-admin@example.test";
    assert.equal((await register(studentEmail)).status, 201);
    const adminAccount = await register(adminEmail);
    assert.equal(adminAccount.status, 201);
    await User.updateOne({ _id: adminAccount.data.user.id }, { $set: { role: "admin" } });
    const studentToken = await login(studentEmail);
    const adminToken = await login(adminEmail);
    const expiredToken = await login(adminEmail);
    const revokedToken = await login(adminEmail);
    const tokenHash = createHash("sha256").update(expiredToken).digest("hex");
    const expiryUpdate = await Session.updateOne({ tokenHash }, { $set: { expiresAt: new Date(0) } });
    assert.equal(expiryUpdate.modifiedCount, 1);
    assert.equal((await request("POST", "/auth/logout", {}, revokedToken)).status, 200);

    const emailClasses = [
      ["BB-EP-01", "fresh valid email after trimming", " Fresh@Example.test ", 201],
      ["BB-EP-02", "existing email ignoring case", "BLACKBOX-STUDENT@example.test", 400, "User already exists"],
      ["BB-EP-03", "malformed email missing domain dot", "fresh@example", 400, validationMessage],
      ["BB-EP-04", "email of wrong JSON type", 42, 400, validationMessage],
      ["BB-EP-05", "blank email after trimming", "   ", 400, validationMessage],
    ];
    for (const [id, label, email, status, message] of emailClasses) {
      await t.test(id + " " + label, async () => {
        const result = await register(email);
        if (status === 201) {
          assert.equal(result.status, 201);
          assert.equal(result.data.success, true);
          assert.equal(result.data.user.email, "fresh@example.test");
          assert.equal(result.data.user.role, "student");
        } else expectError(result, status, message);
      });
    }

    const messageClasses = [
      ["BB-EP-06", "nonblank recognised message", "What are the library hours?", 200],
      ["BB-EP-07", "whitespace-only message", "   ", 400],
      ["BB-EP-08", "message of wrong JSON type", 42, 400],
    ];
    for (const [id, label, message, status] of messageClasses) {
      await t.test(id + " " + label, async () => {
        const result = await request("POST", "/assistant/chat", { message }, studentToken);
        if (status === 200) {
          assert.equal(result.status, 200);
          assert.deepEqual(result.data, {
            success: true,
            reply: "Library hours:\nNo matching information is currently available.",
            sources: [],
            mode: "campus-data",
          });
        } else expectError(result, status, chatValidationMessage);
      });
    }

    for (const [index, length] of [5, 6, 7, 71, 72, 73].entries()) {
      const id = "BB-BV-0" + (index + 1);
      await t.test(id + " registration password length " + length, async () => {
        const result = await register("length-" + length + "@example.test", "x".repeat(length));
        if (length === 5 || length === 73) expectError(result, 400, validationMessage);
        else {
          assert.equal(result.status, 201);
          assert.equal(result.data.success, true);
        }
      });
    }

    for (const [index, length] of [0, 1, 2, 1999, 2000, 2001].entries()) {
      const id = "BB-BV-" + String(index + 7).padStart(2, "0");
      await t.test(id + " assistant message length " + length, async () => {
        const result = await request("POST", "/assistant/chat", { message: "x".repeat(length) }, studentToken);
        if (length === 0 || length === 2001) expectError(result, 400, chatValidationMessage);
        else {
          assert.equal(result.status, 200);
          assert.equal(result.data.success, true);
          assert.ok(result.data.reply.startsWith("I can look up campus events"));
          assert.deepEqual(result.data.sources, []);
        }
      });
    }

    const rules = [
      ["BB-DT-01", "anonymous", undefined, 401, "Please log in"],
      ["BB-DT-02", "malformed token", "short", 401, "Please log in"],
      ["BB-DT-03", "unknown token", randomBytes(32).toString("hex"), 401, inactiveSessionMessage],
      ["BB-DT-04", "expired admin session", expiredToken, 401, inactiveSessionMessage],
      ["BB-DT-05", "revoked admin session", revokedToken, 401, inactiveSessionMessage],
      ["BB-DT-06", "valid student session", studentToken, 403, "Administrator access required"],
      ["BB-DT-07", "valid admin session", adminToken, 201],
    ];
    for (const [id, label, token, status, message] of rules) {
      await t.test(id + " admin event creation with " + label, async () => {
        const title = "Disposable event " + id;
        const result = await request("POST", "/events", {
          title, date: "2030-01-01", time: "10:00", location: "Test Hall",
        }, token);
        if (result.status === 201) eventIds.push(result.data.event._id);
        if (status === 201) {
          assert.equal(result.status, 201);
          assert.equal(result.data.success, true);
          assert.equal(result.data.event.title, title);
        } else expectError(result, status, message);

        const list = await request("GET", "/events");
        assert.equal(list.status, 200);
        assert.equal(list.data.events.filter(record => record.title === title).length, status === 201 ? 1 : 0);
      });
    }
  } finally {
    try {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      if (isolated) {
        await Event.deleteMany({ _id: { $in: eventIds } });
        await Session.deleteMany({ user: { $in: userIds } });
        await User.deleteMany({ _id: { $in: userIds } });
      }
    } finally {
      await mongoose.disconnect();
    }
  }
});
