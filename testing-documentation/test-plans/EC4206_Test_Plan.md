# EC4206 Section 3.1 — Introduction and Test Planning

**Project** — AI-Powered Smart Campus Assistant  
**Document status** — Proposed group test plan. Section 7 records the confirmed Step 2 baseline.

## 1. Introduction and software under test

The Smart Campus Assistant is a web application that gives students access to campus information and gives administrators a common interface for maintaining that information. Students can browse campus records or ask questions through a chat interface. The assistant uses deterministic keyword matching and data from MongoDB. This makes it possible to test its responses against known campus records.

| Layer | Implementation and responsibilities |
|---|---|
| Presentation | React and TypeScript with Vite. `src/App.tsx` defines public, authenticated and administrator routes. `src/pages/` contains the home page, account forms, dashboards, campus pages, profile and assistant. |
| Client integration | `src/components/ProtectedRoute.tsx` verifies the session through the API. `src/lib/api.ts` sends requests to relative `/api` URLs, and Vite proxies them to Express in development. |
| Service | Node.js and Express in `backend/server.js`. The routes implement account operations, campus record management and chat. Shared middleware verifies bearer sessions and administrator permissions. |
| Persistence | Mongoose connects to MongoDB through `backend/config/db.js`. Models cover users, sessions, events, announcements, schedules, library resources and campus locations. Passwords are hashed with bcrypt, and stored session tokens are represented by SHA-256 hashes. |

## 2. Objectives and scope

The objectives are to verify that campus information is accurate against controlled fixtures, confirm that only authorised users can perform protected actions, check that updates persist across requests, and establish repeatable regression evidence. The group will also evaluate the clarity of the main student and administrator workflows and measure selected performance and maintainability properties.

**In scope**

- Public home and navigation, registration, login, identity checks, logout, session expiry, and student and administrator permissions.
- Own-profile editing and password changes, including validation, persistence and session revocation.
- Student dashboard, search and display for events, announcements, academic schedules, library resources and campus locations. The events API supports public reads. The other four campus collections require authentication for reads.
- Administrator creation, reading, updating and deletion of all five campus record types.
- Authenticated, rule-based chat, including topic matching, relevant records, dates, response limits and fallback messages.
- API responses, MongoDB integration, and selected interaction, reliability, security and performance checks in a disposable test environment.

**Out of scope**

- External language models, real-time maps, individual course enrolment, event booking, uploads, password recovery and conversation persistence.
- Production deployment acceptance, production load testing, institutional data certification and formal ISO conformity assessment.

## 3. ISO/IEC 25010 product quality attributes

This plan uses ISO/IEC 25010:2023. The characteristics below are applied to the implemented system and used to define evidence for evaluation. [ISO/IEC 25010:2023 product quality model](https://www.iso.org/standard/78176.html)

| Characteristic | Application and planned evidence |
|---|---|
| Functional suitability | Compare assistant answers and campus page values with the same MongoDB fixture. Check that record changes persist and are visible to students. |
| Performance efficiency | Measure p95 response time, throughput and error rate for event listing and assistant queries with controlled data volume and concurrency. |
| Compatibility | Confirm that the React client and Express API exchange the expected JSON and status codes through the Vite proxy. |
| Interaction capability | Observe whether a student can find library hours and whether an administrator can correct an invalid schedule using keyboard controls and visible feedback. |
| Reliability | Check whether the UI reports an API interruption and recovers after service is restored. Check that rejected updates preserve stored data. |
| Security | Verify login, session expiry and revocation, own-profile access and server-side enforcement of administrator permissions. Check that public responses omit password hashes and stored session details. |
| Maintainability | Review and measure coverage of authentication and resource validation branches. Use lint and planned SonarQube analysis to examine code issues and duplication. |
| Flexibility | Review whether the API can run against a separate database through configuration and whether the frontend can be built and served with the expected API proxy. |
| Safety | Emergency functions are outside the application scope. Review the assistant's fallback for unavailable campus information so an absent record does not yield invented directions or hours. This is a limited check of the risk of misleading information. |

## 4. Test strategy, levels and types

Use a risk-based approach. Run authentication, administrator authorisation, password changes and database integrity checks first. Follow with assistant correctness and student interaction checks. Execute cases with synthetic records and separate student and administrator accounts.

| Level | Approach |
|---|---|
| Static verification | Review routes, models, interface contracts and test cases. Use ESLint, the TypeScript/Vite build and planned SonarQube analysis. |
| Unit or component | Plan targeted checks of validation branches and React loading, empty and error states. A standalone component suite was not identified in the baseline. |
| Integration | Reuse the Node test runner, assertions and HTTP requests in `backend/tests/api.test.js`, `profile.test.js` and `password.test.js`. These exercise Express and real MongoDB using separately named test databases. |
| System | Run selected browser workflows across React, Express and MongoDB. The existing `backend/tests/browser-smoke.cjs` is a candidate for a later authorised run. |
| Acceptance | Ask a peer acting as a student or administrator to complete a representative task and assess the outcome against agreed acceptance criteria. |

Apply black-box equivalence partitioning and boundary value analysis to input lengths and schedule times. Use a decision table for anonymous, student and administrator access. Use white-box branch analysis for session handling and resource validation. Include positive, negative, regression, interaction, reliability, defensive security and performance checks. Write the library-hours workflow as a Given/When/Then scenario. If an approved change is made later, retain failing and passing test output and the final refactor result as TDD evidence.

## 5. Verification and validation

**Verification** checks the implementation against specified requirements. For example, inspect the Express middleware and execute an API test showing that a student cannot change a campus location and receives HTTP 403. A successful build verifies that the source compiles and bundles under the tested configuration.

**Validation** checks whether the application meets a user's actual need. For example, after an administrator updates library hours, ask a peer acting as a student to find the new hours through the locations page and the assistant. Observe whether the peer can find and understand the answer without guidance. The two activities provide evidence about implementation correctness and usefulness, respectively.

## 6. Environment, tools and test data

| Item | Configuration or use |
|---|---|
| Local baseline | Windows PowerShell, Node.js 25.6.0 and npm 11.8.0 as observed in the workspace. Record versions and the Git revision for each future execution. |
| Services | Vite on localhost port 5173 and Express on port 5000. Use the existing local MongoDB configuration with a disposable database. Keep `MONGO_URI` private. Use `MONGO_DB_NAME` to select an isolated database where appropriate. |
| Existing tools | Node test runner, strict assertions, native fetch, ESLint, TypeScript, Vite, Chrome DevTools Protocol smoke script and manual examples in `backend/test.http`. |
| Proposed tools | SonarQube for static analysis, a load tool such as k6, and a CI runner with an isolated MongoDB service, subject to group approval and availability. |
| Data and evidence | Use synthetic accounts and campus records, known expected values, and dates interpreted in Asia/Colombo where relevant. Use disposable fixtures for writes and failure tests. Remove credentials and personal data from logs and screenshots. |

## 7. Confirmed Step 2 baseline

| Executed check | Confirmed result |
|---|---|
| Local MongoDB read-only ping and Express startup | MongoDB responded and Express connected to a separate verification database. |
| Frontend, backend and proxy HTTP checks | HTTP 200 from `http://localhost:5173/`, `http://localhost:5000/api/test` and `http://localhost:5173/api/test`. The frontend served entry HTML, and the API checks returned success JSON. |
| `npm.cmd --prefix backend test` | **26 passed, 0 failed, 0 skipped**, counting parent tests and subtests as reported by Node. |
| `npm.cmd run lint` | Exit code 0 with no diagnostics. |
| `npm.cmd run build` | Exit code 0. TypeScript and Vite produced the production build. |

This historical baseline established API regression and HTTP availability. Later evidence includes browser execution, local branch coverage, bounded load measurement and hosted SonarQube analysis. The matrix records current catalogue outcomes.

## 8. Requirements-to-test traceability matrix

The requirements below are derived from implemented behaviour and the proposed quality objectives. H means high priority and M means medium priority. [Manual results](../test-cases/EC4206_Manual_Execution_Results.csv) record TC-001 as Passed and TC-005 as a partial observation with status Not Run. [Automated results](../reports/EC4206_Automated_Execution_Results.md) record a separate catalogue run. The separate BB IDs link to the [Section 3.3 execution report](../reports/EC4206_Black_Box_Testing.md) and passed in that run. The WB IDs link to the [Section 3.4 execution and coverage report](../reports/EC4206_White_Box_Testing.md) and passed in the focused run. The last two columns distinguish manual records from automated catalogue outcomes. TDD-01 and TDD-02 passed after the fix. BDD-01 and BDD-02 passed in Cucumber. See the [Section 3.5 report](../reports/EC4206_TDD_BDD_Testing.md) for the TDD and BDD execution evidence. AUTO-01 through AUTO-05 passed in the local Selenium run. See the [Section 3.6 report](../reports/EC4206_Automation_CICD.md) for results and screenshots. See the [STLC report](../reports/EC4206_STLC.md#coverage-and-remaining-gaps) for remaining gaps.

| Requirement ID and expected behaviour | Case IDs and execution references | Priority | Baseline reference | Manual status | Automated catalogue status |
|---|---|---|---|---|---|
| FR-01 Registration creates student accounts | TC-001, TC-002, TC-003, TC-004, BB-EP-01, BB-EP-02, BB-EP-03, BB-EP-04, BB-EP-05, BB-BV-01, BB-BV-02, BB-BV-03, BB-BV-04, BB-BV-05, BB-BV-06, USE-01 | H | API suite | TC-001 Passed; TC-002–004 Not Run | TC-002–004 Pass |
| FR-02 Login and logout control access | TC-005, TC-006, TC-007, TC-008, TC-009, BB-DT-01, BB-DT-02, BB-DT-03, BB-DT-04, BB-DT-05, WB-01, WB-02, WB-03, WB-04, WB-05, WB-06, WB-07, WB-08, WB-09, AUTO-01, AUTO-02, AUTO-03, SEC-01, SEC-02, SEC-03, USE-02, USE-03 | H | API suite | TC-005 partial observation; TC-005–009 Not Run | TC-005–009 Pass |
| FR-03 Administrator writes require permission | TC-010, TC-011, BB-DT-01, BB-DT-02, BB-DT-03, BB-DT-04, BB-DT-05, BB-DT-06, BB-DT-07, AUTO-04, SEC-04, SEC-05, SEC-06 | H | API suite | Not Run | TC-010–011 Pass |
| FR-04 Users can update their own profile | TC-012, TC-013, TC-014 | H | Profile suite | Not Run | TC-012–014 Pass |
| FR-05 Password changes revoke sessions | TC-015, TC-016, TC-017, TC-018 | H | Password suite | Not Run | TC-015–018 Pass |
| FR-06 Administrator changes persist across all five campus collections | TC-019, TC-020, TC-021, TC-022, TC-023, TC-024, BDD-01, SEC-06, SEC-07, SEC-08 | H | API suite | Not Run | TC-019–024 Pass |
| FR-07 Schedule times are validated | TC-025 | H | API suite | Not Run | TC-025 Pass |
| FR-08 Campus pages display and filter records | TC-026, TC-027, BDD-01, AUTO-03, USE-04 | M | Browser script available | Not Run | TC-026–027 Pass |
| FR-09 Assistant answers from current campus data | TC-028, TC-029, TDD-02, BDD-01, AUTO-05, USE-05 | H | API suite covers assistant lookup | Not Run | TC-028–029 Pass |
| FR-10 Assistant validates input and handles missing data | TC-030, TC-031, TC-032, BB-EP-06, BB-EP-07, BB-EP-08, BB-BV-07, BB-BV-08, BB-BV-09, BB-BV-10, BB-BV-11, BB-BV-12, TDD-01, BDD-02, DEF-001 | M | API suite covers missing data | Not Run | TC-030–032 Pass |
| QR-01 Student workflow recovers from a service interruption | TC-033 | H | None recorded | Not Run | TC-033 Pass |
| QR-02 Selected endpoints meet agreed performance thresholds | TC-034, PERF-01, PERF-02 | M | JMeter localhost run at 1, 5, 10 and 20 users | Not Run | TC-034 Blocked (approved targets and workload) |
| QR-03 Campus tasks can be completed using keyboard controls | TC-035 | M | None recorded | Not Run | TC-035 Blocked (peer evaluation) |
| QR-04 Quality checks give repeatable results | TC-036, DEF-002, DEF-003 | M | Lint, build, backend regression coverage and SonarQube Cloud Quality Gate passed on `main` at `1bd7b42` | Not Run | TC-036 Blocked (local checks passed; fresh hosted scan pending) |

Section 3.7 IDs link to the [performance, security and usability report](../reports/EC4206_Performance_Security_Usability.md). SEC-01 through SEC-08 and USE-01 through USE-05 passed in the local execution. PERF-01 and PERF-02 completed all four JMeter stages with 1,420 successful samples and zero errors. Assessment against QR-02 response-time and throughput thresholds is pending agreement on those thresholds. The Manual status column tracks the 36 manual cases.

Section 3.8 defects are documented in the [defect register](../reports/EC4206_Defect_Tracking.md). DEF-001 and DEF-002 are historical fixes verified by existing evidence and focused checks. DEF-003 was reproduced, corrected, verified and closed in the local register.

Section 3.9 records 66 passing backend regression tests and local Node coverage of 98.13% lines, 94.76% branches and 87.93% functions across 15 runtime files. Frontend coverage remains Not Measured. SonarQube Cloud passed its Quality Gate on `main` at `1bd7b42`, with 0 new issues and 61.5% overall project coverage. The result is automated evidence for QR-04. [Hosted API evidence](../evidence/section-3.9/hosted-analysis-1bd7b42.json). See the [quality metrics report](../reports/EC4206_SonarQube_Quality_Metrics.md).

Section 3.10 synthesises existing evidence for the library-hours workflow (FR-06, FR-08 and FR-09 via BDD-01 and AUTO-05), the empty-catalogue fallback (FR-10 via TDD-01, TDD-02 and BDD-02), and repeatable quality checks (QR-04 via hosted CI and SonarQube). The [case study](../reports/EC4206_Case_Study_Best_Practices.md) records the limits of this evidence. Human usability evaluation remains Not Run. TC-028 additionally verified the complete browser update workflow.

## 9. Roles, responsibilities and adjustable schedule

Assign work by role once the group confirms availability. For a four-person group, each person can lead one role and review another person's evidence. Smaller groups can combine roles and retain peer review.

| Role | Responsibility |
|---|---|
| Test coordinator | Own the scope, priorities, traceability matrix, criteria and closure report. Coordinate defect triage. |
| Backend and data tester | Prepare disposable data and lead API, persistence, session and role checks. |
| Frontend and acceptance tester | Design and execute browser and usability cases. Collect sanitised evidence and lead the library-hours case study. |
| Automation and quality tester | Maintain regression execution, CI proposals, performance measurements and SonarQube evidence. |

| Relative window | Work and milestone |
|---|---|
| Working days 1–2 | Review the plan, baseline and scope. Assign owners and confirm acceptance and performance criteria. |
| Working days 3–4 | Prepare fixtures and detailed cases. Review test oracles, access rules and branch coverage targets. |
| Working days 5–7 | Execute priority integration, UI, acceptance and reliability cases. Record and triage defects. |
| Working days 8–9 | Run approved performance, automation and static analysis activities. Retest defects and rerun related cases. |
| Working day 10 | Review results, remaining risks, traceability and the case study. Submit the closure summary and evidence index. |

The windows are estimates from the group's agreed start. Day 9 can absorb limited retesting. If environment setup slips, defer medium-priority work only with group agreement and document the coverage impact.

## 10. Entry and exit criteria

**Entry criteria**

- The group agrees on scope, expected outcomes, priorities, case owners and any performance or quality thresholds before execution.
- The revision, tools, database and account roles are recorded. Isolated fixtures are available, and baseline evidence can be reproduced.
- Each selected case has prerequisites, steps, input and an expected result.

**Exit criteria**

- All high-priority cases have an execution result and pass after any required retest. No critical or high-severity defects remain open.
- All selected cases have a recorded outcome or a documented reason for deferral. Results and defects link back to the matrix.
- Regression checks complete successfully. Performance and static-analysis results are evaluated against agreed criteria, with deviations documented.
- The group reviews the closure report, evidence index and case study. Any residual risks and deferred cases are recorded with an owner.

## 11. Risks and assumptions

| Risk or assumption | Response |
|---|---|
| Shared or important MongoDB data could be affected by write tests. | Use disposable database names and synthetic records. Verify the database target before writes. |
| Date-sensitive data may expire and change assistant results. | Use controlled date fixtures, record the reference time and apply the Asia/Colombo timezone where the application does. |
| A Chrome path or a port conflict may block browser execution. | Verify browser availability and expected ports before the browser session. Record blocked cases and use manual evidence where suitable. |
| Local performance figures depend on machine and data volume. | Record hardware context, fixture size, concurrency and repeated runs. Treat findings as specific to the test environment. |
| No independent product specification was supplied for this section. | Review source-derived requirements with the group and distinguish verified behaviour from proposed acceptance criteria. |

## 12. Deliverables

- Approved test plan and requirements-to-test traceability matrix.
- Detailed test cases, fixtures and instructions needed to reproduce the runs.
- Execution log with commands, revision, environment, results and sanitised screenshots where captured.
- Defect register with severity, ownership, reproduction details, retest and closure evidence.
- Regression output, coverage or branch analysis, CI results, performance measurements and SonarQube evidence as completed.
- Library-hours case study and closure report with totals, deviations, remaining risks and group contributions.
