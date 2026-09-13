# 001 — Match-basierte Wertung

| Phase | State | Signed off | Note |
|---|---|---|---|
| requirements | approved | 2026-09-13 | Aus dem Interview geschrieben, nicht über `/requirements` |
| architecture | approved | 2026-09-13 | AD-1 bis AD-6 ohne Änderung bestätigt |
| frontend | approved | 2026-09-13 | FE-1 bis FE-6, `tsc`/`lint`/`build` sauber |
| backend | approved | 2026-09-13 | BE-1 bis BE-9, 82/82 Tests, `tsc` sauber |
| qa | approved | 2026-09-13 | Volllauf ohne Blocker und Majors, ein Minor (F-1) |

## Freigabe

Beide Spec-Dateien entstanden aus einer Befragung, die im Gespräch schon
stattgefunden hat, statt über `/requirements` und `/architecture`. Die ADR in
`architecture.md` halten auch die **verworfenen** Optionen fest — Free-for-all,
Spielplan-Generator, konfigurierbare Punktevergabe, reines Siegzählen, ASC für
Versus-Disziplinen, Siege als Term in der Gesamtwertung —, damit sie nicht in
der nächsten Sitzung erneut vorgeschlagen werden.

Drei Punkte, die beim Schreiben der Spec dazukamen und nicht im Plan standen:

- `Game.scoring` nachträglich zu wechseln macht vorhandene Ergebnisse
  unsichtbar, ohne sie zu löschen → AC-1.4 und E-6 fordern 409.
- `buildTable` leitet die Teilnehmer aus den Matches ab, statt sie übergeben zu
  bekommen — konsistent mit `rankScores` und Voraussetzung für AC-4.5.
- Die Tordifferenz wird nicht übertragen, sondern im Client gerechnet.

## Reihenfolge

Dieses Feature ist ohne 002 lauffähig und bewusst zuerst dran: es ist rein
additiv und mit dem bestehenden `ADMIN_PIN` testbar. 002 berührt dagegen jeden
Controller und muss warten, bis 001 committet ist.

## QA-Ergebnis des Volllaufs

`qa-report.md` auf der Platte enthält **nur den Teillauf zu BE-1** — eine
spätere Invokation mit Task-ID hat die Datei überschrieben, während die
Argument-Übergabe der Skills geprüft wurde. Das Ergebnis des vorangegangenen
Volllaufs steht deshalb hier:

| | Gesamt | mit Testbeleg | per Codelesung | unverifizierbar | **fehlgeschlagen** |
|---|---|---|---|---|---|
| Akzeptanzkriterien | 21 | 13 | 7 | 1 | **0** |
| Edge Cases | 8 | 5 | 2 | 1 (per Design) | **0** |

Suite 82/82, `tsc --noEmit` sauber, `npm run build` sauber, `npm run lint`
sauber. Verdikt: ready to ship.

**F-1 (minor, Backend):** `match.model.ts`'s `pre('validate')`,
die Refines in `SubmitMatchSchema`, `match.service.ts`, `match.controller.ts`
und der 409-Zweig in `game.service.ts` haben keinen automatisierten Test. Die
Regeln wurden von Hand durchgegangen, kein Fehler gefunden — eine
Abdeckungslücke, kein Verdacht. Entspricht dem Stand, den `Score` heute hat.

**AC-2.7 unverifizierbar:** Board-Aktualisierung ohne Reload. Der Mechanismus
ist belegt (`match.controller.ts` ruft `emitBoardUpdate` nach Anlegen und
Löschen, derselbe Pfad wie bei Scores); der Nachweis braucht zwei Browser-Tabs
gegen einen laufenden Server.

Wer den Vollbericht als Datei braucht: `/qa 001-match-wertung` ohne Task-ID
erneut laufen lassen.

## Korrekturen während des Baus

- `.gitignore` enthielt nach dem ersten Backend-Lauf `specs` — nicht beauftragt,
  im Bericht nicht erwähnt, zurückgesetzt.
- `architecture.md`: der Default für `scoring` gehört an `CreateGameSchema`,
  nicht an `GameFields` — sonst leckt er über `.partial()` in
  `UpdateGameSchema` (`KONVENTIONEN.md` §5 Regel 4).
- `AC-3.1`: »Siege« → »Spielzahl«. `Pkt` ist ohne Unentschieden genau
  `3 × Siege`, die Spielzahl dagegen aus nichts anderem auf der Karte ablesbar.
- Zwei Aufgaben ergänzt: `BE-9` (DESC-Invariante über zwei Requests) und
  `FE-6` (`ScoreFormModal` für Team-Turniere — eine Regression aus FE-4).
