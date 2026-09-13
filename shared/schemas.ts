import { z } from 'zod';

// Sortier- & Format-Enums
export const SortOrderSchema = z.enum(['ASC', 'DESC']);
export const MetricFormatterSchema = z.enum([
    'time_ms',
    'integer',
    'decimal',
    'currency',
]);
export const TournamentModeSchema = z.enum(['player', 'team']);
export const TournamentStatusSchema = z.enum([
    'draft',
    'live',
    'finished',
    'archived',
]);
export const GameStatusSchema = z.enum(['upcoming', 'running', 'finished']);
// Metrisch (bisheriges Verhalten) oder Versus — zwei Teilnehmer je Ergebnis.
export const ScoringModeSchema = z.enum(['metric', 'versus']);

/**
 * Bild-Adresse: entweder extern oder ein Upload auf demselben Server.
 * Uploads liegen unter `/uploads/<userId>/<name>` (AD-9,
 * specs/002-benutzerkonten) und sind damit relativ — `z.url()` allein würde
 * genau die Adressen ablehnen, die der eigene Upload ausgibt.
 */
export const ImageUrlSchema = z.union([
    z.url(),
    z.string().regex(/^\/uploads\/[\w.-]+\/[\w.-]+$/),
]);

// Konfiguration einzelner Metriken
export const MetricConfigSchema = z.object({
    key: z.string().min(1).max(50),
    label: z.string().min(1).max(50),
    sortOrder: SortOrderSchema,
    formatter: MetricFormatterSchema,
    unit: z.string().max(20).optional(),
});

/**
 * Game-Felder ohne Defaults. Die Defaults sitzen bewusst nur im
 * Create-Schema: ein PATCH mit `.partial()` würde sie sonst mitschicken und
 * z.B. pinned still auf false zurücksetzen, sobald man nur das Cover ändert.
 */
const GameFields = z.object({
    tournamentId: z.string().min(1),
    slug: z
        .string()
        .regex(
            /^[a-z0-9-]+$/,
            'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        ),
    title: z.string().min(1).max(100),
    genre: z.enum(['racing', 'sports', 'arcade', 'fps', 'custom']),
    coverUrl: ImageUrlSchema.optional(),
    // Metrisch (bestehend) oder Versus (Matches mit zwei Seiten). Ohne Default
    // hier — der sitzt nur im Create-Schema, siehe UpdateGameSchema.
    scoring: ScoringModeSchema,
    primaryMetric: MetricConfigSchema,
    secondaryMetrics: z.array(MetricConfigSchema).optional(),
    // Gewichtungsfaktor der Disziplin — ein Finale zählt zum Beispiel doppelt.
    weight: z.number().positive(),
    // Steuert, welche Games auf dem Board erscheinen.
    pinned: z.boolean(),
    // Reihenfolge in der Board-Rotation.
    boardOrder: z.number().int().nonnegative(),
    status: GameStatusSchema,
    // Ende des Countdowns auf dem Board. Gesetzt beim Start der Disziplin
    // (jetzt + Dauer), `null` räumt ihn wieder ab — deshalb nullable und
    // nicht nur optional: ein PATCH muss ihn löschen können.
    endsAt: z.iso.datetime().nullable().optional(),
});

// Game Schema (Antwort — der Server liefert die Defaults immer mit)
export const GameSchema = GameFields.extend({ id: z.string().min(1) });

/**
 * Versus-Disziplinen sind auf absteigende Sortierung festgelegt (AD-5): bei
 * einem Match entscheidet der höhere Wert den Sieg, und nur bei DESC ist
 * "höher" auch "besser". Erzwungen hier und zusätzlich im
 * Mongoose-Validator — die zweite Hälfte wie bei `hasMatchingEntrant`.
 *
 * Bei `UpdateGameSchema` (`.partial()`) greift die Prüfung nur, wenn ein
 * Patch beide Felder widersprüchlich zugleich setzt; ein Patch, der nur eines
 * von beiden ändert, kann ohne den bestehenden Datenbankstand nicht bewertet
 * werden.
 */
const hasDescSortOrderForVersus = (game: {
    scoring?: z.infer<typeof ScoringModeSchema>;
    primaryMetric?: z.infer<typeof MetricConfigSchema>;
}): boolean =>
    game.scoring !== 'versus' ||
    game.primaryMetric === undefined ||
    game.primaryMetric.sortOrder === 'DESC';

const DESC_INVARIANT_MESSAGE =
    'Versus-Disziplinen benötigen primaryMetric.sortOrder: DESC';

/** Spieler-Felder. Global und turnierübergreifend, damit die persönliche
 * Historie über mehrere Events hinweg erhalten bleibt. */
const PlayerFields = z.object({
    username: z.string().min(2).max(30),
    // Anzeigename auf dem Board; fehlt er, steht dort der username.
    displayName: z.string().min(1).max(30).optional(),
    avatarUrl: ImageUrlSchema.optional(),
    // Deterministischer Fallback-Sprite, wenn kein Avatar hochgeladen ist.
    avatarSeed: z.string().min(1),
    // Bleibt erhalten, wird auf dem Board aber nicht genutzt.
    countryCode: z.string().length(2).toUpperCase().optional(),
});

/** `ownerId` dito wie bei `TournamentSchema` — Antwort, nicht Create-Input. */
export const PlayerSchema = PlayerFields.extend({
    id: z.string().min(1),
    ownerId: z.string().min(1),
});

/**
 * Score-Felder. `tournamentId` ist gegenüber dem Game denormalisiert, damit
 * Turnierabfragen ohne Join auskommen. `entrantType` ist gegenüber dem Turnier
 * redundant, macht den Score aber selbsttragend — die Wertungsfunktionen
 * müssen dafür nichts nachladen.
 */
const ScoreFields = z.object({
    tournamentId: z.string().min(1),
    gameId: z.string().min(1),
    entrantType: TournamentModeSchema,
    playerId: z.string().min(1).optional(),
    teamId: z.string().min(1).optional(),
    primaryValue: z.number().nonnegative(),
    secondaryValues: z.record(z.string(), z.number()).optional(),
    metadata: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
});

/**
 * Genau die zu `entrantType` passende ID ist gesetzt. Erzwungen wird das hier
 * und im Mongoose-Validator — kein Controller und kein Service prüft es noch
 * einmal nach.
 */
const hasMatchingEntrant = (score: z.infer<typeof ScoreFields>): boolean =>
    score.entrantType === 'player'
        ? score.playerId !== undefined && score.teamId === undefined
        : score.teamId !== undefined && score.playerId === undefined;

// Score-Submit Schema (für POST-Requests /api/scores)
export const SubmitScoreSchema = ScoreFields.refine(
    hasMatchingEntrant,
    'Zu entrantType gehört genau eine ID: playerId oder teamId',
);

// Leaderboard-Eintrag (vollständig mit Rang & Timestamp)
export const LeaderboardEntrySchema = ScoreFields.extend({
    id: z.string().min(1),
    player: PlayerSchema,
    rank: z.number().int().positive(),
    recordedAt: z.iso.datetime(),
});

// Dashboard Aggregation Schema (Response für /api/leaderboard/:gameSlug)
export const LeaderboardChartDataSchema = z.object({
    game: GameSchema,
    totalParticipants: z.number().int().nonnegative(),
    topEntries: z.array(LeaderboardEntrySchema),
    userEntry: LeaderboardEntrySchema.optional(),
});

// Roher Score-Eintrag inkl. Game-Titel (Historie im Spieler-Modal)
export const ScoreRecordSchema = ScoreFields.extend({
    id: z.string().min(1),
    recordedAt: z.iso.datetime(),
    gameTitle: z.string().optional(),
    gameSlug: z.string().optional(),
    primaryMetric: MetricConfigSchema.optional(),
});

// Spieler-Statistik (Response für /api/players/:id/stats)
export const PlayerStatsSchema = z.object({
    player: PlayerSchema,
    medals: z.object({
        gold: z.number().int().nonnegative(),
        silver: z.number().int().nonnegative(),
        bronze: z.number().int().nonnegative(),
    }),
    gamesPlayed: z.number().int().nonnegative(),
    totalScores: z.number().int().nonnegative(),
    recentScores: z.array(ScoreRecordSchema),
});

// Input-Schemas: aus den Entity-Schemas abgeleitet, nicht neu geschrieben.
export const CreateGameSchema = GameFields.extend({
    scoring: ScoringModeSchema.default('metric'),
    weight: z.number().positive().default(1),
    pinned: z.boolean().default(false),
    boardOrder: z.number().int().nonnegative().default(0),
    status: GameStatusSchema.default('upcoming'),
}).refine(hasDescSortOrderForVersus, DESC_INVARIANT_MESSAGE);
/** Nur die gesendeten Felder werden geändert — keine Defaults, siehe oben. */
export const UpdateGameSchema = GameFields.partial().refine(
    hasDescSortOrderForVersus,
    DESC_INVARIANT_MESSAGE,
);
/** avatarSeed leitet der Service deterministisch aus dem Namen ab. */
export const CreatePlayerSchema = PlayerFields.omit({ avatarSeed: true });
/** Nur die gesendeten Felder werden geändert — keine Defaults, siehe oben. */
export const UpdatePlayerSchema = PlayerFields.partial();
/** Ein Score lässt sich korrigieren, aber nicht auf einen anderen Teilnehmer
 * oder in eine andere Disziplin umhängen. */
export const UpdateScoreSchema = ScoreFields.omit({
    tournamentId: true,
    gameId: true,
    entrantType: true,
    playerId: true,
    teamId: true,
}).partial();

// Type Exports via Inference
export type SortOrder = z.infer<typeof SortOrderSchema>;
export type ScoringMode = z.infer<typeof ScoringModeSchema>;
export type MetricFormatter = z.infer<typeof MetricFormatterSchema>;
export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type SubmitScoreInput = z.infer<typeof SubmitScoreSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardChartData = z.infer<typeof LeaderboardChartDataSchema>;
export type ScoreRecord = z.infer<typeof ScoreRecordSchema>;
export type PlayerStats = z.infer<typeof PlayerStatsSchema>;
export type CreateGameInput = z.infer<typeof CreateGameSchema>;
export type UpdateGameInput = z.infer<typeof UpdateGameSchema>;
export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayerInput = z.infer<typeof UpdatePlayerSchema>;
export type UpdateScoreInput = z.infer<typeof UpdateScoreSchema>;

// ---------------------------------------------------------------------------
// Match (Versus-Disziplinen, architecture.md 001-match-wertung)
// Eine Begegnung zwischen zwei Teilnehmern mit je einem Wert — anders als
// Score, das einen einzelnen Teilnehmer gegen die Bestenliste stellt.
// ---------------------------------------------------------------------------

export const MatchSideSchema = z.object({
    playerId: z.string().min(1).optional(),
    teamId: z.string().min(1).optional(),
    value: z.number().nonnegative(),
});

/** Match-Felder ohne Defaults; `playedAt` hat serverseitig einen Default
 * (jetzt), siehe SubmitMatchSchema. */
const MatchFields = z.object({
    tournamentId: z.string().min(1),
    gameId: z.string().min(1),
    entrantType: TournamentModeSchema,
    // Ein Match ist immer zwei Seiten — Free-for-all ist ausdrücklich out
    // of scope (requirements.md Scope/Out). `z.tuple` erzwingt das strukturell.
    sides: z.tuple([MatchSideSchema, MatchSideSchema]),
});

const matchSideMatchesEntrant = (
    side: z.infer<typeof MatchSideSchema>,
    entrantType: z.infer<typeof TournamentModeSchema>,
): boolean =>
    entrantType === 'player'
        ? side.playerId !== undefined && side.teamId === undefined
        : side.teamId !== undefined && side.playerId === undefined;

/**
 * Genau die zu `entrantType` passende ID ist je Seite gesetzt — zweite
 * Hälfte im Mongoose-Validator, wie bei `hasMatchingEntrant` für Score.
 */
const hasMatchingEntrants = (match: z.infer<typeof MatchFields>): boolean =>
    match.sides.every((side) =>
        matchSideMatchesEntrant(side, match.entrantType),
    );

/** Die beiden Seiten dürfen nicht denselben Teilnehmer nennen. */
const hasDistinctEntrants = (match: z.infer<typeof MatchFields>): boolean => {
    const idOf = (side: z.infer<typeof MatchSideSchema>) =>
        match.entrantType === 'player' ? side.playerId : side.teamId;
    return idOf(match.sides[0]) !== idOf(match.sides[1]);
};

// Match-Submit Schema (für POST-Requests /api/matches)
export const SubmitMatchSchema = MatchFields.extend({
    playedAt: z.iso.datetime().optional(),
})
    .refine(
        hasMatchingEntrants,
        'Zu entrantType gehört je Seite genau eine ID: playerId oder teamId',
    )
    .refine(
        hasDistinctEntrants,
        'Die beiden Seiten müssen unterschiedliche Teilnehmer sein',
    );

// Match Schema (Antwort — Response von POST/GET /api/matches)
export const MatchSchema = MatchFields.extend({
    id: z.string().min(1),
    playedAt: z.iso.datetime(),
});

export type MatchSide = z.infer<typeof MatchSideSchema>;
export type SubmitMatchInput = z.infer<typeof SubmitMatchSchema>;
export type Match = z.infer<typeof MatchSchema>;

// ---------------------------------------------------------------------------
// Board-Vertrag — Payload für board:update und event:announce (PROJEKT.md §5)
// ---------------------------------------------------------------------------

/**
 * Ein Teilnehmer in der Board-Darstellung — Spieler oder Team, bereits
 * flachgeklopft. Das Board rendert für beide Modi dieselbe Zeile, also
 * entscheidet der Server einmal, was Name, Bild und Farbe sind, statt den
 * Client für jeden Modus verzweigen zu lassen. Kein `entrantType` hier:
 * der Modus steht im selben Payload am Turnier.
 */
export const StandingsEntrySchema = z.object({
    entrantId: z.string().min(1),
    name: z.string().min(1),
    // Avatar oder Team-Banner; fehlt beides, rendert der Client den
    // deterministischen Pixel-Sprite aus avatarSeed.
    imageUrl: ImageUrlSchema.optional(),
    avatarSeed: z.string().min(1),
    // Balkenfarbe. Nur im Team-Modus gesetzt (colorPrimary aus der DB), im
    // Spieler-Modus greift der Client auf einen Token zurück.
    color: z.string().optional(),
    rank: z.number().int().positive(),
    // Ungerundet übertragen, gerundet dargestellt — PROJEKT.md §4.2.
    points: z.number().nonnegative(),
    // Balkenlänge relativ zum Führenden, 0..1. Der Server kennt das Maximum
    // ohnehin; der Client soll die Liste nicht noch einmal durchlaufen.
    share: z.number().min(0).max(1),
    // Index 0 = Zahl der ersten Plätze, 1 = zweite, usw. Deckt den
    // olympischen Tie-Break (§4.4) und den Medaillenspiegel der Siegerehrung
    // mit einem Feld ab.
    rankCounts: z.array(z.number().int().nonnegative()),
});

/**
 * Die Tabellenzeile einer Versus-Disziplin auf der Board-Karte (architecture.md
 * 001-match-wertung). Die Tordifferenz ist bewusst kein Feld — der Client
 * rechnet `goalsFor - goalsAgainst`.
 */
export const MatchRecordSchema = z.object({
    played: z.number().int().nonnegative(),
    won: z.number().int().nonnegative(),
    drawn: z.number().int().nonnegative(),
    lost: z.number().int().nonnegative(),
    goalsFor: z.number().int().nonnegative(),
    goalsAgainst: z.number().int().nonnegative(),
});

/** Ein Ergebnis innerhalb einer Disziplin. */
export const BoardGameEntrySchema = z.object({
    // Verweist auf StandingsEntry — Name, Bild und Farbe stehen genau einmal
    // im Payload und können nicht auseinanderlaufen.
    entrantId: z.string().min(1),
    rank: z.number().int().positive(),
    // Rohwert der Disziplin bei `scoring: 'metric'` (identisch mit
    // Score.primaryValue); bei `scoring: 'versus'` sind es die Liga-Punkte.
    value: SubmitScoreSchema.shape.primaryValue,
    // Platzierungspunkte inkl. Mittelung und Gewichtung (§4.2).
    points: z.number().nonnegative(),
    // Nur bei `scoring: 'versus'` gesetzt — metrische Disziplinen haben
    // keine Tabelle.
    record: MatchRecordSchema.optional(),
});

/**
 * Eine Disziplin auf dem Board. Nur die Felder, die die Karte zeigt —
 * `weight`, `boardOrder` und `pinned` bleiben serverseitig: die Reihenfolge
 * ist die Array-Reihenfolge, und ungepinnte Games stehen gar nicht drin.
 */
export const BoardGameSchema = z.object({
    game: GameSchema.pick({
        id: true,
        slug: true,
        title: true,
        genre: true,
        coverUrl: true,
        primaryMetric: true,
        scoring: true,
    }),
    status: GameStatusSchema,
    /** Ziel des Countdowns, solange die Disziplin läuft. */
    endsAt: z.iso.datetime().nullable().optional(),
    entries: z.array(BoardGameEntrySchema),
});

/**
 * Der vollständige Board-Zustand. Wird als Ganzes geschickt (§5) und ist
 * zugleich die Eingabe für announce.ts, das zwei aufeinanderfolgende
 * Zustände vergleicht.
 */
export const BoardStateSchema = z.object({
    tournament: z.object({
        id: z.string().min(1),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        // Der Konto-Slug des Besitzers — damit der Client die öffentliche
        // Board-URL `/board/:ownerSlug/:slug` bauen kann (AC-4.5).
        ownerSlug: z.string().regex(/^[a-z0-9-]+$/),
        title: z.string().min(1),
        mode: TournamentModeSchema,
        status: TournamentStatusSchema,
    }),
    // Absteigend sortiert, Platz 1 zuerst.
    standings: z.array(StandingsEntrySchema),
    games: z.array(BoardGameSchema),
    // Das Board pollt zusätzlich alle 30s per REST (§5). Ohne Zeitstempel
    // könnte eine langsame Poll-Antwort einen neueren Socket-Zustand
    // überschreiben; der Client verwirft damit alles Ältere.
    computedAt: z.iso.datetime(),
});

export const AnnouncementTypeSchema = z.enum([
    'first_score',
    'personal_best',
    'new_leader',
    'overtake',
    'tie_broken',
    'game_finished',
    'tournament_finished',
]);

/**
 * Ein Toast-Ereignis. `text` ist serverseitig fertig gerendert — der Client
 * setzt keine Platzhalter mehr ein. Die strukturierten Felder bleiben
 * trotzdem dabei: das Board zeigt den Avatar des Teilnehmers und hält die
 * betroffene Game-Karte einen Rotationszyklus länger stehen (§6).
 *
 * Bewusst ein flaches Objekt mit optionalen Feldern statt einer
 * diskriminierten Union über sieben Typen: `tournament_finished` hat keinen
 * Teilnehmer, alle übrigen Kombinationen sind für die Darstellung egal.
 */
export const AnnouncementSchema = z.object({
    type: AnnouncementTypeSchema,
    text: z.string().min(1),
    entrantId: z.string().min(1).optional(),
    gameId: z.string().min(1).optional(),
    value: SubmitScoreSchema.shape.primaryValue.optional(),
    rank: z.number().int().positive().optional(),
});

// --- Konten, Zugriffsschutz und Upload (PROJEKT.md §9, specs/002) ----------

/**
 * Slugs, die mit einem festen Routenpfad kollidieren würden (E-8) — bei der
 * Registrierung abgelehnt, sonst wird `/board/:userSlug/:slug` mehrdeutig.
 */
export const RESERVED_SLUGS = [
    'board',
    'result',
    'control',
    'login',
    'register',
    'api',
    'uploads',
] as const;

const isNotReservedSlug = (slug: string): boolean =>
    !(RESERVED_SLUGS as readonly string[]).includes(slug);

const AccountSlugSchema = z
    .string()
    .regex(
        /^[a-z0-9-]+$/,
        'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
    )
    .min(2)
    .max(30);

/** Das öffentliche Bild eines Kontos — ohne `passwordHash`. */
export const UserSchema = z.object({
    id: z.string().min(1),
    email: z.email(),
    slug: AccountSlugSchema,
    displayName: z.string().trim().max(50).optional(),
});

/**
 * Registrierung. `trap` ist das Honeypot-Feld: per CSS ausgeblendet, ein
 * echter Nutzer füllt es nie. Geprüft wird es im Controller (AC-1.5), nicht
 * hier — ein leeres oder fehlendes Feld ist immer gültig.
 */
export const RegisterSchema = z
    .object({
        email: z.email(),
        password: z.string().min(12, 'Passwort muss mindestens 12 Zeichen haben'),
        slug: AccountSlugSchema,
        displayName: z.string().trim().max(50).optional(),
        trap: z.string().optional(),
    })
    .refine(
        (input) => isNotReservedSlug(input.slug),
        'Dieser Slug ist reserviert',
    );

export const LoginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

/** Antwort des Uploads; die Adresse wandert danach in ein Entitätsfeld. */
export const UploadResultSchema = z.object({ url: ImageUrlSchema });

export type User = z.infer<typeof UserSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;

// --- Socket-Events (PROJEKT.md §5, KONVENTIONEN.md §8) ---------------------

export const RoomJoinSchema = z.object({ tournamentId: z.string().min(1) });
export const TournamentStatusEventSchema = RoomJoinSchema.extend({
    status: TournamentStatusSchema,
});

export type TournamentMode = z.infer<typeof TournamentModeSchema>;
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export type StandingsEntry = z.infer<typeof StandingsEntrySchema>;
export type MatchRecord = z.infer<typeof MatchRecordSchema>;
export type BoardGameEntry = z.infer<typeof BoardGameEntrySchema>;
export type BoardGame = z.infer<typeof BoardGameSchema>;
export type BoardState = z.infer<typeof BoardStateSchema>;
export type AnnouncementType = z.infer<typeof AnnouncementTypeSchema>;
export type Announcement = z.infer<typeof AnnouncementSchema>;
export type RoomJoin = z.infer<typeof RoomJoinSchema>;
export type TournamentStatusEvent = z.infer<typeof TournamentStatusEventSchema>;

export type ServerToClientEvents = {
    'board:update': (payload: BoardState) => void;
    'event:announce': (payload: Announcement[]) => void;
    'tournament:status': (payload: TournamentStatusEvent) => void;
};

export type ClientToServerEvents = {
    'room:join': (payload: RoomJoin) => void;
};

// ---------------------------------------------------------------------------
// Turnier und Team (PROJEKT.md §3)
// Stehen hinter dem Board-Vertrag, weil sie dessen Enums mitbenutzen.
// ---------------------------------------------------------------------------

/**
 * Turnier-Felder ohne Defaults — siehe die Begründung bei GameFields.
 */
const TournamentFields = z.object({
    slug: z
        .string()
        .regex(
            /^[a-z0-9-]+$/,
            'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        ),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    // Gilt für ALLE Games des Turniers: entweder Spieler gegen Spieler oder
    // Team gegen Team. Gemischte Turniere gibt es bewusst nicht.
    mode: TournamentModeSchema,
    status: TournamentStatusSchema,
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().optional(),
    // Index 0 = Platz 1. Muss monoton fallen, sonst könnte ein schlechterer
    // Rang mehr Punkte einbringen als ein besserer — points.ts verlässt sich
    // darauf und prüft es bewusst nicht noch einmal nach.
    pointsTable: z
        .array(z.number().nonnegative())
        .min(1)
        .refine(
            (table) => table.every((v, i) => i === 0 || v <= table[i - 1]!),
            'Die Punktetabelle muss von Platz 1 an fallen',
        ),
    // Einziger Wert bis auf Weiteres; das Feld existiert für spätere Varianten.
    tieBreak: z.enum(['olympic']),
    bannerUrl: ImageUrlSchema.optional(),
});

/**
 * `ownerId` steht nur in der Antwort, nicht im Create-Input (siehe
 * `CreateTournamentSchema`) — der Server nimmt es aus der Sitzung, ein
 * Client könnte sonst fremden Besitz behaupten.
 */
export const TournamentSchema = TournamentFields.extend({
    id: z.string().min(1),
    ownerId: z.string().min(1),
});

/**
 * Team-Felder. Teams gehören zu genau einem Turnier — dieselbe Person kann
 * beim nächsten Event in einem anderen Team antreten, ohne dass die Historie
 * falsch wird.
 */
const TeamFields = z.object({
    tournamentId: z.string().min(1),
    name: z.string().min(1).max(50),
    colorPrimary: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein Hex-Wert wie #ff2d9b sein'),
    colorSecondary: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein Hex-Wert wie #ff2d9b sein')
        .optional(),
    bannerUrl: ImageUrlSchema.optional(),
    avatarSeed: z.string().min(1),
    members: z.array(z.string().min(1)),
});

export const TeamSchema = TeamFields.extend({ id: z.string().min(1) });

export const CreateTournamentSchema = TournamentFields.extend({
    status: TournamentStatusSchema.default('draft'),
    pointsTable: TournamentFields.shape.pointsTable.default([
        10, 8, 6, 5, 4, 3, 2, 1,
    ]),
    tieBreak: z.enum(['olympic']).default('olympic'),
});
/** Nur die gesendeten Felder werden geändert — keine Defaults, siehe oben. */
export const UpdateTournamentSchema = TournamentFields.partial();

/** avatarSeed leitet der Service deterministisch aus dem Namen ab. */
export const CreateTeamSchema = TeamFields.omit({ avatarSeed: true }).extend({
    members: TeamFields.shape.members.default([]),
});
export const UpdateTeamSchema = TeamFields.partial();

export type Tournament = z.infer<typeof TournamentSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type CreateTournamentInput = z.infer<typeof CreateTournamentSchema>;
export type UpdateTournamentInput = z.infer<typeof UpdateTournamentSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
