# EC4206 automated catalogue execution

On 25 November 2026, the runner exercised **32 catalogue cases with 32 passes and 0 failures**. Three further cases have blocked acceptance criteria. Manual observations are in the [manual results CSV](../test-cases/EC4206_Manual_Execution_Results.csv). TC-001 was outside this automated batch.

- Tested application and configuration revision `1bd7b42648c07b92dbcd5a561dd2019b27a54bad` on Windows with Node 25.6.0 and headless Chrome. Express and Vite bound to ephemeral loopback ports. The runner connected to disposable MongoDB on port 27960, reset only its own randomly named synthetic database between cases, and dropped that database after the run.
- [Per-case CSV with UTC times and evidence paths](../evidence/catalogue/20261125-061344291/results.csv) and [execution transcript](../evidence/catalogue/20261125-061344291/catalogue.txt). API cases have request and response transcripts with bearer tokens redacted. Five browser cases have 11 real screenshots. Screenshot paths are listed in the CSV and capture timestamps are in each case log.
- [Runner](../../backend/testing/catalogue.cjs), [environment](../evidence/catalogue/20261125-061344291/environment.txt) and [suite timings and exit codes](../evidence/catalogue/20261125-061344291/suite-exits.csv).

| Case | Execution method | Outcome | Earlier coverage and new evidence |
|---|---|---|---|
| TC-002 | HTTP API | Pass | API and black-box equivalence tests cover duplicate registration. [Log](../evidence/catalogue/20261125-061344291/TC-002.txt) |
| TC-003 | HTTP API | Pass | Black-box boundary suite covers all four lengths. [Log](../evidence/catalogue/20261125-061344291/TC-003.txt) |
| TC-004 | HTTP API | Pass | API suite checks the registered role. [Log](../evidence/catalogue/20261125-061344291/TC-004.txt) |
| TC-005 | HTTP API | Pass | API suite checks login and identity. The black-box harness checks token format. [Log](../evidence/catalogue/20261125-061344291/TC-005.txt) |
| TC-006 | HTTP API | Pass | API suite and AUTO-02 cover incorrect login across API and browser. [Log](../evidence/catalogue/20261125-061344291/TC-006.txt) |
| TC-007 | HTTP API | Pass | API suite checks single-session logout. This run compares two sessions. [Log](../evidence/catalogue/20261125-061344291/TC-007.txt) |
| TC-008 | HTTP API | Pass | WB suite covers missing and malformed authorization. [Log](../evidence/catalogue/20261125-061344291/TC-008.txt) |
| TC-009 | HTTP API | Pass | API and WB suites check expired sessions. [Log](../evidence/catalogue/20261125-061344291/TC-009.txt) |
| TC-010 | HTTP API | Pass | API, black-box decision table and SEC checks cover roles. [Log](../evidence/catalogue/20261125-061344291/TC-010.txt) |
| TC-011 | Selenium Chrome | Pass | AUTO-04 checks a student redirect. [Log](../evidence/catalogue/20261125-061344291/TC-011.txt) |
| TC-012 | HTTP API | Pass | Profile suite checks trimming, persistence and identity. [Log](../evidence/catalogue/20261125-061344291/TC-012.txt) |
| TC-013 | HTTP API | Pass | Profile suite checks invalid fields and atomicity. [Log](../evidence/catalogue/20261125-061344291/TC-013.txt) |
| TC-014 | HTTP API | Pass | Profile suite checks rejected fields and identity protection. [Log](../evidence/catalogue/20261125-061344291/TC-014.txt) |
| TC-015 | HTTP API | Pass | Password suite checks session and account isolation. [Log](../evidence/catalogue/20261125-061344291/TC-015.txt) |
| TC-016 | HTTP API | Pass | Password suite checks wrong current password and retained sessions. [Log](../evidence/catalogue/20261125-061344291/TC-016.txt) |
| TC-017 | HTTP API | Pass | Password suite covers confirmation mismatch. [Log](../evidence/catalogue/20261125-061344291/TC-017.txt) |
| TC-018 | HTTP API | Pass | Password suite covers the bcrypt UTF-8 byte limit. [Log](../evidence/catalogue/20261125-061344291/TC-018.txt) |
| TC-019 | HTTP API | Pass | API suite checks creation and listing of all five collections. [Log](../evidence/catalogue/20261125-061344291/TC-019.txt) |
| TC-020 | HTTP API | Pass | API suite and browser smoke cover related updates. This run compares each unchanged field. [Log](../evidence/catalogue/20261125-061344291/TC-020.txt) |
| TC-021 | HTTP API | Pass | API suite covers delete and repeated delete. [Log](../evidence/catalogue/20261125-061344291/TC-021.txt) |
| TC-022 | HTTP API | Pass | API and SEC checks cover invalid IDs, including invalid event PUT in SEC. [Log](../evidence/catalogue/20261125-061344291/TC-022.txt) |
| TC-023 | HTTP API | Pass | API suite covers malformed JSON. [Log](../evidence/catalogue/20261125-061344291/TC-023.txt) |
| TC-024 | HTTP API | Pass | API suite covers related schema failures. [Log](../evidence/catalogue/20261125-061344291/TC-024.txt) |
| TC-025 | HTTP API | Pass | API and black-box suites cover time ordering and boundaries. [Log](../evidence/catalogue/20261125-061344291/TC-025.txt) |
| TC-026 | Selenium Chrome | Pass | API suite and browser smoke cover related data and dashboard checks. [Log](../evidence/catalogue/20261125-061344291/TC-026.txt) |
| TC-027 | Selenium Chrome | Pass | USE-04 checks similar filtering. [Log](../evidence/catalogue/20261125-061344291/TC-027.txt) |
| TC-028 | Selenium Chrome | Pass | BDD-01 checks API propagation. AUTO-05 checks browser rendering with a separate fixture. [Log](../evidence/catalogue/20261125-061344291/TC-028.txt) |
| TC-029 | HTTP API | Pass | API suite checks a next-class reply. This run checks ordering and source ID. [Log](../evidence/catalogue/20261125-061344291/TC-029.txt) |
| TC-030 | HTTP API | Pass | Black-box suite covers all four assistant boundaries. [Log](../evidence/catalogue/20261125-061344291/TC-030.txt) |
| TC-031 | HTTP API | Pass | API suite checks a missing-exam response. [Log](../evidence/catalogue/20261125-061344291/TC-031.txt) |
| TC-032 | HTTP API | Pass | Existing assistant tests cover related lookup paths. [Log](../evidence/catalogue/20261125-061344291/TC-032.txt) |
| TC-033 | Selenium Chrome | Pass | New location-only interruption and Retry coverage. [Log](../evidence/catalogue/20261125-061344291/TC-033.txt) |
| TC-034 | JMeter acceptance run | Blocked | No approved per-endpoint limits, load or duration. Historical local runs establish measurement and error counts. [Section 3.7](EC4206_Performance_Security_Usability.md) |
| TC-035 | Human keyboard-only observation | Blocked | A peer evaluator must complete the task and report what they observe. USE-04 and TC-027 provide automated filtering evidence. [Execution guide](../test-cases/EC4206_Manual_Execution_Guide.md#tc-035--find-library-hours-with-keyboard-controls) |
| TC-036 | Local command rerun and hosted CI/SonarQube review | Blocked | Lint, build, regression, Cucumber and Selenium exited 0. The archived hosted API capture confirms both jobs succeeded and the gate passed on the same SHA. The guide calls for a fresh authorized scan and confirmation of its analysis. [Local timing and results](../evidence/catalogue/20261125-061344291/suite-exits.csv) · [Archived hosted record](../evidence/section-3.9/hosted-analysis-1bd7b42.json) |

## Existing suite reruns

| Suite | Fresh result | Scope | Evidence |
|---|---|---|---|
| Node backend | 66 passed, 0 failed or skipped | TAP/Node harness count includes parent tests. It overlaps catalogue checks and includes the focused black-box and white-box suites. | [Regression transcript](../evidence/catalogue/20261125-061344291/regression.txt) |
| Cucumber | 2 scenarios and 9 steps passed | API-level library-hours propagation and empty upcoming-events behaviour. | [Cucumber transcript](../evidence/catalogue/20261125-061344291/cucumber.txt) |
| Selenium | 5 workflow subtests passed, 6 TAP passes with suite parent | Existing AUTO-01 through AUTO-05. | [Selenium TAP](../evidence/catalogue/20261125-061344291/selenium.txt) |
| ESLint and production build | Both exit 0 | Frontend lint, TypeScript and Vite build. | [Lint](../evidence/catalogue/20261125-061344291/lint.txt) · [Build](../evidence/catalogue/20261125-061344291/build.txt) |


## Reproduce the catalogue run

Use the existing locked project dependencies, the disposable MongoDB server on port 27960 and a ChromeDriver that matches installed Chrome. From the SQA root in PowerShell:

```powershell
$env:MONGO_URI = 'mongodb://127.0.0.1:27960/?directConnection=true'
$env:CHROMEDRIVER_PATH = '<absolute path to matching chromedriver.exe>'
$run = 'testing-documentation/evidence/catalogue/' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssfff')
node backend/testing/catalogue.cjs $run
```

Read the CSV to determine the individual outcomes. The process exit code indicates whether the runner itself finished.