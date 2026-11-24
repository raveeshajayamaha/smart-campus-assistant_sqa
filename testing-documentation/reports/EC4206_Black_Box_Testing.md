# EC4206 Section 3.3 — Black-Box Testing

## Scope and approach

This section evaluates observable HTTP behaviour for account registration, assistant input validation and administrator access. Test inputs and expected results were derived from [registration](../../backend/routes/authRoutes.js), [chat validation](../../backend/routes/assistantRoutes.js), [session and role checks](../../backend/middleware/auth.js) and [resource routes](../../backend/routes/resourceRoutes.js). Assertions use response status, JSON and public event listings. Direct database operations prepare the administrator and expired-session fixtures and remove records created by the suite.

## Execution environment and reproducibility

- Windows PowerShell, Node.js 25.6.0 and existing Express, Mongoose and local MongoDB dependencies.
- Express binds to an ephemeral port on loopback. The suite requires a single local MongoDB endpoint, sets a random database name beginning with `campus_blackbox_test_` and verifies the connection target. It uses synthetic accounts and removes its tracked fixtures without dropping the database. Empty collections and indexes may remain.
- The [automated suite](../../backend/tests/black-box.test.js) uses the built-in Node test runner, strict assertions and native fetch. Run from the repository root and compare the output with the [recorded TAP evidence](../evidence/EC4206_Black_Box_Test_Run.tap).

```powershell
node --test --test-reporter=tap backend/tests/black-box.test.js
```

### Response labels used in the tables

- **Registration validation** means `Provide name, valid email and a password of 6 to 72 characters`.
- **Chat validation** means `Enter a message of 1 to 2000 characters`.
- **Inactive session** means `Session expired. Please log in again`.

## 1. Equivalence partitioning

For email, submit each representative to `POST /api/auth/register` with the same valid name and password. Before testing the duplicate class, register `blackbox-student@example.test`. The application trims input, checks its email pattern, and compares existing emails without case sensitivity. For chat, log in as the fixture student, keep the locations collection empty, then send each representative as the JSON `message` to `POST /api/assistant/chat`.

These classes separate accepted inputs, invalid types and invalid content. Email values rejected after the same format check are represented by malformed and trimmed-blank examples. The length-related partitions are exercised in Section 2.

| Test ID | Requirement | Class | Representative input | Expected result | Actual result | Status |
|---|---|---|---|---|---|---|
| BB-EP-01 | FR-01 | Fresh, well-formed string after trimming | `" Fresh@Example.test "` | 201; student account with normalised email | 201; account email was `fresh@example.test` and role was student | Pass |
| BB-EP-02 | FR-01 | Well-formed but already registered | `BLACKBOX-STUDENT@example.test` | 400; duplicate email | 400; `User already exists` | Pass |
| BB-EP-03 | FR-01 | Nonblank string with invalid syntax | `fresh@example` | 400; registration validation | 400; registration validation | Pass |
| BB-EP-04 | FR-01 | Wrong JSON type | Number `42` | 400; registration validation | 400; registration validation | Pass |
| BB-EP-05 | FR-01 | Blank after trimming | Three spaces | 400; registration validation | 400; registration validation | Pass |
| BB-EP-06 | FR-10 | Nonblank string with a supported topic | `What are the library hours?` | 200; missing-data reply for empty locations collection | 200; Library hours section reported no matching information; sources empty | Pass |
| BB-EP-07 | FR-10 | Nonempty string that becomes blank after trimming | Three spaces | 400; chat validation | 400; chat validation | Pass |
| BB-EP-08 | FR-10 | Wrong JSON type | Number `42` | 400; chat validation | 400; chat validation | Pass |

## 2. Boundary value analysis

Registration accepts password lengths **6 through 72 inclusive**. The registration route measures JavaScript string length. This suite uses ASCII, so the number of characters equals the number of UTF-16 code units and UTF-8 bytes. Password-change rules are outside this boundary exercise. Submit each password as repeated `x` with a fresh email and valid name.

Chat accepts nonblank messages with **1 through 2000 inclusive** for the ASCII data below. The upper bound uses raw JavaScript string length, and an independent trim check rejects empty or whitespace-only input. Submit each length as repeated `x` using a valid student session. Accepted messages contain no recognised topic and therefore produce the guidance reply.

| Test ID | Requirement | Field | Boundary position | Length | Expected result | Actual result | Status |
|---|---|---|---|---:|---|---|---|
| BB-BV-01 | FR-01 | Registration password | Below minimum | 5 | 400; registration validation | 400; registration validation | Pass |
| BB-BV-02 | FR-01 | Registration password | Minimum | 6 | 201; registration succeeds | 201; registration succeeds | Pass |
| BB-BV-03 | FR-01 | Registration password | Just above minimum | 7 | 201; registration succeeds | 201; registration succeeds | Pass |
| BB-BV-04 | FR-01 | Registration password | Just below maximum | 71 | 201; registration succeeds | 201; registration succeeds | Pass |
| BB-BV-05 | FR-01 | Registration password | Maximum | 72 | 201; registration succeeds | 201; registration succeeds | Pass |
| BB-BV-06 | FR-01 | Registration password | Above maximum | 73 | 400; registration validation | 400; registration validation | Pass |
| BB-BV-07 | FR-10 | Assistant message | Below minimum | 0 | 400; chat validation | 400; chat validation | Pass |
| BB-BV-08 | FR-10 | Assistant message | Minimum | 1 | 200; guidance reply with no sources | 200; guidance reply with no sources | Pass |
| BB-BV-09 | FR-10 | Assistant message | Just above minimum | 2 | 200; guidance reply with no sources | 200; guidance reply with no sources | Pass |
| BB-BV-10 | FR-10 | Assistant message | Just below maximum | 1999 | 200; guidance reply with no sources | 200; guidance reply with no sources | Pass |
| BB-BV-11 | FR-10 | Assistant message | Maximum | 2000 | 200; guidance reply with no sources | 200; guidance reply with no sources | Pass |
| BB-BV-12 | FR-10 | Assistant message | Above maximum | 2001 | 400; chat validation | 400; chat validation | Pass |

## 3. Decision table for administrator writes

Send a valid event payload to `POST /api/events` under each condition. The payload includes a title unique to the rule, a date of `2030-01-01`, a time of `10:00` and location `Test Hall`. Confirm the result using the public `GET /api/events` listing. The record count in the table is the count for that rule's unique title. FR-03 applies to every rule. FR-02 also applies where session presence, expiry or revocation determines access.

The role is evaluated only after the bearer header and session pass authentication. An expired or revoked student session follows the same rule as the expired or revoked administrator fixture. A session with no associated user follows the inactive-session response and is represented by the no-matching-session class. Expiry is exclusive at the session expiration instant because the lookup requires `expiresAt` to be greater than the current time. This exercise represents expiry with a date in the past.

| Test ID | Bearer header | Session state | Account role | Authenticated | Expected result | Actual result | Status |
|---|---|---|---|---|---|---|---|
| BB-DT-01 | Absent | N/A | N/A | N/A | 401; Please log in; zero records | 401; Please log in; zero records | Pass |
| BB-DT-02 | Malformed | N/A | N/A | N/A | 401; Please log in; zero records | 401; Please log in; zero records | Pass |
| BB-DT-03 | Well formed | No matching session | N/A | N/A | 401; inactive session; zero records | 401; inactive session; zero records | Pass |
| BB-DT-04 | Well formed | Expired | Admin fixture | No | 401; inactive session; zero records | 401; inactive session; zero records | Pass |
| BB-DT-05 | Well formed | Revoked by logout | Admin fixture | No | 401; inactive session; zero records | 401; inactive session; zero records | Pass |
| BB-DT-06 | Well formed | Active | Student | Yes | 403; Administrator access required; zero records | 403; Administrator access required; zero records | Pass |
| BB-DT-07 | Well formed | Active | Administrator | Yes | 201; event created; one record | 201; event created; one record | Pass |

## 4. Results and conclusion

| Technique | Designed | Executed | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|---:|
| Equivalence partitioning | 8 | 8 | 8 | 0 | 0 |
| Boundary value analysis | 12 | 12 | 12 | 0 | 0 |
| Decision table | 7 | 7 | 7 | 0 | 0 |
| Total scenarios | 27 | 27 | 27 | 0 | 0 |

Node reported **28 passed, 0 failed and 0 skipped**, counting the parent test and its 27 subtests. The process exited with code 0. No deviations from the expected results were observed. The previous Step 2 baseline remains 26 passed. The earlier Section 3.2 cases retain their recorded statuses because this run exercised the new BB identifiers.

The suite demonstrated acceptance and rejection across both length ranges and showed that only the active administrator could create an event. These results apply to the tested HTTP inputs and the representative administrator write. Browser form behaviour, other administrator operations and Unicode boundary variants were outside this execution. The [test plan matrix](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix) links the executed IDs to the existing requirements.
