# 001 — Match-basierte Wertung

## Problem

`Score` ist ein einseitiger Datensatz: ein Teilnehmer, eine absolute Zahl,
bester Wert gewinnt. Für Mario Kart passt das, für Rocket League, FIFA und
Tekken nicht. »Team A 3:1 Team B« ist **eine** Tatsache über **zwei**
Teilnehmer, und die entscheidende Information — der Sieg — steht in keiner der
beiden Zahlen. Zusätzlich kollabiert `rankScores` auf den besten Versuch je
Teilnehmer, während bei Matches jedes einzelne zählen muss.

Der Veranstalter kann heute also kein Turnier durchführen, in dem Teams direkt
gegeneinander spielen, ohne die Wertung von Hand nebenher zu führen.

## Scope

### In

- Eine Disziplin ist entweder metrisch (wie bisher) oder eine Versus-Disziplin.
- Erfassen und Löschen einzelner Match-Ergebnisse mit zwei Seiten und je einem
  Wert.
- Tabelle je Versus-Disziplin: 3 Punkte für den Sieg, 1 für das Unentschieden,
  Tordifferenz und Tore als Tie-Break.
- Der Tabellenrang fließt über die bestehende Platzierungspunkt-Rechnung
  (`PROJEKT.md` §4.2) in die Gesamtwertung.
- Board-Karte einer Versus-Disziplin zeigt die Tabelle statt einer Wertespalte.

### Out (ausdrücklich)

- **Free-for-all-Matches** (drei oder mehr Teilnehmer in einem Match mit je
  einer Platzierung). Mario Kart wird über die bestehende Metrik gewertet.
- **Spielplan-Generator.** Kein Round-Robin, keine Fixture-Verwaltung, keine
  offenen/gespielten Zustände. Matches werden ad hoc erfasst.
- **Konfigurierbare Punktevergabe je Disziplin.** 3/1/0 ist fest.
- **Siege als Term in der Gesamtwertung.** Siege entscheiden ausschließlich den
  Rang innerhalb der Disziplin; `standings.ts` und `byOlympicOrder` bleiben
  unangetastet.
- Gemischte Disziplinen — eine Disziplin ist metrisch *oder* Versus, nie beides.

## User stories

### US-1 — Disziplin als Versus-Disziplin anlegen

Als Veranstalter will ich beim Anlegen einer Disziplin festlegen, ob sie über
Einzelwerte oder über Matches gewertet wird, damit Rocket League und Mario Kart
im selben Turnier nebeneinander laufen können.

**Acceptance criteria**

- AC-1.1 — Gegeben das Disziplin-Formular im Control-Panel, wenn ich die
  Wertungsart `versus` wähle, dann ist die Sortierrichtung auf `DESC`
  festgelegt und nicht bedienbar.
- AC-1.2 — Gegeben `POST /api/games` mit `scoring: 'versus'` und
  `primaryMetric.sortOrder: 'ASC'`, dann antwortet der Server 400 mit einer
  deutschen Fehlermeldung.
- AC-1.3 — Gegeben `POST /api/games` **ohne** `scoring`, dann hat die angelegte
  Disziplin `scoring: 'metric'`, und ihr Verhalten auf dem Board ist identisch
  zu vor dieser Änderung.
- AC-1.4 — Gegeben eine Disziplin, für die schon Ergebnisse erfasst sind, wenn
  ich per `PATCH /api/games/:id` die Wertungsart wechsle, dann antwortet der
  Server 409 und ändert nichts.

### US-2 — Match-Ergebnis erfassen und zurücknehmen

Als Veranstalter will ich am Tablet »Team A 3:1 Team B« eintragen und einen
Fehleintrag wieder entfernen können, ohne die Tabelle von Hand zu korrigieren.

**Acceptance criteria**

- AC-2.1 — Gegeben eine Versus-Disziplin und zwei gemeldete Teams, wenn ich ein
  Match mit 3 und 1 erfasse, dann antwortet `POST /api/matches` 201 und das
  Match erscheint in `GET /api/matches?gameId=…`.
- AC-2.2 — Gegeben ein Match, dessen beide Seiten denselben Teilnehmer nennen,
  dann antwortet der Server 400.
- AC-2.3 — Gegeben ein Match mit einer oder mit drei Seiten, dann antwortet der
  Server 400.
- AC-2.4 — Gegeben ein Match, dessen Seite eine ID trägt, die nicht zu
  `entrantType` passt (`playerId` im Team-Turnier), dann antwortet der Server
  400.
- AC-2.5 — Gegeben ein erfasstes Match, wenn ich es lösche, dann ist es aus
  `GET /api/matches` verschwunden und die Tabelle der Disziplin ist so, als
  hätte es das Match nie gegeben.
- AC-2.6 — Gegeben das Control-Panel, wenn ich bei einer metrischen Disziplin
  ein Ergebnis eintrage, öffnet sich das Score-Formular; bei einer
  Versus-Disziplin das Match-Formular.
- AC-2.7 — Gegeben ein offenes Board im selben Turnier, wenn ein Match erfasst
  oder gelöscht wird, dann aktualisiert sich das Board ohne Reload.

### US-3 — Tabelle auf der Leinwand

Als Zuschauer will ich auf der Leinwand sehen, wer in Rocket League führt und
woran es liegt, damit die Wertung ohne Erklärung verständlich ist.

**Acceptance criteria**

- AC-3.1 — Gegeben eine Versus-Disziplin mit Matches, dann zeigt ihre
  Board-Karte je Zeile Rang, Name, Spielzahl, Liga-Punkte und Tordifferenz.
  Bewusst die Spielzahl statt der Siege: solange es keine Unentschieden gibt,
  ist `Pkt` genau `3 × Siege`, die Spalte wäre also redundant — die Spielzahl
  ist dagegen aus nichts anderem auf der Karte ablesbar und macht laut AD-4
  einen schiefen Spielplan sichtbar.
- AC-3.2 — Gegeben eine metrische Disziplin, dann ist ihre Board-Karte
  unverändert gegenüber vor dieser Änderung.
- AC-3.3 — Gegeben `GET /api/board/:slug`, dann tragen die Einträge einer
  Versus-Disziplin das Feld `record`, die einer metrischen Disziplin nicht.
- AC-3.4 — Gegeben eine Versus-Disziplin ohne ein einziges Match, dann rendert
  ihre Karte leer und ohne Fehler.

### US-4 — Versus-Ergebnisse in der Gesamtwertung

Als Veranstalter will ich, dass ein Tabellenplatz in Rocket League genauso viele
Turnierpunkte bringt wie derselbe Platz in Mario Kart, damit die
disziplinübergreifende Wertung fair bleibt.

**Acceptance criteria**

- AC-4.1 — Gegeben ein Sieg, ein Unentschieden und eine Niederlage, dann hat der
  Teilnehmer 4 Liga-Punkte (3 + 1 + 0).
- AC-4.2 — Gegeben zwei Teilnehmer mit gleichen Liga-Punkten, dann steht der mit
  der besseren Tordifferenz vorn; bei gleicher Differenz der mit mehr erzielten
  Toren.
- AC-4.3 — Gegeben zwei Teilnehmer, die in Punkten, Differenz und Toren
  gleichstehen, dann teilen sie den Rang und der Folgerang wird übersprungen
  (1, 2, 2, 4).
- AC-4.4 — Gegeben eine Punktetabelle `[10, 8, 6, …]` und zwei Teilnehmer auf
  einem geteilten Rang 2, dann bekommt jeder 7 Turnierpunkte — dieselbe
  Mittelung wie bei metrischen Disziplinen (`PROJEKT.md` §4.2).
- AC-4.5 — Gegeben ein gemeldetes Team ohne ein einziges Match, dann steht es
  nicht in der Tabelle der Disziplin und trägt 0 Turnierpunkte aus ihr bei.
- AC-4.6 — Gegeben ein Turnier mit einer metrischen und einer Versus-Disziplin,
  dann ist die Gesamtwertung die Summe beider Platzierungspunkte, und
  `standings.ts` wurde dafür nicht geändert.

## Edge cases

| # | Situation | Erwartetes Verhalten |
|---|---|---|
| E-1 | Versus-Disziplin ohne Matches | Leere Tabelle, keine Turnierpunkte, kein Fehler |
| E-2 | Ungleiche Spielzahl (A 3 Spiele, B 1 Spiel) | Wertung summiert unverändert; die Spalte »Sp« macht das Ungleichgewicht sichtbar. Bewusst kein Ausgleich — siehe AD-4 |
| E-3 | Drei Teilnehmer vollständig gleich | Alle drei auf Rang 1, nächster Rang ist 4 |
| E-4 | Match 0:0 | Unentschieden, je 1 Liga-Punkt, je 0 Tore |
| E-5 | Match verweist auf einen gelöschten Teilnehmer | Eintrag fällt aus dem Board-Payload, genau wie heute Scores ohne Teilnehmer |
| E-6 | Disziplin von `metric` auf `versus` umgestellt, obwohl Scores existieren | 409, keine Änderung (AC-1.4). Sonst würden vorhandene Ergebnisse unsichtbar |
| E-7 | Negativer Wert auf einer Match-Seite | 400 — `min: 0` wie bei `Score.primaryValue` |
| E-8 | Zwei identische Matches erfasst (Doppelklick) | Beide zählen. Ein Match ist kein eindeutiger Datensatz; die Rücknahme aus AC-2.5 ist die Korrektur |

## Data touched

- **`Game`** — neues Feld `scoring`. Bestehende Dokumente gelten als `metric`.
- **`Match`** — neue Collection: Turnier, Disziplin, Teilnehmertyp, zwei Seiten
  mit je einem Wert, Zeitpunkt.
- **`Score`** — unberührt. Metrische Disziplinen lesen und schreiben weiter
  ausschließlich Scores.
- **Board-Payload** — `BoardGameEntry` bekommt ein optionales `record`,
  `BoardGame.game` bekommt `scoring`.

## Non-functional

- Die Tabellenlogik ist ein reines, DB-freies Rule-Modul mit Tests **vor** der
  Implementierung (`PROJEKT.md` §4).
- Die Tabelle wird wie alles andere pro Request neu berechnet, nichts wird
  persistiert oder zwischengespeichert.
- Board-Karten müssen auf zehn Meter lesbar bleiben: maximal fünf Spalten.
- Sprachregeln `KONVENTIONEN.md` §1 — Identifier englisch, Kommentare und
  Testnamen deutsch, Fehlermeldungen deutsch.

## Open questions

Keine. Alle Entscheidungen sind in `architecture.md` als ADR festgehalten.
