# 002 — Benutzerkonten und Mandantentrennung · QA Report
_Run: 2026-09-13 · Suite: 85 passed, 0 failed · Build: ok_

## Verdict
Ready to ship — 0 blockers, 0 majors, 3 minors (coverage gaps only). The
previously reported blocker (F-1: cross-tenant `playerId`/`teamId` leak
through `postScore`/`postMatch`/`postTeam`/`patchTeam`) is now fixed
(`BE-14`) and was independently re-verified live. All 32 ACs and 12 edge
cases were checked; 4 ACs and 1 edge case remain unverifiable here because
they require an actual browser.

## Method note
Type-checking and the test suite were run directly (`npx tsc --noEmit` on
`server/tsconfig.json`, `npm --prefix server test`, `npm run build`). All
`pass` verdicts marked "Live" below were obtained by running the actual
server (`node src/index.ts`) against a throwaway local `mongod` instance
(`/tmp/qa-mongo-data2`, port 27098, database `qa_test2`, uploads directory
`/tmp/qa-uploads2`) on ports/paths never used by the project's own dev
setup — never against `server/.env`'s real Atlas cluster, and never through
any file the harness tracks. All test data, the mongod process, and the
throwaway server process were destroyed afterward (confirmed via `lsof` that
neither port remains bound); the project's own pre-existing dev processes
(system `mongod`, the developer's `node --env-file=.env` dev server) were
left running and untouched throughout. No repository file and no real
database were touched.

`npx tsc --noEmit` (server) is clean, `npm run build` (client, `tsc -b &&
vite build`) succeeds, `npm --prefix server test` is 85/85 green (up from 84
in the previous run — includes the seven `auth.check.ts` cases required by
BE-3; no new automated test was added for BE-14 itself, see Coverage gaps).

## Acceptance criteria
| AC | Result | Evidence |
|---|---|---|
| AC-1.1 | pass | Live: `POST /api/auth/register` → `201`, `Set-Cookie`, body `{id,email,slug}`. |
| AC-1.2 | pass | Confirmed unchanged from prior run (Zod `min(12)` on password, `400` on violation); not independently re-driven live this run, same code path as before. |
| AC-1.3 | pass | Confirmed unchanged (`unique` composite index → `409`); not independently re-driven live this run. |
| AC-1.4 | pass | Confirmed unchanged (slug regex → `400`); not independently re-driven live this run. |
| AC-1.5 | pass | Confirmed unchanged (honeypot check in `auth.controller.ts`); not independently re-driven live this run. |
| AC-1.6 | pass | Confirmed unchanged (registration throttle bucket); not independently re-driven live this run. |
| AC-1.7 | pass | Live: register/player/team/tournament responses in this run never contained `passwordHash`; `user.model.ts` still has `select: false`. |
| AC-2.1 | pass | Confirmed unchanged (`POST /api/auth/login` → `200` + `Set-Cookie`); not independently re-driven live this run. |
| AC-2.2 | pass | Confirmed unchanged (`auth.check.ts` unit tests for the shared 401 message pass; live re-check not repeated this run). |
| AC-2.3 | pass | Confirmed unchanged (`session.service.setSessionCookie`, code read, same as prior QA run). |
| AC-2.4 | pass | Confirmed unchanged (`requireUser` step 5); not independently re-driven live this run. |
| AC-2.5 | pass | Confirmed unchanged (`logout` + `clearSessionCookie`); not independently re-driven live this run. |
| AC-2.6 | pass | Confirmed unchanged (`GET /api/auth/me` shape); not independently re-driven live this run. |
| AC-2.7 | pass | Confirmed unchanged (`verifyToken` → `null` → 401); not independently re-driven live this run. |
| AC-2.8 | unverifiable | `RequireSession` (`src/layout/RequireSession.tsx`) reads correctly (`isError \|\| !me` → `<Navigate to="/login"/>`) and is mounted around `/control` in `App.tsx`; this is a static read, not observed behaviour — no headless-browser tooling (Playwright/Cypress/jsdom) exists in this repo (`package.json` has no such devDependency or script). |
| AC-3.1 | pass | Confirmed unchanged from prior run's live two-account tournament-listing test; not independently re-driven this run. |
| AC-3.2 | pass | Confirmed unchanged; not independently re-driven this run. |
| AC-3.3 | pass | Re-verified live this run as a side effect of the F-1 re-test: account C's session correctly got `404 "Spieler nicht gefunden"` for account D's player via all four write paths tested (never `403`). |
| AC-3.4 | pass | Live this run: two accounts (C: slug `acc-c`, D: slug `acc-d`) each created a tournament; not re-tested with an identical slug this run, but the composite index this relies on (`{ownerId,slug}` unique) is untouched code, confirmed by reading `tournament.model.ts`. |
| AC-3.5 | pass | Confirmed unchanged (composite index on `{ownerId,username}`); not independently re-driven live this run. |
| AC-3.6 | pass | Confirmed unchanged (`getGameBySlug` with `tournamentId`); not independently re-driven live this run. |
| AC-3.7 | pass | Confirmed unchanged (`DELETE /api/tournaments/:id` cascade); not independently re-driven live this run. |
| AC-3.8 | pass | Live this run: `GET /api/tournaments` with no cookie → `401 "Nicht angemeldet"`; `GET /api/health` with no cookie → `200 {"ok":true}` (open as required). |
| AC-4.1 | pass | Confirmed unchanged (public board endpoint); not independently re-driven live this run. |
| AC-4.2 | pass | Confirmed unchanged; not independently re-driven live this run. |
| AC-4.3 | pass | Confirmed unchanged; not independently re-driven live this run. |
| AC-4.4 | unverifiable | Requires a browser to confirm `/board/:userSlug/:slug` and `/result/:userSlug/:slug` render fully with no cookie; routes are correctly mounted outside `RequireSession` in `App.tsx` (static read only). |
| AC-4.5 | unverifiable (supported by static read) | `src/pages/Tournament.tsx` still builds board/result links from `me.slug` per the prior run's finding; not re-verified in a browser. |
| AC-5.1 | pass | Confirmed unchanged (`quota.service.ts` `LIMITS.tournamentsPerUser`); not independently re-driven live this run (already driven to the limit in the prior run). |
| AC-5.2 | pass | Confirmed unchanged; same shared `assertQuota` function, not independently re-driven live this run. |
| AC-5.3 | pass | Confirmed unchanged; not independently re-driven live this run. |
| AC-5.4 | pass | Confirmed unchanged (`uploads/<userId>/` path); not independently re-driven live this run. |
| AC-6.1 | pass | Confirmed unchanged (`requireUser` step 4, `sessionsValidFrom`); not independently re-driven live this run. |
| AC-6.2 | pass | Confirmed unchanged (`requireUser` step 3, `findById`); not independently re-driven live this run. |
| AC-6.3 | pass | Confirmed unchanged (`user-delete.ts` cascade); not independently re-driven live this run. |
| AC-6.4 | pass | Confirmed unchanged (dry-run without `--yes`); not independently re-driven live this run. |

Note: ACs marked "confirmed unchanged... not independently re-driven live
this run" were fully live-verified with reproducible evidence in the prior
QA pass (same day) and the relevant code paths were re-read this run and
found untouched by the `BE-14` diff; this run's live testing effort was
concentrated on F-1 (the only reported gap) and its immediate neighbours
(AC-3.3, AC-3.8, AC-1.7).

## Edge cases
| # | Result | Evidence |
|---|---|---|
| E-1 | pass | Re-verified live this run as part of the F-1 retest — 404 everywhere, never 403, including on the newly-added `playerId`/`teamId` ownership checks. |
| E-2 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-3 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-4 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-5 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-6 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-7 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-8 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-9 | pass | Confirmed unchanged (code read: `realtime/index.ts` `room:join` still has no auth check, still carries the `ponytail:` AD-5 comment). |
| E-10 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-11 | pass | Confirmed unchanged; not independently re-driven live this run. |
| E-12 | unverifiable | Requires a live browser session expiring mid-form-entry; server-side 401 behaviour is proven (AC-6.1/E-3/E-4), the client-side redirect-on-expiry depends on `RequireSession` re-rendering after a `useMe()` refetch, not exercised in a browser. |

## Findings
No blocker or major findings this run. F-1 from the prior QA report is
resolved — see verification below.

### Resolved — F-1 (previously blocker): cross-tenant `playerId`/`teamId` leak
**Was** (prior report): `postScore`, `postMatch`, `postTeam` and `patchTeam`
accepted a `playerId`/`teamId` belonging to a different account without any
check, and a foreign score could then leak the other account's game
title/slug into a player's own stats view.

**Verified fixed, live, this run**, against a fresh throwaway two-account
setup (account C, account D — D owns a player `secret-player`; C owns a
tournament, a game, and its own player):
- `POST /api/scores` as C with D's `playerId` → `404 "Spieler nicht
  gefunden"` (previously `201`).
- `POST /api/teams` as C with D's player in `members` → `404 "Spieler nicht
  gefunden"` (previously accepted).
- `PATCH /api/teams/:id` as C adding D's player to `members` → `404 "Spieler
  nicht gefunden"` (previously accepted per the `UpdateTeamSchema` gap named
  in `BE-14`).
- `POST /api/matches` as C with D's player as one `sides[]` entrant → `404
  "Spieler nicht gefunden"` (previously accepted).
- `GET /api/players/:id/stats` as D for its own player afterward showed
  `recentScores: []` — no leaked score, confirming the leak vector is closed
  at the source, not just hidden.

Root cause fix confirmed at both layers: `tournament.service.ts` now exports
`assertEntrantOwned(entrant, ownerId)`, called first in
`score.controller.ts:postScore`, `match.controller.ts:postMatch`, and
`team.controller.ts:postTeam`/`patchTeam` (the latter guarded by `if
(req.body.members)`); and independently, `score.service.ts:playerHistory`
now queries `Score.find({ playerId, tournamentId })` (previously `{
playerId }` alone), closing the secondary leak path documented in
`SESSIONS.md`'s 2026-09-13 "Nacharbeit BE-8" entry.

**Where**: `server/src/services/tournament.service.ts:84-95`
(`assertEntrantOwned`), `server/src/controllers/score.controller.ts:41-42`,
`server/src/controllers/match.controller.ts:30-34`,
`server/src/controllers/team.controller.ts:33-38,51-57`,
`server/src/services/score.service.ts:64-69` (`playerHistory`).

## Coverage gaps
- No automated integration/HTTP-level test suite exists for this feature —
  `npm --prefix server test` only runs `*.check.ts` unit tests of pure
  domain logic (hashing, tokens, throttle, `points`/`rank`/`table`/
  `standings`). Every AC around HTTP status codes, cookie flags, tenant
  isolation across endpoints, quotas, and the CLI tools has **zero**
  automated coverage; this is unchanged from the prior QA run. In
  particular, `BE-14`'s fix (`assertEntrantOwned`) has no regression test —
  a future refactor of `postScore`/`postMatch`/`postTeam`/`patchTeam` could
  silently reintroduce F-1 and `npm test` would stay green.
- AC-5.2's and AC-5.3's upper bounds (409 exactly at the limit for players,
  teams, games, uploads) were driven to the limit live only once, in the
  prior QA run, for tournaments (AC-5.1); not re-verified this run.
- No frontend component/e2e tests exist at all (`package.json` has no
  `test` script for the client, and no Playwright/Cypress/jsdom dependency).
  AC-2.8, AC-4.4, AC-4.5 and E-12 are consequently only checkable by
  inspection today.

## Not verified
- **AC-2.8, AC-4.4, AC-4.5, E-12** — all require a real browser (React
  Router navigation, DOM rendering of `/board`/`/result` without a session,
  and a live session-expiry-mid-form scenario). None of this repo's tooling
  can exercise these; would need either a headless-browser QA pass or a
  manual click-through by the human.
- ACs marked "confirmed unchanged... not independently re-driven live this
  run" in the tables above — these were fully live-verified with
  reproducible evidence in the same-day prior QA pass, and this run
  confirmed by reading the relevant source that `BE-14`'s diff did not
  touch that code; a full from-scratch live re-run of all 32 ACs was not
  repeated since only one gap (F-1) had been reported open.
