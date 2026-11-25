
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const mongoose = require("mongoose");
const { Builder, By, Key } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const root = path.resolve(__dirname, "../..");
const dir = path.resolve(process.argv[2]);
assert.equal(path.dirname(dir), path.join(root, "testing-documentation", "evidence", "catalogue"));
assert.equal(process.env.MONGO_URI, "mongodb://127.0.0.1:27960/?directConnection=true");
const db = "campus_catalogue_" + randomBytes(8).toString("hex");
process.env.MONGO_DB_NAME = db;
const { app } = require("../server");
const User = require("../models/User");
const Session = require("../models/Session");
const { hashToken } = require("../middleware/auth");
const pass = "CampusDemo123";
const next = "CampusDemo456";
const date = new Date(Date.now() + 106200000).toISOString().slice(0, 10);
const generic = "Invalid input. Check required fields, dates, times and links.";
const expired = "Session expired. Please log in again";
const fixtures = [
  ["events", "event", "events", { title: "Robotics Fair", date, time: "10:00 AM", location: "Hall A" }, { location: "Hall B" }],
  ["announcements", "announcement", "announcements", { title: "Registration Notice", description: "Registration opens soon", date, priority: "high" }, { priority: "urgent" }],
  ["schedules", "schedule", "schedules", { subject: "Algorithms", date, startTime: "09:00", endTime: "10:00", location: "Room A" }, { endTime: "11:00" }],
  ["library", "resource", "resources", { title: "Algorithms Book", type: "Book", description: "Reference text", availability: "Available", location: "Shelf A", link: "https://example.test/book" }, { availability: "On loan" }],
  ["locations", "location", "locations", { name: "Main Library", building: "Central Building", description: "Study area", category: "Library", openingHours: "08:00-18:00", directions: "Ground floor" }, { openingHours: "09:00-17:00" }],
];
const [E, A, S, L, C] = fixtures;
const ui = new Set([11, 26, 27, 28, 33]);
let apiOrigin, front, notes, drivers, files, id, started;
const iso = () => new Date().toISOString();
const note = msg => notes.push(iso() + " " + msg);
const evidence = name => files.push(path.relative(root, path.join(dir, name)).split(path.sep).join("/"));
async function api(method, route, status, { token, data, raw = false, message } = {}) {
  const response = await fetch(apiOrigin + "/api/" + route, {
    method, redirect: "error", signal: AbortSignal.timeout(7000),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: raw ? data : JSON.stringify(data),
  });
  const body = await response.json();
  note(method + " " + route + " HTTP " + response.status + " " + JSON.stringify(body, (key, value) => key === "token" ? "[redacted]" : value));
  assert.equal(response.status, status, method + " " + route + " HTTP status");
  if (message) assert.equal(body.message, message);
  return body;
}
const email = () => id.toLowerCase() + "-" + randomBytes(4).toString("hex") + "@example.test";
const register = (address, password = pass, status = 201, more = {}, message) => api("POST", "auth/register", status, { data: { name: "Test Student", email: address, password, ...more }, message });
const login = (address, password = pass, status = 200, message) => api("POST", "auth/login", status, { data: { email: address, password }, message });
async function account(admin = false) {
  const address = email();
  const { user } = await register(address);
  if (admin) assert.equal((await User.updateOne({ _id: user.id, email: address }, { role: "admin" })).modifiedCount, 1);
  const signed = await login(address);
  assert.equal(signed.user.role, admin ? "admin" : "student");
  return signed;
}
const me = (token, status = 200, message) => api("GET", "auth/me", status, { token, message });
const profile = (token, data, status = 200, message) => api("PUT", "auth/profile", status, { token, data, message });
const change = (token, status, currentPassword, newPassword, confirmPassword = newPassword, message) =>
  api("PUT", "auth/change-password", status, { token, message, data: { currentPassword, newPassword, confirmPassword } });
const create = async (f, token, more = {}) => (await api("POST", f[0], 201, { token, data: { ...f[3], ...more } }))[f[1]];
const list = async (f, token) => (await api("GET", f[0], 200, { token }))[f[2]];
const chat = (token, value, status = 200, message) => api("POST", "assistant/chat", status, { token, data: { message: value }, message });
function fields(actual, expected) {
  assert.ok(actual, "Expected fixture record");
  for (const [key, value] of Object.entries(expected)) assert.equal(key === "date" ? actual[key].slice(0, 10) : actual[key], value, key);
}
const begin = () => { started = true; };
async function element(driver, selector) {
  return driver.wait(async () => {
    for (const item of await driver.findElements(By.css(selector))) if (await item.isDisplayed()) return item;
    return false;
  }, 8000, "Visible control " + selector);
}
const route = (driver, pathname) => driver.wait(async () => new URL(await driver.getCurrentUrl()).pathname === pathname, 8000, "Expected route " + pathname);
async function browser(user, pathname = "/student-dashboard") {
  const options = new chrome.Options().addArguments("--headless=new", "--window-size=1440,1000");
  const builder = new Builder().disableEnvironmentOverrides().forBrowser("chrome").setChromeOptions(options);
  builder.setChromeService(new chrome.ServiceBuilder(process.env.CHROMEDRIVER_PATH));
  const driver = await builder.build();
  drivers.push(driver);
  await driver.get(front + "/login");
  await (await element(driver, 'input[type=email]')).sendKeys(user.email);
  await (await element(driver, 'input[placeholder="Password"]')).sendKeys(pass);
  await (await element(driver, 'form button[type=submit]')).click();
  await route(driver, pathname);
  return driver;
}
async function shows(driver, selector, ...values) {
  await driver.wait(async () => {
    const text = await (await element(driver, selector)).getText();
    return values.every(value => text.includes(value));
  }, 8000, selector + " should display " + values.join(" | "));
  note(selector + " displayed " + values.join(" | "));
}
async function shot(driver, stage) {
  const file = id + "-" + stage + ".png";
  await fs.writeFile(path.join(dir, file), Buffer.from(await driver.takeScreenshot(), "base64"));
  evidence(file);
  note("Screenshot " + stage + " " + await driver.getCurrentUrl());
}
async function type(driver, selector, text) {
  await (await element(driver, selector)).sendKeys(Key.chord(Key.CONTROL, "a"), text);
}
const cases = {
  2: async () => {
    const address = "student@example.test";
    await register(address);
    begin();
    assert.equal((await register(address.toUpperCase(), pass, 400, {}, "User already exists")).success, false);
  },
  3: async () => {
    begin();
    for (const [length, status] of [[5, 400], [6, 201], [72, 201], [73, 400]]) {
      note("ASCII password length " + length);
      await register(email(), "a".repeat(length), status, {}, status === 400 ? "Provide name, valid email and a password of 6 to 72 characters" : undefined);
    }
  },
  4: async () => { begin(); assert.equal((await register(email(), pass, 201, { role: "admin" })).user.role, "student"); },
  5: async () => {
    const address = email(), { user } = await register(address);
    begin();
    const signed = await login(address);
    assert.match(signed.token, /^[a-f0-9]{64}$/);
    note("Login token has the expected format");
    fields((await me(signed.token)).user, { id: user.id, email: address, name: user.name, role: "student" });
  },
  6: async () => {
    const { user } = await account();
    begin();
    assert.ok(!Object.hasOwn(await login(user.email, "wrong", 400, "Invalid email or password"), "token"));
  },
  7: async () => {
    const a = await account(), b = await login(a.user.email);
    assert.notEqual(a.token, b.token);
    begin();
    assert.equal((await api("POST", "auth/logout", 200, { token: a.token })).success, true);
    await me(a.token, 401, expired);
    await me(b.token);
  },
  8: async () => { begin(); await me(undefined, 401, "Please log in"); await me("short", 401, "Please log in"); },
  9: async () => {
    const { user } = await account(), token = randomBytes(32).toString("hex");
    const session = await Session.create({ user: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() - 5000) });
    assert.ok(await Session.findById(session.id));
    note("Verified expired synthetic fixture exists");
    begin();
    await me(token, 401, expired);
  },
  10: async () => {
    const student = await account(), admin = await account(true), data = E[3];
    assert.equal((await list(E, student.token)).length, 0);
    begin();
    await api("POST", "events", 401, { data });
    await api("POST", "events", 403, { data, token: student.token, message: "Administrator access required" });
    const event = await create(E, admin.token);
    assert.deepEqual((await list(E, student.token)).map(item => item._id), [event._id]);
  },
  11: async () => {
    const driver = await browser((await account()).user);
    begin();
    await driver.get(front + "/admin-dashboard");
    await route(driver, "/student-dashboard");
    await element(driver, ".sidebar-link");
    assert.equal((await driver.findElements(By.css(".admin-nav-item, .admin-primary-button"))).length, 0);
    await shot(driver, "redirect");
  },
  12: async () => {
    const { token, user } = await account();
    begin();
    await profile(token, { department: " Computing ", contactNumber: "+94 770000000" });
    const signed = await login(user.email);
    fields((await me(signed.token)).user, { department: "Computing", contactNumber: "+94 770000000", id: user.id, email: user.email, role: user.role });
  },
  13: async () => {
    const { token } = await account(), baseline = { department: "Computing", contactNumber: "+94 770000000" };
    await profile(token, baseline);
    begin();
    assert.ok((await profile(token, { department: "New Department", contactNumber: "letters" }, 400)).errors.contactNumber);
    fields((await me(token)).user, baseline);
  },
  14: async () => {
    const { token, user } = await account();
    begin();
    await profile(token, { role: "admin", name: "Changed" }, 400, "Only name, student ID, faculty, department, year/semester and contact number can be updated.");
    fields((await me(token)).user, { role: "student", name: user.name });
  },
  15: async () => {
    const a = await account(), b = await login(a.user.email), c = await account();
    begin();
    await change(a.token, 200, pass, next);
    await me(a.token, 401);
    await me(b.token, 401);
    await me(c.token);
    await login(a.user.email, pass, 400);
    await login(a.user.email, next);
  },
  16: async () => {
    const { token, user } = await account();
    begin();
    await change(token, 400, "wrong", next, next, "Current password is incorrect.");
    await me(token);
    await login(user.email);
  },
  17: async () => {
    const { token } = await account();
    begin();
    await change(token, 400, pass, next, "CampusDemo789", "New password and confirmation do not match.");
    await me(token);
  },
  18: async () => {
    const { token } = await account(), value = "\u00e9".repeat(37);
    begin();
    note("New password UTF-8 byte count " + Buffer.byteLength(value));
    await change(token, 400, pass, value, value, "New password must be 6 to 72 characters and no more than 72 UTF-8 bytes. Current password must not exceed 72 characters.");
    await me(token);
  },
  19: async () => {
    const admin = await account(true), student = await account();
    begin();
    for (const f of fixtures) {
      const saved = await create(f, admin.token);
      fields((await list(f, student.token)).find(item => item._id === saved._id), f[3]);
    }
  },
  20: async () => {
    const { token } = await account(true);
    const records = [];
    for (const f of fixtures) records.push(await create(f, token));
    begin();
    for (const [i, f] of fixtures.entries()) {
      const prior = records[i];
      await api("PUT", f[0] + "/" + prior._id, 200, { token, data: f[4] });
      const saved = (await list(f, token)).find(item => item._id === prior._id);
      for (const [key, value] of Object.entries(prior)) {
        if (!["_id", "__v", "createdAt", "updatedAt"].includes(key)) assert.equal(saved[key], f[4][key] ?? value, key);
      }
    }
  },
  21: async () => {
    const { token } = await account(true);
    const records = [];
    for (const f of fixtures) records.push(await create(f, token));
    begin();
    for (const [i, f] of fixtures.entries()) {
      const recordId = records[i]._id, endpoint = f[0] + "/" + recordId;
      assert.equal((await api("DELETE", endpoint, 200, { token })).success, true);
      assert.ok(!(await list(f, token)).some(item => item._id === recordId));
      await api("DELETE", endpoint, 404, { token, message: "Record not found" });
    }
  },
  22: async () => {
    const { token } = await account(true);
    begin();
    await api("PUT", "events/bad-id", 400, { token, data: { location: "Hall B" }, message: "Invalid record ID" });
  },
  23: async () => {
    const { token } = await account(true);
    begin();
    assert.equal((await api("POST", "events", 400, { token, data: "{", raw: true, message: generic })).success, false);
  },
  24: async () => {
    const { token } = await account(true);
    begin();
    for (const [f, invalid] of [[E, { date: "invalid" }], [A, { priority: "immediate" }], [L, { link: "ftp://example.test/file" }]]) {
      const before = await list(f, token);
      await api("POST", f[0], 400, { token, data: { ...f[3], ...invalid }, message: generic });
      assert.deepEqual(await list(f, token), before);
    }
  },
  25: async () => {
    const { token } = await account(true);
    begin();
    for (const [startTime, endTime, status] of [["09:00","09:00",400],["09:00","08:59",400],["09:00","09:01",201],["24:00","10:00",400]]) {
      note("Schedule " + startTime + " to " + endTime);
      await api("POST", "schedules", status, { token, data: { ...S[3], startTime, endTime } });
    }
  },
  26: async () => {
    const admin = await account(true);
    for (const f of [E,A,S]) await create(f, admin.token);
    const driver = await browser((await account()).user);
    begin();
    for (const [stage, label, expected] of [
      ["event", "Robotics Fair", ["Robotics Fair"]],
      ["announcement", "Registration Notice", ["Registration Notice (high)", "Registration opens soon"]],
      ["schedule", "Algorithms", ["Algorithms", "09:00 - 10:00", "Room A"]],
    ]) {
      await shows(driver, "body", ...expected);
      const target = await driver.findElement(By.xpath("//*[contains(text(),'" + label + "')]"));
      await driver.executeScript("arguments[0].scrollIntoView({block:'center'})", target);
      await shot(driver, stage);
    }
  },
  27: async () => {
    const admin = await account(true);
    await create(C, admin.token);
    await create(C, admin.token, { name: "Sports Centre", category: "Sports" });
    const driver = await browser((await account()).user);
    begin();
    await driver.get(front + "/locations");
    await shows(driver, "body", "Main Library", "Sports Centre");
    await type(driver, ".campus-search", "mAIN lIBRARY");
    await shows(driver, ".campus-card", "Main Library");
    assert.equal((await driver.findElements(By.css(".campus-card"))).length, 1);
    await shot(driver, "match");
    await type(driver, ".campus-search", "no-such-place");
    await shows(driver, "[role=status]", "No matching records available.");
    await shot(driver, "empty");
  },
  28: async () => {
    const admin = await account(true);
    await create(C, admin.token);
    const student = await browser((await account()).user);
    const manage = await browser(admin.user, "/admin-dashboard");
    await student.get(front + "/locations");
    await shows(student, ".campus-card", "Main Library", "08:00-18:00");
    begin();
    await (await element(manage, '[data-section=locations]')).click();
    await (await element(manage, '[aria-label="Edit Main Library"]')).click();
    await type(manage, "#admin-openingHours", "09:00-17:00");
    await (await element(manage, ".admin-form-panel button[type=submit]")).click();
    await shows(manage, "tbody", "09:00-17:00");
    await shot(manage, "admin");
    await student.navigate().refresh();
    await shows(student, ".campus-card", "Main Library", "09:00-17:00");
    await shot(student, "location");
    await student.get(front + "/assistant");
    await (await element(student, '[aria-label="Campus question"]')).sendKeys("What are the library hours?", Key.ENTER);
    await shows(student, "body", "Main Library", "09:00-17:00");
    await shot(student, "assistant");
  },
  29: async () => {
    const admin = await account(true), student = await account();
    await create(S, admin.token, { subject: "Past Class", date: new Date(Date.now() - 172800000).toISOString().slice(0, 10) });
    const first = await create(S, admin.token, { subject: "First Class" });
    await create(S, admin.token, { subject: "Later Class", startTime: "11:00", endTime: "12:00" });
    begin();
    const result = await chat(student.token, "When is my next class?");
    assert.equal(result.mode, "campus-data");
    assert.match(result.reply, /Schedules[\s\S]*First Class[\s\S]*09:00/);
    assert.doesNotMatch(result.reply, /Past Class|Later Class/);
    assert.deepEqual(result.sources.map(source => source.id), [first._id]);
  },
  30: async () => {
    const { token } = await account();
    begin();
    for (const [length, status] of [[0,400],[1,200],[2000,200],[2001,400]]) {
      note("Assistant input length " + length);
      const reply = await chat(token, "x".repeat(length), status, status === 400 ? "Enter a message of 1 to 2000 characters" : undefined);
      if (status === 200) assert.ok(reply.reply);
    }
  },
  31: async () => {
    const { token } = await account();
    begin();
    const result = await chat(token, "What exams are scheduled?");
    assert.match(result.reply, /Schedules[\s\S]*No matching information is currently available\./);
    assert.deepEqual(result.sources, []);
  },
  32: async () => {
    const { token } = await account();
    begin();
    const result = await chat(token, "Hello");
    assert.match(result.reply, /^I can look up campus events/);
    assert.deepEqual(result.sources, []);
  },
  33: async () => {
    const admin = await account(true);
    await create(C, admin.token);
    const driver = await browser((await account()).user);
    await driver.sendDevToolsCommand("Network.enable");
    await driver.sendDevToolsCommand("Network.setBlockedURLs", { urls: [front + "/api/locations"] });
    note("Intercepted /api/locations only");
    begin();
    await driver.get(front + "/locations");
    await shows(driver, "[role=alert]", "Retry");
    await shot(driver, "interrupted");
    await driver.sendDevToolsCommand("Network.setBlockedURLs", { urls: [] });
    await (await element(driver, "[role=alert] button")).click();
    await shows(driver, ".campus-card", "Main Library");
    await shot(driver, "recovered");
  },
};
const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
async function main() {
  await fs.mkdir(dir, { recursive: true });
  await mongoose.connect(process.env.MONGO_URI, { dbName: db, serverSelectionTimeoutMS: 5000 });
  let server, vite;
  try {
    assert.equal(mongoose.connection.name, db);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    apiOrigin = "http://127.0.0.1:" + server.address().port;
    const { createServer } = await import(pathToFileURL(require.resolve("vite", { paths: [root] })).href);
    vite = await createServer({ root, server: { host: "127.0.0.1", port: 0, proxy: { "/api": { target: apiOrigin, changeOrigin: true } } } });
    await vite.listen();
    front = "http://127.0.0.1:" + vite.httpServer.address().port;
    console.log(iso(), "Isolated environment", db, apiOrigin, front, "Node", process.version);
    const rows = [["Test ID","Method","Status","Start UTC","End UTC","Actual Result","Evidence Paths (repository relative)"]];
    for (const [index, check] of Object.entries(cases)) {
      id = "TC-" + index.padStart(3, "0");
      notes = []; drivers = []; files = []; started = false;
      let status = "Pass", result = "All scripted catalogue assertions matched. See observed values in the case evidence.";
      const start = iso();
      try {
        for (const name of ["User","Session","Event","Announcement","Schedule","LibraryResource","CampusLocation"]) {
          await mongoose.model(name).deleteMany({});
        }
        await check();
      } catch (error) {
        status = started && !/fetch failed|ECONNREFUSED|disconnected|invalid session id/i.test(error.message) ? "Fail" : "Blocked";
        result = error.message.split("\n")[0];
        note(error.stack);
        for (const [i, driver] of drivers.entries()) {
          try { await shot(driver, "diagnostic-" + (i + 1)); } catch (capture) { note(capture.message); }
        }
      } finally {
        for (const driver of drivers) {
          try { await driver.quit(); } catch (error) { note("Chrome teardown " + error.message); }
        }
      }
      note(status + " " + result);
      const file = id + ".txt";
      await fs.writeFile(path.join(dir, file), notes.join("\n") + "\n");
      evidence(file);
      rows.push([id, ui.has(Number(index)) ? "Selenium Chrome + HTTP fixture setup" : "HTTP API", status, start, iso(), result, files.join(" | ")]);
      await fs.writeFile(path.join(dir, "results.csv"), rows.map(row => row.map(quote).join(",")).join("\n") + "\n");
      console.log(id, status, result);
    }
  } finally {
    try {
      if (vite) await vite.close();
      if (server) await new Promise(resolve => server.close(resolve));
      assert.equal(mongoose.connection.name, db);
      await mongoose.connection.dropDatabase();
      console.log(iso(), "Removed this run's database", db);
    } finally { await mongoose.disconnect(); }
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });

