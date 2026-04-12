# AC Traceability Matrix

## Sprint
- `sprint_id`: `20260412-card-unify-harness`
- `date`: `2026-04-13`

## Mapping (AC1..AC6 -> exact evidence)

| AC | Frozen criterion | Evidence (exact file:line) | Verdict |
|---|---|---|---|
| AC1 | Build gate passes (`npm run build` runs typecheck + vite build and finishes successfully). | `evidence/build.log:2-3`, `evidence/build.log:6-7`, `evidence/build.log:86` | PASS |
| AC2 | Frozen card baseline classes exist (`.ui-card-panel`, `.ui-card-sub`, `.ui-card-interactive`) with hover/breakpoint rules. | `evidence/card-baseline-css.log:8-20`, `evidence/card-class-after.log:8-22` | PASS |
| AC3 | Target page coverage exists with count `>=1` for Home/Stories/Forum/Anonymous/Space/Gallery/Login/Portal. | `evidence/page-card-coverage.log:1-8` | PASS |
| AC4 | Target shared-component coverage exists with count `>=1` for AuthPanel/ForumProgressPanel/GalleryShowcase/PaginationBar. | `evidence/component-card-coverage.log:1-4` | PASS |
| AC5 | Route x viewport manual checks all PASS for `overflow` and `overlap`. | `evidence/manual-checklist.md:4-5`, `evidence/manual-checklist.md:14-18`, `evidence/manual-checklist.md:23-27`, `evidence/manual-checklist.md:32-36`, `evidence/manual-checklist.md:41-45`, `evidence/manual-checklist.md:50-54`, `evidence/manual-checklist.md:59-63`, `evidence/manual-checklist.md:68-72`, `evidence/manual-checklist.md:77-81` | PASS |
| AC6 | Evidence completeness and explicit limitation note: every matrix row points to screenshot files; `/space` authenticated advanced states not covered is documented. | `evidence/manual-checklist.md:12-13`, `evidence/manual-checklist.md:14-81`, `evidence/manual-checklist.md:84-85` | PASS |

## Notes
- This traceability file restores evaluator-required AC linkage only; no source-code behavior changes were applied in this rework.
