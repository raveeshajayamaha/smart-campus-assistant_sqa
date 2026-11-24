const test = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { once } = require("node:events");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { Builder, Browser, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const mongoose = require("mongoose");

const root = path.resolve(__dirname, "../../..");
const screenshotDir = process.env.SELENIUM_EVIDENCE_DIR ||
  path.join(root, "testing-documentation", "evidence", "selenium");
const databaseName = "campus_selenium_test_" + randomBytes(8).toString("hex");
process.env.MONGO_DB_NAME = databaseName;

const { app } = require("../../server");
const connectDB = require("../../config/db");
const User = require("../../models/User");
const Session = require("../../models/Session");
const Location = require("../../models/CampusLocation");

const password = "CampusSeleniumFixture123";
const waitMs = 15000;

test("EC4206 Selenium Chrome workflows", { timeout: 300000 }, async t => {
  let apiServer;
  let vite;
  let isolated = false;
  const userIds = [];
  const locationIds = [];

  try {
    const localUri = /^mongodb:\/\/(?:[^/?#@]+@)?(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:[/?]|$)/i;
    assert.ok(localUri.test(process.env.MONGO_URI || ""), "A single local MongoDB endpoint is required");
    try {
      await connectDB();
    } catch {
      throw new Error("Unable to connect to the isolated Selenium MongoDB database");
    }
    assert.equal(mongoose.connection.name, databaseName);
    isolated = true;

    apiServer = app.listen(0, "127.0.0.1");
    await once(apiServer, "listening");
    const apiOrigin = "http://127.0.0.1:" + apiServer.address().port;
    const { createServer } = await import(pathToFileURL(require.resolve("vite", { paths: [root] })).href);
    vite = await createServer({
      root,
      server: {
        host: "127.0.0.1", port: 0,
        proxy: { "/api": { target: apiOrigin, changeOrigin: true } },
      },
    });
    await vite.listen();
    const origin = "http://127.0.0.1:" + vite.httpServer.address().port;
    await mkdir(screenshotDir, { recursive: true });

    async function createStudent(id) {
      const email = id.toLowerCase() + "-" + randomBytes(5).toString("hex") + "@selenium.example.test";
      const response = await fetch(apiOrigin + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Selenium Student " + id, email, password }),
      });
      assert.equal(response.status, 201);
      const { user } = await response.json();
      userIds.push(user.id);
      return email;
    }

    async function waitForPath(driver, expected) {
      await driver.wait(async () => new URL(await driver.getCurrentUrl()).pathname === expected,
        waitMs, "Expected browser route " + expected);
    }

    async function visible(driver, locator) {
      const element = await driver.wait(until.elementLocated(locator), waitMs);
      return await driver.wait(until.elementIsVisible(element), waitMs);
    }

    async function signIn(driver, email, inputPassword = password) {
      await driver.get(origin + "/login");
      await (await visible(driver, By.css('input[type="email"]'))).sendKeys(email);
      await (await visible(driver, By.css('input[placeholder="Password"]'))).sendKeys(inputPassword);
      await (await visible(driver, By.css('form button[type="submit"]'))).click();
    }

    async function screenshot(driver, id, status) {
      const png = await driver.takeScreenshot();
      const filename = id + "-" + status + ".png";
      await writeFile(path.join(screenshotDir, filename), Buffer.from(png, "base64"));
      console.log("Screenshot:", filename);
    }

    async function runScenario(id, description, scenario) {
      await t.test(id + " " + description, { timeout: 75000 }, async () => {
        const options = new chrome.Options().addArguments("--headless=new", "--window-size=1440,1000");
        if (process.env.CHROME_BIN) options.setChromeBinaryPath(process.env.CHROME_BIN);
        const builder = new Builder().disableEnvironmentOverrides().forBrowser(Browser.CHROME).setChromeOptions(options);
        if (process.env.CHROMEDRIVER_PATH) {
          builder.setChromeService(new chrome.ServiceBuilder(process.env.CHROMEDRIVER_PATH));
        }
        const driver = await builder.build();
        try {
          await scenario(driver);
          await screenshot(driver, id, "pass");
        } catch (error) {
          try {
            await screenshot(driver, id, "failure");
          } catch (captureError) {
            console.error("Could not capture failure screenshot:", captureError.message);
          }
          throw error;
        } finally {
          await driver.quit();
        }
      });
    }

    await runScenario("AUTO-01", "signed-out visitor is redirected from the student dashboard", async driver => {
      await driver.get(origin + "/student-dashboard");
      await waitForPath(driver, "/login");
      await visible(driver, By.css('input[type="email"]'));
    });

    await runScenario("AUTO-02", "incorrect password is rejected by the login form", async driver => {
      await signIn(driver, await createStudent("AUTO-02"), "IncorrectFixturePassword");
      await visible(driver, By.xpath("//*[normalize-space(text())='Invalid email or password']"));
      await waitForPath(driver, "/login");
    });

    await runScenario("AUTO-03", "student signs in and navigates from the dashboard to campus locations", async driver => {
      await signIn(driver, await createStudent("AUTO-03"));
      await waitForPath(driver, "/student-dashboard");
      const link = await visible(driver, By.css('nav a[href="/locations"]'));
      await link.click();
      await waitForPath(driver, "/locations");
      await visible(driver, By.css("input.campus-search"));
    });

    await runScenario("AUTO-04", "student cannot enter the administrator dashboard", async driver => {
      await signIn(driver, await createStudent("AUTO-04"));
      await waitForPath(driver, "/student-dashboard");
      await driver.get(origin + "/admin-dashboard");
      await waitForPath(driver, "/student-dashboard");
      await visible(driver, By.css("a.logout-button"));
      assert.equal((await driver.findElements(By.css('nav a[href="/admin-dashboard"]'))).length, 0);
    });

    await runScenario("AUTO-05", "assistant displays MongoDB-backed library hours", async driver => {
      const location = await Location.create({
        name: "Selenium Main Library", building: "Main Building", description: "Study room",
        category: "Library", openingHours: "09:15-17:45", directions: "Ground floor",
      });
      locationIds.push(location._id);
      await signIn(driver, await createStudent("AUTO-05"));
      await waitForPath(driver, "/student-dashboard");
      await (await visible(driver, By.css('nav a[href="/assistant"]'))).click();
      await waitForPath(driver, "/assistant");
      await (await visible(driver, By.css('[aria-label="Campus question"]'))).sendKeys("What are the library hours?");
      await (await visible(driver, By.css('[aria-label="Send message"]'))).click();
      const transcript = await visible(driver, By.css('[role="log"]'));
      await driver.wait(until.elementTextContains(transcript, "Selenium Main Library: 09:15-17:45"), waitMs);
    });
  } finally {
    try {
      if (vite) await vite.close();
    } finally {
      try {
        if (apiServer) await new Promise((resolve, reject) =>
          apiServer.close(error => error ? reject(error) : resolve()));
      } finally {
        try {
          if (isolated) {
            await Location.deleteMany({ _id: { $in: locationIds } });
            await Session.deleteMany({ user: { $in: userIds } });
            await User.deleteMany({ _id: { $in: userIds } });
          }
        } finally {
          await mongoose.disconnect();
        }
      }
    }
  }
});
