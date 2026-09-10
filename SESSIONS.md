# SESSIONS.md

Kurzlog. Ein Eintrag pro abgeschlossenem Schritt: **was** gebaut wurde, welche
**Entscheidung** dabei fiel, was **offen** blieb. Neueste Einträge oben.

Kein Ersatz für `git log` — hier steht, was der Commit nicht erklärt.
Fachliche Wahrheit liegt in `PROJEKT.md`, Code-Standards in `KONVENTIONEN.md`.

**Format:**

```
## JJJJ-MM-TT — Titel
**Gebaut:** was fertig wurde
**Entschieden:** die Entscheidung und der Grund
**Offen:** was als Nächstes ansteht oder ungeklärt blieb
```

---

## 2026-09-10 — formatMetricValue nach shared/

**Gebaut**

- `shared/format.ts`; `src/utils/index.ts` und `server/src/utils/index.ts`
  re-exportieren daraus. Die beiden Client-Aufrufer bleiben unverändert.
- KONVENTIONEN §2: `shared/` wächst im Baum von einer Datei auf zwei.

**Entschieden**

- **Der Formatter wird geteilt statt verdoppelt.** `announce.ts` rendert den
  Toast-Text serverseitig fertig (§7), und `{value}` muss dieselbe
  Darstellung haben wie die Game-Karte daneben — sonst steht auf derselben
  Leinwand einmal `01:11.350` und einmal `71350`.
- Strukturänderung an KONVENTIONEN §2: `shared/` war bisher als eine Datei
  dokumentiert. Der Grund, warum es shared/ gibt, gilt für den Formatter
  genauso wie für die Schemas.

**Offen**

- `announce.ts` — der eigentliche Schritt, für den der Formatter gebraucht
  wird.

---

## 2026-09-10 — standings.ts: Gesamtwertung und olympischer Tie-Break

**Gebaut**

- `services/standings.check.ts` (12 Tests), danach `services/standings.ts`
  mit `computeStandings(entrantIds, placements)`. Im Services-Barrel.
- `#types`: `Placement` und `StandingsRow`, beide als `Pick<>` aus den
  Board-Schemas — kein Typ steht doppelt.

**Entschieden**

- **`placements` kommt flach über alle Disziplinen, ohne `gameId`.** Weder
  die Punktsumme (§4.3) noch das Platzhistogramm (§4.4) interessiert, aus
  welchem Spiel ein Ergebnis stammt. Weil `Placement` ein `Pick` von
  `BoardGameEntry` ist, passt `games.flatMap(g => g.entries)` ohne Adapter.
- **`entrantIds` ist ein eigener Parameter**, nicht aus den Placements
  abgeleitet. Sonst verschwindet, wer noch nichts gespielt hat — und genau
  der soll mit 0 Punkten in der Liste stehen.
- **Rückgabe ist nicht der fertige `StandingsEntry`.** Name, Bild und Farbe
  kommen aus Player- bzw. Team-Dokumenten und setzt der Board-Service dazu;
  das Rule-Modul bleibt DB-frei.
- **`share` ist 0, solange niemand Punkte hat.** Das Board wird vor dem
  ersten Score geöffnet; ohne Guard stünde dort NaN und die Validierung
  gegen `min(0).max(1)` würde werfen.
- **`rankCounts` wird aufgefüllt statt direkt indiziert.** Ein Loch im Array
  käme als `null` durch `JSON.stringify` und bräche das Schema.
- **Bei echtem Gleichstand entscheidet die Reihenfolge in `entrantIds`**,
  weil die Sortierung stabil ist — auf der Leinwand also Roster-Reihenfolge,
  nicht Alphabet.

**Offen**

- `announce.ts`: Vergleich zweier `BoardState` → Toast-Ereignisse. Braucht
  den Spruch-Pool `content/announcements.de.json` und einen injizierten
  Zufallsgenerator (KONVENTIONEN §7.2).
- Der Board-Service, der `rank` → `points` → `standings` verkettet und die
  Teilnehmerdaten dazulädt. Kein Rule-Modul, also kein TDD.
- Weiterhin offen: `.refine()` auf monoton fallende `pointsTable` am
  Tournament-Schema.

---

## 2026-09-10 — points.ts: Platzierungspunkte

**Gebaut**

- `services/points.check.ts` (13 Tests) und danach `services/points.ts` mit
  `placementPoints(ranks, pointsTable, weight = 1)`. Im Services-Barrel.

**Entschieden**

- **Signatur nur über `number[]`.** Das Modul kennt weder `RankedScore` noch
  `Game`. `standings.ts` reicht `ranked.map(e => e.rank)` hinein und zippt
  das Ergebnis per Index zurück. Genau das, was §4.2 beschreibt, sonst nichts.
- **Gruppiert wird über den Rangwert, nicht über benachbarte Einträge.**
  `rankScores` liefert zwar sortiert, aber eine Zählung per Map ist gleich
  kurz und bleibt bei unsortierter Eingabe korrekt.
- **Fehlende Tabellenplätze werden als 0 mit eingemittelt.** Zwei auf Rang 2
  bei Tabelle `[10,8]` bekommen je 4, nicht 8. Nur so bleibt die
  ausgeschüttete Summe konstant — die Begründung, mit der §4.2 das Mitteln
  überhaupt einführt.
- **Monotonie ist Invariante, nicht Zufall.** Zwei Ranggruppen mitteln
  disjunkte, aufeinanderfolgende Ausschnitte einer fallenden Tabelle; ein
  schlechterer Rang kann einen besseren nie überholen. Steht als eigener
  Test, weil das die Frage ist, die man sich bei diesem Modul stellt.

**Offen**

- **`pointsTable` muss monoton fallen**, sonst kippt die Monotonie-Garantie.
  `points.ts` prüft das bewusst nicht — es rechnet, es validiert nicht. Gehört
  als `.refine()` an `TournamentFields`, sobald dieses Schema entsteht.
- `standings.ts` nach TDD: Summe über alle Games, olympischer Tie-Break,
  `share` und `rankCounts` für den Board-Payload.

---

## 2026-09-10 — Payload-Vertrag für board:update und event:announce

**Gebaut**

- `shared/schemas.ts`: `BoardStateSchema`, `AnnouncementSchema`, dazu
  `RoomJoinSchema`, `TournamentStatusEventSchema` und die getypten
  Event-Maps `ServerToClientEvents` / `ClientToServerEvents`.
- Vorgezogen, weil an drei Stellen gebraucht: `TournamentModeSchema`,
  `TournamentStatusSchema`, `GameStatusSchema`. Die Entity-Schemas von
  `Tournament` und `Game` referenzieren sie später, statt sie zu wiederholen.

**Entschieden**

- **Ein flacher `StandingsEntry` statt Player | Team.** Das Board rendert in
  beiden Turniermodi dieselbe Zeile. Der Server entscheidet einmal, was Name,
  Bild und Farbe sind; der Client verzweigt nie über den Modus. `entrantType`
  entfällt auf der Leitung — der Modus steht am Turnier im selben Payload.
- **Game-Einträge verweisen per `entrantId`**, statt Name und Avatar je
  Disziplin zu wiederholen. Jeder Teilnehmer steht genau einmal im Payload
  und kann nicht auseinanderlaufen.
- **`rankCounts: number[]` statt `firstPlaces: number`.** §4.4 vergleicht
  erste, dann zweite, dann dritte Plätze, und die Siegerehrung braucht den
  Medaillenspiegel. Ein Array bedient beides; zwei Felder wären Redundanz.
- **`computedAt` im Board-Zustand.** Das Board pollt zusätzlich alle 30s per
  REST. Ohne Zeitstempel kann eine langsame Poll-Antwort einen neueren
  Socket-Zustand überschreiben — ein sichtbar falsches Board.
- **`BoardGame` zeigt kein `weight`, `boardOrder`, `pinned`.** Reihenfolge ist
  die Array-Reihenfolge, ungepinnte Games stehen gar nicht drin.
- **Kein diskriminierter Union für `Announcement`.** Sieben Typen, aber nur
  `tournament_finished` fällt aus dem Muster; für die Darstellung ist die
  Unterscheidung egal. Flaches Objekt mit optionalen Feldern.
- **Keine Tests.** Deklarative Schemas ohne Verzweigung; KONVENTIONEN §7.1
  führt sie nicht als TDD-pflichtig.

**Offen**

- `GameSchema.pick(...)` in `BoardGameSchema` leitet noch vom Vor-Umbau-Stand
  ab. Das ist Absicht: verschwindet eines der gepickten Felder beim Umbau,
  bricht der Typecheck. `timeframe` und `pinned` sind bewusst nicht dabei.
- `points.ts` und `standings.ts` nach TDD — der Vertrag steht jetzt.

---

## 2026-09-10 — Housekeeping: Prettier, Test-Glob, Kontextdateien

**Gebaut**

- `.prettierrc` mit den Werten aus KONVENTIONEN.md §3.
- `server/package.json`: `npm test` läuft jetzt über `'src/**/*.check.ts'`
  statt nur `rank.check.ts`. Die sechs bestehenden Tests laufen unverändert.
- `PROJEKT.md`, `KONVENTIONEN.md`, `SESSIONS.md` erstmals versioniert.

**Entschieden**

- **`dist/` war bereits sauber.** Weder getrackt noch in `.gitignore`
  fehlend — die Notiz in KONVENTIONEN.md §11 und der offene Punkt vom
  2026-09-09 waren veraltet. Statt einer erfundenen Änderung wurden beide
  Stellen korrigiert.

**Offen**

- Payload-Vertrag für `board:update` und `event:announce` (Schritt 2 dieser
  Session).

---

## 2026-09-10 — Design freigegeben, Punktetabelle bestätigt

**Entschieden**

- **Design-Canvas ist abgenommen.** 16-Bit-Neon, Silkscreen + Chakra Petch,
  Palette und Bewegungswerte wie im Canvas. Die Tokens können nach `index.css`
  übersetzt werden, sobald die UI dran ist.
- **Punktetabelle `[10,8,6,5,4,3,2,1]` vom Projektleiter bestätigt.** Bleibt
  trotzdem pro Turnier konfigurierbar; die Tests in `points.ts` behandeln sie
  als Parameter und erwarten sie nicht hart.

**Offen**

- Payload-Vertrag für `board:update` und `event:announce` — muss vor den
  Rule-Modulen stehen.

---

## 2026-09-09 — Spezifikation, Konventionen, Design-Canvas

**Gebaut**

- `PROJEKT.md`: vollständiges Datenmodell (Tournament, Team, Player, Game,
  Score), Wertungslogik, Socket-Architektur, Board-Layout, Deployment.
- `KONVENTIONEN.md`: Code-Standards, festgeschrieben aus dem Bestand plus
  sechs neue Regeln (Prettier-Config, Test-Glob, injizierte Zeit und Zufall in
  Rule-Modulen, Emits nur aus `realtime/`, getrennte Board- und
  Control-Komponenten, Conventional Commits).
- Design-Canvas mit sechs Artboards: Board-Screen, Siegerehrung, Palette und
  Tokens, Control-Panel, Team-Zeile in fünf Zuständen, Live-Banner in vier
  Varianten.

**Entschieden**

- **Turnier statt globalem Board.** `Tournament` klammert Games, Teams,
  Zeitraum und Punktetabelle. Ohne diese Ebene vermischen sich die Daten ab
  dem zweiten Event.
- **`mode` sitzt am Turnier, nicht am Game.** Ein Turnier ist entweder
  Spieler gegen Spieler oder Team gegen Team. Das löst die Frage auf, wie eine
  Einzelleistung in eine Teamwertung überführt wird — sie stellt sich nicht.
  `Score` bleibt trotzdem polymorph (`playerId` ODER `teamId`), damit gemischte
  Turniere später kein Schemabruch wären.
- **Platzierungspunkte statt Rohwerten.** Nur die Platzierung zählt, Tabelle
  `[10,8,6,5,4,3,2,1]`, Gewichtungsfaktor je Disziplin. Damit sind
  Millisekunden und Torzahlen ohne Umrechnung vergleichbar.
- **Punkte werden bei geteiltem Rang gemittelt.** Zwei auf Rang 2 belegen die
  Plätze 2 und 3 und bekommen je 7. Die ausgeschüttete Summe bleibt konstant —
  nur so sind verschiedene Turniere untereinander vergleichbar.
- **Nicht-Teilnahme kostet Punkte**, kein Streichresultat. Wunsch des Kunden.
- **Gleichstand olympisch:** mehr erste Plätze, dann zweite, dann dritte.
- **`board:update` schickt den kompletten Zustand**, kein Delta. Wenige
  Kilobyte je Eintrag, dafür heilt sich ein Board, das kurz offline war, mit
  dem nächsten Ereignis von selbst.
- **Gesamtwertung zählt laufende Disziplinen mit.** Sie ist damit jederzeit
  live; die Platzierungen schwanken dafür, solange gespielt wird.
- **Socket.IO statt SSE.** Der Datenfluss wäre einseitig genug für SSE, aber
  Rooms, Reconnect und Polling-Fallback sind vor Ort robuster.
- **Motion für die Reorder-Animation**, gestuftes Easing statt weichem, damit
  die Bewegung zum Pixel-Look passt.
- **Design: 16-Bit-Neon**, nicht 8-Bit. Press Start 2P ist auf zehn Meter
  schlecht lesbar. Display-Font Silkscreen, Fließtext Chakra Petch.
- **Betrieb auf dem eigenen Ubuntu-Server**, öffentlich per Tailscale Funnel.
  Board-Route öffentlich, Control-Panel nur im Tailnet — die Score-Eingabe ist
  damit von außen gar nicht erreichbar, unabhängig vom Admin-PIN.
- **Keine Migration.** Die DB enthält nur Testdaten; Collections werden
  geleert, ein Seed-Skript legt ein Beispielturnier an.
- **Siegerehrung zeigt gestapelte Balken je Disziplin**, nicht nur die Summe.
  Nur so ist auf der Leinwand ablesbar, wo ein Team stark und wo es schwach
  war; eine Nicht-Teilnahme bleibt als Lücke im Balken sichtbar.

**Offen**

- Auflösung und Seitenverhältnis der Leinwand unbekannt — bis dahin wird
  strikt auflösungsunabhängig gebaut.
- ~~`dist/` liegt eingecheckt im Repo und fehlt in `.gitignore`.~~ Trifft
  nicht zu, siehe Eintrag 2026-09-10 (Housekeeping).
- Spruch-Pool muss noch geschrieben werden; der Canvas zeigt vier Beispiele
  je Ereignistyp.

**Nächster Schritt:** Implementierung in VS Code mit Claude Code, beginnend mit
`points.ts` und `standings.ts` nach TDD. Session dort mit `PROJEKT.md` und
`KONVENTIONEN.md` starten.
