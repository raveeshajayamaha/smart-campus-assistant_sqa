# EC4206 Manual Execution Guide

Use this guide with the [original case catalogue](EC4206_Test_Cases.md) and the [results sheet](EC4206_Manual_Execution_Results.csv). The expected results come from the original cases. Related automation is listed for comparison. Enter a manual result only after you personally execute and observe the case. Setup steps and evidence review do not count as manual execution.

## 1. Start an isolated local environment

Use the separate SQA checkout in VS Code, Windows PowerShell, Chrome, the repository's Node 24 CI major version or a locally supported version, npm, and a local MongoDB Community `mongod` executable. JMeter and Java are needed only for TC-034. Do not use Atlas, a normal application database, repository environment credentials, or production accounts.

1. Open the SQA folder in VS Code. In its terminal run `git rev-parse --show-toplevel`, `git remote -v`, `git rev-parse HEAD` and `git status --short --branch`. Confirm the checkout ends in `smart-campus-assistant-sqa` and the remote is `raveeshajayamaha/smart-campus-assistant_sqa`. Record revision, working tree state, date, timezone and tool versions. If dependencies are missing, run `npm ci --ignore-scripts` and `npm ci --ignore-scripts --prefix backend` from the root, checking each command succeeds. npm ci replaces the relevant local node_modules directory.
2. In Terminal A, make sure ports **27960**, **5000** and **5173** are free. Stop if one belongs to another service and leave that service alone.

   ```powershell
   Get-NetTCPConnection -State Listen -LocalPort 27960,5000,5173 -ErrorAction SilentlyContinue
   ```

   With no listeners, start a fresh MongoDB instance. Adjust the executable path if needed. Save the exact scratch path in your private run notes. Leave this terminal open.

   ```powershell
   $mongoExe = 'C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe'
   if (!(Test-Path -LiteralPath $mongoExe -PathType Leaf)) { throw 'Locate your installed mongod.exe first' }
   $manualScratch = Join-Path (Get-Location) ('coverage/manual-mongo-' + [guid]::NewGuid().ToString('N'))
   New-Item -ItemType Directory -Path $manualScratch -ErrorAction Stop | Out-Null
   Write-Host $manualScratch
   & $mongoExe --bind_ip 127.0.0.1 --port 27960 --dbpath $manualScratch
   ```

   Wait for MongoDB to report that it is listening. If it reports a bind or startup error, stop here.

3. In Terminal B at the checkout root, set the disposable database explicitly and start the existing Express app bound only to loopback. Each additional terminal that invokes backend database tools must repeat these two environment assignments. The application loads dotenv without overriding already-set values.

   ```powershell
   $env:MONGO_URI = 'mongodb://127.0.0.1:27960/campus_manual?directConnection=true'
   $env:MONGO_DB_NAME = 'campus_manual'
   node -e "const {app}=require('./backend/server'); require('./backend/config/db')().then(()=>app.listen(5000,'127.0.0.1',()=>console.log('Manual SQA API ready on 127.0.0.1:5000'))).catch(e=>{console.error(e.message);process.exitCode=1})"
   ```

4. In Terminal C run `$env:NODE_OPTIONS = '--dns-result-order=ipv4first'`, then `npm run dev -- --host localhost --strictPort`. This terminal-local setting makes the Vite proxy prefer the IPv4 loopback address for the API. Open **http://localhost:5173/api/test** in Chrome and check for `success: true` and `Smart Campus API is working`. This confirms the frontend proxy reaches the local API. If it cannot reach the loopback listener, check that `localhost` resolves to 127.0.0.1 for the Node proxy and verify the ports before continuing. All relative browser URLs below start at **http://localhost:5173**.
5. Use separate Chrome profiles (create two temporary profiles without signing in to Google) for **Student** and **Admin** so browser storage does not overwrite the other login. Two Incognito windows in the same Chrome profile share storage. Use a third signed-out profile if useful for registration cases.

## 2. Create synthetic accounts and records

In the browser, open `/register`. Register **Manual Student** as `manual-student@example.test` and **Manual Admin** as `manual-admin@example.test`. Enter `CampusDemo123` for both password fields. These are disposable fixture values. Public registration creates student accounts. Promote only the synthetic admin once, in a fourth PowerShell terminal opened at the SQA root:

```powershell
$env:MONGO_URI = 'mongodb://127.0.0.1:27960/campus_manual?directConnection=true'
$env:MONGO_DB_NAME = 'campus_manual'
npm --prefix backend run make-admin -- manual-admin@example.test
```

Check for `Administrator role granted`. In each profile open `/login` and enter its own credentials. The student should reach `/student-dashboard` and the admin `/admin-dashboard`. Keep `student@example.test` reserved for TC-001 and TC-002. Use a clean run or unique addresses with the same case/length properties for repeat attempts, and record any fixture variations.

### Send individual requests from Chrome DevTools

Open DevTools with **F12**, choose **Console**, and type or paste this guide's helper after reading it. If Chrome blocks pasting, type it or follow your lab's instructions. Run it only on the local frontend origin. The helper sends one request at a time. It saves session tokens privately in the page's memory and prints a sanitized result. It performs no checks or requests until you call it. Re-enter it after switching tabs or navigating to a new document, then call `sign` again for required aliases. Cases comparing old tokens must stay in the same document and use the original aliases.

```js
if (location.origin !== 'http://localhost:5173') throw Error('Use the local SQA frontend')
var P = 'CampusDemo123', P2 = 'CampusDemo456'
var student = 'manual-student@example.test', admin = 'manual-admin@example.test'
var manual = (() => {
  const sessions = new Map()
  async function req(method, path, body, alias, options = {}) {
    if (location.origin !== 'http://localhost:5173' || !path.startsWith('/') || path.startsWith('//'))
      throw Error('Local relative API path required')
    const headers = { 'Content-Type': 'application/json' }
    if (alias) {
      if (!sessions.has(alias)) throw Error('Sign in with that alias first')
      headers.Authorization = 'Bearer ' + sessions.get(alias)
    }
    if (options.auth) headers.Authorization = options.auth
    const r = await fetch('/api' + path, {
      method, headers, body: body === undefined ? undefined : options.raw ? body : JSON.stringify(body)
    })
    const data = await r.json()
    const { token, ...publicData } = data
    if (token && options.saveAs) sessions.set(options.saveAs, token)
    return { status: r.status, tokenPresent: typeof token === 'string',
      tokenIs64LowerHex: typeof token === 'string' && /^[a-f0-9]{64}$/.test(token), ...publicData }
  }
  return { req, sign: (alias, email, password = P) =>
    req('POST', '/auth/login', { email, password }, undefined, { saveAs: alias }) }
})()
var { req, sign } = manual
```

Example requests you type individually:

```js
await sign('S', student)
await req('GET', '/auth/me', undefined, 'S')
await sign('ADM', admin)
await req('POST', '/auth/register', {name:'Fixture Example',email:'fixture-example@example.test',password:P})
```

A method and path in the case instructions refer to `req` in that order. For a signed-in GET or DELETE, use `undefined` for the third argument before the alias. For a request without credentials, omit the alias. The helper's sessions are separate from the browser UI login. Never screenshot raw Authorization headers, login response tokens, browser storage, passwords, or a raw HAR. Save sanitized status and body observations in text or cropped screenshots.

### Campus fixtures

Set `D` to tomorrow's date in Asia/Colombo, using `YYYY-MM-DD`. In each new Console document used for fixture requests, type the block below and replace `YYYY-MM-DD` with the actual date.

```js
var D = 'YYYY-MM-DD'
var E = {title:'Robotics Fair',date:D,time:'10:00 AM',location:'Hall A'}
var A = {title:'Registration Notice',description:'Registration opens soon',date:D,priority:'high'}
var Sched = {subject:'Algorithms',date:D,startTime:'09:00',endTime:'10:00',location:'Room A'}
var L = {title:'Algorithms Book',type:'Book',description:'Reference text',availability:'Available',location:'Shelf A',link:'https://example.test/book'}
var C = {name:'Main Library',building:'Central Building',description:'Study area',category:'Library',openingHours:'08:00-18:00',directions:'Ground floor'}
```

| Fixture | API path | Create response key | List response key | Student page |
|---|---|---|---|---|
| E | `/events` | `event` | `events` | `/events` |
| A | `/announcements` | `announcement` | `announcements` | `/announcements` |
| Sched | `/schedules` | `schedule` | `schedules` | `/academic` |
| L | `/library` | `resource` | `resources` | `/library` |
| C | `/locations` | `location` | `locations` | `/locations` |

To prepare a fixture, POST it as ADM and record its returned `_id`; for example, `await req('POST','/locations',C,'ADM')`. List first if it might already exist. To reset, delete only the recorded synthetic fixture by its exact ID and recreate it as needed. Keep dependent cases together, and avoid the demo seed so dates, counts and library names are controlled.

### Expiry setup for TC-009

In a spare PowerShell terminal at the SQA root, repeat the two disposable MongoDB environment assignments above. Copy the **public user ID** from the TC-009 login response, substitute it for `USER_ID` below and run this once. The command checks the disposable URI and database name, and expires sessions for that one synthetic account only.

```powershell
node -e "const m=require('./backend/node_modules/mongoose'); const S=require('./backend/models/Session'); const id=process.argv[1]; if(process.env.MONGO_URI!=='mongodb://127.0.0.1:27960/campus_manual?directConnection=true'||process.env.MONGO_DB_NAME!=='campus_manual'||!m.isValidObjectId(id)) throw Error('Check disposable database and user ID'); require('./backend/config/db')().then(async()=>{const r=await S.updateMany({user:id},{expiresAt:new Date(0)}); if(!r.matchedCount) throw Error('No matching session'); console.log('Expired synthetic sessions:',r.modifiedCount)}).catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>m.disconnect())" USER_ID
```

## 3. Execute the cases

Browser interaction is required for TC-011, TC-026 through TC-028, TC-033 and TC-035. TC-006 can use the login form with the Network panel. TC-034 and TC-036 use test tooling and hosted verification. The other cases use manually issued API requests in DevTools.

Run the groups in order on a new fixture database, or use the setup listed for the selected case. Paths in request instructions omit the `/api` prefix because the helper adds it. Blank or unexpected outcomes belong in your actual observations, with the run's date and evidence filename.

### Accounts and sessions (001–009)

#### TC-001 — Register and normalise a new student

- **Setup and actions** — Open `/register`. With `student@example.test` unused, call `POST /auth/register` with `{name:' Test Student ', email:' STUDENT@example.test ', password:P}` from Console. Keep this account for TC-002.
- **Expected** — 201, `success:true`, name `Test Student`, email `student@example.test`, role `student`, and no `password` field.
- **Evidence** — Status and returned public user fields.
- **Related automation** — API suite and black-box registration checks address registration and normalisation.

#### TC-002 — Reject duplicate email

- **Setup and actions** — Open `/register`. Confirm TC-001 created `student@example.test` or create it once as setup. Call `POST /auth/register` with `{name:'Test Student',email:'STUDENT@example.test',password:P}`.
- **Expected** — 400, `success:false`, `User already exists`.
- **Evidence** — Record the second response and the existing email.
- **Related automation** — API and black-box suites cover duplicate registration.

#### TC-003 — Check registration password boundaries

- **Setup and actions** — Open `/register`. Make four separate `POST /auth/register` requests using name `Boundary Student`, emails `length5@example.test`, `length6@example.test`, `length72@example.test` and `length73@example.test`, and respective passwords `'a'.repeat(5)`, `'a'.repeat(6)`, `'a'.repeat(72)` and `'a'.repeat(73)`. Use fresh emails for a retest.
- **Expected** — Lengths 5 and 73 return 400 with `Provide name, valid email and a password of 6 to 72 characters`. Lengths 6 and 72 return 201.
- **Evidence** — Four statuses and the validation text, labelled by length.
- **Related automation** — Black-box boundary suite covers the four lengths.

#### TC-004 — Preserve the student role during registration

- **Setup and actions** — Open `/register`. With `role-check@example.test` unused, call `POST /auth/register` with `{name:'Role Check',email:'role-check@example.test',password:P,role:'admin'}`. The normal form has no role field.
- **Expected** — 201 and `user.role` is `student`.
- **Evidence** — Status and returned role.
- **Related automation** — API suite checks registration privilege handling.

#### TC-005 — Sign in and retrieve identity

- **Setup and actions** — Open `/login`. Use the existing fixture student and call `await sign('S', student)`, then `GET /auth/me` with `S`. Compare the returned user ID, email and role against the login result.
- **Expected** — Both requests return 200. The helper reports `tokenIs64LowerHex:true`. Identity matches the student account.
- **Evidence** — Both statuses, format check and matching public fields. Keep token values out of evidence.
- **Related automation** — API suite checks login and identity. The black-box harness also checks token format.

#### TC-006 — Reject incorrect login credentials

- **Setup and actions** — Open `/login`. Enter the fixture student email and `WrongCampus123`, then submit. In Network, select the login request and check its response, or send the same `POST /auth/login` from Console without requesting token storage.
- **Expected** — 400, `Invalid email or password`, no token. The browser stays on login when using the form.
- **Evidence** — Login feedback and sanitized response.
- **Related automation** — API and Selenium AUTO-02 cover incorrect login.

#### TC-007 — Revoke only the logged-out session

- **Setup and actions** — Open `/login`. Call `sign('A', student)` and `sign('B', student)` separately. `POST /auth/logout` using `A`, then `GET /auth/me` once with `A` and once with `B`. Preserve both aliases until checks finish.
- **Expected** — Logout 200 and `success:true`. A gets 401 with `Session expired. Please log in again`. B gets 200.
- **Evidence** — Three responses labelled logout, A and B.
- **Related automation** — API covers single-session logout. The two-session comparison is required here.

#### TC-008 — Require a valid bearer header

- **Setup and actions** — Open `/login`. Call `GET /auth/me` with no alias, then call `req('GET','/auth/me',undefined,undefined,{auth:'Bearer short'})`.
- **Expected** — Both return 401 and `Please log in`.
- **Evidence** — Both statuses and messages.
- **Related automation** — White-box suite exercises absent and malformed authorization.

#### TC-009 — Reject an expired session

- **Setup and actions** — Open `/login`. Register `expiry@example.test` using `P`, then `sign('X','expiry@example.test')`. Record only the returned `user.id`. In an extra local PowerShell terminal, use the expiry setup below for that ID. Return to Chrome and `GET /auth/me` using `X`.
- **Expected** — 401 and `Session expired. Please log in again`. MongoDB TTL cleanup can remove the expired record after expiry.
- **Evidence** — Fixture update confirmation and the sanitized 401 response.
- **Related automation** — API and white-box suites cover expired sessions.

### Roles, profile and passwords (010–018)

#### TC-010 — Enforce administrator write permissions

- **Setup and actions** — Open `/login`. Sign in through Console as `S` and `ADM`. Make event `E` with title `TC-010 Robotics Fair`. Confirm it is absent via `GET /events`. `POST /events` with the same valid event anonymously, as `S` and as `ADM` in that order. List events again and count the matching title. Delete only its recorded ID as `ADM` after saving evidence.
- **Expected** — 401 anonymous, 403 student with `Administrator access required`, and 201 admin. Exactly one matching event exists after the requests.
- **Evidence** — Before and after counts, all statuses and the student message.
- **Related automation** — API, black-box decision table and Section 3.7 security checks cover role-based writes.

#### TC-011 — Redirect a student away from the admin dashboard

- **Setup and actions** — In student Chrome profile, sign in using `/login`. Type `/admin-dashboard` into the address bar using the local base URL and wait for navigation.
- **Expected** — URL becomes `/student-dashboard`, and administrator controls are absent.
- **Evidence** — Screenshot showing the final URL and student navigation.
- **Related automation** — Selenium AUTO-04 covers the student redirect.

#### TC-012 — Trim and persist own profile updates

- **Setup and actions** — Open `/profile` in student profile. In Console, sign `S`, GET `/auth/me` and record public ID/email/role. PUT `/auth/profile` as `S` with `{department:' Computing ',contactNumber:'+94 770000000'}`. Sign in again as `S`, repeat GET and reload the profile page.
- **Expected** — Update and identity return 200. `Computing` and `+94 770000000` persist. ID, email and role remain the same.
- **Evidence** — Before and after identity, update response, optional profile screenshot.
- **Related automation** — Profile suite covers trimming, persistence and identity.

#### TC-013 — Reject invalid profile fields atomically

- **Setup and actions** — Open `/profile`. With `S`, set and verify baseline `Computing` and `+94 770000000`. PUT `{department:'New Department',contactNumber:'letters'}` to `/auth/profile`, then GET `/auth/me` as `S`.
- **Expected** — 400 with `errors.contactNumber`. Baseline department and contact number are unchanged.
- **Evidence** — Baseline, validation and follow-up identity.
- **Related automation** — Profile suite tests invalid fields and no partial save.

#### TC-014 — Reject fields outside the profile allowlist

- **Setup and actions** — Open `/profile`. Use `S` to read the original name and role. PUT `{role:'admin',name:'Changed'}` to `/auth/profile`, then GET `/auth/me` again. The real form permits name changes and displays role as read-only.
- **Expected** — 400, `Only name, student ID, faculty, department, year/semester and contact number can be updated.` Original name and student role persist.
- **Evidence** — Allowlist response and before and after identity.
- **Related automation** — Profile suite tests rejected role/unknown fields and identity protection.

#### TC-015 — Change password and revoke all own sessions

- **Setup and actions** — Open `/login`. Register `pw-change@example.test` with `P`, and sign it in as `A` and `B`. Sign the separate fixture student in as `S`. PUT `/auth/change-password` as `A` with `{currentPassword:P,newPassword:P2,confirmPassword:P2}`. GET `/auth/me` with A, B and S. Attempt login for `pw-change@example.test` with P, then P2.
- **Expected** — Change 200. A and B get 401, S gets 200, old login 400, and new login 200.
- **Evidence** — Label each of the six responses. Avoid tokens and password fields.
- **Related automation** — Password suite checks revocation, new and old login, and session isolation.

#### TC-016 — Reject an incorrect current password

- **Setup and actions** — Open `/profile`. Sign fixture student `S` using P. PUT `/auth/change-password` as S with `{currentPassword:'WrongCampus123',newPassword:P2,confirmPassword:P2}`. GET `/auth/me` with S and call login with P.
- **Expected** — 400 `Current password is incorrect.` The existing session and correct old login both return 200.
- **Evidence** — Validation response and two follow-up statuses.
- **Related automation** — Password suite covers incorrect current password and surviving sessions.

#### TC-017 — Reject mismatched password confirmation

- **Setup and actions** — Open `/profile`. Sign S using P. PUT `/auth/change-password` with `{currentPassword:P,newPassword:P2,confirmPassword:'CampusDemo789'}`. GET `/auth/me` with the same S.
- **Expected** — 400 `New password and confirmation do not match.` Session still returns 200.
- **Evidence** — Validation and session status.
- **Related automation** — Password suite checks mismatched confirmation.

#### TC-018 — Reject new passwords above the UTF-8 byte limit

- **Setup and actions** — Open `/profile`. Sign S using P. In Console set `var longPw=String.fromCodePoint(233).repeat(37)`. PUT `/auth/change-password` with `{currentPassword:P,newPassword:longPw,confirmPassword:longPw}`. GET `/auth/me` with S.
- **Expected** — 400 with the bounds message including `no more than 72 UTF-8 bytes`. Input is 37 characters and 74 bytes. Session returns 200.
- **Evidence** — Record lengths, the validation message and session status.
- **Related automation** — Password suite covers the bcrypt byte limit.

### Administrator records and validation (019–025)

#### TC-019 — Create and read all five campus record types

- **Setup and actions** — Open `/admin-dashboard` as admin. In Console sign `ADM` and `S`. POST E, A, Sched, L and C as ADM to the five routes in the fixture table. Save each returned ID and baseline fields. GET all five matching lists as S. Keep these five fixtures unchanged for TC-020.
- **Expected** — Each POST 201. Each GET 200 and includes the same ID and expected business fields under the proper list key.
- **Evidence** — Five create/list pairs with IDs and field comparisons.
- **Related automation** — API suite covers creation and list lookup for all five models.

#### TC-020 — Partially update all five record types

- **Setup and actions** — Open `/admin-dashboard` as admin. Use TC-019 IDs or recreate identical baselines once. As ADM, PUT one field at each `/<collection>/<id>`: E `{location:'Hall B'}`, A `{priority:'urgent'}`, Sched `{endTime:'11:00'}`, L `{availability:'On loan'}`, C `{openingHours:'09:00-17:00'}`. GET each list as S and compare against TC-019.
- **Expected** — Each PUT 200. The intended field changes and other business fields retain baseline values. Ignore expected changes to metadata such as `updatedAt`.
- **Evidence** — Five update/list pairs and before/after field comparisons.
- **Related automation** — API suite covers updates and browser smoke covers admin edits. The original single-field comparisons remain required.

#### TC-021 — Delete all five record types and confirm absence

- **Setup and actions** — Open `/admin-dashboard` as admin. Use the five TC-019/020 IDs, or recreate five disposable fixtures. DELETE each as ADM. GET each list as S and verify its ID is absent. DELETE each same ID again as ADM.
- **Expected** — First deletes 200 with `success:true`. All lists omit the deleted IDs. All repeat deletes 404 `Record not found`.
- **Evidence** — Five first-delete/list/repeat-delete records with IDs.
- **Related automation** — API suite covers first and repeated deletes across its fixtures.

#### TC-022 — Reject a malformed resource ID

- **Setup and actions** — Open `/admin-dashboard` as admin. Sign ADM and PUT `/events/bad-id` with `{location:'Hall B'}`.
- **Expected** — 400 `Invalid record ID`.
- **Evidence** — Request path and response.
- **Related automation** — API covers invalid IDs using a related method and the security transcript covers invalid event PUT.

#### TC-023 — Handle malformed JSON

- **Setup and actions** — Open `/admin-dashboard` as admin. Sign ADM. Use `req('POST','/events','{','ADM',{raw:true})`. The helper sets `Content-Type: application/json`.
- **Expected** — 400, `success:false`, `Invalid input. Check required fields, dates, times and links.`
- **Evidence** — Raw-body notation and response. Leave headers containing session data out of evidence.
- **Related automation** — API suite covers raw malformed JSON.

#### TC-024 — Reject invalid record model data

- **Setup and actions** — Open `/admin-dashboard` as admin. Confirm test records named or titled `TC-024` are absent. POST `{...E,title:'TC-024 Event',date:'invalid'}` to `/events`, `{...A,title:'TC-024 Notice',priority:'immediate'}` to `/announcements`, and `{...L,title:'TC-024 Book',link:'ftp://example.test/file'}` to `/library` as ADM. List those collections as S afterward.
- **Expected** — Each POST 400 with the same generic validation message as TC-023. No matching record is created.
- **Evidence** — Three errors and post-request list checks.
- **Related automation** — API suite covers analogous invalid date, priority and URL values.

#### TC-025 — Validate schedule ordering and format

- **Setup and actions** — Open `/admin-dashboard` as admin. Sign ADM. POST `/schedules` four times using Sched with subjects `TC-025 Equal`, `TC-025 Earlier`, `TC-025 Valid`, `TC-025 Format`. Use times 09:00/09:00, 09:00/08:59, 09:00/09:01, and 24:00/10:00 respectively. A native time input may reject 24:00 before submission, so use the direct API. Delete the successful fixture by ID after capturing evidence.
- **Expected** — Equal, reversed and out-of-range variants return 400. The one-minute valid interval returns 201.
- **Evidence** — Four statuses labelled with each exact time pair.
- **Related automation** — API and black-box suites exercise ordering and time boundaries.

### Student views and assistant (026–032)

#### TC-026 — Display API data on the student dashboard

- **Setup and actions** — Ensure exactly one E, A and Sched fixture exists with the original values. Sign in as student via `/login`, open `/student-dashboard` and inspect Events, Announcements and the schedule section. Wait for loading to finish.
- **Expected** — Robotics Fair appears, Registration Notice shows high priority, and Algorithms shows 09:00-10:00 and Room A.
- **Evidence** — Screenshots showing all three sections and the synthetic values.
- **Related automation** — Related API and browser smoke coverage exists. The exact three-panel comparison is a browser check.

#### TC-027 — Filter the locations list case-insensitively

- **Setup and actions** — Create C and `{...C,name:'Engineering Lab',category:'Lab'}` as admin. In student profile open `/locations`. In the locations search, type `mAIN lIBRARY`, then replace it with `no-such-place`.
- **Expected** — First term leaves the Main Library card. Second displays `No matching records available.`
- **Evidence** — Two screenshots showing the terms and results.
- **Related automation** — Section 3.7 USE-04 covers similar search behaviour.

#### TC-028 — Reflect an administrator's hours update across student views

- **Setup and actions** — Ensure a single Main Library location C with hours `08:00-18:00`. Keep separate signed-in admin and student Chrome profiles. Admin opens `/admin-dashboard` > **Campus Locations** > **Edit** on Main Library, changes Opening hours to `09:00-17:00`, then selects **Update Location**. Student refreshes `/locations`, then opens `/assistant`, types `What are the library hours?` in **Campus question** and selects **Send message**.
- **Expected** — The student locations card and assistant reply both display `09:00-17:00` for Main Library.
- **Evidence** — Admin update confirmation and both student-view screenshots.
- **Related automation** — BDD-01 checks update propagation at API level. AUTO-05 checks browser rendering with its own fixture.

#### TC-029 — Return the next future class

- **Setup and actions** — Use isolated schedules with no other upcoming classes. Create Sched variants with distinct subjects `TC-029 Past`, `TC-029 Early`, `TC-029 Late`. Use the previous Asia/Colombo calendar day for Past at 09:00-10:00. Use D for Early 09:00-10:00 and Late 11:00-12:00. Record Early's ID. On `/assistant`, sign S in Console and POST `{message:'When is my next class?'}` to `/assistant/chat`. Remove the three fixtures afterward.
- **Expected** — 200, `mode:'campus-data'`, a Schedules section containing only the Early class, and a source ID matching Early.
- **Evidence** — Fixture dates and times, Early ID, reply and source comparison.
- **Related automation** — API suite checks a next-class reply. Exact ordering and source identity require this fixture.

#### TC-030 — Enforce assistant length boundaries

- **Setup and actions** — Open `/assistant` while signed in. In Console sign S and manually POST each message to `/assistant/chat` with `''`, `'x'`, `'x'.repeat(2000)` and `'x'.repeat(2001)`. The browser form disables empty input and limits length, so use the API path.
- **Expected** — Lengths 0 and 2001 return 400 `Enter a message of 1 to 2000 characters`. Lengths 1 and 2000 return 200 with a reply.
- **Evidence** — Four statuses and reply/message presence, labelled by length.
- **Related automation** — Black-box suite covers all four assistant boundaries.

#### TC-031 — Return an informative response for missing records

- **Setup and actions** — Confirm no schedules marked Exam are present in this disposable database. Open `/assistant`. Sign S in Console and POST `{message:'What exams are scheduled?'}` to `/assistant/chat`.
- **Expected** — 200. Schedules contains `No matching information is currently available.` and `sources` is an empty array.
- **Evidence** — Fixture check and response with reply and sources.
- **Related automation** — API suite checks the missing-exam reply. Inspect the exact source array here.

#### TC-032 — Return guidance for an unsupported topic

- **Setup and actions** — Open `/assistant`. Sign S in Console and POST `{message:'Hello'}` to `/assistant/chat`.
- **Expected** — 200. Reply starts `I can look up campus events` and `sources` is empty.
- **Evidence** — Status, reply and sources.
- **Related automation** — The assistant suite exercises related lookup paths. Use this authenticated fixture for the exact guidance assertion.

### Recovery, performance, keyboard use and CI (033–036)

#### TC-033 — Recover a campus page from an API interruption

- **Setup and actions** — Sign in as student with C present. Open Chrome DevTools Network request blocking. Enable a pattern matching only `*/api/locations` with no trailing wildcard. Open `/locations`. Keep `/api/auth/me` allowed. After observing the failure, disable the pattern and click **Retry**. Reload once more.
- **Expected** — The page shows an alert and Retry. Main Library appears after retry and reload, with a successful locations request.
- **Evidence** — Blocked request and alert screenshot, then successful request and card screenshot.
- **Related automation** — The matrix records no matching executed interruption-and-retry case.

#### TC-034 — Compare API performance with agreed targets

- **Setup and actions** — Use a separate isolated load run and the procedure below. Record approved per-endpoint p95/error limits, concurrency, duration, seed volume and environment before running. Use `GET /api/events` and student-authenticated `POST /api/assistant/chat` with `{message:'What are the library hours?'}`.
- **Expected** — p95 and error rate meet agreed limits for each endpoint. Record throughput and conditions. If thresholds or tooling are unavailable, record the blocker when attempting the case.
- **Evidence** — Approved thresholds, JTL or aggregate tables, p95, throughput, error rate and run settings.
- **Related automation** — Section 3.7 JMeter evidence covers related localhost read workloads. Its counts are historical evidence.

#### TC-035 — Find library hours with keyboard controls

- **Setup and actions** — With C present and a peer evaluator available, sign in as student and open `/locations`. Hand over control. The evaluator uses only Tab or Shift+Tab to reach the search input and types `Main Library`. Observe focus and ask the evaluator to read the displayed hours.
- **Expected** — Search is reachable and operable with visible keyboard focus. The matching card presents the expected Main Library hours.
- **Evidence** — Focused field and card screenshots plus dated peer observation notes. If no peer is available, record the blocker when attempting the case.
- **Related automation** — USE-04 covers filtering with automated browser input. Human keyboard-only evaluation remains separate.

#### TC-036 — Repeat quality checks for a fixed revision

- **Setup and actions** — At a recorded fixed Git revision, follow the terminal and approved hosted scan procedure below. Open the exact GitHub Actions run and SonarQube analysis for the revision in Chrome.
- **Expected** — Lint, build and backend tests exit 0, baseline suites have no failures, and the configured Quality Gate passes on that revision.
- **Evidence** — Revision, terminal exit codes and totals, hosted run URL, analysis revision and Quality Gate evidence.
- **Related automation** — Existing CI and SonarQube provide a related successful baseline for `1bd7b42`.

### TC-034 load procedure

1. Read the [previous bounded JMeter run](../reports/EC4206_Performance_Security_Usability.md#performance). Arrange approval for per-endpoint p95 and error-rate thresholds, load size and duration before an acceptance run. The historical run does not establish these thresholds.
2. Prepare isolated MongoDB, a valid student session and the Main Library fixture. Also populate the approved number of synthetic events and record both fixture counts. Close unrelated tools and record hardware, versions, start time and any warm-up. In JMeter target the Express server at `127.0.0.1:5000`.
3. Create a Thread Group with one user for the baseline, then a separate run with the agreed ramp-up, concurrency and duration. Create labelled HTTP Request samplers for `GET /api/events` and `POST /api/assistant/chat`. For the second sampler set **Body Data** to `{"message":"What are the library hours?"}` and attach an HTTP Header Manager with JSON Content-Type and a valid disposable student bearer header. Use Chrome's Network panel privately to obtain the header from your own successful assistant request. Do not save it to the evidence folder. Add response assertions for status 200 and the expected event list or Main Library hours. Run baseline and load into distinct JTL files, without response headers or request bodies saved. Keep any token-bearing plan private and remove the token on completion.
4. Use JMeter Aggregate Report or HTML dashboard for each JTL. Record sample count, 95th percentile in milliseconds, throughput in requests per second, and error percentage **per sampler**. Record the baseline and the load separately. Compare only against agreed limits. If approvals are absent, record that as the blocker instead of inferring a pass.

### TC-036 fixed-revision procedure

1. In VS Code record `git rev-parse HEAD` and `git status --short`. Use a revision with unchanged application and CI configuration for the comparison. In the disposable backend terminal (or another terminal with both MongoDB variables set), run `npm run lint`, `npm run build` and `npm --prefix backend test` from the root, one at a time. Record `$LASTEXITCODE` directly after each command, plus regression totals. The backend suites create isolated test databases on the disposable server.
2. Open [EC4206 CI](https://github.com/raveeshajayamaha/smart-campus-assistant_sqa/actions/workflows/ec4206-ci.yml) and [SonarQube Cloud](https://sonarcloud.io/project/overview?id=raveeshajayamaha_smart-campus-assistant_sqa) in Chrome. For a fresh scan, use an authorised Actions re-run for the exact commit if available, and confirm the completed `sonarqube` job produced a matching analysis. Verify the commit in SonarQube Activity and record the gate displayed for that analysis. CI success and the gate are distinct observations. A historical run is useful for comparison. If you cannot run the configured scan or cannot confirm the matching revision, record the blocker rather than carrying forward a historical result.

## 4. Save results and clean up

1. Use [manual screenshots](../evidence/manual/screenshots/) and [manual logs](../evidence/manual/logs/). Use filenames such as `TC-028_YYYY-MM-DD_student-location.png` and `TC-023_YYYY-MM-DD_response.txt`. For a mismatch, preserve the observed result and environment before resetting the fixture. Save multiple filenames separated by line breaks within the evidence cell, using paths relative to the results sheet. Preserve original evidence from Sections 3.1–3.10 in its existing location.
2. Open the CSV in a spreadsheet or VS Code. Fill Date, Tester, Actual Result and Evidence File. Use **Pass** only when all expected checks and variants match, **Fail** for an observed mismatch and **Blocked** when a prerequisite prevented completion. Leave unattempted cases **Not Run**. Put exact observed values and any blocker or defect ID in Comments. Preserve previous attempts in separately dated copies when retesting.
3. After execution, update the matching original case's **Actual result** and **Status** in [the case catalogue](EC4206_Test_Cases.md). Add the evidence reference without changing the existing case ID or expected result. In the [requirements traceability matrix](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix), record manual outcomes against the listed TC IDs. Where a requirement covers several cases, list their statuses separately or summarize counts and link the sheet. Keep existing automated evidence and unattempted IDs intact.
4. Sign out in each Chrome profile, clear this localhost site's browser data and close the temporary profiles. Stop Vite, the loopback API and your disposable MongoDB with **Ctrl+C** in their own terminals. Confirm there are no listeners on 5173, 5000 or 27960 created by the run. In VS Code Explorer, verify the exact private `coverage/manual-mongo-<unique id>` folder printed in Terminal A, then delete that folder only. This removes the synthetic accounts, records and sessions together. Leave every other database and evidence folder intact. If you plan to resume the same run, keep the scratch folder private and restart MongoDB with that same path and port after verifying the process is stopped.
