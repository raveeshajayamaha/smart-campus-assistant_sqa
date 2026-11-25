# EC4206 submission checklist

## Verified and ready for review

- [x] Sections 3.1–3.10 reviewed and indexed in the [final report](EC4206_Final_Report.md).
- [x] [Requirements traceability](../test-plans/EC4206_Test_Plan.md#8-requirements-to-test-traceability-matrix) records manual and automated outcomes.
- [x] [New automation report](EC4206_Automated_Execution_Results.md) traces all 35 requested cases, with per-case timestamps, API logs and 11 Chrome screenshots for TC-002 through TC-033.
- [x] [Existing suite reruns](EC4206_Automated_Execution_Results.md#existing-suite-reruns) preserve historical artifacts and show zero failures.
- [x] Archived exact-revision CI and Quality Gate evidence, five open findings and one analysis warning documented. [Quality report](EC4206_SonarQube_Quality_Metrics.md)
- [x] [Publication preflight audit](../evidence/catalogue/20261125-061344291/publication-audit.txt) checked tracked and unignored paths and common secret signatures. The candidate review remains required below.

## Pending evidence and decisions

| Item | Owner and outstanding work |
|---|---|
| Manual coursework evidence | Tester verifies the assignment's required manual coverage against the [manual guide](../test-cases/EC4206_Manual_Execution_Guide.md). TC-002 is the next manual case. TC-005 requires token format and identity checks. Original registration screenshot, execution date and detailed API observations were not supplied. If required, conduct a dated retest with new synthetic data. |
| TC-034 performance acceptance | Group or instructor approves per-endpoint p95 and error-rate thresholds and the workload before retesting both endpoints and retaining a fresh JTL and aggregate results. |
| TC-035 peer keyboard usability | Peer uses Tab and Shift+Tab to reach search, finds Main Library, and reads its hours. Record focus screenshots and dated participant observations. |
| TC-036 hosted repeatability | Authorized account reruns the fixed revision and captures the matching workflow jobs, artifacts, SonarQube Activity and gate. |
| Section 3.9 visual evidence | Capture Overview, Overall Code or Measures, Issues, Activity, background warning text if available, and the completed GitHub Actions summary with backend LCOV. Saved API JSON supports the historical claims. |
| Defect tracking evidence | Verify whether the marking brief requires published GitHub issues. If it does, obtain permission to publish the existing drafts and record their real links. |
| Final package | Confirm cover-page details, group contributions, format and sign-off against the brief. Review all staged paths and redactions, especially generated JMeter assets and local evidence. Exclude databases, dependencies, build output, local configuration and secrets. Commit or push only after explicit authorization. |

The assignment marking brief was unavailable in the reviewed files. The table lists evidence required by the existing execution guide and report, plus decisions the group must confirm with the brief.

