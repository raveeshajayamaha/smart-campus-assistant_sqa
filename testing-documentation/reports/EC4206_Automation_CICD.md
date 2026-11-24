# EC4206 Section 3.6 — Test Automation and CI/CD

## 1. Selenium WebDriver automation

The [Selenium suite](../../backend/tests/ui/selenium.test.cjs) runs the actual React application in headless Chrome. Browser actions exercise the login form, protected routes, dashboard navigation and assistant. The test harness starts Express and Vite on ephemeral loopback ports and configures Vite to forward API traffic to that Express instance. The harness requires a local MongoDB endpoint, sets and verifies a random `campus_selenium_test_` database, and creates synthetic fixtures. It removes only tracked test records and closes both servers. Empty test collections and indexes may remain.

The earlier Windows browser smoke test uses the Chrome DevTools Protocol, fixed ports and seed data. The new suite uses Selenium WebDriver and its default driver resolution, independent browser sessions and scenario-specific data. It uses explicit waits for routes, visible elements and assistant text. It requires neither the earlier browser smoke script nor the application seed script. Each scenario creates its own account if needed and can run without data produced by any other scenario.

The backend pins `selenium-webdriver` 4.41.0 as its only new direct development dependency. Local testing used Windows PowerShell, Node 25.6.0 and Chrome 157.0.8103.80. The installed Vite, Cucumber and Selenium dependency engine ranges support Node 24, which is selected for CI. By default, Selenium resolves a local Chrome and matching driver. If needed, set `CHROME_BIN` and `CHROMEDRIVER_PATH` to compatible local executables. [Selenium JavaScript API](https://www.selenium.dev/selenium/docs/api/javascript/index.html)

## 2. Executed scenarios

| ID | Requirement | Scenario and observed result | Status | Screenshot |
|---|---|---|---|---|
| AUTO-01 | FR-02 | Opening the protected dashboard while signed out redirected the browser to the login page. | Pass | [Login redirect](../evidence/selenium/AUTO-01-pass.png) |
| AUTO-02 | FR-02 | Submitting a wrong password displayed “Invalid email or password” and left the browser on the login page. | Pass | [Rejected login](../evidence/selenium/AUTO-02-pass.png) |
| AUTO-03 | FR-02, FR-08 | A synthetic student signed in on the React form and followed the campus map link to the locations page. | Pass | [Campus locations](../evidence/selenium/AUTO-03-pass.png) |
| AUTO-04 | FR-03 | A signed-in student opening the administrator URL was redirected to the student dashboard. The administrator link was absent. | Pass | [Student landing page](../evidence/selenium/AUTO-04-pass.png) |
| AUTO-05 | FR-09 | The student submitted a library-hours question. The assistant displayed the synthetic library name and hours stored in MongoDB. | Pass | [Assistant reply](../evidence/selenium/AUTO-05-pass.png) |

The successful [Selenium TAP run](../evidence/EC4206_Selenium_Rerun.tap) executed **5 scenarios with 5 passed, 0 failed, 0 skipped and 0 blocked**. Node counted **6 passed** including the parent. Browser screenshots were saved after each successful scenario. The harness also attempts a failure screenshot whenever an assertion fails after Chrome starts. The [initial Selenium attempt](../evidence/EC4206_Selenium_Run.tap) recorded one harness failure because its relative backend imports were incorrect. This happened before a browser session existed, leaving no failure screenshot. The harness paths were corrected before the rerun, with the scenario assertions retained.

## 3. Local execution and verification

From the repository root, use Node 24 or another version supported by the locked dependencies, a local MongoDB instance, and installed Chrome. The backend reads its existing local environment configuration or a loopback `MONGO_URI` supplied by the shell. Make both dependency trees available from their lockfiles before running the checks.

```powershell
npm.cmd ci
npm.cmd --prefix backend ci
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix backend test
npm.cmd --prefix backend run test:bdd
npm.cmd --prefix backend run test:ui
```

Local dependency verification compared both manifests with their lockfile root declarations. The commands above describe reproducible setup. The evidence run used the installed dependencies with the newly pinned Selenium package.

| Local check performed | Result | Evidence |
|---|---|---|
| Frontend ESLint | Exit 0 | [Lint log](../evidence/EC4206_Automation_Lint.txt) |
| TypeScript and Vite production build | Exit 0 | [Build log](../evidence/EC4206_Automation_Build.txt) |
| Full backend regression | 66 passed, 0 failed, 0 skipped, including parent tests | [Regression log](../evidence/EC4206_Automation_Regression.txt) |
| Cucumber | 2 scenarios and 9 steps passed | [Cucumber log](../evidence/EC4206_Automation_Cucumber.txt) |
| Selenium | 5 scenarios passed, with 5 screenshots | [Selenium TAP](../evidence/EC4206_Selenium_Rerun.tap) |
| Workflow validation | YAML parsed successfully. Trigger, loopback database and artifact settings were checked, and Git Bash syntax validation passed for each shell step. | Local validation only |

The Selenium suite is separate from the backend regression glob and runs with `test:ui`. Use a fresh `SELENIUM_EVIDENCE_DIR` to preserve old screenshots when repeating a run. The 36 separately designed manual cases remain **Not Run**.

## 4. GitHub Actions and continuous delivery

The [EC4206 CI workflow](../../.github/workflows/ec4206-ci.yml) runs on pushes and pull requests. It uses an Ubuntu 24.04 GitHub-hosted runner, Node 24, and a dedicated MongoDB 8.0 service container with a ping health check. The job's connection string addresses the service on loopback and needs no repository secrets. It uses read-only repository permissions.

The workflow checks out the code, installs locked frontend and backend dependencies with `npm ci`, runs lint and the TypeScript/Vite build, executes backend tests and Cucumber, then launches Selenium using the hosted runner's Chrome. Bash runs each piped command with failure propagation. An always-run upload preserves evidence collected before any failure, including Selenium screenshots when a browser session was available. A successful job publishes the verified frontend build as a downloadable artifact. This is a continuous-delivery artifact for review. No automatic environment deployment is configured.

**GitHub-hosted status** — The workflow was prepared and checked locally. There is no hosted run result for this change. Local checks do not verify hosted runner browser provisioning, the MongoDB service container or artifact publication.

## 5. Capturing GitHub Actions evidence

1. Review and commit the workflow, backend package files, Selenium suite and any earlier uncommitted TDD/BDD files required by the pipeline. Confirm that local environment files and credentials are excluded.
2. Push that commit to the authorised GitHub repository, or open a pull request from the pushed branch. If the repository restricts workflows, ask the repository maintainer to enable or approve the run.
3. Open **Actions → EC4206 CI** in the repository and wait for the run for that commit to finish. Check the verification job and each test step. If a step fails, inspect its log and the evidence artifact before rerunning.
4. After a successful run, capture the run summary with the green conclusion, commit or branch, completed verification job and artifact list. Download **ec4206-ci-evidence** for the captured Selenium PNGs and test logs, and **smart-campus-frontend** for the verified build.

The [traceability matrix](../test-plans/EC4206_Test_Plan.md) links AUTO-01 through AUTO-05 to their existing requirements and preserves all earlier IDs.
