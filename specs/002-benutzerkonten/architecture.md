# 002 — Benutzerkonten und Mandantentrennung · Architecture

## Overview

Heute gibt es eine einzige Sicherheitsgrenze: `apiRouter.use(requireAdmin)` in
`routes/index.ts`. Alles davor ist offen, alles danach braucht das Token — und
das Token trägt kein Subjekt, weshalb kein Service und kein Controller weiß, für
wen er arbeitet.

Der Umbau besteht aus drei Schichten:

1. **Identität.** Eine `User`-Collection, `scrypt`-Hashing, und das bestehende
   HMAC-Token um `userId` und Ausstellungszeitpunkt erweitert. Das Token reist
   künftig in einem `httpOnly`-Cookie.
2. **Durchsetzung.** `requireUser` ersetzt `requireAdmin`, lädt das Konto und
   hängt es an den Request. Ein Helfer `assertOwned` ist die einzige Stelle, an
   der Besitz geprüft wird.
3. **Besitz im Datenmodell.** `ownerId` an `Tournament` und `Player`; alles
   andere erbt über `tournamentId`.

`auth.service.ts` wird dabei **umgebaut, nicht neu geschrieben**: `sign()`,
`equals()` und die komplette Anmeldebremse bleiben unverändert.

## Data model

### `User` — neue Collection

`server/src/models/user.model.ts`

```ts
const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // Trägt die öffentliche Board-URL: /board/<slug>/<turnier>
        slug: {
            type: String,
            required: true,
            unique: true,
            match: /^[a-z0-9-]+$/,
            minlength: 2,
            maxlength: 30,
        },
        displayName: { type: String, trim: true, maxlength: 50 },
        passwordHash: { type: String, required: true, select: false },
        // Jedes davor ausgestellte Token gilt nicht mehr. Deckt
        // "überall abmelden" und den Passwortwechsel mit einem Feld ab.
        sessionsValidFrom: { type: Date, default: Date.now },
        // ponytail: keine Mail-Verifikation. Feld reserviert, damit SMTP
        // später ohne Schemaänderung nachrüstbar ist.
        verifiedAt: Date,
    },
    { timestamps: true, toJSON: toJSONOptions },
);
```

`select: false` am Hash, damit er nicht versehentlich in einer Antwort landet
(AC-1.7). `verifyPassword` fordert ihn ausdrücklich mit `.select('+passwordHash')`
an.

**Reservierte Slugs.** Die Registrierung lehnt Slugs ab, die mit einem
Routenpfad kollidieren würden (E-8):
`['board', 'result', 'control', 'login', 'register', 'api', 'uploads']`.
Als Konstante neben dem Schema, geprüft im Zod-`.refine()`.

### `Tournament` — Besitz

```ts
ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
slug: { type: String, required: true, match: /^[a-z0-9-]+$/ },   // unique entfällt
```
```ts
tournamentSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
```

### `Player` — Besitz

```ts
ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
username: { type: String, required: true, trim: true, minlength: 2, maxlength: 30 },
```
```ts
playerSchema.index({ ownerId: 1, username: 1 }, { unique: true });
```

Der Kommentar in `shared/schemas.ts`, der die globale Eindeutigkeit mit
»Historie über mehrere Events« begründet, bleibt inhaltlich richtig — die
Historie ist jetzt kontoweit statt instanzweit.

### `Team`, `Game`, `Score`, `Match` — unverändert

Sie tragen `tournamentId` und erben den Besitz darüber. Ein zweites Feld wäre
ein zweiter Ort, an dem derselbe Fakt auseinanderlaufen kann.

**Keine Migration.** `PROJEKT.md` §12: die Datenbank enthält nur Testdaten,
`syncIndexes()` beim Boot räumt die alten `unique`-Indizes selbst ab.

## API contract

### `POST /api/auth/register`

Auth: keine. Request — `RegisterSchema`:
```ts
{
    email: string,           // z.email()
    password: string,        // min 12
    slug: string,            // ^[a-z0-9-]+$, nicht reserviert
    displayName?: string,
    trap?: string,           // Honeypot — muss leer oder abwesend sein
}
```
Response `201`: `{ id, email, slug, displayName? }` + `Set-Cookie: session=…`

Errors: `400` Passwort zu kurz / Slug ungültig oder reserviert / `trap` gefüllt ·
`409` E-Mail oder Slug vergeben · `429` Throttle

### `POST /api/auth/login`

Auth: keine. Request: `{ email, password }`.
Response `200`: `{ id, email, slug, displayName? }` + `Set-Cookie`.
Errors: `401` »E-Mail oder Passwort falsch« — eine Meldung für beide Fälle
(AC-2.2), mit dem bestehenden `PENALTY_MS`-Sleep · `429` Throttle

### `POST /api/auth/logout`

Auth: keine (ein abgelaufenes Cookie soll sich auch löschen lassen).
Response `204` + `Set-Cookie` mit Ablauf in der Vergangenheit.

### `GET /api/auth/me`

Auth: erforderlich. Response `200`: `{ id, email, slug, displayName? }`.
`401` ohne gültige Sitzung. **Kein `passwordHash`.**

### `GET /api/board/:userSlug/:tournamentSlug`

Auth: keine — ersetzt `GET /api/board/:slug`.
Response `200`: `BoardState` wie bisher. `404` wenn ein Slug unbekannt ist.
`?all=1` bleibt.

### Alle übrigen Routen

Unverändert in Pfad und Form, mit drei Änderungen im Verhalten:

- **`401` ohne Sitzung, auch bei GET.** Die heutige Ausnahme für GET/HEAD
  entfällt.
- **`404` bei fremdem Besitz**, nie `403` (AC-3.3).
- **`409` bei Überschreiten einer Obergrenze** (US-5).

Neu aktiviert: **`DELETE /api/tournaments/:id`** → `204`. Die Begründung für die
bisherige Sperre in `routes/tournament.routes.ts` war »kein Besitzer«; mit
`assertOwned` fällt sie weg.

`GET /api/games` und `GET /api/scores` bekommen `tournamentId` als
**Pflichtparameter**, sonst `400` — dasselbe Muster wie `GET /api/teams` heute
schon. Ohne Turnierbezug gibt es keine sinnvolle Abgrenzung.

## Shared types

`shared/schemas.ts`:

| Neu / geändert | Bedeutung |
|---|---|
| `UserSchema` | `{ id, email, slug, displayName? }` — das öffentliche Bild eines Kontos, ohne Hash |
| `RegisterSchema` | mit `.refine()` für Slug-Reservierung |
| `LoginSchema` | `{ pin }` → `{ email, password }` |
| `AuthTokenSchema` | **entfällt** — kein Token in einem Response-Body |
| `TournamentFields.ownerId` | nur in der Antwort, nicht im Create-Input; der Server nimmt es aus der Sitzung |
| `PlayerFields.ownerId` | dito |
| `BoardStateSchema.tournament.ownerSlug` | damit der Client Board-Links bauen kann |

`CreateTournamentSchema` und `CreatePlayerSchema` **dürfen `ownerId` nicht
enthalten** — sonst könnte ein Client fremden Besitz behaupten. Der Controller
setzt es aus `req.user`.

## Frontend structure

```
/login                         Login.tsx            (neu)
/register                      Register.tsx         (neu)
/board/:userSlug/:slug         Board.tsx            (Route geändert)
/result/:userSlug/:slug        Result.tsx           (Route geändert)
/control                       RequireSession       (neu) → Layout.tsx
  index    Scoring.tsx
  games    Games.tsx · GameDetail.tsx
  players  Players.tsx
  teams    Teams.tsx
  tournament Tournament.tsx
```

**`RequireSession`** ist ein Wrapper-Element um die `/control`-Route: es ruft
`useMe()`, zeigt während des Ladens nichts und leitet bei Fehler auf `/login`
um (AC-2.8).

**Kein Auth-Context-Provider.** `useMe()` als React-Query-Hook **ist** der
Cache; ein Provider wäre eine zweite Quelle für dieselbe Wahrheit. Die Board-
und Result-Links im Control-Panel entstehen aus `me.slug` (AC-4.5).

**`src/lib/auth.ts` wird gelöscht.** Das Cookie verwaltet der Browser; es gibt
nichts zu speichern, zu lesen oder zu löschen. Abmelden ist
`POST /api/auth/logout` plus `queryClient.clear()`.

**`src/components/layout/PinLock.tsx` wird gelöscht.** Sein eigener Kommentar
(»Die richtige Anmeldemaske entsteht mit `/control`«) beschreibt genau diesen
Schritt. `src/layout/Layout.tsx:46` ist der einzige Mountpunkt und zeigt
stattdessen Kontoname und Abmelden.

**`src/lib/api.ts`** — `request()` verliert das Anhängen des
`Authorization`-Headers und bekommt `credentials: 'same-origin'`. Bei `401`
keine Speicherbereinigung mehr, nur der Fehler »Sitzung abgelaufen — bitte
erneut anmelden«; die Umleitung macht `RequireSession`.

**`useTournamentContext.ts`** bleibt unverändert. Die Turnierliste kommt jetzt
besitzergebunden vom Server, also greift die »ein laufendes Event«-Heuristik
weiter, nur eben je Konto.

**Vier Zustände** in `Login.tsx` und `Register.tsx`: Ruhe, Senden, Feldfehler
(400/409 aus dem Server), Serverfehler. Das Honeypot-Feld ist per CSS
ausgeblendet und `tabIndex={-1}`, damit es niemand mit der Tastatur trifft.

## Domain logic (test-first)

Zwei Module mit echten Regeln, beide mit `*.check.ts` **vor** der
Implementierung. `auth.check.ts` existiert und wird erweitert, nicht ersetzt.

### `services/auth.service.ts`

```ts
export const hashPassword = (plain: string): string;          // "salt:hash" hex
export const verifyPassword = (plain: string, stored: string): boolean;
export const issueToken = (userId: string, now?: number): string;
export const verifyToken = (token: string, now?: number)
    : { userId: string; issuedAt: number } | null;
```

- Hashing: `scryptSync(plain, salt, 64)` mit `randomBytes(16)`-Salt, Vergleich
  über das vorhandene `equals()` (also `timingSafeEqual`).
- Token: `base64url("<userId>.<issuedAtMs>.<expiresAtMs>") + "." + sign(payload)`.
  `sign()` und `equals()` unverändert übernommen.
- Reihenfolge in `verifyToken` bleibt **Signatur vor Inhalt** — ein abgelaufenes
  Token soll nicht verraten, dass es echt war.
- `config.adminPin` und `checkPin` entfallen. HMAC-Schlüssel ist
  `config.sessionSecret` aus dem neuen Pflicht-Env `SESSION_SECRET`.
- `config` bekommt zusätzlich `nodeEnv: process.env.NODE_ENV ?? 'development'` —
  heute nicht vorhanden, aber vom Cookie-Flag gebraucht.
- Zweite Throttle-Bucket für die Registrierung; `isThrottled`,
  `noteFailedLogin`, `clearFailedLogins` und die Fenstergrößen bleiben wie sie
  sind.

Tests in `auth.check.ts`: Hash prüft das richtige Passwort und lehnt das falsche
ab · zwei Hashes desselben Passworts sind verschieden (Salt) · Token trägt die
`userId` zurück · verfälschte Signatur ergibt `null` · abgelaufenes Token ergibt
`null` · fremd signiertes Token ergibt `null` · Registrier-Throttle zählt
getrennt von der Anmelde-Throttle.

### `services/session.service.ts` (neu, ~25 Zeilen)

Die einzige Stelle, an der Cookie-Flags stehen — sonst schreiben Login,
Registrierung und Erneuerung sie dreimal und driften auseinander.

```ts
const COOKIE = 'session';

export const setSessionCookie = (res: Response, userId: string): void =>
    void res.cookie(COOKIE, issueToken(userId), {
        httpOnly: true,   // für JavaScript unlesbar, anders als localStorage
        sameSite: 'lax',  // ersetzt den CSRF-Token
        secure: config.nodeEnv === 'production',  // sonst kommt es über http nie an
        maxAge: config.tokenTtlMs,
        path: '/',
    });

export const clearSessionCookie = (res: Response): void =>
    void res.clearCookie(COOKIE, { path: '/' });

/** Eine Zeile statt cookie-parser — es wird genau ein Cookie gelesen. */
export const readSessionCookie = (req: Request): string | undefined =>
    req.headers.cookie
        ?.split('; ')
        .find((c) => c.startsWith(`${COOKIE}=`))
        ?.slice(COOKIE.length + 1);
```

### `middleware/auth.ts` — `requireUser`

Fünf Schritte, in dieser Reihenfolge:

1. `readSessionCookie` → fehlt: 401.
2. `verifyToken` → `null`: 401.
3. `User.findById(userId)` → kein Treffer: 401. **Das ist AC-6.2** — ohne diesen
   Schritt könnte ein per CLI gelöschtes Konto bis zu zwölf Stunden weiter
   schreiben.
4. `issuedAt < user.sessionsValidFrom` → 401. **Das ist AC-6.1.**
5. `req.user = user`, und wenn das Token über die halbe Laufzeit hinaus ist,
   `setSessionCookie` erneut (AC-2.4).

Deklarations-Merge für `Express.Request` in `server/src/types/index.ts`.

### `services/tournament.service.ts` — `assertOwned`

```ts
/** Wirft 404, nicht 403 — ein fremdes Turnier soll nicht einmal seine
 *  Existenz bestätigen. */
export const assertOwned = (
    tournamentId: string,
    ownerId: string,
): Promise<Tournament>;
```

Die **einzige** Stelle, an der Besitz geprüft wird. Jeder Team-, Game-, Score-
und Match-Controller ruft sie als erstes.

### `services/quota.service.ts` (neu)

```ts
const LIMITS = {
    tournamentsPerUser: 10,
    playersPerUser: 200,
    teamsPerTournament: 32,
    gamesPerTournament: 20,
    uploadsPerUser: 100,      // × 2 MB Obergrenze je Datei = 200 MB
} as const;

export const assertQuota = async (kind: keyof typeof LIMITS, scopeId: string)
    : Promise<void>;   // wirft 409 mit deutscher Meldung
```

Eine `countDocuments`-Abfrage vor dem Anlegen. Für `uploadsPerUser` ein
`readdir(uploads/<userId>).length` — **kein Zählerfeld am User**, das beim
Löschen einer Datei auseinanderlaufen könnte.

## Löcher, die dieses Feature schließen muss

Aus der Analyse des Ist-Stands. Jedes davon ist heute höchstens ein latenter
Bug, mit Konten ein Datenleck:

| Ort | Problem |
|---|---|
| `game.service.getGameBySlug` | `Game.findOne({ slug })` ohne `tournamentId` — liefert die erstgefundene Disziplin instanzweit (AC-3.6) |
| `leaderboard.service.getPinnedCharts` | ruft `listGames()` ohne `tournamentId` |
| `leaderboard.service.getPlayerStats` | dito |
| `player.service.getPlayerMap` | lädt **alle** Spieler der Instanz; braucht `ownerId` |
| `GET /api/players` | gibt alle Spieler der Instanz zurück (AC-3.2) |
| `board.service.loadEntrants` | nutzt `getPlayerMap`, zieht also mit |
| `routes/index.ts` | GET/HEAD/OPTIONS gehen heute an der Auth-Grenze vorbei (AC-3.8) |
| `middleware/upload.ts` | schreibt flach in ein gemeinsames Verzeichnis (AC-5.4) |

## Decisions (ADR)

### AD-1 — `httpOnly`-Cookie statt Token im `localStorage`

**Gewählt:** Cookie. Ein Token im `localStorage` ist für jedes eingeschleuste
Script lesbar, ein `httpOnly`-Cookie nicht. Die Anwendung ist ohnehin
same-origin (`PROJEKT.md` §11: Express liefert `dist/` aus), und `res.cookie()`
steckt in Express — es kostet also **kein** Paket und **weniger** Code:
`src/lib/auth.ts` verschwindet, und `api.ts` verwaltet keinen Header mehr.

**Konsequenz:** `secure` muss an `NODE_ENV` hängen, sonst kommt das Cookie im
Dev-Betrieb über `http://localhost` nie an (E-5).

### AD-2 — Kein JWT, kein Refresh-Token-Paar

**Optionen:** (a) HMAC-Token um ein Subjekt erweitern, (b) JWT, (c) JWT plus
Refresh-Token mit Rotation und eigener Collection.

**Gewählt: (a).** `auth.service.ts` signiert heute schon per HMAC-SHA256, prüft
Signatur vor Inhalt und vergleicht mit `timingSafeEqual` — das **ist** ein
signiertes Token. Ein JWT wäre dasselbe, verpackt in einen JSON-Header, der
seinen eigenen Algorithmus ansagt; genau dort sitzen die bekannten Fallen
(`alg: none`, Algorithmus-Verwechslung). Das Token wird von keinem anderen
System gelesen, das Standardformat kauft also nichts und kostet eine
Abhängigkeit plus eine umgeschriebene, heute grüne `auth.check.ts`.

Zu (c): Der Zweck eines kurzlebigen Access-Tokens ist, den Diebstahl eines für
JavaScript **lesbaren** Tokens zu begrenzen. Mit AD-1 ist es unlesbar, damit
entfällt das Bedrohungsmodell. Was von (c) übrig bleibt, ist der **Widerruf** —
und den liefern Schritt 3 und 4 in `requireUser` für zwei Zeilen statt für eine
Collection mit Rotation und Reuse-Erkennung.

**Konsequenz:** eine Datenbankabfrage je geschütztem Request. Gegen ~20 ms
Atlas-Grundlast (§11) vertretbar, und sie wird für `req.user` ohnehin gebraucht.

### AD-3 — Kein CSRF-Token

**Gewählt:** `sameSite: 'lax'` genügt. Lax sendet das Cookie bei
fremdinitiierten POST/PATCH/DELETE nicht mit, und **jede** schreibende Route
dieser API ist non-GET. Anders als heute lässt `requireUser` GET nicht durch,
also gibt es auch keine lesende Seitentür.

### AD-4 — 404 statt 403 bei fremdem Besitz

**Gewählt:** 404. Ein 403 bestätigt, dass die ID existiert. Bei fortlaufend
ratbaren ObjectIds und einer offenen Registrierung wäre das ein Verzeichnis
fremder Turniere. Umgesetzt an einer Stelle — `assertOwned` —, damit es nicht
route-weise verloren geht.

### AD-5 — Socket.IO bleibt unauthentifiziert

**Gewählt:** `room:join` bleibt offen. Der Raum verteilt ausschließlich
`board:update`, also denselben Payload, den
`GET /api/board/:userSlug/:slug` öffentlich ausliefert. Eine Authentifizierung
würde nichts schützen, aber das Board am Beamer anmeldepflichtig machen — genau
das, was AC-4.4 verbietet. Als `ponytail:`-Kommentar in `realtime/index.ts`
festhalten, damit es nicht als Versehen gelesen wird.

### AD-6 — Offene Registrierung mit Quoten statt Einladungscode

**Optionen:** (a) offene Registrierung mit Honeypot, Throttle und Quoten,
(b) geteilter Einladungscode, (c) Konten nur per CLI.

**Gewählt: (a)** — ausdrücklicher Wunsch: Nutzer sollen ohne Zutun des
Betreibers anlegen können. Von den drei Maßnahmen ist die **Quote** die
wirksamste: das Risiko ist nicht die Existenz eines Müll-Kontos, sondern dass
jedes Konto unbegrenzt Turniere anlegen und 2-MB-Bilder in das Named Volume
schieben kann. Eine Zählung vor dem Anlegen begrenzt den Schaden unabhängig
davon, wie viele Konten entstehen. Der Honeypot fängt nur naive Formular-Bots
und ist drei Zeilen wert, nicht mehr.

**Konsequenz:** Ohne Mail-Verifikation ist kein Konto als menschlich bewiesen.
`verifiedAt` liegt dafür bereit.

### AD-7 — Besitz nur an `Tournament` und `Player`

**Gewählt:** `Team`, `Game`, `Score` und `Match` erben über `tournamentId`. Ein
eigenes `ownerId` an jedem wäre ein zweiter Ort für denselben Fakt, der bei
jedem Umhängen auseinanderlaufen kann. Der Preis ist ein zusätzlicher Lookup je
Zugriff — genau der, den `assertOwned` ohnehin macht.

### AD-8 — `Player` gehört dem Konto, nicht dem Turnier

**Optionen:** (a) `ownerId` am Player, (b) `tournamentId` am Player,
(c) globale Spieler, die sich selbst anmelden können.

**Gewählt: (a).** (b) wäre die strengste Trennung, zerstört aber genau den in
`shared/schemas.ts` dokumentierten Zweck der Collection — Historie über mehrere
Events hinweg. (c) ist ein eigenes Produkt (Einladungen, Identität,
Einwilligung). Mit (a) bleibt die Historie erhalten, nur kontoweit statt
instanzweit.

### AD-9 — Uploads nach `uploads/<userId>/`

**Gewählt:** ein Verzeichnis je Konto. Es macht die Quote zu einem `readdir`
ohne Zählerfeld, und die Kaskade in `user-delete` löscht ein Verzeichnis statt
Dateien zu suchen. `ImageUrlSchema` bleibt gültig, weil der Pfad weiterhin unter
`/uploads/` liegt.

## AC coverage

| AC | Covered by |
|---|---|
| AC-1.1, 1.2, 1.4 | `RegisterSchema` + `POST /api/auth/register` |
| AC-1.3 | `unique`-Indizes auf `email` und `slug` → 409 |
| AC-1.5 | `trap`-Prüfung im Register-Controller |
| AC-1.6 | zweite Throttle-Bucket in `auth.service.ts` |
| AC-1.7 | `select: false` am `passwordHash` + `UserSchema` ohne das Feld |
| AC-2.1, 2.2 | `POST /api/auth/login`, eine Fehlermeldung für beide Fälle |
| AC-2.3 | `session.service.setSessionCookie` |
| AC-2.4 | Schritt 5 in `requireUser` |
| AC-2.5 | `POST /api/auth/logout` + `clearSessionCookie` |
| AC-2.6 | `GET /api/auth/me` |
| AC-2.7 | `verifyToken` → `null` → 401 |
| AC-2.8 | `RequireSession` im Router |
| AC-3.1, 3.2 | `ownerId`-Filter in `tournament.service` und `player.service` |
| AC-3.3 | `assertOwned` (AD-4) |
| AC-3.4, 3.5 | zusammengesetzte `unique`-Indizes |
| AC-3.6 | `getGameBySlug` mit `tournamentId` |
| AC-3.7 | `DELETE /api/tournaments/:id` + bestehendes `deleteTournament` |
| AC-3.8 | `apiRouter.use(requireUser)` ohne GET-Ausnahme |
| AC-4.1–4.3 | `GET /api/board/:userSlug/:tournamentSlug` |
| AC-4.4 | Board-Routen vor `RequireSession` montiert |
| AC-4.5 | `useMe()` → `me.slug` in den Control-Links |
| AC-5.1–5.3 | `assertQuota` in den Create-Controllern |
| AC-5.4 | `middleware/upload.ts` schreibt nach `uploads/<userId>/` |
| AC-6.1 | Schritt 4 in `requireUser` (`sessionsValidFrom`) |
| AC-6.2 | Schritt 3 in `requireUser` (`findById`) |
| AC-6.3, 6.4 | `server/src/user-delete.ts` |
