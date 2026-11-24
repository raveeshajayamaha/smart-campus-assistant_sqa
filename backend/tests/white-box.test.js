const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, createHash } = require("node:crypto");
const { once } = require("node:events");
const mongoose = require("mongoose");

const databaseName = "campus_whitebox_test_" + randomBytes(8).toString("hex");
process.env.MONGO_DB_NAME = databaseName;
const { app } = require("../server");
const connectDB = require("../config/db");
const User = require("../models/User");
const Session = require("../models/Session");

test("EC4206 white-box authentication paths", { timeout: 60000 }, async t => {
  let server;
  let isolated = false;
  const userIds = [];
  const orphanUserId = new mongoose.Types.ObjectId();
  const password = "CampusWhiteBox123";

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

    async function request(method, path, { body, token } = {}) {
      const headers = { "Content-Type": "application/json" };
      if (token !== undefined) headers.Authorization = "Bearer " + token;
      const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    }

    async function login(email) {
      const response = await request("POST", "/auth/login", { body: { email, password } });
      assert.equal(response.status, 200);
      assert.ok(/^[a-f0-9]{64}$/.test(response.data.token), "Expected a valid session token");
      return response.data.token;
    }

    for (const role of ["student", "admin"]) {
      const email = role + "@whitebox.example.test";
      const response = await request("POST", "/auth/register", {
        body: { name: "White-box " + role, email, password },
      });
      assert.equal(response.status, 201);
      userIds.push(response.data.user.id);
      if (role === "admin") {
        const result = await User.updateOne({ _id: response.data.user.id }, { $set: { role } });
        assert.equal(result.modifiedCount, 1);
      }
    }
    const studentToken = await login("student@whitebox.example.test");
    const adminToken = await login("admin@whitebox.example.test");
    const expiredToken = await login("student@whitebox.example.test");
    const revokedToken = await login("admin@whitebox.example.test");
    const hash = token => createHash("sha256").update(token).digest("hex");
    const expiryUpdate = await Session.updateOne(
      { tokenHash: hash(expiredToken) }, { $set: { expiresAt: new Date(0) } }
    );
    assert.equal(expiryUpdate.modifiedCount, 1);
    assert.equal((await request("POST", "/auth/logout", { token: revokedToken })).status, 200);

    const orphanToken = randomBytes(32).toString("hex");
    await Session.create({
      tokenHash: hash(orphanToken),
      user: orphanUserId,
      expiresAt: new Date(Date.now() + 600000),
    });

    const noSession = "Session expired. Please log in again";
    const denied = [
      ["WB-01", "missing Authorization header", undefined, "Please log in"],
      ["WB-02", "malformed bearer token", "short", "Please log in"],
      ["WB-03", "unknown well-formed token", randomBytes(32).toString("hex"), noSession],
      ["WB-04", "expired student session", expiredToken, noSession],
      ["WB-05", "revoked admin session", revokedToken, noSession],
      ["WB-06", "active session with no populated user", orphanToken, noSession],
    ];
    for (const [id, label, token, message] of denied) {
      await t.test(id + " " + label, async () => {
        const response = await request("GET", "/auth/me", { token });
        assert.equal(response.status, 401);
        assert.deepEqual(response.data, { success: false, message });
      });
    }

    for (const [id, role, token, userId] of [
      ["WB-07", "student", studentToken, userIds[0]],
      ["WB-08", "admin", adminToken, userIds[1]],
    ]) {
      await t.test(id + " active " + role + " session reaches identity handler", async () => {
        const response = await request("GET", "/auth/me", { token });
        assert.equal(response.status, 200);
        assert.equal(response.data.success, true);
        assert.equal(response.data.user.id, userId);
        assert.equal(response.data.user.role, role);
        assert.equal(response.data.user.email, role + "@whitebox.example.test");
      });
    }

    await t.test("WB-09 database rejection reaches Express error handler", async subtest => {
      const lookup = subtest.mock.method(Session, "findOne", () => ({
        populate: async () => { throw new Error("Synthetic session lookup failure"); },
      }));
      try {
        const response = await request("GET", "/auth/me", { token: studentToken });
        assert.equal(lookup.mock.callCount(), 1);
        assert.equal(response.status, 500);
        assert.deepEqual(response.data, { success: false, message: "Unable to complete request. Please try again." });
      } finally {
        lookup.mock.restore();
      }
    });
  } finally {
    try {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      if (isolated) {
        await Session.deleteMany({ user: { $in: [...userIds, orphanUserId] } });
        await User.deleteMany({ _id: { $in: userIds } });
      }
    } finally {
      await mongoose.disconnect();
    }
  }
});
