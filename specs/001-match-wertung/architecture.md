# 001 — Match-basierte Wertung · Architecture

## Overview

Die Wertungskette des Projekts ist `rank → points → standings`, verkettet in
`board.service.ts`. Entscheidend ist `PROJEKT.md` §4.2: der Rohwert einer
Disziplin fließt **nicht** in die Gesamtwertung, nur die Platzierung. Eine
Versus-Disziplin muss also lediglich eine Rangliste liefern — dann arbeiten
`points.ts` und `standings.ts` unverändert weiter.

Der Eingriff besteht deshalb aus zwei additiven Teilen: ein zweites Rule-Modul
`table.ts` neben `rank.ts`, und eine `Match`-Collection neben `Score`. In
`board.service.ts` entscheidet **eine** Verzweigung, welches der beiden Module
eine Disziplin auswertet. `Score`, `rank.ts`, `points.ts`, `standings.ts` und
alle Score-Routen bleiben unberührt.

## Data model

### `Game` — ein neues Feld

`server/src/models/game.model.ts`

```ts
scoring: {
    type: String,
    enum: ['metric', 'versus'],
    default: 'metric',
    required: true,
},
```

Bestehende Dokumente ohne das Feld werden von Mongoose als `'metric'` gelesen,
also ändert sich für jede heutige Disziplin nichts.

**Invariante:** `scoring === 'versus'` ⇒ `primaryMetric.sortOrder === 'DESC'`.
Erzwungen im Zod-Schema **und** im Mongoose-Validator, nach dem Muster von
`pointsTable` in `tournament.model.ts`. Grund: bei einem Match entscheidet der
höhere Wert den Sieg, und die Tordifferenz ist nur für »größer ist besser«
sinnvoll. Die Alternative wäre eine zweite Konfigurationsachse für einen Fall,
den niemand braucht (Kopf-an-Kopf-Rundenzeiten).

`primaryMetric` wird für Versus-Disziplinen **unverändert weiterbenutzt** und
beschreibt den Wert *je Seite*: `label: 'Tore'` bei Rocket League,
`'Runden'` bei Tekken. Damit generalisiert die Bezeichnung ohne neues Schema.

### `Match` — neue Collection

`server/src/models/match.model.ts`

```ts
const matchSideSchema = new Schema(
    {
        playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
        value: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);

const matchSchema = new Schema(
    {
        // Denormalisiert vom Game, damit Turnierabfragen ohne Join auskommen —
        // dieselbe Begründung wie bei Score.
        tournamentId: {
            type: Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true,
        },
        gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
        entrantType: { type: String, enum: ['player', 'team'], required: true },
        sides: { type: [matchSideSchema], required: true },
        playedAt: { type: Date, default: Date.now },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

matchSchema.index({ gameId: 1, playedAt: -1 });      // Tabelle je Disziplin
matchSchema.index({ tournamentId: 1, playedAt: -1 }); // Live-Feed
```

`pre('validate')` nach dem Muster von `score.model.ts`:

1. genau zwei Seiten,
2. je Seite genau die zu `entrantType` passende ID (`playerId` **oder**
   `teamId`, nie beides, nie keines),
3. die beiden Teilnehmer-IDs sind verschieden.

Fehlermeldungen deutsch, wie in `score.model.ts`.

## API contract

Alle drei Routen hängen hinter derselben Middleware wie die Score-Routen und
werden in `routes/index.ts` als `apiRouter.use('/matches', matchRouter)`
eingehängt — **nach** der Auth-Grenze.

### `POST /api/matches`

Auth: erforderlich (wie `/api/scores`).

Request — `SubmitMatchSchema`:
```ts
{
    tournamentId: string,
    gameId: string,
    entrantType: 'player' | 'team',
    sides: [
        { playerId?: string, teamId?: string, value: number },
        { playerId?: string, teamId?: string, value: number }
    ],
    playedAt?: string   // ISO, default now
}
```

Response `201` — `MatchSchema`:
```ts
{
    id: string,
    tournamentId: string,
    gameId: string,
    entrantType: 'player' | 'team',
    sides: [{ playerId?, teamId?, value }, { playerId?, teamId?, value }],
    playedAt: string
}
```

Errors:
- `400` — nicht genau zwei Seiten, ID passt nicht zu `entrantType`, beide Seiten
  derselbe Teilnehmer, `value` negativ
- `400` — die Disziplin hat `scoring: 'metric'`
  (»Diese Disziplin wird über Einzelwerte gewertet«)
- `404` — `gameId` oder `tournamentId` unbekannt

Seiteneffekt: `emitBoardUpdate(tournamentId)`, exakt wie in
`score.controller.ts`.

### `GET /api/matches?gameId=<id>`

Auth: erforderlich. `gameId` ist Pflicht, sonst `400` — dasselbe Muster wie
`GET /api/teams?tournamentId=…`.

Response `200`: `MatchSchema[]`, absteigend nach `playedAt`.

### `DELETE /api/matches/:id`

Auth: erforderlich. Response `204`. `404` wenn unbekannt.
Seiteneffekt: `emitBoardUpdate(tournamentId)`.

### `PATCH /api/games/:id` — eine neue Fehlerantwort

`409` wenn `scoring` gewechselt werden soll und für die Disziplin bereits
Ergebnisse existieren (Scores bei `metric`, Matches bei `versus`).
Meldung: »Die Wertungsart lässt sich nicht ändern, solange Ergebnisse
vorliegen«. Ohne diese Sperre würden vorhandene Ergebnisse unsichtbar, ohne
gelöscht zu sein.

### `GET /api/board/:slug` — erweiterter Payload

Unverändert öffentlich. Zwei zusätzliche Felder, beide additiv:

```ts
BoardGame.game.scoring: 'metric' | 'versus'

BoardGameEntry.record?: {
    played: number,
    won: number,
    drawn: number,
    lost: number,
    goalsFor: number,
    goalsAgainst: number,
}
```

Bei `scoring: 'versus'` trägt `value` die **Liga-Punkte** und `record` ist
gesetzt. Bei `scoring: 'metric'` ist `record` nicht vorhanden und `value` bleibt
der Rohwert. Die Tordifferenz wird **nicht** übertragen — der Client rechnet
`goalsFor - goalsAgainst`.

## Shared types

Alles in `shared/schemas.ts`, von beiden Seiten über die Barrels
`server/src/schemas/index.ts` und `src/schemas/index.ts` importiert.

| Neu / geändert | Bedeutung |
|---|---|
| `ScoringModeSchema` | `z.enum(['metric', 'versus'])` |
| `GameFields.scoring` | ohne Default — der Default sitzt **nur** an `CreateGameSchema`. An `GameFields` würde er über `.partial()` in `UpdateGameSchema` lecken und jedes PATCH still auf `'metric'` zurücksetzen (`KONVENTIONEN.md` §5 Regel 4); dasselbe Muster wie bei `weight`, `pinned`, `boardOrder` und `status`. AC-1.3 hält unverändert. |
| `CreateGameSchema` / `UpdateGameSchema` | erben das Feld; das `.refine()` für die DESC-Invariante hängt an beiden |
| `MatchSideSchema` | `{ playerId?, teamId?, value }` |
| `SubmitMatchSchema` | mit `.refine()` für zwei Seiten, passende IDs, verschiedene Teilnehmer |
| `MatchSchema` | `SubmitMatchSchema`-Felder + `id`, `playedAt` |
| `MatchRecordSchema` | das `record`-Objekt der Board-Karte |
| `BoardGameEntrySchema.record` | optional |
| `BoardGameSchema.game.scoring` | Pflichtfeld |

Serverintern in `server/src/types/index.ts`, analog zu `RawScore`:

```ts
export type RawMatch = {
    id: string;
    tournamentId: string;
    gameId: string;
    entrantType: TournamentMode;
    /** Wie bei RawScore zu entrantId kollabiert — playerId ?? teamId. */
    sides: [
        { entrantId: string; value: number },
        { entrantId: string; value: number },
    ];
    playedAt: string;
};
```

## Frontend structure

```
/control  (Layout)
  index → Scoring.tsx
            ├ game.scoring === 'metric' → ScoreFormModal   (bestehend)
            └ game.scoring === 'versus' → MatchFormModal   (neu)
                                          + Match-Liste mit Löschen
  games   → Games.tsx → GameFormModal   (Wertungsart-Auswahl neu)

/board/:slug (Board)
  GamePanel
    ├ game.scoring === 'metric' → bestehende Wertespalte
    └ game.scoring === 'versus' → Mini-Tabelle
```

**State-Besitz:** unverändert. `Scoring.tsx` hält weiter nur, welches Modal
offen ist; alle Daten kommen aus React Query. `MatchFormModal` ist ein
kontrolliertes Formular ohne eigenen Fetch, Vorbild `ScoreFormModal.tsx`.

**Hooks** in `src/hooks/index.ts`, Muster von den Score-Hooks:
`useMatches(gameId)`, `useCreateMatch()`, `useDeleteMatch()`. Query-Key
`queryKeys.matches(gameId)`. Die Mutationen invalidieren `matches` und `board`,
wie `useCreateScore` es tut.

**Vier Zustände** je fetchende Komponente: Laden, leer, Fehler, gefüllt. Für die
Match-Liste ist »leer« der Normalfall am Abendanfang und braucht eine Zeile
(»Noch kein Spiel erfasst«), keinen Spinner-Rest.

**Board-Karte**, fünf Spalten, mehr nicht:

```
┌─ ROCKET LEAGUE ──────────────┐
│ 1  TEAM A   3 Sp  6 Pkt  +3  │
│ 2  TEAM C   2 Sp  4 Pkt  +2  │
│ 3  TEAM B   3 Sp  1 Pkt  -5  │
└──────────────────────────────┘
```

Maße über `--u` wie im übrigen Board (`PROJEKT.md` §12), keine festen Pixel.

## Domain logic (test-first)

**`server/src/services/table.ts`** — rein, DB-frei, Tests vor der
Implementierung. Das einzige Modul dieses Features mit echten Regeln.

```ts
export type MatchResult = {
    sides: [
        { entrantId: string; value: number },
        { entrantId: string; value: number },
    ];
};

export type TableRow = {
    entrantId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    leaguePoints: number;
    rank: number;
};

export const buildTable = (matches: MatchResult[]): TableRow[];
```

Regeln:

1. `WIN_POINTS = 3`, `DRAW_POINTS = 1` als Modulkonstanten.
2. Höherer Wert gewinnt (die DESC-Invariante macht das eindeutig), gleicher Wert
   ist ein Unentschieden.
3. Sortierung: `leaguePoints` absteigend → Tordifferenz absteigend →
   `goalsFor` absteigend.
4. **Dieselbe Rangregel wie `rankScores`:** gleichstehende Teilnehmer teilen den
   Rang, der Folgerang wird übersprungen (1, 2, 2, 4). Das ist keine Kosmetik —
   nur so rechnet `placementPoints` die Mittelung aus §4.2 korrekt.
5. Teilnehmer werden **aus den Matches abgeleitet**, es gibt keinen
   `entrantIds`-Parameter. Konsistent mit `rankScores`, das ebenfalls nur
   Teilnehmer mit mindestens einem Ergebnis rankt; wer nicht gespielt hat,
   bekommt keinen Rang und über `computeStandings` 0 Punkte.
6. Die Tordifferenz ist **kein Feld**, sondern `goalsFor - goalsAgainst`.
7. Die Eingabe wird nicht mutiert (`rank.check.ts` prüft das für `rankScores`
   ausdrücklich, hier genauso).

Testfälle in `table.check.ts`, deutsch benannt, `node --test`:

- Sieg und Niederlage vergeben 3 und 0
- Unentschieden vergibt je 1
- 0:0 ist ein Unentschieden
- Sieg + Unentschieden + Niederlage ergibt 4 Punkte (AC-4.1)
- Punktgleichheit wird über die Tordifferenz gelöst (AC-4.2)
- Punkt- und Differenzgleichheit wird über erzielte Tore gelöst (AC-4.2)
- vollständiger Gleichstand teilt den Rang, Folgerang übersprungen (AC-4.3, E-3)
- ungleiche Spielzahl wird summiert, `played` zählt korrekt (E-2)
- leere Eingabe ergibt leere Tabelle (E-1)
- die Eingabe wird nicht mutiert

**`board.service.ts`** — die einzige Verzweigung, kein Regelmodul:

```ts
const ranked = game.scoring === 'versus'
    ? buildTable(matchBuckets.get(game.id) ?? [])
    : rankScores(buckets.get(game.id) ?? [], game.primaryMetric.sortOrder);
```

Beide Zweige liefern Zeilen mit `entrantId` und `rank`, also bleiben die Aufrufe
von `placementPoints` und `computeStandings` Zeichen für Zeichen gleich. Matches
werden nur für Versus-Disziplinen geladen, Scores nur für metrische.

**`announce.ts`** — bewusst kein neuer Ereignistyp. `isBetter` wird mit
`value = leaguePoints` aufgerufen und funktioniert unverändert, weil
Versus-Disziplinen DESC-only sind: `first_score` feuert beim ersten Match,
`personal_best` beim Punktgewinn, `overtake` und `new_leader` wie gehabt. Ein
`ponytail:`-Kommentar hält das fest, damit es niemand für einen Zufall hält.

## Decisions (ADR)

### AD-1 — Eigene `Match`-Collection statt Erweiterung von `Score`

**Optionen:** (a) `Score` um `opponentId` und `matchId` erweitern,
(b) `Match` als eigene Collection, (c) alles auf `Match` vereinheitlichen und
`Score` als »Match mit einer Seite« modellieren.

**Gewählt: (b).** (a) hinterlässt zwei Zeilen für eine Tatsache, die
auseinanderlaufen können, und bricht `UpdateScoreSchema`, das ein Umhängen
ausdrücklich verbietet. (c) wäre auf dem Papier sauberer, würde aber
`rankScores`, alle Score-Routen, `UpdateScoreSchema` und die Scoring-Oberfläche
umschreiben — viel Diff für null Funktionsgewinn.

**Konsequenz:** zwei Ergebnisformen im System. `Game.scoring` sagt, welche gilt,
und AC-1.4 verhindert, dass eine Disziplin beide hat.

### AD-2 — 3/1/0 fest, keine `draws_allowed`-Option

**Optionen:** (a) nur Siege zählen, (b) 3/1/0 fest, (c) je Disziplin
konfigurierbar.

**Gewählt: (b).** (a) macht ein Unentschieden von einer Niederlage nicht
unterscheidbar — wer jedes Spiel remis spielt, stünde hinter jemandem mit
einem Sieg und sonst Niederlagen. (c) ist eine Konfigurationsachse für einen
Fall, den niemand genannt hat. Bei Spielen ohne Unentschieden (Rocket League hat
Overtime) tritt der Remis-Fall einfach nie ein, und 3/1/0 verhält sich dort
identisch zum reinen Siegzählen. Die Option kostet also nichts und wird nicht
gebraucht.

### AD-3 — Tordifferenz vor erzielten Toren

**Gewählt:** Punkte → Tordifferenz → Tore. Nur erzielte Tore zu zählen würde
einen Teilnehmer mit 5:0 und 1:6 über einen mit 3:1 und 2:2 setzen, obwohl der
zweite konstant besser war. Die Differenz bestraft die deutliche Niederlage,
Tore lösen den Rest. Das ist die etablierte Ordnung aus dem Fußball und muss
nicht neu erfunden werden.

### AD-4 — Ungleiche Spielzahl wird sichtbar gemacht, nicht ausgeglichen

**Optionen:** (a) Punkte summieren und `played` anzeigen, (b) Punkte durch
Spiele teilen, (c) Spielplan generieren und gleiche Spielzahl erzwingen.

**Gewählt: (a).** (b) setzt 1 Spiel × 1 Sieg (100 %) über 5 Spiele × 4 Siege
(80 %) — bei den kleinen Spielzahlen eines Abends falsch. (c) ist ein eigenes
Feature (Fixtures, offen/gespielt, Generator) für ein Problem, das der
Veranstalter durch Ansetzen löst. Die Spalte »Sp« auf der Karte macht ein
Ungleichgewicht für alle im Raum sichtbar — das genügt.

**Konsequenz:** ein schief angesetztes Turnier wird schief gewertet. Bewusst.

### AD-5 — Versus-Disziplinen sind auf `sortOrder: 'DESC'` festgelegt

**Gewählt:** per `.refine()` erzwungen. Die Alternative wäre, ASC zu erlauben
und »wer gewinnt« sowie »was ist eine gute Tordifferenz« zu invertieren — zwei
Verzweigungen mehr in `table.ts`, für Kopf-an-Kopf-Rundenzeiten, die niemand
angefragt hat. Eine Zeile Schema statt zwei Codepfade.

### AD-6 — Siege beeinflussen die Gesamtwertung nicht direkt

**Gewählt:** Siege entscheiden nur den Rang **innerhalb** der Disziplin. Die
Alternative — Gesamt-Siege als Tie-Break-Term in `byOlympicOrder` — hätte
bedeutet, dass metrische Disziplinen keine Siege beitragen und der Term nur für
einen Teil des Turniers greift. `standings.ts`, `points.ts` und
`StandingsEntrySchema` bleiben dadurch vollständig unangetastet.

## AC coverage

| AC | Covered by |
|---|---|
| AC-1.1 | `GameFormModal.tsx` — `sortOrder` disabled bei `versus` |
| AC-1.2 | `.refine()` in `CreateGameSchema` + Mongoose-Validator |
| AC-1.3 | `default: 'metric'` in Schema und Modell |
| AC-1.4 | `PATCH /api/games/:id` → 409 in `game.controller.ts` |
| AC-2.1 | `POST /api/matches` + `GET /api/matches?gameId` |
| AC-2.2–2.4 | `SubmitMatchSchema.refine()` + `matchSchema.pre('validate')` |
| AC-2.5 | `DELETE /api/matches/:id` + `useDeleteMatch` |
| AC-2.6 | `Scoring.tsx` verzweigt auf `game.scoring` |
| AC-2.7 | `emitBoardUpdate` in `match.controller.ts` |
| AC-3.1 | `GamePanel.tsx` Versus-Zweig |
| AC-3.2 | `GamePanel.tsx` Metrik-Zweig unverändert |
| AC-3.3 | `BoardGameEntrySchema.record` + `board.service.ts` |
| AC-3.4 | `buildTable([])` → `[]`, Leerzustand in `GamePanel` |
| AC-4.1–4.3 | `table.ts` + `table.check.ts` |
| AC-4.4 | bestehendes `placementPoints` — ungeändert, weil `buildTable` die Rangregel von `rankScores` teilt |
| AC-4.5 | `buildTable` leitet Teilnehmer aus Matches ab; `computeStandings` setzt den Rest auf 0 |
| AC-4.6 | `board.service.ts` — eine Verzweigung, `standings.ts` im Diff nicht enthalten |
