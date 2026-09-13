# 001 — Match-basierte Wertung · Tasks

Reihenfolge: Backend zuerst, weil `FE-1` die geteilten Typen und die Endpunkte
braucht. `BE-1` ist von allem anderen unabhängig und beweist die Regel, bevor
Infrastruktur entsteht.

## Backend

- [x] **BE-1** Rule-Modul `services/table.ts` mit `services/table.check.ts`
      — _test-first._ Tests zuerst schreiben, laufen lassen, aus dem richtigen
      Grund scheitern sehen, dann implementieren.
      _done when:_ `npm --prefix server test` grün, alle elf Fälle aus
      `architecture.md` § »Domain logic« abgedeckt, `npx tsc --noEmit` sauber.
      _blocks:_ BE-6

- [x] **BE-2** `Game.scoring` in `shared/schemas.ts` und
      `models/game.model.ts`, inklusive der DESC-Invariante als `.refine()` und
      als Mongoose-Validator.
      _done when:_ `POST /api/games` mit `versus` + `ASC` antwortet 400;
      ohne `scoring` wird `'metric'` gespeichert.
      _blocks:_ BE-3, BE-6, FE-2

- [x] **BE-3** `models/match.model.ts` mit `matchSideSchema`, den drei
      `pre('validate')`-Regeln und beiden Indizes; Export im Barrel
      `models/index.ts`.
      _done when:_ Modell compiliert; ein Match mit drei Seiten, mit
      doppeltem Teilnehmer oder mit zu `entrantType` unpassender ID wirft.
      _needs:_ BE-2 · _blocks:_ BE-4

- [x] **BE-4** `services/match.service.ts` — `createMatch`, `listMatches`,
      `deleteMatch`, `matchesByGame`. Letzteres kollabiert `playerId ?? teamId`
      zu `entrantId`, genau wie `score.service.ts` es tut; Typ `RawMatch` in
      `types/index.ts`.
      _done when:_ `matchesByGame` liefert eine Map `gameId → RawMatch[]`,
      Aufrufform identisch zu `scoresByGame`.
      _needs:_ BE-3 · _blocks:_ BE-5, BE-6

- [x] **BE-5** `controllers/match.controller.ts`, `routes/match.routes.ts`,
      eingehängt in `routes/index.ts`; jede Mutation ruft
      `emitBoardUpdate(tournamentId)`. `GET` ohne `gameId` → 400,
      `POST` auf eine metrische Disziplin → 400.
      _done when:_ die drei Endpunkte antworten mit den Codes aus
      `architecture.md` § »API contract«.
      _needs:_ BE-4 · _blocks:_ FE-1

- [x] **BE-6** Board-Verkettung: die Verzweigung in `board.service.ts`,
      `BoardGameEntrySchema.record` und `BoardGameSchema.game.scoring` in
      `shared/schemas.ts`; `ponytail:`-Kommentar in `announce.ts`, der erklärt,
      warum kein neuer Ereignistyp entsteht.
      _done when:_ `GET /api/board/:slug` liefert für eine Versus-Disziplin
      Einträge mit `record` und `value` = Liga-Punkte, für eine metrische
      unverändert ohne `record`; die Aufrufe von `placementPoints` und
      `computeStandings` sind im Diff **unverändert**.
      _needs:_ BE-1, BE-2, BE-4 · _blocks:_ FE-1, FE-5

- [x] **BE-7** `PATCH /api/games/:id` → 409 beim Wechsel der Wertungsart,
      solange Ergebnisse vorliegen (Scores bei `metric`, Matches bei `versus`).
      _done when:_ der Wechsel an einer Disziplin mit Ergebnis antwortet 409 und
      ändert nichts; an einer ohne Ergebnis geht er durch.
      _needs:_ BE-2, BE-4

- [x] **BE-8** `seed.ts` ergänzt eine Versus-Disziplin mit vier bis sechs
      Matches, damit die Tabelle ohne Handarbeit im Browser sichtbar ist.
      _done when:_ `npm --prefix server run seed -- --yes` legt sie an und
      `GET /api/board/:slug` zeigt eine gefüllte Tabelle.
      _needs:_ BE-6

- [x] **BE-9** Die DESC-Invariante aus AD-5 auch über zwei Requests hinweg
      erzwingen. Zod sieht nur einen Request, und `pre('validate')` feuert nicht
      bei `findByIdAndUpdate` — also in `updateGame` laden, ändern, `save()`,
      oder ein `pre('findOneAndUpdate')`-Hook.
      _done when:_ `PATCH /api/games/:id` mit `primaryMetric.sortOrder: 'ASC'`
      auf eine bestehende Versus-Disziplin antwortet 400 und ändert nichts;
      ein Testfall deckt den Zwei-Schritt-Weg ab.
      _needs:_ BE-2, BE-7

## Frontend

- [x] **FE-1** `lib/api.ts` um die drei Match-Endpunkte erweitern (jede Antwort
      Zod-geparst, wie alle übrigen); `hooks/index.ts` um
      `queryKeys.matches(gameId)`, `useMatches`, `useCreateMatch`,
      `useDeleteMatch` mit Invalidierung von `matches` und `board`.
      _done when:_ `npx tsc --noEmit` sauber, Hooks folgen dem Muster der
      Score-Hooks.
      _needs:_ BE-5, BE-6 · _blocks:_ FE-3, FE-4

- [x] **FE-2** `GameFormModal.tsx` — Auswahl der Wertungsart; bei `versus` ist
      `sortOrder` auf `DESC` gesetzt und das Feld deaktiviert (AC-1.1).
      _done when:_ eine Versus-Disziplin ist über die Oberfläche anlegbar und
      `sortOrder` lässt sich dabei nicht verstellen.
      _needs:_ BE-2 · _kann parallel zu FE-1 laufen_

- [x] **FE-3** `components/control/MatchFormModal.tsx` — zwei
      Teilnehmer-Selects, zwei Zahlenfelder, Vorbild `ScoreFormModal.tsx`.
      Derselbe Teilnehmer auf beiden Seiten wird im Formular verhindert, nicht
      erst vom Server.
      _done when:_ Laden, Fehler und gefüllter Zustand vorhanden; ein Match ist
      erfassbar und erscheint danach in der Liste.
      _needs:_ FE-1

- [x] **FE-4** `pages/Scoring.tsx` — verzweigt je `game.scoring` auf
      `ScoreFormModal` oder `MatchFormModal` (AC-2.6); Liste der erfassten
      Matches mit Löschen, analog zum bestehenden Score-Undo; Leerzustand
      »Noch kein Spiel erfasst«.
      _done when:_ alle vier Zustände vorhanden, Löschen funktioniert, das Board
      im zweiten Tab folgt ohne Reload.
      _needs:_ FE-3

- [x] **FE-5** `components/board/GamePanel.tsx` — Versus-Zweig mit der
      Mini-Tabelle (Rang · Name · Sp · Pkt · ±), Maße über `--u`, metrischer
      Zweig unverändert; Leerzustand für eine Disziplin ohne Match (AC-3.4).
      _done when:_ `npm run build` sauber, beide Kartenarten stehen
      gleichzeitig auf dem Board.
      _needs:_ BE-6

- [x] **FE-6** `ScoreFormModal.tsx` unterstützt beide Turniermodi. Das Modal
      setzt `entrantType` heute fest auf `'player'` und hat keine Teamauswahl;
      seit FE-4 öffnet `Scoring.tsx` es auch für metrische Disziplinen in
      Team-Turnieren, wo es dadurch keinen gültigen Score absenden kann. Nach
      `tournament.mode` verzweigen, so wie `MatchFormModal` es bereits tut.
      _done when:_ in einem Turnier mit `mode: 'team'` lässt sich für eine
      metrische Disziplin ein Score erfassen; `entrantType` folgt
      `tournament.mode`.
      _needs:_ FE-4
