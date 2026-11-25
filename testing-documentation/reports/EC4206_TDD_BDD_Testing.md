# EC4206 Section 3.5 — TDD and BDD

## Scope and outcome

The React assistant sends campus questions to an Express route. The route queries MongoDB through Mongoose and formats replies from campus records. The backend uses CommonJS and the built-in Node test runner. This section demonstrates a complete TDD cycle for the upcoming-events fallback and provides two Cucumber business scenarios. Both Cucumber scenarios passed against an isolated MongoDB database.

## 1. Test-driven development

TDD uses a failing test to specify a change, implements the minimum behaviour to pass it, then refactors while retaining the same tests. The built-in `node:test` runner and strict assertions are appropriate because the formatter takes an array and returns text. It can be tested without starting Express, connecting to MongoDB or adding a test dependency. The existing backend test script discovers the new unit test automatically.

### Behaviour and acceptance criteria

The upcoming-events route queries for future events. When that query is empty, it queries for recent records. Before the change, the fallback always introduced a list of recent events, even when that second query also returned no records.

| Test | Requirement | Acceptance criterion |
|---|---|---|
| TDD-01 | FR-10 | With no recent records, return an Events heading and exactly “There are no upcoming events at the moment.” |
| TDD-02 | FR-09 | With recent records, preserve the original introduction and the supplied order, Colombo date formatting, time, location and description. |

The criteria were specified before the Red run. Authentication, database schemas, queries, ordering and source selection were outside the change.

### Red, Green and Refactor evidence

The same command ran from the project root at each phase. PowerShell `Tee-Object` saved each run to its own evidence file.

```powershell
node --test --test-reporter=tap backend/tests/upcoming-event-fallback.test.js
```

| Phase | Implementation at execution | Actual result | Evidence |
|---|---|---|---|
| Red | Extracted the existing fallback formatting into a pure helper and connected the route to it. The extraction preserved the original output. Added TDD-01 and TDD-02 before implementing the new response. | Exit 1. **1 passed, 1 failed, 0 skipped**. TDD-01 failed with an assertion showing the unwanted list introduction. TDD-02 passed. | [Red TAP](../evidence/EC4206_TDD_Red.tap) |
| Green | Added an early return for an empty records array. The historical-event implementation and assertions were unchanged. | Exit 0. **2 passed, 0 failed, 0 skipped**. | [Green TAP](../evidence/EC4206_TDD_Green.tap) |
| Refactor | Shared the opening text and constructed the nonempty reply from a heading and formatted details joined by line breaks. The tests and expected replies stayed the same. | Exit 0. **2 passed, 0 failed, 0 skipped**. | [Refactor TAP](../evidence/EC4206_TDD_Refactor.tap) |

The relevant files are the [assistant route](../../backend/routes/assistantRoutes.js), [formatter](../../backend/lib/upcomingEventFallback.js) and [unit tests](../../backend/tests/upcoming-event-fallback.test.js). The Red failure was the expected discrepancy for the prior implementation. The full regression after refactoring passed.

## 2. Behaviour-driven development with Cucumber

BDD describes business outcomes in shared language. The [Gherkin feature](../../backend/features/campus-information.feature) uses Given to establish state, When to describe an action and Then and And to verify outcomes. The [Cucumber step definitions](../../backend/features/step-definitions/campus-information.steps.js) start Express on a loopback port and call its real HTTP endpoints.

| Scenario | Requirement | Expected outcome | Actual result | Status |
|---|---|---|---|---|
| BDD-01 Administrator updates library opening hours | FR-06, FR-08, FR-09 | The updated location appears with the new hours in the student-facing API. The assistant returns the same hours and cites the same MongoDB location ID. | Verified the new hours in both API responses and the matching location ID in the assistant sources. | Pass |
| BDD-02 Student asks about upcoming events in an empty catalogue | FR-10 | With no events in the database, the assistant reports that no upcoming events are available and returns an empty sources array. | Verified the exact no-upcoming-events reply and an empty sources array. | Pass |

The steps register synthetic accounts and sign in through the API. Fixture setup promotes the synthetic administrator in MongoDB. The scenario itself creates and updates the library through Express. The database guard requires a single local MongoDB endpoint and checks a randomly named `campus_bdd_test_` database before fixture writes. Scenario cleanup tracks only the records it creates. The feature checks the API consumed by React. Browser rendering is outside this scenario.

### Dependency and execution status

Cucumber.js 12.9.0 is pinned as a backend development dependency and recorded in the backend lockfile. The workspace uses Node 25.6.0, which the versioned manifest lists among tested versions. [Cucumber.js 12.9.0 manifest](https://raw.githubusercontent.com/cucumber/cucumber-js/v12.9.0/package.json)

The initial installation attempts failed with `ENOTFOUND`. After network access was restored, the following command succeeded using the official npm registry. The current and historical logs preserve both outcomes. [Successful installation log](../evidence/EC4206_Cucumber_Install_Retry.txt) · [Earlier installer evidence](../evidence/EC4206_Cucumber_Install.txt)

```powershell
npm.cmd --prefix backend install --save-dev --save-exact --ignore-scripts --no-audit --no-fund --fetch-retries=0 --registry=https://registry.npmjs.org/ @cucumber/cucumber@12.9.0
npm.cmd --prefix backend run test:bdd
```

The backend script explicitly selects the existing feature and step-definition files and uses Cucumber's summary formatter. Cucumber exited with code 0. **Two scenarios passed, zero failed, zero were skipped, and zero were blocked. All nine steps passed.** The original Gherkin and assertions were used for this run. [Cucumber execution evidence](../evidence/EC4206_Cucumber_Run.txt)


## 3. Regression, traceability and conclusion

After checking that the configured database was local, the full regression executed using:

```powershell
npm.cmd --prefix backend test
```

The regression rerun after the Cucumber installation exited with code 0. Node reported **66 passed, 0 failed and 0 skipped**, including parent tests. The total matched the earlier post-TDD run. Cucumber is a separate runner and its scenarios are outside this total. [Regression rerun](../evidence/EC4206_TDD_BDD_Regression_Rerun.txt) · [Earlier post-TDD regression](../evidence/EC4206_TDD_BDD_Regression.txt)

The [test plan](../test-plans/EC4206_Test_Plan.md) links TDD-01, TDD-02, BDD-01 and BDD-02 without renumbering earlier IDs. TC-001 passed by user confirmation. TC-005 has a partial login observation, and its formal status is Not Run. The other 34 manual cases remain Not Run. The fallback behaviour has reproducible Red, Green and Refactor evidence. Section 3.5 is complete with the verified Cucumber run and backend regression evidence. The fresh Cucumber rerun passed both scenarios. TC-028 separately verified library-hours propagation through the real admin and student interfaces. [Automated catalogue results](EC4206_Automated_Execution_Results.md)
