const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const path = require("node:path");
const mongoose = require("mongoose");

const root = path.resolve(__dirname, "../../..");
const databaseName = "ec4206_section37_" + randomBytes(8).toString("hex");
const mode = process.argv[2];
const port = { serve: 27937, preflight: 27937, security: 27938, ui: 27939, regression: 27940, coverage: 27941 }[mode];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  assert.ok(["serve", "preflight", "security", "ui", "regression", "coverage"].includes(mode), "Select serve, preflight, security, ui, regression or coverage");
  assert.ok(process.env.EC4206_MONGOD, "Set EC4206_MONGOD to the absolute path to mongod");
  const scratch = await fs.realpath(path.join(root, "backend", "node_modules"));
  assert.equal(path.dirname(scratch), await fs.realpath(path.join(root, "backend")));
  const dbPath = await fs.mkdtemp(path.join(scratch, ".ec4206-mongo-"));
  const mongo = spawn(process.env.EC4206_MONGOD, ["--bind_ip", "127.0.0.1", "--port", String(port), "--dbpath", dbPath], {
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  const ready = new Promise((resolve, reject) => {
    mongo.once("error", reject);
    mongo.once("close", code => reject(new Error("Disposable mongod exited before readiness: " + code)));
    mongo.stdout.on("data", chunk => {
      if (chunk.toString().includes('"Waiting for connections"')) resolve();
    });
    mongo.stderr.resume();
  });
  let server;
  let timer;
  try {
    await Promise.race([ready, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Disposable mongod startup timed out")), 20000);
    })]);
    process.env.MONGO_URI = "mongodb://127.0.0.1:" + port + "/?directConnection=true";
    process.env.MONGO_DB_NAME = databaseName;
    console.log("Disposable MongoDB is ready on 127.0.0.1:" + port);
    if (mode === "regression" || mode === "coverage") {
      const args = ["--test"];
      const rawCoverage = path.join(dbPath, "regression.lcov");
      if (mode === "coverage") {
        args.push("--experimental-test-coverage");
        const sources = ["server.js", ...["config", "lib", "middleware", "models", "routes"].map(dir => dir + "/**/*.js")];
        for (const source of sources) args.push("--test-coverage-include=" + source);
        args.push("--test-reporter=tap", "--test-reporter-destination=stdout",
          "--test-reporter=lcov", "--test-reporter-destination=" + rawCoverage);
      }
      const child = spawn(process.execPath, [...args, "tests/*.test.js"], {
        cwd: path.join(root, "backend"), stdio: "inherit",
      });
      const [code] = await once(child, "exit");
      assert.equal(code, 0, "Backend regression exit code");
      if (mode === "coverage") {
        const coverage = await fs.readFile(rawCoverage, "utf8");
        assert.match(coverage, /^SF:/m, "Expected LCOV source records");
        const normalized = coverage.replace(/^SF:(.+)$/gm, (_, file) => {
          const absolute = path.resolve(root, "backend", file.trim());
          const relative = path.relative(root, absolute).split(path.sep).join("/");
          assert.match(relative, /^backend\/(?:server\.js$|(?:config|lib|middleware|models|routes)\/.+\.js$)/);
          return "SF:" + relative;
        });
        const destination = path.join(root, "testing-documentation", "evidence", "section-3.9");
        await fs.mkdir(destination, { recursive: true });
        await fs.writeFile(path.join(destination, "backend-regression.lcov"), normalized);
        console.log("Saved backend runtime LCOV with repository-relative paths");
      }
      return;
    }

    const { app } = require("../../server");
    const connectDB = require("../../config/db");
    const Event = require("../../models/event");
    const Location = require("../../models/CampusLocation");
    await connectDB();
    assert.equal(mongoose.connection.name, databaseName);
    const fixture = {
      title: "EC4206 Synthetic Event", date: "2030-06-01", time: "10:00",
      location: "Synthetic Hall", description: "Section 3.7 fixture",
    };
    await Event.insertMany(Array.from({ length: 100 }, (_, index) => ({
      ...fixture, title: fixture.title + " " + String(index + 1).padStart(3, "0"),
    })));
    await Location.create({
      name: "EC4206 Main Library", building: "Synthetic Building", description: "Study room",
      category: "Library", openingHours: "09:15-17:45", directions: "Ground floor",
    });
    server = app.listen(mode === "serve" ? 51937 : 0, "127.0.0.1");
    await once(server, "listening");
    const origin = "http://127.0.0.1:" + server.address().port;
    console.log("Local API:", origin, "| Synthetic events:", await Event.countDocuments());
    if (mode === "serve" || mode === "preflight") {
      const events = await fetch(origin + "/api/events", { redirect: "error", signal: AbortSignal.timeout(5000) });
      assert.equal(events.status, 200);
      const body = await events.json();
      assert.equal(body.events.length, 100);
      assert.ok(body.events.some(item => item.title === "EC4206 Synthetic Event 001"));
      const control = await fetch(origin + "/api/test", { redirect: "error", signal: AbortSignal.timeout(5000) });
      assert.equal(control.status, 200);
      assert.equal((await control.json()).message, "Smart Campus API is working");
      console.log("Preflight: GET /api/events returned 200 with 100 synthetic events; GET /api/test returned 200.");
      if (mode === "serve") {
        if (process.send) {
          if (process.connected) {
            const finished = once(process, "disconnect");
            process.send("section37-preflight-passed");
            await finished;
          }
          return;
        }
        console.log("Press Ctrl+C after the JMeter runs finish.");
        await new Promise(resolve => process.once("SIGINT", resolve));
      }
      return;
    }
    const check = require("./" + mode + ".cjs");
    await check({ origin, root, Event, fixture });
  } finally {
    clearTimeout(timer);
    try {
      if (server) await new Promise(resolve => server.close(resolve));
      await mongoose.disconnect();
    } finally {
      if (mongo.pid && mongo.exitCode === null && mongo.signalCode === null) {
        const ended = once(mongo, "exit");
        mongo.kill();
        await ended;
      }
      assert.equal(path.dirname(await fs.realpath(dbPath)), scratch);
      await fs.rm(dbPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      console.log("Disposable MongoDB data directory removed");
    }
  }
}

run().catch(error => {
  console.error(error.stack.replaceAll(root, "<checkout>"));
  process.exitCode = 1;
});
