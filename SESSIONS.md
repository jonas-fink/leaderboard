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
