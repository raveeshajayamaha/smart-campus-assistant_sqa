# EC4206 Section 3.9 — Quality Metrics and SonarQube

**Project** AI-Powered Smart Campus Assistant  
**Measurement date** 24 November 2026, Asia/Colombo  
**Source baseline** `ee7e5e28b537497a7a64d405a2717d12107d5fd5` in the separate SQA checkout

| Activity | Outcome | Evidence |
|---|---|---|
| Backend regression and coverage | 66 passed, 0 failed, 0 skipped. 98.13% lines and 94.76% branches across 15 runtime files. | [TAP with V8 report](../evidence/section-3.9/backend-regression-coverage.tap), [LCOV](../evidence/section-3.9/backend-regression.lcov) |
| Frontend code coverage | **Not Measured**. The existing Selenium suite exercises browser workflows without JavaScript coverage instrumentation. | [Selenium execution report](EC4206_Automation_CICD.md) |
| SonarQube Cloud baseline | GitHub Actions succeeded. The Quality Gate **failed** because new-code security was **C** against required **A**. | [GitHub run](https://github.com/raveeshajayamaha/smart-campus-assistant_sqa/actions/runs/45420050634), [SonarQube Cloud](https://sonarcloud.io/project/overview?id=raveeshajayamaha_smart-campus-assistant_sqa) |
| Historical backend application defect density | **2.51 defects per KLOC**, based on one confirmed application defect and 398 backend runtime source lines. | [Source-line inventory](../evidence/section-3.9/source-lines.json), [defect register](EC4206_Defect_Tracking.md) |

## Coverage method and results

The coverage run used Node.js 25.6.0 and the existing six `backend/tests/*.test.js` files. The regression exercises API workflows, authentication and authorization, password and profile behavior, black-box and white-box cases, and the upcoming-event formatter. Node's TAP total includes suite parents. Cucumber and Selenium have separate entry points and were outside the measured run. The runner explicitly selected the V8 coverage and LCOV reporters and started its own MongoDB 8.3 process on loopback port 27941. It used disposable test data and removed the scratch data directory after execution.

| Measured scope | Lines hit / found | Branches hit / found | Functions hit / found |
|---|---:|---:|---:|
| Section 3.9 backend runtime regression | 419 / 427 (**98.13%**) | 181 / 191 (**94.76%**) | 51 / 58 (**87.93%**) |
| Section 3.4 focused `auth.js` run | 19 / 23 (82.61%) | 12 / 12 (100.00%) | See the focused report |
| React and TypeScript frontend | Not Measured | Not Measured | Not Measured |

Coverage includes the imported application server, database configuration, routes, middleware, models and the event fallback helper. All 15 files in that runtime scope appear in the LCOV inventory. The administrative scripts `backend/seed.js` and `backend/make-admin.js`, tests, dependencies and the frontend are outside the coverage denominator. Section 3.4 measured authentication paths in a focused run. Its 100% refers to the 12 branch ranges V8 recorded in that run, whereas the broader regression recorded 17 hit ranges in the same file. The V8 line denominator differs from the physical source-line count used for defect density. [Section 3.4 report](EC4206_White_Box_Testing.md)

The LCOV source-record paths use forward slashes and are relative to the repository root. Coverage hits and counts in this local measurement come directly from Node. The GitHub Actions scanner uses a fresh CI-generated LCOV report.

### Reproduce the backend measurement

Run from the SQA checkout root with both lockfile dependency sets installed, Node.js 25.6.0, and the MongoDB executable available. Adjust its path for the local machine.

```powershell
$env:EC4206_MONGOD = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe'
$evidence = 'testing-documentation/evidence/section-3.9'
$lines = @(node backend/testing/section-3.7/run.cjs coverage)
$code = $LASTEXITCODE
($lines + "# Runner exit code: $code") | Set-Content "$evidence/backend-regression-coverage.tap" -Encoding utf8
if ($code -ne 0) { throw "Coverage runner failed ($code)" }
node backend/testing/section-3.9/count-sloc.cjs | Set-Content "$evidence/source-lines.json" -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'Source line count failed' }
```

The runner writes `backend-regression.lcov` to the same evidence directory. A rerun replaces these three evidence files.

## SonarQube configuration, availability and setup

[sonar-project.properties](../../sonar-project.properties) includes the frontend and backend in static analysis. Backend tests and Cucumber features are classified as tests. Generated evidence and testing utilities are outside the application source scope. The [EC4206 CI workflow](../../.github/workflows/ec4206-ci.yml) generates `coverage/backend-regression.lcov` in the verification job and passes it to the scan job as an artifact. The scan job uses GitHub OIDC with job-level `contents: read` and `id-token: write`. Frontend coverage in this report remains **Not Measured**. [JS/TS LCOV import](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/test-coverage/javascript-typescript-test-coverage)

### Historical local scanner attempt

Initial inspection found Temurin 17.0.21.1+2 in the previous checkout-local JMeter toolchain, no Java or scanner on terminal PATH, no local SonarQube listener on port 9000 and an installed Docker CLI with an unavailable engine. Windows reported about 736 MiB of available RAM at inspection. SonarSource specifies 4 GB RAM for a small server start and requires Java 21 or later on current Community Build releases. On this host, a local server was deferred. The portable Windows SonarScanner CLI **8.1.0.6389** from SonarSource is now verified with its bundled **Temurin 21.0.9+10**. The official ZIP was downloaded over validated HTTPS, and the logged SHA-256 records the archive received. Its bootstrap check used `http://127.0.0.1:9000` with no token and stopped at server discovery, exit 1. No source analysis ran. [Server host requirements](https://docs.sonarsource.com/sonarqube-community-build/server-installation/server-host-requirements) · [Scanner CLI downloads](https://docs.sonarsource.com/sonarqube-community-build/analyzing-source-code/scanners/sonarscanner)

### Hosted baseline and workflow security findings

GitHub Actions run **45420050634**, for commit `f23cd83af49a3a2862acce9823f70683b0323b4d`, completed successfully in both the verification and scan jobs. SonarQube Cloud reported a **failed Quality Gate**. Its new-code security rating was **C (3)** against the required **A (1)**. The line numbers below refer to that analyzed revision. [GitHub Actions run](https://github.com/raveeshajayamaha/smart-campus-assistant_sqa/actions/runs/45420050634) · [SonarQube Cloud Quality Gate API](https://sonarcloud.io/api/qualitygates/project_status?projectKey=raveeshajayamaha_smart-campus-assistant_sqa)

| Line | Security severity and rule | Root cause | Remediation |
|---:|---|---|---|
| 108 | High · `githubactions:S7637` | The OIDC action used the mutable `v1` tag. | Pinned the exact upstream `v1` commit `a0aa643acde4162396015b4f12536c1b9c4aab82` and retained a version comment. [SonarSource commit](https://github.com/SonarSource/sonarqube-auth-action/commit/a0aa643acde4162396015b4f12536c1b9c4aab82) |
| 112 | High · `githubactions:S7637` | The scan action used a version tag in place of a full commit SHA. | Pinned upstream `v8.3.0` commit `d209202bc7d53ff1cc128f7f907dac145c9d6ae9` and retained a version comment. [SonarSource commit](https://github.com/SonarSource/sonarqube-scan-action/commit/d209202bc7d53ff1cc128f7f907dac145c9d6ae9) |
| 40 | Medium · `githubactions:S6505` | Frontend dependency installation allowed package lifecycle scripts. | Changed the frontend install to `npm ci --ignore-scripts`. |
| 41 | Medium · `githubactions:S6505` | Backend dependency installation allowed package lifecycle scripts. | Changed the backend install to `npm ci --ignore-scripts --prefix backend`. |

The full SHAs were resolved from the official SonarSource Git tag refs. GitHub reported verified signatures for both commits. SonarQube Cloud listed all four findings as open on the hosted baseline at review time. [SonarQube Cloud issues](https://sonarcloud.io/project/issues?id=raveeshajayamaha_smart-campus-assistant_sqa)

### Install compatibility

The frontend lockfile records an install hook on optional macOS-only `fsevents`. Rolldown and Lightning CSS have prebuilt Linux x64 packages in the lockfile. The backend lockfile records no install hooks. In CI, the MongoDB service is provided by a container, Chrome is provided by the runner, and Selenium uses its packaged manager at test runtime. The Cucumber and Selenium commands remain explicit test steps. [npm lifecycle option](https://docs.npmjs.com/cli/commands/npm-ci/#ignore-scripts)

### Local remediation verification

Validation ran in a clean disposable copy of the tracked SQA files on Windows with Node 25.6.0, npm 11.8.0, and an isolated MongoDB 8.3 process. GitHub Actions uses Ubuntu 24.04, Node 24, and MongoDB 8.0.

| Check | Verified result |
|---|---|
| Frontend and backend `npm ci --ignore-scripts` | Both passed. No lifecycle script was needed for the tested setup. |
| Workflow validation | actionlint 1.7.12 and Bash syntax checks passed. Job ordering, permissions, OIDC configuration, and the LCOV artifact path were preserved. |
| Frontend lint and build | Both passed. |
| Backend regression and LCOV | 66 passed, 0 failed, 0 skipped. The LCOV paths resolved to 15 backend source files. Node reported 98.13% line and 94.76% branch coverage in that runtime scope. |
| Cucumber | 2 scenarios passed and all 9 steps passed. |
| Selenium with local Chrome | 6 passed, 0 failed, 0 skipped. |

The clean installs also reported separate npm audit findings. The frontend reported 11 (9 moderate, 2 high) and the backend 6 (4 moderate, 2 high). The lockfiles are unchanged. The next hosted run must confirm Ubuntu compatibility and SonarQube must reevaluate the four workflow findings and Quality Gate for the remediation commit.

## Application defect density

The numerator is **one historically confirmed backend application defect**, DEF-001. The Selenium import failure (DEF-002) and JMeter transcript failure (DEF-003) are recorded separately as two test-infrastructure defects. An infrastructure density is not reported, because the private wrapper and Selenium harness do not share a measured infrastructure baseline.

The denominator is **398 physical backend runtime source lines** in the current baseline. The reproducible counter uses the checkout's TypeScript parser (6.0.3) to count each nonblank physical line containing a source token once. Blank and comment-only lines, tests, dependencies, generated output and administrative scripts are excluded. Frontend TS/TSX separately accounts for **2,068** physical source lines and is outside the backend rate. [Per-file counts](../evidence/section-3.9/source-lines.json) · [Counter](../../backend/testing/section-3.9/count-sloc.cjs)

`1 historical application defect ÷ (398 source lines ÷ 1,000) = 2.51256… ≈ 2.51 historical defects per KLOC.`

DEF-001 was fixed before the measured baseline. This is a coursework defect-discovery density against a stated denominator, rather than a count of open defects or SonarQube issues.

## Improvements supported by the measurements

1. Exercise the Express startup path through `start()` in a disposable fixture. V8 reported lines 24–28 of `backend/server.js` uncovered. Verify that startup returns a listening server and that cleanup closes it.
2. Add an API regression with no upcoming events and one historical event. Assert both the historical reply text and its returned source ID. The formatter test covers populated output in isolation, and V8 reported the route's historical source mapping at lines 50–51 uncovered.
3. Add instrumented React tests for the existing login feedback and campus-search workflows. Preserve the Selenium workflow checks and export separate frontend LCOV before reporting a frontend percentage.

The [traceability matrix](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix) records the measured backend coverage and pending SonarQube scan under QR-04. All 36 manual cases retain **Not Run**. Section 3.9 still requires a new hosted scan of the remediation, confirmation that the four findings are resolved and LCOV was imported, and dashboard evidence for the resulting metrics and Quality Gate.
