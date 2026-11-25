# EC4206 Section 3.7 — Performance, Security and Usability Testing

**Execution date** 24 November 2026 (Asia/Colombo)  
**Scope** AI-Powered Smart Campus Assistant SQA checkout. Node.js v25.6.0, local MongoDB 8.3 and Chrome 157.0.8103.80 on Windows.

| Activity | Outcome | Evidence |
|---|---|---|
| JMeter performance | PERF-01 and PERF-02 executed at 1, 5, 10 and 20 users. 1,420 samples, 0 errors. | [JMeter plan](../../backend/testing/section-3.7/campus-read-only.jmx), [measured summary](../evidence/section-3.7/jmeter-20261124-120314/summary.json) |
| Local API security | 8 passed, 0 failed, 0 blocked | [Security transcript](../evidence/section-3.7/security.txt) |
| Chrome usability-oriented checks | 5 passed on rerun. Human evaluation **Not Run**. | [Chrome rerun](../evidence/section-3.7/ui.txt), [initial run](../evidence/section-3.7/ui-first-run.txt), screenshots below |
| Backend regression | 66 passed, 0 failed, 0 skipped | [Original regression](../evidence/section-3.7/regression.txt), [post-performance regression](../evidence/section-3.7/regression-after-performance.txt) |

The runner starts a separate MongoDB process on loopback with a fresh data directory and a unique database name. It binds Express to loopback and seeds 100 synthetic events and one synthetic library location. The browser run uses a loopback Vite proxy to the same Express process. Each run removes its disposable MongoDB data directory on exit. The existing MongoDB service and application data were left alone.

## Performance

`backend/server.js`, `eventRoutes.js` and `resourceRoutes.js` expose two unauthenticated read-only routes suitable for this workload. PERF-01 measures an events request that reads and sorts a MongoDB collection. PERF-02 uses an API health response as a control that exercises HTTP and Express without a database query. The plan fixes the host and port to `127.0.0.1:51937`, disables redirects, and checks HTTP 200 and a response marker for each route. The executed preflight confirmed 100 events and the expected health response using one request per endpoint.

### Measured results

The run used portable Eclipse Temurin 17.0.21.1+2 and Apache JMeter 5.6.3 with session-local settings. Temurin’s SHA-256 and JMeter’s SHA-512 and OpenPGP signature were verified against their official sources. Both version commands succeeded. [Toolchain verification](../evidence/section-3.7/toolchain.txt)

JMeter ran in non-GUI mode against the disposable Express fixture at `127.0.0.1:51937` after the live preflight confirmed both HTTP 200 responses and 100 synthetic events. Each thread made two sequential GETs per loop, with a 250 ms delay before each request, a 2 s connect timeout and a 5 s response timeout. The four stages used the same fixture in the listed order without a separate warm-up phase or repeated trials.

| Configured users | Observed peak threads | Ramp-up (s) | Loops per user | Samples per endpoint | Total samples | Sampling window (s) |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 1 | 10 | 10 | 20 | 5.12 |
| 5 | 5 | 5 | 20 | 100 | 200 | 14.24 |
| 10 | 10 | 5 | 20 | 200 | 400 | 14.75 |
| 20 | 20 | 5 | 20 | 400 | 800 | 15.00 |

The sampling window runs from the first sample start to the last sample completion. p95 refers to JMeter’s elapsed response time. The **Total** row gives combined stage throughput. Endpoint throughputs use the respective sampler windows.

| Users | Sampler | Samples | Average (ms) | Median (ms) | p95 (ms) | Req/s | Error % |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | PERF-01 GET campus events | 10 | 14.30 | 10.00 | 52.00 | 2.06 | 0.00 |
| 1 | PERF-02 GET API health control | 10 | 1.80 | 2.00 | 2.00 | 2.08 | 0.00 |
| 1 | Total | 20 | 8.05 | 3.50 | 50.35 | 3.91 | 0.00 |
| 5 | PERF-01 GET campus events | 100 | 7.11 | 7.00 | 12.95 | 7.15 | 0.00 |
| 5 | PERF-02 GET API health control | 100 | 1.37 | 1.00 | 2.00 | 7.16 | 0.00 |
| 5 | Total | 200 | 4.24 | 3.00 | 10.95 | 14.04 | 0.00 |
| 10 | PERF-01 GET campus events | 200 | 6.03 | 6.00 | 10.00 | 13.80 | 0.00 |
| 10 | PERF-02 GET API health control | 200 | 1.16 | 1.00 | 2.00 | 13.82 | 0.00 |
| 10 | Total | 400 | 3.59 | 2.50 | 8.00 | 27.11 | 0.00 |
| 20 | PERF-01 GET campus events | 400 | 6.70 | 6.00 | 14.00 | 27.14 | 0.00 |
| 20 | PERF-02 GET API health control | 400 | 1.60 | 1.00 | 3.95 | 27.17 | 0.00 |
| 20 | Total | 800 | 4.15 | 3.00 | 11.00 | 53.34 | 0.00 |

All **1,420 samples** returned HTTP 200 and passed the response assertions. Every planned stage completed. The Windows host had 12 logical processors and about 7.65 GiB of RAM. The wrapper checked host resources once per second. It used a 90-second stage limit and abort limits of 512 MiB available RAM and 95% CPU for five consecutive readings. Peak sampled host CPU was 61.3% and minimum sampled available memory was 589 MiB. No abort limit was reached. The JMeter plan stops on a failed sample.

The 1-user events p95 is based on 10 requests and is sensitive to the slowest sample. Later stages ran against an already exercised fixture, and the measurements characterize this local run. Agreement on QR-02 performance thresholds remains pending.

### Performance evidence

- [Four JTLs, JMeter logs, console transcripts and HTML dashboards](../evidence/section-3.7/jmeter-20261124-120314/)
- Dashboards by load level [1 user](../evidence/section-3.7/jmeter-20261124-120314/users-1-dashboard/index.html), [5 users](../evidence/section-3.7/jmeter-20261124-120314/users-5-dashboard/index.html), [10 users](../evidence/section-3.7/jmeter-20261124-120314/users-10-dashboard/index.html), [20 users](../evidence/section-3.7/jmeter-20261124-120314/users-20-dashboard/index.html)
- [Machine-readable summary](../evidence/section-3.7/jmeter-20261124-120314/summary.json) and [independent sample and cleanup verification](../evidence/section-3.7/jmeter-20261124-120314/verification.txt)

The wrapper confirmed the live preflight but missed saving its fixture transcript. The earlier [single-request preflight](../evidence/section-3.7/preflight.txt) comes from a separate run. Independent post-run checks confirmed that the fixture ports closed and the disposable MongoDB directory was removed.

### Install and run on Windows

1. Install the Eclipse Temurin **17 LTS Windows x64 JDK** via its MSI, selecting the options to update PATH and set `JAVA_HOME`. Open a fresh PowerShell session and run `java -version`. [Eclipse Temurin JDK downloads](https://adoptium.net/temurin/releases/?os=windows&arch=x64&package=jdk&version=17)
2. Download and verify the Apache JMeter 5.6.3 binary ZIP using Apache's signature and SHA-512 instructions. Extract the ZIP to `C:\tools\apache-jmeter-5.6.3` and run `& 'C:\tools\apache-jmeter-5.6.3\bin\jmeter.bat' -v`. [Apache JMeter downloads](https://jmeter.apache.org/download_jmeter.cgi)
3. Open PowerShell in the SQA checkout. With Node and MongoDB installed locally, run the following. Adjust the `mongod.exe` path to your installation. Leave the runner open once preflight passes.

```powershell
npm.cmd ci --prefix backend
if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed' }
$env:EC4206_MONGOD = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe'
node backend/testing/section-3.7/run.cjs serve
```

4. From a second PowerShell window in the SQA checkout, run the four stages in order. The script stops if a stage fails or has missing or failed samples. Stop the load if the local machine becomes unresponsive or saturated, then review the last stage before proceeding.

```powershell
$jmeter = 'C:\tools\apache-jmeter-5.6.3\bin\jmeter.bat'
$plan = 'backend/testing/section-3.7/campus-read-only.jmx'
$run = Join-Path 'testing-documentation/evidence/section-3.7' ('jmeter-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $run -ErrorAction Stop | Out-Null
$stages = @(
  @{ Users = 1; Ramp = 1; Loops = 10 }
  @{ Users = 5; Ramp = 5; Loops = 20 }
  @{ Users = 10; Ramp = 5; Loops = 20 }
  @{ Users = 20; Ramp = 5; Loops = 20 }
)
foreach ($stage in $stages) {
  $name = 'users-' + $stage.Users
  $jtl = Join-Path $run "$name.jtl"
  $log = Join-Path $run "$name.log"
  $dashboard = Join-Path $run "$name-dashboard"
  & $jmeter -n -t $plan "-Jusers=$($stage.Users)" "-Jramp=$($stage.Ramp)" "-Jloops=$($stage.Loops)" -l $jtl -j $log -e -o $dashboard
  if ($LASTEXITCODE -ne 0) { throw "JMeter failed at $name" }
  $samples = @(Import-Csv -LiteralPath $jtl)
  if ($samples.Count -ne (2 * $stage.Users * $stage.Loops) -or ($samples | Where-Object success -ne 'true')) {
    throw "Unexpected sample count or errors at $name. Review the JTL and JMeter log."
  }
}
```

5. Press Ctrl+C in the fixture runner. For each completed stage open `users-N-dashboard/index.html` and copy the per-sampler Statistics rows into the report. Record samples, average and p95 in milliseconds, throughput in requests per second and Error %. Keep raw JTL rows for per-request elapsed time and thread counts, and use the dashboard's active threads view to verify achieved concurrency. Preserve the JTL, JMeter log and dashboard under the timestamped evidence directory. Record machine configuration and any stopped stage alongside the metrics. [JMeter dashboard documentation](https://jmeter.apache.org/usermanual/generating-dashboard.html)

## Security

The selected category is **OWASP A01:2025 Broken Access Control**. The Express middleware requires a valid session for campus locations and an administrator role for event writes. SEC-07 and SEC-08 also check ordinary schema and path input validation. [OWASP A01:2025](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/)

| ID | Actor and request | Expected response | Observed response and persistence | Result |
|---|---|---|---|---|
| SEC-01 | Anonymous `GET /api/locations` | 401 | 401, events unchanged | Pass |
| SEC-02 | Student `GET /api/locations` | 200 with seeded location | 200 with seeded location, events unchanged | Pass |
| SEC-03 | Administrator `GET /api/locations` | 200 with seeded location | 200 with seeded location, events unchanged | Pass |
| SEC-04 | Anonymous `POST /api/events` with valid fixture fields | 401 and no write | 401, events unchanged | Pass |
| SEC-05 | Student `POST /api/events` with valid fixture fields | 403 and no write | 403, events unchanged | Pass |
| SEC-06 | Administrator `POST /api/events` with valid fixture fields | 201 and one new matching event | 201, one matching event added, existing events unchanged | Pass |
| SEC-07 | Administrator `POST /api/events` with date `not-a-date` | 400 and no write | 400, events unchanged | Pass |
| SEC-08 | Administrator `PUT /api/events/invalid-id` with ordinary text | 400 and no write | 400, events unchanged | Pass |

The runner compares complete sorted event documents before and after each request. The authorization and validation assertions found no defects in these paths. Coverage is limited to the listed endpoints, roles and inputs. Injection resistance, account ownership boundaries, and other routes remain outside these results. The security evidence omits the disposable passwords and session tokens.

## Usability checklist

| ID | Browser task and observable criterion | Observation | Evidence |
|---|---|---|---|
| USE-01 | Submit the registration form and reach login | The synthetic registration opened the login page | [Login after registration](../evidence/section-3.7/browser/USE-01.png) |
| USE-02 | Submit an incorrect password and see correction feedback | “Invalid email or password” appeared and the login page stayed open | [Login feedback](../evidence/section-3.7/browser/USE-02.png) |
| USE-03 | Sign in and locate the campus map entry | The student dashboard opened with a campus map link | [Dashboard](../evidence/section-3.7/browser/USE-03.png) |
| USE-04 | Open Campus Map and search for matching and nonmatching terms | “No matching records available.” appeared for a nonmatch. “main library” restored the seeded result | [Matching result](../evidence/section-3.7/browser/USE-04.png) |
| USE-05 | Ask the assistant about library hours | The transcript showed the fixture's 09:15–17:45 library hours | [Assistant transcript](../evidence/section-3.7/browser/USE-05.png) |

These were automated Chrome checks at a desktop viewport. The initial run timed out on USE-03 after the failed-login scenario. The harness was changed to open a fresh login page before each attempt, and all five checks passed on rerun. Same-page recovery after a rejected login still needs a dedicated check. The initial timeout did not establish an application defect.

Suggested improvements to evaluate with participants include a clear-search action and a recovery hint when there are no matches. For registration, test whether users notice confirmation before the redirect. Human task completion, time on task, user feedback, mobile layouts, keyboard-only operation and assistive technology remain unassessed. A human session can reuse USE-01 through USE-05 as prompts and record actual observations separately.

## Reproduction and closure

From the checkout root, install both locked dependency sets with `npm.cmd ci` and `npm.cmd ci --prefix backend`, set `EC4206_MONGOD` as above, then run `node backend/testing/section-3.7/run.cjs security`, `node backend/testing/section-3.7/run.cjs ui` and `node backend/testing/section-3.7/run.cjs regression`. For the browser run, install Chrome and a compatible ChromeDriver. Set `CHROME_BIN` and `CHROMEDRIVER_PATH` to their full executable paths to use existing binaries. The UI command writes five PNGs to the browser evidence directory.

The [traceability matrix](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix) links the new IDs to existing requirements. TC-001 passed by user confirmation. TC-005 has a partial login observation, and its formal status is Not Run. The other 34 manual cases remain Not Run. The new catalogue run verified the case-insensitive search and API interruption recovery in Chrome. [Automated catalogue results](EC4206_Automated_Execution_Results.md) The measured JMeter stages are complete. TC-034 requires agreed per-endpoint limits and workload. TC-035 requires a peer keyboard-only session with dated observations. This section reports local measurements and observations.
