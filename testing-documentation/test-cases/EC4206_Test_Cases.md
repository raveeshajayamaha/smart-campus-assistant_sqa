# EC4206 Section 3.2 — Test Case Design

This catalogue defines the original case IDs and expectations. Current manual outcomes are in the [manual CSV](EC4206_Manual_Execution_Results.csv), and the new automated outcomes are in the [automated catalogue report](../reports/EC4206_Automated_Execution_Results.md). The in-case fields preserve the original design baseline.

## Execution conventions and reusable fixtures

- Use a disposable MongoDB database, synthetic accounts and independent fixtures for each case. Restore the fixture state before rerunning a case. Account and record names below are synthetic.
- API paths in the cases are relative to `/api`. Browser paths are relative to the frontend origin. For authenticated requests, use the specified account's bearer token. Send JSON with the appropriate content type unless the case specifies raw input.
- A fixture replacement changes only the stated field. Use the next calendar day in Asia/Colombo for `D`, formatted as YYYY-MM-DD.
- E, events. `{"title":"Robotics Fair","date":"D","time":"10:00 AM","location":"Hall A"}`.
- A, announcements. `{"title":"Registration Notice","description":"Registration opens soon","date":"D","priority":"high"}`.
- S, schedules. `{"subject":"Algorithms","date":"D","startTime":"09:00","endTime":"10:00","location":"Room A"}`.
- L, library. `{"title":"Algorithms Book","type":"Book","description":"Reference text","availability":"Available","location":"Shelf A","link":"https://example.test/book"}`.
- C, locations. `{"name":"Main Library","building":"Central Building","description":"Study area","category":"Library","openingHours":"08:00-18:00","directions":"Ground floor"}`.
- Create/read response keys are event/events, announcement/announcements, schedule/schedules, resource/resources and location/locations.
- The existing [API suite](../../backend/tests/api.test.js), [profile suite](../../backend/tests/profile.test.js), [password suite](../../backend/tests/password.test.js) and [browser script](../../backend/tests/browser-smoke.cjs) provide reference fixtures and checks.

### TC-001 — Register and normalise a new student

- **Test ID** — TC-001
- **Requirement ID** — FR-01
- **Description** — Register and normalise a new student.
- **Preconditions** — Unused email.
- **Test data** — name " Test Student ", email " STUDENT@example.test ", password "CampusDemo123".
- **Execution steps** — POST /auth/register with the supplied fields and inspect user.
- **Expected result** — 201, success true, name "Test Student", email "student@example.test", role student, password field absent.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-002 — Reject duplicate email

- **Test ID** — TC-002
- **Requirement ID** — FR-01
- **Description** — Reject duplicate email.
- **Preconditions** — Existing student@example.test.
- **Test data** — Same name and password, mixed-case email STUDENT@example.test.
- **Execution steps** — POST /auth/register and inspect the response.
- **Expected result** — 400, success false, "User already exists".
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-003 — Check registration password boundaries

- **Test ID** — TC-003
- **Requirement ID** — FR-01
- **Description** — Check registration password boundaries.
- **Preconditions** — Unused email for each attempt.
- **Test data** — Valid name and email, ASCII passwords of lengths 5, 6, 72 and 73.
- **Execution steps** — POST /auth/register separately for each dataset.
- **Expected result** — 5 and 73 return 400 with the registration validation message. 6 and 72 return 201.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-004 — Preserve the student role during registration

- **Test ID** — TC-004
- **Requirement ID** — FR-01
- **Description** — Preserve the student role during registration.
- **Preconditions** — Unused email.
- **Test data** — Valid registration data with role admin.
- **Execution steps** — POST /auth/register and inspect user.role.
- **Expected result** — 201 and user.role is student.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-005 — Sign in and retrieve identity

- **Test ID** — TC-005
- **Requirement ID** — FR-02
- **Description** — Sign in and retrieve identity.
- **Preconditions** — Registered student.
- **Test data** — Valid email and password.
- **Execution steps** — POST /auth/login, then GET /auth/me using the returned token.
- **Expected result** — Both return 200. Login returns a 64-character lowercase hexadecimal token. Identity matches the student account.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-006 — Reject incorrect login credentials

- **Test ID** — TC-006
- **Requirement ID** — FR-02
- **Description** — Reject incorrect login credentials.
- **Preconditions** — Registered student.
- **Test data** — Existing email and incorrect nonempty password.
- **Execution steps** — POST /auth/login and inspect the response.
- **Expected result** — 400, "Invalid email or password", with no token.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-007 — Revoke only the logged-out session

- **Test ID** — TC-007
- **Requirement ID** — FR-02
- **Description** — Revoke only the logged-out session.
- **Preconditions** — Two independent sessions for one student.
- **Test data** — Tokens A and B.
- **Execution steps** — POST /auth/logout using A. GET /auth/me separately with A and B.
- **Expected result** — Logout returns 200 and success true. A returns 401 with the session expiry message. B returns 200.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-008 — Require a valid bearer header

- **Test ID** — TC-008
- **Requirement ID** — FR-02
- **Description** — Require a valid bearer header.
- **Preconditions** — API available.
- **Test data** — No Authorization header, then Bearer short.
- **Execution steps** — GET /auth/me using each header variant.
- **Expected result** — Both return 401, "Please log in".
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-009 — Reject an expired session

- **Test ID** — TC-009
- **Requirement ID** — FR-02
- **Description** — Reject an expired session.
- **Preconditions** — Disposable expired session fixture exists.
- **Test data** — Its correctly formatted token.
- **Execution steps** — GET /auth/me using the expired token.
- **Expected result** — 401, "Session expired. Please log in again".
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-010 — Enforce administrator write permissions

- **Test ID** — TC-010
- **Requirement ID** — FR-03
- **Description** — Enforce administrator write permissions.
- **Preconditions** — Student and admin accounts exist.
- **Test data** — Valid event fixture E, anonymous and both account roles.
- **Execution steps** — POST /events once per role. List events and count created fixture records.
- **Expected result** — Anonymous receives 401, student receives 403 with "Administrator access required", and admin receives 201. Only the admin request creates a record.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-011 — Redirect a student away from the admin dashboard

- **Test ID** — TC-011
- **Requirement ID** — FR-03
- **Description** — Redirect a student away from the admin dashboard.
- **Preconditions** — Signed in as a student.
- **Test data** — Browser URL /admin-dashboard.
- **Execution steps** — Open the URL directly and observe the destination.
- **Expected result** — Browser redirects to /student-dashboard and admin controls are absent.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-012 — Trim and persist own profile updates

- **Test ID** — TC-012
- **Requirement ID** — FR-04
- **Description** — Trim and persist own profile updates.
- **Preconditions** — Signed in as student.
- **Test data** — department " Computing ", contactNumber "+94 770000000".
- **Execution steps** — PUT /auth/profile with both fields. Sign in again and GET /auth/me.
- **Expected result** — Update and identity return 200. Both values persist with whitespace trimmed and no change to account ID, email or role.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-013 — Reject invalid profile fields atomically

- **Test ID** — TC-013
- **Requirement ID** — FR-04
- **Description** — Reject invalid profile fields atomically.
- **Preconditions** — Student with known profile.
- **Test data** — department "New Department", contactNumber "letters".
- **Execution steps** — PUT /auth/profile and re-read identity.
- **Expected result** — 400 with errors.contactNumber. Previously saved department and contact number are preserved.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-014 — Reject fields outside the profile allowlist

- **Test ID** — TC-014
- **Requirement ID** — FR-04
- **Description** — Reject fields outside the profile allowlist.
- **Preconditions** — Student with valid session.
- **Test data** — role admin, name "Changed".
- **Execution steps** — PUT /auth/profile, then GET /auth/me.
- **Expected result** — 400 with the allowed-fields message. Original name and student role are preserved.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-015 — Change password and revoke all own sessions

- **Test ID** — TC-015
- **Requirement ID** — FR-05
- **Description** — Change password and revoke all own sessions.
- **Preconditions** — Two student sessions and one independent session for another user.
- **Test data** — Old CampusDemo123, new and confirmation CampusDemo456.
- **Execution steps** — PUT /auth/change-password. Check old sessions and independent session with GET /auth/me. Try both passwords at login.
- **Expected result** — Change returns 200. Both old sessions return 401, the other user's session returns 200, old password returns 400, and new password returns 200.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-016 — Reject an incorrect current password

- **Test ID** — TC-016
- **Requirement ID** — FR-05
- **Description** — Reject an incorrect current password.
- **Preconditions** — Signed in as student.
- **Test data** — Incorrect current password and matching valid new values.
- **Execution steps** — PUT /auth/change-password and check existing session and old login.
- **Expected result** — 400, "Current password is incorrect." Existing session and correct old login still work.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-017 — Reject mismatched password confirmation

- **Test ID** — TC-017
- **Requirement ID** — FR-05
- **Description** — Reject mismatched password confirmation.
- **Preconditions** — Signed in as student.
- **Test data** — Correct current password, CampusDemo456, confirmation CampusDemo789.
- **Execution steps** — PUT /auth/change-password and check existing session.
- **Expected result** — 400, "New password and confirmation do not match." Existing session remains valid.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-018 — Reject new passwords above the UTF-8 byte limit

- **Test ID** — TC-018
- **Requirement ID** — FR-05
- **Description** — Reject new passwords above the UTF-8 byte limit.
- **Preconditions** — Signed in as student.
- **Test data** — Correct current password, matching new and confirmation of 37 repetitions of U+00E9.
- **Execution steps** — PUT /auth/change-password and check existing session.
- **Expected result** — 400 with the new-password bounds message because the new value uses 74 UTF-8 bytes. Existing session remains valid.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-019 — Create and read all five campus record types

- **Test ID** — TC-019
- **Requirement ID** — FR-06
- **Description** — Create and read all five campus record types.
- **Preconditions** — Admin and student sessions, isolated data.
- **Test data** — Fixtures E, A, S, L and C.
- **Execution steps** — POST each fixture as admin. GET corresponding lists as student and compare the returned IDs and fields.
- **Expected result** — Each create returns 201. Each list returns 200 and contains the saved record under the corresponding list key.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-020 — Partially update all five record types

- **Test ID** — TC-020
- **Requirement ID** — FR-06
- **Description** — Partially update all five record types.
- **Preconditions** — One fixture of each type exists.
- **Test data** — E location "Hall B", A priority urgent, S endTime "11:00", L availability "On loan", C openingHours "09:00-17:00".
- **Execution steps** — PUT each individual change as admin and GET each list.
- **Expected result** — Updates return 200. Changed fields persist and other business fields retain their original values.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-021 — Delete all five record types and confirm absence

- **Test ID** — TC-021
- **Requirement ID** — FR-06
- **Description** — Delete all five record types and confirm absence.
- **Preconditions** — Disposable records of all five types exist.
- **Test data** — Their record IDs.
- **Execution steps** — DELETE each as admin, GET each list, then repeat each DELETE.
- **Expected result** — First deletes return 200 with success true. Lists omit the IDs. Repeat deletes return 404, "Record not found".
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-022 — Reject a malformed resource ID

- **Test ID** — TC-022
- **Requirement ID** — FR-06
- **Description** — Reject a malformed resource ID.
- **Preconditions** — Admin session.
- **Test data** — Record ID bad-id.
- **Execution steps** — PUT /events/bad-id with location "Hall B".
- **Expected result** — 400, "Invalid record ID".
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-023 — Handle malformed JSON

- **Test ID** — TC-023
- **Requirement ID** — FR-06
- **Description** — Handle malformed JSON.
- **Preconditions** — Admin session.
- **Test data** — Literal body { and Content-Type application/json.
- **Execution steps** — POST /events with the raw malformed body.
- **Expected result** — 400, success false, "Invalid input. Check required fields, dates, times and links."
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-024 — Reject invalid record model data

- **Test ID** — TC-024
- **Requirement ID** — FR-06
- **Description** — Reject invalid record model data.
- **Preconditions** — Admin session.
- **Test data** — E with date "invalid", A with priority "immediate", L with link "ftp://example.test/file".
- **Execution steps** — POST each invalid fixture to its corresponding route.
- **Expected result** — Each returns 400 with the generic validation message and creates no record.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-025 — Validate schedule ordering and format

- **Test ID** — TC-025
- **Requirement ID** — FR-07
- **Description** — Validate schedule ordering and format.
- **Preconditions** — Admin session.
- **Test data** — S with startTime 09:00 and endTime 09:00, 08:59 or 09:01. Additional variant startTime 24:00 with endTime 10:00..
- **Execution steps** — POST each variant independently to /schedules.
- **Expected result** — Equal, reversed and out-of-range times return 400. The 09:00 to 09:01 interval returns 201.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-026 — Display API data on the student dashboard

- **Test ID** — TC-026
- **Requirement ID** — FR-08
- **Description** — Display API data on the student dashboard.
- **Preconditions** — Student session and one E, A and S fixture.
- **Test data** — Fixture names, description, priority, subject and schedule times.
- **Execution steps** — Open /student-dashboard and inspect events, announcements and schedule sections.
- **Expected result** — The fixture event appears, the announcement includes its title and high priority, and the schedule shows the expected subject, times and location.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-027 — Filter the locations list case-insensitively

- **Test ID** — TC-027
- **Requirement ID** — FR-08
- **Description** — Filter the locations list case-insensitively.
- **Preconditions** — Student session, C and another distinct location exist.
- **Test data** — Search "mAIN lIBRARY", then "no-such-place".
- **Execution steps** — Open /locations and enter each term.
- **Expected result** — First search leaves the Main Library card. Second shows "No matching records available."
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-028 — Reflect an administrator's hours update across student views

- **Test ID** — TC-028
- **Requirement ID** — FR-09
- **Description** — Reflect an administrator's hours update across student views.
- **Preconditions** — C exists, separate admin and student sessions.
- **Test data** — New hours "09:00-17:00", question "What are the library hours?".
- **Execution steps** — Edit C in the admin locations section. Refresh the student's locations page and ask the assistant the question.
- **Expected result** — Both student views display the new hours for Main Library.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-029 — Return the next future class

- **Test ID** — TC-029
- **Requirement ID** — FR-09
- **Description** — Return the next future class.
- **Preconditions** — Student session and isolated schedules.
- **Test data** — One past class and two future classes on the next local day at 09:00 and 11:00, using S with distinct subjects.
- **Execution steps** — POST /assistant/chat with "When is my next class?" and inspect reply and sources.
- **Expected result** — 200, mode campus-data, a Schedules section with the 09:00 class only, and a source ID matching that schedule.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-030 — Enforce assistant length boundaries

- **Test ID** — TC-030
- **Requirement ID** — FR-10
- **Description** — Enforce assistant length boundaries.
- **Preconditions** — Student session.
- **Test data** — Empty string, one x, 2000 x characters and 2001 x characters.
- **Execution steps** — POST each value as message to /assistant/chat.
- **Expected result** — Lengths 0 and 2001 return 400 with "Enter a message of 1 to 2000 characters". Lengths 1 and 2000 return 200 with a reply.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-031 — Return an informative response for missing records

- **Test ID** — TC-031
- **Requirement ID** — FR-10
- **Description** — Return an informative response for missing records.
- **Preconditions** — Student session and no exam fixtures.
- **Test data** — Question "What exams are scheduled?".
- **Execution steps** — POST the question to /assistant/chat and read sources.
- **Expected result** — 200 with a Schedules section containing "No matching information is currently available." and an empty sources array.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-032 — Return guidance for an unsupported topic

- **Test ID** — TC-032
- **Requirement ID** — FR-10
- **Description** — Return guidance for an unsupported topic.
- **Preconditions** — Student session.
- **Test data** — Question "Hello".
- **Execution steps** — POST /assistant/chat and inspect reply and sources.
- **Expected result** — 200 with guidance beginning "I can look up campus events" and an empty sources array.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-033 — Recover a campus page from an API interruption

- **Test ID** — TC-033
- **Requirement ID** — QR-01
- **Description** — Recover a campus page from an API interruption.
- **Preconditions** — Student session, C exists, browser request interception available.
- **Test data** — Simulated failure on /api/locations only.
- **Execution steps** — Block the locations request while allowing /api/auth/me. Open /locations. Restore the request and select Retry.
- **Expected result** — The page shows an alert and Retry. After retry and reload, Main Library is displayed.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-034 — Compare API performance with agreed targets

- **Test ID** — TC-034
- **Requirement ID** — QR-02
- **Description** — Compare API performance with agreed targets.
- **Preconditions** — Isolated services, approved thresholds and recorded data volume.
- **Test data** — Events list, authenticated library-hours query, agreed concurrency and duration.
- **Execution steps** — Collect a single-user baseline, run the agreed load, and record p95, throughput and error rate for each endpoint.
- **Expected result** — Measured p95 and error rate meet the agreed limits for each endpoint. Record throughput and run conditions.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-035 — Find library hours with keyboard controls

- **Test ID** — TC-035
- **Requirement ID** — QR-03
- **Description** — Find library hours with keyboard controls.
- **Preconditions** — Student session, C exists, peer evaluator available.
- **Test data** — Campus Locations page and keyboard only.
- **Execution steps** — Use Tab and keyboard input to reach the search field and filter to Main Library. Observe focus and read the hours.
- **Expected result** — The search can be reached and operated with the keyboard, focus is visible, and the matching card presents the expected hours.
- **Actual result** — Not Yet Executed
- **Status** — Not Run

### TC-036 — Repeat quality checks for a fixed revision

- **Test ID** — TC-036
- **Requirement ID** — QR-04
- **Description** — Repeat quality checks for a fixed revision.
- **Preconditions** — Recorded revision, disposable database and configured SonarQube gate.
- **Test data** — Existing lint, build and test scripts plus approved scanner configuration.
- **Execution steps** — Run lint, build and backend tests, then run the configured scan. Record exit codes and gate outcome.
- **Expected result** — Scripts exit 0, the baseline suites have no failures, and the configured gate passes.
- **Actual result** — Not Yet Executed
- **Status** — Not Run
