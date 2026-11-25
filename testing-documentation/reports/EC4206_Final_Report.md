# EC4206 final test report

**System:** Smart Campus Assistant. **Repository:** `raveeshajayamaha/smart-campus-assistant_sqa`. **Test date:** 25 November 2026. **Application revision:** `1bd7b42648c07b92dbcd5a561dd2019b27a54bad`.

## Results and test scope

The system provides synthetic campus events, announcements, schedules, library resources and locations to students and administrators. It uses a React/Vite frontend, Express API and MongoDB. The team derived requirements from the application and documented acceptance criteria, fixtures and expected results in a 36-case catalogue. The local catalogue run used isolated synthetic data, real HTTP calls, headless Chrome and case-specific assertions. [Test plan and traceability](../test-plans/EC4206_Test_Plan.md) · [Catalogue](../test-cases/EC4206_Test_Cases.md)

| Evidence set | Confirmed result | Remaining work |
|---|---|---|
| Manual catalogue | 1 passed by user confirmation (TC-001), 35 Not Run. TC-005 has a genuine partial student login observation. | Detailed registration API assertions and original screenshot were not supplied. TC-005 token and identity verification remain open. Complete further manual cases if required by the brief. [Manual CSV](../test-cases/EC4206_Manual_Execution_Results.csv) |
| New automated catalogue | 32 passed, 0 failed. TC-002 through TC-033 ran as 27 API cases and five browser cases. | TC-034, TC-035 and full TC-036 remain blocked. [Case mapping and results](EC4206_Automated_Execution_Results.md) |
| Existing automated reruns | Node 66 passed, Cucumber 2 scenarios and 9 steps passed, Selenium 5 workflow subtests passed, and lint and build exited 0. | Counts use each tool’s reporting units and overlap the catalogue. [Suite outputs](EC4206_Automated_Execution_Results.md#existing-suite-reruns) |
| Historical hosted verification | Both jobs and the SonarQube Quality Gate passed at `1bd7b426` in the saved hosted record. | Fresh matching hosted analysis and authenticated screenshots remain pending. [Hosted API capture](../evidence/section-3.9/hosted-analysis-1bd7b42.json) · [Actions run](https://github.com/raveeshajayamaha/smart-campus-assistant_sqa/actions/runs/45426972596) |

## Sections 3.1–3.10

| Section | Findings | Reference |
|---|---|---|
| 3.1 Test planning | Explicit environments, roles, risks, criteria and manual versus automated status for all 14 requirements. | [Plan and matrix](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix) |
| 3.2 STLC and case design | Requirements mapped to 36 fixed IDs. Catalogue runner uses synthetic data, repeatable cleanup and timestamps. | [STLC](EC4206_STLC.md) · [Automated results](EC4206_Automated_Execution_Results.md) |
| 3.3 Black-box | Equivalence partitions, boundary values and role decision table. Focused historical run passed 27 subtests, 28 with parent. | [Black-box](EC4206_Black_Box_Testing.md) |
| 3.4 White-box | Nine focused authentication paths include valid, invalid and expired sessions and error handling. The latest backend regression included them. | [White-box](EC4206_White_Box_Testing.md) |
| 3.5 TDD and BDD | Preserved Red, Green and Refactor evidence. Cucumber passed the library-hours propagation and empty event catalogue cases. | [TDD and BDD](EC4206_TDD_BDD_Testing.md) |
| 3.6 Automation and CI/CD | Browser workflows, hosted verification, backend LCOV and frontend build artifacts. | [Automation and CI/CD](EC4206_Automation_CICD.md) |
| 3.7 Performance, security and usability | Historical JMeter recorded 1,420 samples and zero errors across 1, 5, 10 and 20 users. Eight selected defensive security checks and five usability-oriented scripts passed. Human usability and performance acceptance are outstanding. | [Measurements and limits](EC4206_Performance_Security_Usability.md) |
| 3.8 Defect tracking | Three historical defects have documented retest evidence. The new catalogue run found no additional failing cases. | [Defect register](EC4206_Defect_Tracking.md) |
| 3.9 Quality metrics | Local measured backend coverage was 98.13% lines, 94.76% branches and 87.93% functions across 15 runtime files. Hosted overall coverage was 61.5% with backend LCOV supplied. Frontend test coverage is unmeasured. | [SonarQube and coverage](EC4206_SonarQube_Quality_Metrics.md) |
| 3.10 Case study | TC-028 used separate administrator and student Chrome sessions to show the same revised library hours on both student interfaces. BDD-01 also verified API persistence and source identity. TC-035 requires human task evidence. | [Case study](EC4206_Case_Study_Best_Practices.md) · [TC-028 log](../evidence/catalogue/20261125-061344291/TC-028.txt) |

## SonarQube residual findings

The Quality Gate passed on the archived analyzed revision with five distinct overall findings open. Two have impacts in more than one quality dimension. The successful background task reported one warning and returned an empty public warning-details array. Its text, cause and impact remain unverified. [Issue records and warning details](EC4206_SonarQube_Quality_Metrics.md#open-issues)

| Rule | Finding in archived analysis |
|---|---|
| S5689 | Express can disclose framework version information by default. |
| S8786 | An authentication expression may incur regex backtracking. |
| S7737 | The resource router uses an object literal as a default sort parameter. |
| S9383 | The admin view has a promise without explicit rejection handling. |
| S6845 | The admin view applies `tabIndex` to a noninteractive element. |

## Closure and limitations

Catalogue functional and recovery results meet the scripted expectations. TC-034 requires approved performance workload and per-endpoint acceptance thresholds, TC-035 requires actual peer observation, and TC-036 requires the fresh hosted evidence specified by the execution guide. Browser evidence is scoped to the tested desktop Chrome workflows. The team must review deferred criteria, assess any mandatory manual or external evidence against the assignment brief, and record sign-off. [Submission checklist](EC4206_Submission_Checklist.md)

