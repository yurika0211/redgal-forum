# Manual Checklist (Route x Breakpoint)

Validation date: 2026-04-13
Viewport matrix: 375 / 640 / 768 / 980 / 1280
Routes: /, /stories, /forum, /anonymous, /space, /gallery, /login, /admin

Legend:
- Overflow: PASS = no obvious horizontal overflow in screenshot viewport
- Overlap: PASS = no visible card overlap in screenshot viewport

## Home (`/`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/home-375.png` | PASS | PASS | Cards aligned.
| 640 | `screens/home-640.png` | PASS | PASS | Cards aligned.
| 768 | `screens/home-768.png` | PASS | PASS | Cards aligned.
| 980 | `screens/home-980.png` | PASS | PASS | Floating notice modal present (expected overlay, not card collision).
| 1280 | `screens/home-1280.png` | PASS | PASS | Floating notice modal present (expected overlay, not card collision).

## Stories (`/stories`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/stories-375.png` | PASS | PASS | Main card stack stable.
| 640 | `screens/stories-640.png` | PASS | PASS | Main card stack stable.
| 768 | `screens/stories-768.png` | PASS | PASS | Main card stack stable.
| 980 | `screens/stories-980.png` | PASS | PASS | Main card stack stable.
| 1280 | `screens/stories-1280.png` | PASS | PASS | Main card stack stable.

## Forum (`/forum`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/forum-375.png` | PASS | PASS | Card list and composer stable.
| 640 | `screens/forum-640.png` | PASS | PASS | Card list and composer stable.
| 768 | `screens/forum-768.png` | PASS | PASS | Card list and composer stable.
| 980 | `screens/forum-980.png` | PASS | PASS | Card list and composer stable.
| 1280 | `screens/forum-1280.png` | PASS | PASS | Card list and composer stable.

## Anonymous (`/anonymous`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/anonymous-375.png` | PASS | PASS | Unauthenticated login card shown.
| 640 | `screens/anonymous-640.png` | PASS | PASS | Unauthenticated login card shown.
| 768 | `screens/anonymous-768.png` | PASS | PASS | Unauthenticated login card shown.
| 980 | `screens/anonymous-980.png` | PASS | PASS | Unauthenticated login card shown.
| 1280 | `screens/anonymous-1280.png` | PASS | PASS | Unauthenticated login card shown.

## Space (`/space`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/space-375.png` | PASS | PASS | Unauthenticated login card shown.
| 640 | `screens/space-640.png` | PASS | PASS | Unauthenticated login card shown.
| 768 | `screens/space-768.png` | PASS | PASS | Unauthenticated login card shown.
| 980 | `screens/space-980.png` | PASS | PASS | Unauthenticated login card shown.
| 1280 | `screens/space-1280.png` | PASS | PASS | Unauthenticated login card shown.

## Gallery (`/gallery`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/gallery-375.png` | PASS | PASS | Curation cards align; no overlap.
| 640 | `screens/gallery-640.png` | PASS | PASS | Curation cards align; no overlap.
| 768 | `screens/gallery-768.png` | PASS | PASS | Curation cards align; no overlap.
| 980 | `screens/gallery-980.png` | PASS | PASS | Curation cards align; no overlap.
| 1280 | `screens/gallery-1280.png` | PASS | PASS | Curation cards align; no overlap.

## Login (`/login`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/login-375.png` | PASS | PASS | Login card stable.
| 640 | `screens/login-640.png` | PASS | PASS | Login card stable.
| 768 | `screens/login-768.png` | PASS | PASS | Login card stable.
| 980 | `screens/login-980.png` | PASS | PASS | Login card stable.
| 1280 | `screens/login-1280.png` | PASS | PASS | Login card stable.

## Admin (`/admin`)
| width | screenshot | overflow | overlap | notes |
|---|---|---|---|---|
| 375 | `screens/admin-375.png` | PASS | PASS | Entry/empty state only.
| 640 | `screens/admin-640.png` | PASS | PASS | Entry/empty state only.
| 768 | `screens/admin-768.png` | PASS | PASS | Entry/empty state only.
| 980 | `screens/admin-980.png` | PASS | PASS | Entry/empty state only.
| 1280 | `screens/admin-1280.png` | PASS | PASS | Entry/empty state only.

## Notes
- `/space` advanced authenticated editor/multi-column states are not reachable in static preview without backend/session; this checklist validates the route-level card layout and unauthenticated card state.
- `/gallery` wall/curation visible states were captured and show no visible card overlap after stagger reduction.
