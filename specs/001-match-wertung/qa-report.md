# 001 — Match-basierte Wertung · QA Report
_Run: 2026-09-13 · Scope: task **BE-1** only · Suite: 82 passed, 0 failed · Build: ok (`tsc --noEmit` clean)_

## Verdict
BE-1 ready to ship — no findings. All eleven `table.check.ts` cases pass, `npx tsc --noEmit` on `server/` is clean, and `buildTable` matches the domain-logic spec in `architecture.md`.

Note on scope: only task **BE-1** (`server/src/services/table.ts` +
`server/src/services/table.check.ts`) was in scope for this run, per the
invocation. Other ticked tasks (BE-2…BE-9, FE-1…FE-6) were **not** re-verified
here; a prior/future QA run should cover them explicitly.

## BE-1 done-when checklist (tasks.md)
| Condition | Result | Evidence |
|---|---|---|
| `npm --prefix server test` grün | pass | `82 passed, 0 failed` (includes all 11 `table.check.ts` tests) |
| Alle elf Fälle aus `architecture.md` § »Domain logic« abgedeckt | pass | `table.check.ts` has exactly 11 `test()` blocks; the 10 named in architecture.md's "Testfälle" bullet list are present verbatim, plus one covering Regel 5 ("Teilnehmer werden aus den Matches abgeleitet …", AC-4.5) |
| `npx tsc --noEmit` sauber | pass | `npx tsc --noEmit -p server/tsconfig.json` exits 0, no output |
| Test-first (tests written before implementation, seen failing for the right reason) | unverifiable | Working directory is not a git repository (confirmed: no `.git`), so there is no commit history to show tests were authored/run before `table.ts` existed. Cannot confirm from static state alone. |

## Acceptance criteria touched by BE-1
(`table.ts` is directly cited as the implementation for AC-4.1–4.3 and part of AC-4.5/AC-3.4 in architecture.md's "AC coverage" table; the remaining ACs belong to other tasks and are out of scope for this run — see "Not verified".)

| AC | Result | Evidence |
|---|---|---|
| AC-4.1 | pass | `table.check.ts:53` "Sieg, Unentschieden und Niederlage ergeben zusammen 4 Punkte (AC-4.1)" — asserts `leaguePoints === 4`, `played === 3` |
| AC-4.2 | pass | `table.check.ts:63` (tie broken by goal difference) and `table.check.ts:76` (tie broken by goals scored when difference is equal too) both pass |
| AC-4.3 | pass | `table.check.ts:87` "vollständiger Gleichstand teilt den Rang, der Folgerang wird übersprungen" — asserts a/b/c all rank 1, d ranks 4 |
| AC-4.5 (partial — `buildTable`'s share only) | pass, with a caveat | `buildTable` has no `entrantIds` parameter, so an entrant with zero matches structurally cannot appear in its output (`table.ts:63-96` builds the table exclusively from a `Map` keyed by the sides seen in the input `matches` array). The test at `table.check.ts:118` only confirms that the two entrants who *did* play both show up — it does not exercise a scenario with a third, never-played entrant, so it doesn't behaviourally demonstrate exclusion, only that inclusion is derived from matches. The exclusion guarantee here rests on the type signature, not on an observed test outcome. The rest of AC-4.5 (a team contributing 0 tournament points overall) depends on `computeStandings`/`board.service.ts` (BE-6), not in scope here. |
| AC-3.4 (partial — `buildTable`'s share only) | pass | `table.check.ts:110` "leere Eingabe ergibt eine leere Tabelle (E-1)" — `buildTable([])` returns `[]`. The "renders without error" half of this AC belongs to `GamePanel.tsx` (FE-5), not in scope here. |

## Edge cases (table.ts's share)
| # | Result | Evidence |
|---|---|---|
| E-1 — Versus-Disziplin ohne Matches | pass | `buildTable([])` → `[]`, `table.check.ts:110` |
| E-2 — Ungleiche Spielzahl | pass | `table.check.ts:99` asserts `a.played === 3`, `b.played === 2` for an unbalanced set, points simply summed, no normalisation |
| E-3 — Drei Teilnehmer vollständig gleich | pass | `table.check.ts:87`, ranks 1,1,1,4 as required |
| E-4 — Match 0:0 | pass | `table.check.ts:37` "0:0 ist ein Unentschieden" — both get 1 league point, 0 goals each |

E-5 through E-8 belong to the `Match` model/service/routes (BE-3–BE-5), not to `table.ts`, so they are out of scope for BE-1 and not evaluated here.

## Findings
None.

## Coverage gaps
None found for BE-1's own surface. The one soft spot is noted above under AC-4.5: the "Teilnehmer werden aus den Matches abgeleitet" test doesn't include a genuinely non-playing entrant in its fixture, so it demonstrates derivation but not exclusion in a way a reader could observe going wrong. This is a minor test-design nit, not a functional gap — the implementation has no code path that could include a non-playing entrant — so it is not raised as a Finding.

## Not verified
- **Test-first workflow for BE-1**: no git history available in this working directory to confirm tests were written and run (failing) before `table.ts` was implemented, as `tasks.md` claims. Would need commit history or a session log.
- **All other tasks ticked in `tasks.md`** (BE-2…BE-9, FE-1…FE-6): not in scope for this invocation (`BE-1` only requested) and therefore not re-verified, even though they are marked done. If sign-off is needed on the whole feature, a separate QA run covering those task IDs (and the remaining ACs: AC-1.1–1.4, AC-2.1–2.7, AC-3.1–3.3, AC-4.4, AC-4.6, and edge cases E-5–E-8) is required.
- **Integration of `buildTable` into `board.service.ts`** (AC-3.3, AC-4.4, AC-4.6): depends on BE-6, out of scope here.
