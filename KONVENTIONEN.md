# KONVENTIONEN.md

Code-Standards für das Scoreboard. Zwei Sorten Regeln stehen hier:
**bestehend** — bereits im Code gelebt, wird fortgeschrieben — und **neu** —
kommt mit dem Umbau dazu. Neue Regeln sind als solche markiert.

Fachlicher Kontext steht in `PROJEKT.md`, der Verlauf in `SESSIONS.md`.

---

## 1. Sprachen

| Wo                                       | Sprache                   |
| ---------------------------------------- | ------------------------- |
| Bezeichner im Code                       | Englisch                  |
| Kommentare und JSDoc                     | Deutsch                   |
| Testnamen                                | Deutsch                   |
| Commit-Nachrichten                       | **Englisch**, ausnahmslos |
| Oberfläche und Fehlermeldungen an Nutzer | Deutsch                   |
| Dokumentation (`*.md`)                   | Deutsch                   |

Fehlermeldungen der API sind Nutzertext, also deutsch: `Score nicht gefunden`,
nicht `Score not found`.

---

## 2. Projektstruktur

```
leaderboard/
├── shared/
│   ├── schemas.ts            ← einziger API-Vertrag, von beiden Seiten importiert
│   └── format.ts             ← Formatter, den Board-Text und UI teilen
├── server/src/
│   ├── config/               Env-Zugriff, sonst nichts
│   ├── db/                   Verbindung + toJSONOptions
│   ├── models/               Mongoose-Schemas
│   ├── schemas/              Re-Export aus shared/
│   ├── types/                Re-Export aus schemas/ + serverinterne Typen
│   ├── services/             Fachlogik und DB-Zugriff
│   ├── controllers/          Request → Service → Response
│   ├── routes/               Pfad + Middleware-Kette
│   ├── middleware/           validate, error, requireAdmin
│   ├── realtime/             (neu) Socket.IO-Setup und Emitter
│   └── content/              (neu) announcements.de.json
└── src/
    ├── lib/                  api.ts, socket.ts (neu), form.ts
    ├── hooks/                React-Query-Hooks + Query-Keys
    ├── schemas/              Re-Export aus shared/
    ├── components/           wiederverwendbare Bausteine
    │   ├── board/            (neu) nur für die Leinwand
    │   └── control/          (neu) nur fürs Eingabe-Panel
    ├── pages/                Routenziele
    ├── layout/               Rahmen
    └── utils/                Formatter
```

Jeder Ordner hat eine `index.ts` als Barrel. Importiert wird immer über das
Barrel, nie über den tiefen Pfad — Ausnahme sind die Service-Module
untereinander, die per `#services/<name>` gezielt importieren, um Zyklen über
das Barrel zu vermeiden.

**Server-Imports laufen über die Subpath-Aliase** aus `server/package.json`
(`#config`, `#db`, `#models`, `#schemas`, `#types`, `#utils`, `#services`,
`#services/*`, `#controllers`, `#routes`, `#middleware`). Neue Ordner bekommen
einen eigenen Alias: `#realtime`, `#content`.

---

## 3. Formatierung

Prettier-Stil, wie er bereits im Code steht: 4 Leerzeichen, einfache
Anführungszeichen, Semikolons, nachgestellte Kommas, Zeilenbreite 80.

**Neu:** Das wird als `.prettierrc` festgeschrieben. Bisher ist die
Formatierung nur Gewohnheit, und Gewohnheit hält keinen Merge aus.

```json
{
    "tabWidth": 4,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 80
}
```

---

## 4. TypeScript-Stil

- **Arrow Functions**, keine `function`-Deklarationen.
- **Keine Klassen.** Services sind Sammlungen exportierter Funktionen.
- **Benannte Exporte** überall — Ausnahme: `pages/` und `layout/` exportieren
  ihre Komponente als Default, weil sie nur von `App.tsx` importiert werden.
  Diese Trennung bleibt, sie ist keine Inkonsistenz sondern ein Signal:
  Default-Export heißt „Routenziel".
- **Explizite Rückgabetypen** bei allen exportierten Service-Funktionen. Innen
  darf Inferenz arbeiten.
- **`type` statt `interface`**, außer bei React-Props — dort `interface
XyzProps`, wie in `GameCard.tsx` bereits gehandhabt.
- **`satisfies`** beim Bau von Objekten, die einen Vertrag erfüllen müssen,
  statt einer Typannotation, die Überschussfelder durchrutschen lässt.
- **Kein `any`.** Wo ein externer Wert wirklich unbekannt ist: `unknown` und
  danach eine Prüfung. `as` nur an den zwei bekannten Stellen, an denen
  Mongoose-Typen nicht mitspielen (siehe `asApi`).

---

## 5. Der API-Vertrag

`shared/schemas.ts` ist die **einzige** Quelle für API-Typen. Client und Server
re-exportieren sie, niemand schreibt einen Typ doppelt.

**Ableitungsregeln**, wie sie im Bestand schon durchgezogen sind:

1. Ein `XyzFields`-Objekt hält die Felder **ohne** Defaults.
2. Das Entity-Schema ist `XyzFields.extend({ id })`.
3. `CreateXyzSchema` setzt die Defaults.
4. `UpdateXyzSchema` ist `XyzFields.partial()` — **ohne** Defaults, sonst würde
   ein PATCH auf ein einzelnes Feld die übrigen still zurücksetzen. Der Grund
   steht als Kommentar im Code und bleibt dort stehen.
5. Typen ausschließlich per `z.infer`, nie handgeschrieben.

**Neu — polymorpher Score.** Dass genau eines von `playerId` und `teamId`
gesetzt ist, wird an einer Stelle erzwungen: per `.refine()` im Zod-Schema und
zusätzlich als Mongoose-Validator. Kein Controller und kein Service prüft das
noch einmal nach.

---

## 6. Server-Schichten

Strikt eine Richtung: `Route → Middleware → Controller → Service → Model`.

| Schicht    | Darf                                            | Darf nicht           |
| ---------- | ----------------------------------------------- | -------------------- |
| Route      | Pfad, Middleware-Kette, Controller nennen       | Logik                |
| Middleware | validieren, authentifizieren, Fehler übersetzen | Fachlogik            |
| Controller | `req` auspacken, Service rufen, Status setzen   | rechnen, DB anfassen |
| Service    | rechnen, DB anfassen, Fehler werfen             | `req`/`res` kennen   |
| Model      | Schema, Indizes, Validatoren                    | Fachlogik            |

Controller sind typisiert über
`RequestHandler<Params, ResBody, ReqBody, Query>` und bleiben Einzeiler, wo es
geht — so wie `postScore` heute.

**Fehler** werden geworfen, nie im Controller beantwortet. `httpError(status,
message)` und `notFound(what)` aus `#utils` sind die einzigen Wege, einen
Statuscode zu setzen. Die zentrale `errorHandler`-Middleware übersetzt Zod-,
Mongoose- und Duplicate-Key-Fehler; sie wird erweitert, nicht umgangen.

**Serialisierung** läuft über `toJSONOptions` und `asApi<T>()`. Kein Service
baut ein Antwortobjekt von Hand aus `doc._id.toString()` zusammen — Ausnahme
ist `playerHistory`, wo `populate()` die Form ändert; solche Stellen bekommen
einen Kommentar mit Begründung.

---

## 7. Rule-Module und Tests

### 7.1 Was TDD-pflichtig ist

**Zuerst der Test, dann die Implementierung** — verbindlich für:

- `services/rank.ts` (bestehend)
- `services/points.ts` (neu)
- `services/standings.ts` (neu)
- `services/announce.ts` (neu)

**Kein TDD** für UI-Komponenten, Controller, Routen und alles, was Mongo
anfasst. Dort ist der Aufwand höher als der Ertrag.

### 7.2 Wie diese Module aussehen müssen

- **Rein.** Keine DB, kein `fetch`, kein Logging.
- **Keine versteckte Zeit.** Kein `Date.now()` im Modul — ein benötigter
  Zeitpunkt wird als Parameter hereingereicht. Sonst ist der Test von der Uhr
  abhängig.
- **Keine Mutation der Eingabe.** Es gibt bereits einen Test, der das für
  `rankScores` prüft; das gilt für alle vier.
- **Kein Zufall.** Die Spruchauswahl in `announce.ts` bekommt ihren
  Zufallsgenerator injiziert, damit der Test ihn ersetzen kann.

### 7.3 Testkonventionen

- `node:test` und `node:assert/strict`, keine zusätzliche Bibliothek.
- Dateiname `<modul>.check.ts`, direkt neben dem Modul. Nicht `.test.ts` —
  `--watch` würde sie sonst als Einstiegspunkte behandeln.
- Testnamen sind **deutsche Sätze**, die die Regel beschreiben, nicht die
  Funktion: `'Gleichstand teilt den Rang, der Folgerang wird übersprungen'`.
- Kleine Fabrikfunktionen am Dateikopf statt wiederholter Objektliterale, so
  wie `score()` in `rank.check.ts`.
- Für jedes Modul mindestens: Normalfall, Gleichstand, leere Eingabe,
  Randfall der Regel.

**Neu:** `npm test` läuft künftig alle `*.check.ts` statt nur `rank.check.ts`:

```json
"test": "node --test 'src/**/*.check.ts'"
```

---

## 8. Realtime

**Event-Namen** nach dem Muster `domain:verb`, Kleinbuchstaben, Doppelpunkt als
Trenner. Bestand des Vertrags:

| Richtung        | Event               | Payload                     |
| --------------- | ------------------- | --------------------------- |
| Client → Server | `room:join`         | `{ tournamentId }`          |
| Server → Client | `board:update`      | vollständiger Board-Zustand |
| Server → Client | `event:announce`    | `AnnouncementPayload[]`     |
| Server → Client | `tournament:status` | `{ tournamentId, status }`  |

**Payloads werden validiert.** Auch Socket-Nachrichten gehen durch Zod-Schemas
aus `shared/schemas.ts`, genau wie REST-Bodies. Ein Socket ist keine
Ausnahme vom Vertrag.

**Emittiert wird nur aus `realtime/`.** Controller und Services rufen einen
Emitter wie `emitBoardUpdate(tournamentId)` auf; kein `io.emit` steht irgendwo
sonst im Code. Damit bleibt die Service-Schicht testbar und unabhängig von
einer laufenden Socket-Instanz.

**Der Server ist die einzige Rechenquelle.** Der Client leitet aus einem
Ereignis niemals selbst einen neuen Zustand ab, er rendert das, was ankommt.
Alle vier Rule-Module laufen ausschließlich serverseitig.

---

## 9. Client

### 9.1 Datenfluss

React Query bleibt die Cache-Schicht, Socket-Nachrichten schreiben in diesen
Cache statt ihn zu invalidieren:

```ts
// richtig: der Payload ist bereits der neue Zustand
qc.setQueryData(queryKeys.board(tournamentId), payload);

// falsch: löst einen überflüssigen Roundtrip aus
qc.invalidateQueries({ queryKey: queryKeys.board(tournamentId) });
```

Query-Keys stehen weiterhin zentral im `queryKeys`-Objekt in `hooks/index.ts`,
nie als Literal im Aufrufer. Mutationen invalidieren gezielt, nicht pauschal —
die Begründung dazu steht bereits als Kommentar im Code.

### 9.2 Komponenten

- Props als `interface XyzProps` direkt über der Komponente.
- Keine Default-Props-Objekte, optionale Felder mit `?` und Fallback im Body.
- Eine Komponente pro Datei, Dateiname gleich Komponentenname.
- `board/` und `control/` teilen keine Komponenten miteinander. Was beide
  brauchen, liegt eine Ebene höher in `components/`. Die Board-Ansicht hat
  andere Größen, andere Kontraste und keine Interaktion — geteilte Komponenten
  mit `variant`-Props enden hier erfahrungsgemäß in Fallunterscheidungen.

### 9.3 Styling

- Tailwind-Utility-Klassen im JSX, keine separaten CSS-Dateien.
- **Farben nur über Tokens** aus `index.css` (`@theme inline`). Kein Hex-Wert
  im JSX. Einzige Ausnahme: Teamfarben aus der Datenbank, die als CSS-Variable
  über `style={{ '--team': team.colorPrimary }}` gesetzt und über
  `bg-[var(--team)]` verwendet werden.
- Board-Maße relativ zur Skalierungsvariable `--u`, nie in `px`. `--u` wird
  einmal auf dem Board-Container per `clamp()` gesetzt.
- `image-rendering: pixelated` auf allen Sprites, Skalierung nur in ganzen
  Faktoren.
- Jede Animation prüft `prefers-reduced-motion` und fällt auf Crossfade zurück.

### 9.4 Zugänglichkeit

Der bestehende Standard wird gehalten: `aria-label` an Icon-Buttons,
`aria-pressed` an Toggles, `alt=""` an dekorativen Bildern, sichtbarer
Fokusring. Für `/board` gilt das nicht — die Ansicht wird nicht bedient und
bekommt stattdessen `aria-hidden` auf den rein dekorativen Ebenen.

---

## 10. Konfiguration

Alle Env-Werte laufen über `config/index.ts`; `process.env` wird nirgends sonst
gelesen. Pflichtwerte über `required()`, damit der Server beim Start scheitert
statt später im Request.

Neu hinzu: `ADMIN_PIN`, `TOKEN_SECRET`, `UPLOAD_DIR`, `CLIENT_ORIGIN`
(für die CORS- und Socket-Konfiguration). Jeder neue Wert kommt gleichzeitig
in `.env.example` — ohne Beispielwert ist er nicht fertig.

Clientseitig nur `VITE_API_URL` und `VITE_SOCKET_URL`, damit derselbe Build
lokal und hinter dem Tunnel läuft.

---

## 11. Git

- Branch-Name: `feat/<kurz>`, `fix/<kurz>`, `chore/<kurz>`.
- **Commit-Nachrichten auf Englisch.**
- **Neu:** Conventional Commits, einzeilig, unter 72 Zeichen im Betreff:
  `feat(scoring): add placement points with tie averaging`.
  Der Bestand ist frei formuliert und bleibt, wie er ist — ab hier gilt das
  Format. Was der Commit erklären muss statt beschreiben, gehört in den Body.
- Ein Commit pro abgeschlossenem Schritt, nicht pro Datei und nicht pro Tag.
- `dist/` gehört nicht ins Repo. Steht in `.gitignore` und ist nicht
  getrackt; das lokale Build-Verzeichnis darf liegen bleiben.

---

## 12. Kommentare

Kommentare erklären **warum**, nie **was**. Der Bestand macht das bereits
richtig, und genau diese Sorte ist gemeint:

```ts
// Deckt die Leaderboard-Abfrage (alle Scores eines Games) und die
// Spieler-Historie (neueste zuerst) ab.
scoreSchema.index({ gameId: 1, primaryValue: 1 });
```

JSDoc über exportierten Funktionen, deren Verhalten nicht aus der Signatur
folgt — besonders bei den Rule-Modulen, wo die Regel selbst die Dokumentation
ist. Eine bewusst getroffene Entscheidung gegen die naheliegende Alternative
wird kommentiert, sonst wird sie beim nächsten Refactoring „aufgeräumt".

---

## 13. Arbeitsweise in Sessions

- Ein abgeschlossener Schritt pro Lieferung, dann Pause zum Gegenlesen.
  Keine fünf Dateien am Stück.
- Bei Fachlogik zuerst der Test, dann die Implementierung. Bei UI nicht.
- Nach jedem Schritt ein Eintrag in `SESSIONS.md`: was gebaut wurde, welche
  Entscheidung dabei fiel, was offen blieb.
- Ändert sich etwas am Datenmodell oder an der Wertungslogik, wird
  `PROJEKT.md` im selben Schritt nachgezogen — nicht später.
