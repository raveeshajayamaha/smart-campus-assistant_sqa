const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const User = require("../../models/User");

module.exports = async function security({ origin, Event, fixture }) {
  async function request(method, endpoint, { body, token } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(origin + endpoint, {
      method, headers, body: JSON.stringify(body), redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, data: await response.json() };
  }

  async function session(role) {
    const email = role + "@section37.example.test";
    const password = randomBytes(24).toString("hex");
    const body = { email, password };
    const registration = await request("POST", "/api/auth/register", {
      body: { ...body, name: "Section 3.7 " + role },
    });
    assert.equal(registration.status, 201);
    if (role === "admin") {
      const result = await User.updateOne({ email }, { $set: { role } });
      assert.equal(result.modifiedCount, 1);
    }
    const login = await request("POST", "/api/auth/login", { body });
    assert.equal(login.status, 200);
    assert.equal(typeof login.data.token, "string");
    return login.data.token;
  }

  const student = await session("student");
  const admin = await session("admin");
  const endpoint = "/api/events";
  const snapshot = () => Event.find().sort({ _id: 1 }).lean().exec();
  let failures = 0;
  async function check(id, method, url, expected, options, verify) {
    const before = await snapshot();
    const response = await request(method, url, options);
    const after = await snapshot();
    const unchanged = require("node:util").isDeepStrictEqual(before, after);
    try {
      assert.equal(response.status, expected);
      if (expected !== 201) assert.equal(unchanged, true);
      if (verify) verify(response.data, before, after);
      console.log(id, "PASS", method, url, "expected", expected, "observed", response.status,
        "| event collection unchanged:", unchanged);
    } catch {
      failures += 1;
      console.log(id, "FAIL", method, url, "expected", expected, "observed", response.status,
        "| event collection unchanged:", unchanged);
    }
  }

  await check("SEC-01", "GET", "/api/locations", 401);
  const seeLocation = data => assert.ok(data.locations.some(location => location.name === "EC4206 Main Library"));
  await check("SEC-02", "GET", "/api/locations", 200, { token: student }, seeLocation);
  await check("SEC-03", "GET", "/api/locations", 200, { token: admin }, seeLocation);
  await check("SEC-04", "POST", endpoint, 401, { body: fixture });
  await check("SEC-05", "POST", endpoint, 403, { body: fixture, token: student });
  await check("SEC-06", "POST", endpoint, 201, { body: fixture, token: admin }, (data, before, after) => {
    assert.equal(data.event.title, fixture.title);
    assert.equal(after.length, before.length + 1);
    const created = after.find(event => String(event._id) === data.event._id);
    assert.equal(created?.title, fixture.title);
    assert.deepEqual(after.filter(event => String(event._id) !== data.event._id), before);
  });
  await check("SEC-07", "POST", endpoint, 400, { body: { ...fixture, date: "not-a-date" }, token: admin });
  await check("SEC-08", "PUT", endpoint + "/invalid-id", 400, { body: { title: "Synthetic update" }, token: admin });
  assert.equal(failures, 0, "Section 3.7 security check failures");
};
