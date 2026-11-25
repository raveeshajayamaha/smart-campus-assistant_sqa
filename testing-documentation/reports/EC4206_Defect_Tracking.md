# EC4206 Section 3.8 — Defect Tracking and Root Cause Analysis

**Project** AI-Powered Smart Campus Assistant  
**Review and retest date** 24 November 2026, Asia/Colombo  
**Scope** Separate SQA checkout, baseline `ee7e5e2`, plus local Section 3.7 test infrastructure.

The evidence supports **three verified defects**. One affected application output, and two affected test infrastructure. Severity reflects the observed impact. Priority is a triage recommendation, with P2 indicating a material quality or assurance gap and P3 indicating a lower-impact improvement.

| Defect | Classification | Requirement and verification | Severity | Priority | Current status |
|---|---|---|---|---|---|
| DEF-001 | Application behaviour | FR-10, TDD-01, TDD-02 and BDD-02 | Minor | P3 | Historical fix verified. Historical assignment and closure unrecorded. |
| DEF-002 | Selenium harness | QR-04, AUTO-01 through AUTO-05 | Major for test execution | P2 | Historical fix verified. Historical assignment and closure unrecorded. |
| DEF-003 | JMeter wrapper and evidence capture | QR-04, PERF-01 and PERF-02 | Moderate for evidence completeness | P2 | Fixed, verified and closed in the local Section 3.8 register. |

## DEF-001 — Empty event catalogue announces a list with no entries

- **Environment** Node.js 25.6.0 on Windows. The pre-fix formatter behaviour is visible in the assistant route at `9baa995`. The historical Red case used an empty array. The BDD validation used a disposable local MongoDB database.
- **Reproduction** Supply an empty array to the pre-fix fallback formatter and run TDD-01 with the Node test runner. The equivalent application scenario is a synthetic student asking “What events are coming up?” through `POST /api/assistant/chat` when both event queries return no records. The recorded Red failure was at formatter level.
- **Expected** The reply contains the Events heading and “There are no upcoming events at the moment.” The empty-catalogue API scenario expects an empty sources array.
- **Actual** The Red run produced “There are no upcoming events at the moment, but here are the latest campus events available:” followed by an empty list. TDD-01 failed and the populated-catalogue case passed. The impact was misleading user-facing text.
- **Root cause and fix** The fallback emitted the recent-events introduction unconditionally when the future-events query yielded no results. The corrected helper returns the empty-state message when the recent records array is empty and retains the original historical-event presentation when records exist. [Historical design and implementation](EC4206_TDD_BDD_Testing.md)
- **Retest** Historical Green and Refactor runs each passed 2 of 2 cases. BDD-02 confirmed the fixed API reply and empty sources. A fresh formatter retest passed 2 of 2 in this review. [Red](../evidence/EC4206_TDD_Red.tap), [Green](../evidence/EC4206_TDD_Green.tap), [Refactor](../evidence/EC4206_TDD_Refactor.tap), [Cucumber](../evidence/EC4206_Cucumber_Run.txt), [fresh TAP](../evidence/section-3.8/DEF-001-retest.tap)
- **Current status** Fixed and verified. The record establishes the sequence Red, Green, Refactor and API verification. It contains no contemporaneous assignment or formal closure record.

## DEF-002 — Selenium suite fails to start because the backend import resolves at the wrong depth

- **Environment** Windows, Node.js 25.6.0, Selenium WebDriver 4.41.0 and Chrome 157.0.8103.80 for the historical successful rerun. The startup failure occurred before Chrome started.
- **Reproduction** Anchor Node’s CommonJS resolver to `backend/tests/ui/selenium.test.cjs` and resolve the historical import `../server`. The original suite attempted this import when invoked with `npm.cmd --prefix backend run test:ui`.
- **Expected** The import resolves to `backend/server.js` and the browser tests can start.
- **Actual** The original path resolves relative to `backend/tests/ui`; it would require `backend/tests/server.js`, which is absent. Node raised `MODULE_NOT_FOUND` before a browser session existed. The initial TAP result records a runner failure, and browser screenshots were unavailable for that attempt.
- **Root cause and fix** The relative backend imports used a one-level ascent from a two-level nested test directory. The suite was corrected to import the backend using paths such as `../../server`. The historical report states that the scenario assertions were retained. [Current Selenium suite](../../backend/tests/ui/selenium.test.cjs)
- **Retest** The historical Selenium rerun passed all five scenarios and produced five browser screenshots. The fresh resolver probe reproduced `MODULE_NOT_FOUND` for the original specifier and resolved the corrected specifier to `backend/server.js`. [Initial TAP](../evidence/EC4206_Selenium_Run.tap), [rerun TAP](../evidence/EC4206_Selenium_Rerun.tap), [resolver probe output](../evidence/section-3.8/DEF-002-module-resolution.txt), [representative passing screenshot](../evidence/selenium/AUTO-03-pass.png)
- **Current status** Fixed and verified. Historical assignment and formal closure are unrecorded. A module-resolution check before launching Chrome would provide an earlier failure signal.

## DEF-003 — JMeter wrapper reports success without persisting its fixture transcript

- **Environment** Windows, Node.js 25.6.0, Temurin 17.0.21.1+2, JMeter 5.6.3 and a dedicated MongoDB 8.3 process on loopback. The private wrapper drives the [fixture](../../backend/testing/section-3.7/run.cjs) and the [JMeter plan](../../backend/testing/section-3.7/campus-read-only.jmx).
- **Reproduction** Run the original wrapper against the isolated fixture using one user, a one-second ramp-up and ten loops. After the two samplers finish, inspect the wrapper exit status, the JTL and `fixture.txt` in the replay directory.
- **Expected** A successful run saves 20 samples and a fixture transcript containing MongoDB startup, both HTTP 200 preflight checks and disposable database cleanup.
- **Actual** The original wrapper exited 0 and recorded 20 successful samples. The transcript was absent, reproducing the earlier four-stage evidence gap. The earlier JTLs, logs and measured results remain intact. Independent checks confirmed that the original benchmark fixture had shut down. [Section 3.7 verification](../evidence/section-3.7/jmeter-20261124-120314/verification.txt)
- **Root cause and fix** The write depended on awaiting the forked process’s `close` event after the parent disconnected IPC. The original replay did not reach the evidence write in that shutdown path. The corrected wrapper waits for the process `exit` and for both output streams to finish before writing and checking the transcript. The Node runtime’s internal event behavior was outside the investigation.
- **Retest** The corrected replay exited 0, recorded 20 successful samples and saved the transcript with preflight and cleanup. The original and corrected runs used the same load settings. They are focused evidence-capture checks and do not replace or extend the reported 1,420-sample benchmark. [Before-and-after replay](../evidence/section-3.8/DEF-003-replay.txt)
- **Current status** Closed in the local register following verification. The implemented correction is in the checkout-local wrapper under the ignored tool directory. The issue draft records the code change for reuse after dependency reinstalls. [Timestamped lifecycle](../evidence/section-3.8/DEF-003-lifecycle.txt)

## Root cause analysis using Five Whys

| Question | DEF-001 — Empty event reply | DEF-003 — Missing benchmark transcript |
|---|---|---|
| 1. Why was the outcome incorrect? | The reply introduced a recent-event list with no entries. | The benchmark returned success without `fixture.txt`. |
| 2. Why did the output take that form? | The fallback appended a formatted list whose empty input produced an empty string. | The final transcript writer was after a child-process wait that did not complete in the original replay. |
| 3. Why did that condition occur? | The fallback starts when there are no future events and the subsequent recent-event query can also return zero rows. | The parent disconnected IPC and depended solely on the child’s `close` event to continue. |
| 4. Why did the implementation fail to handle it? | The fallback used one response template for both empty and nonempty recent records. | The wrapper did not explicitly await child exit and draining of both output streams as separate evidence requirements. |
| 5. Why did earlier verification leave the gap? | The historical TDD record shows that the explicit empty-catalogue assertion first failed in Red. | Successful samples and dashboards could be observed independently of the fixture transcript. The original successful exit alone gave an incomplete assurance signal. |

**Corrective actions completed.** DEF-001 gained an explicit empty-state branch and was verified at formatter and API levels. DEF-003 now synchronizes process termination with output capture and was verified with a real JMeter replay.

**Preventive actions.** Retain TDD-01 and BDD-02 as empty-catalogue regression checks. Require both outcome and evidence checks in automation. For JMeter, verify the fixture transcript, its preflight and cleanup markers, JTL counts and dashboards before accepting a benchmark evidence package. Move the corrected private launcher into maintained test tooling if it is to be reused across machines.

## Lifecycle chronology

DEF-001 and DEF-002 are retrospective reconstructions from genuine execution evidence and source. The underlying failures, corrections and retests are documented above. The records do not establish dates or actors for historical triage, an assignment decision or formal closure.

DEF-003 is a newly recorded local workflow on 24 November 2026. The entries below refer to real local actions in recorded sequence. The closure is a local QA disposition.

| Transition | Time (Asia/Colombo) | Action and evidence |
|---|---|---|
| New | 14:53:21 | Registered the missing transcript observed in the original benchmark. |
| Assigned | 14:53:21 | Codex accepted responsibility as local QA operator for diagnosis and focused correction. |
| Fixed | 14:53:46 | After reproducing the failure, updated the local wrapper to await process exit and stream completion. |
| Verified | 14:54:04 | Confirmed exit 0, 20 successful samples and a saved preflight and cleanup transcript. |
| Closed | 14:54:04 | Recorded local closure after verification. |

[Timestamps and assignment](../evidence/section-3.8/DEF-003-lifecycle.txt) · [Replay output](../evidence/section-3.8/DEF-003-replay.txt)

## Other observed failures and publication status

- The initial Cucumber installation returned `ENOTFOUND`. A subsequent installation succeeded. The evidence establishes a DNS or network resolution failure during installation. It does not establish a defect in the application or Cucumber. [Failed install](../evidence/EC4206_Cucumber_Install.txt), [successful retry](../evidence/EC4206_Cucumber_Install_Retry.txt)
- The initial Section 3.7 browser run timed out on USE-03. A rerun passed after reopening the login page between attempts. The timeout has insufficient evidence for a same-page application defect or a specific underlying harness cause. A dedicated same-page retry scenario remains pending. [Initial run](../evidence/section-3.7/ui-first-run.txt), [rerun](../evidence/section-3.7/ui.txt)
- Java and JMeter availability was an environment prerequisite. Verified portable tools enabled the completed run. GitHub-hosted workflow status remains outside this local defect review. [Toolchain log](../evidence/section-3.7/toolchain.txt)
- Git confirmed the readable SQA remote as `raveeshajayamaha/smart-campus-assistant_sqa`. GitHub CLI reported no authenticated account, so issue-writing access and available labels could not be confirmed. [Target SQA repository](https://github.com/raveeshajayamaha/smart-campus-assistant_sqa)

The issue drafts cover [DEF-001](github-issues/DEF-001.md), [DEF-002](github-issues/DEF-002.md) and [DEF-003](github-issues/DEF-003.md). To publish, obtain approval and authenticate a GitHub account with SQA issue access, confirm Issues and the proposed labels, then open only the approved drafts in the SQA repository and attach the cited local evidence where needed. Record the resulting issue URLs. GitHub issue closure requires separate approval. The [traceability matrix](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix) links the defect IDs. The 32 newly executed catalogue cases passed, yielding no new failure to triage. The earlier login retry investigation and historical defect publication status are tracked separately. [Automated catalogue results](EC4206_Automated_Execution_Results.md)
