const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { Builder, Browser, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

module.exports = async function usability({ origin, root }) {
  const { createServer } = await import(pathToFileURL(require.resolve("vite", { paths: [root] })).href);
  const vite = await createServer({
    root, server: { host: "127.0.0.1", port: 0, proxy: { "/api": origin } },
  });
  const evidence = path.join(root, "testing-documentation", "evidence", "section-3.7", "browser");
  let driver;
  try {
    await vite.listen();
    const browserOrigin = "http://127.0.0.1:" + vite.httpServer.address().port;
    const options = new chrome.Options().addArguments("--headless=new", "--window-size=1440,1000");
    const builder = new Builder().disableEnvironmentOverrides().forBrowser(Browser.CHROME).setChromeOptions(options);
    if (process.env.CHROME_BIN) options.setChromeBinaryPath(process.env.CHROME_BIN);
    if (process.env.CHROMEDRIVER_PATH) builder.setChromeService(new chrome.ServiceBuilder(process.env.CHROMEDRIVER_PATH));
    driver = await builder.build();
    console.log("Chrome version:", (await driver.getCapabilities()).get("browserVersion"));
    await fs.mkdir(evidence, { recursive: true });
    const email = "usability-" + randomBytes(5).toString("hex") + "@section37.example.test";
    const password = randomBytes(16).toString("hex");
    const timeout = 12000;
    async function visible(locator) {
      return driver.wait(until.elementIsVisible(await driver.wait(until.elementLocated(locator), timeout)), timeout);
    }
    const input = placeholder => visible(By.css('input[placeholder="' + placeholder + '"]'));
    const text = value => visible(By.xpath("//*[normalize-space(text())='" + value + "']"));
    const submit = () => visible(By.css('form button[type="submit"]')).then(button => button.click());
    const route = expected => driver.wait(async () => new URL(await driver.getCurrentUrl()).pathname === expected, timeout);
    const nav = async name => (await visible(By.css('nav a[href="/' + name + '"]'))).click();
    async function check(id, scenario) {
      try {
        const finding = await scenario();
        await fs.writeFile(path.join(evidence, id + ".png"), Buffer.from(await driver.takeScreenshot(), "base64"));
        console.log(id, "PASS", finding);
      } catch (error) {
        console.log(id, "FAIL", error.name, "| route:", new URL(await driver.getCurrentUrl()).pathname);
        throw error;
      }
    }

    await check("USE-01", async () => {
      await driver.get(browserOrigin + "/register");
      await (await input("Full Name")).sendKeys("EC4206 Synthetic Student");
      await (await input("Email")).sendKeys(email);
      await (await input("Password")).sendKeys(password);
      await (await input("Confirm Password")).sendKeys(password);
      await submit();
      await route("/login");
      return "Registration accepted the fixture and opened the login page.";
    });
    async function login(value) {
      await driver.get(browserOrigin + "/login");
      const emailBox = await visible(By.css('input[type="email"]'));
      const passwordBox = await input("Password");
      await emailBox.sendKeys(email);
      await passwordBox.sendKeys(value);
      await submit();
    }
    await check("USE-02", async () => {
      await login("wrong-fixture-password");
      await text("Invalid email or password");
      assert.equal(new URL(await driver.getCurrentUrl()).pathname, "/login");
      return "Wrong password displayed Invalid email or password and kept the login page open.";
    });
    await check("USE-03", async () => {
      await login(password);
      await route("/student-dashboard");
      await visible(By.css('nav a[href="/locations"]'));
      return "Valid login opened the student dashboard with a campus map link.";
    });
    await check("USE-04", async () => {
      await nav("locations");
      await route("/locations");
      await text("EC4206 Main Library");
      const search = await visible(By.css(".campus-search"));
      await search.sendKeys("not-in-fixture");
      await text("No matching records available.");
      assert.equal((await driver.findElements(By.css(".campus-card"))).length, 0);
      await search.clear();
      await search.sendKeys("main library");
      await text("EC4206 Main Library");
      return "Campus Map navigation worked, search filtered a non-match and a matching record.";
    });
    await check("USE-05", async () => {
      await nav("assistant");
      await route("/assistant");
      await (await visible(By.css('[aria-label="Campus question"]'))).sendKeys("What are the library hours?");
      await (await visible(By.css('[aria-label="Send message"]'))).click();
      const transcript = await visible(By.css('[role="log"]'));
      await driver.wait(until.elementTextContains(transcript, "EC4206 Main Library: 09:15-17:45"), timeout);
      return "Assistant displayed fixture-backed library hours in the transcript.";
    });
  } finally {
    try { if (driver) await driver.quit(); } finally { await vite.close(); }
  }
};
