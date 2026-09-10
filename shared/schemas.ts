import { z } from 'zod';

// Sortier- & Format-Enums
export const SortOrderSchema = z.enum(['ASC', 'DESC']);
export const MetricFormatterSchema = z.enum([
    'time_ms',
    'integer',
    'decimal',
    'currency',
]);
export const TimeframeSchema = z.enum([
    'all_time',
    'monthly',
    'weekly',
    'season',
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
    slug: z
        .string()
        .regex(
            /^[a-z0-9-]+$/,
            'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        ),
    title: z.string().min(1).max(100),
    genre: z.enum(['racing', 'sports', 'arcade', 'fps', 'custom']),
    coverUrl: z.url().optional(),
    primaryMetric: MetricConfigSchema,
    secondaryMetrics: z.array(MetricConfigSchema).optional(),
    timeframe: TimeframeSchema,
    // Steuert, welche Games auf dem Dashboard als Chart erscheinen.
    pinned: z.boolean(),
});

// Game Schema (Antwort — Server liefert timeframe und pinned immer mit)
export const GameSchema = GameFields.extend({ id: z.string().min(1) });

// Player Schema
export const PlayerSchema = z.object({
    id: z.string().min(1),
    username: z.string().min(2).max(30),
    avatarUrl: z.url().optional(),
    countryCode: z.string().length(2).toUpperCase().optional(),
});

// Score-Submit Schema (für POST-Requests /api/scores)
export const SubmitScoreSchema = z.object({
    gameId: z.string().min(1),
    playerId: z.string().min(1),
    primaryValue: z.number().nonnegative(),
    secondaryValues: z.record(z.string(), z.number()).optional(),
    metadata: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
});

// Leaderboard-Eintrag (vollständig mit Rang & Timestamp)
export const LeaderboardEntrySchema = SubmitScoreSchema.extend({
    id: z.string().min(1),
    player: PlayerSchema,
    rank: z.number().int().positive(),
    recordedAt: z.iso.datetime(),
});

// Dashboard Aggregation Schema (Response für /api/leaderboard/:gameSlug)
export const LeaderboardChartDataSchema = z.object({
    game: GameSchema,
    timeframe: TimeframeSchema,
    totalParticipants: z.number().int().nonnegative(),
    topEntries: z.array(LeaderboardEntrySchema),
    userEntry: LeaderboardEntrySchema.optional(),
});

// Roher Score-Eintrag inkl. Game-Titel (Historie im Spieler-Modal)
export const ScoreRecordSchema = SubmitScoreSchema.extend({
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
    timeframe: TimeframeSchema.default('all_time'),
    pinned: z.boolean().default(false),
});
/** Nur die gesendeten Felder werden geändert — keine Defaults, siehe oben. */
export const UpdateGameSchema = GameFields.partial();
export const CreatePlayerSchema = PlayerSchema.omit({ id: true });
export const UpdatePlayerSchema = CreatePlayerSchema.partial();
export const UpdateScoreSchema = SubmitScoreSchema.omit({
    gameId: true,
    playerId: true,
}).partial();

// Type Exports via Inference
export type SortOrder = z.infer<typeof SortOrderSchema>;
export type MetricFormatter = z.infer<typeof MetricFormatterSchema>;
export type Timeframe = z.infer<typeof TimeframeSchema>;
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
// Board-Vertrag — Payload für board:update und event:announce (PROJEKT.md §5)
// ---------------------------------------------------------------------------

// Beide Enums werden hier gebraucht, bevor Tournament und Game umgebaut sind.
// Sie stehen absichtlich schon eigenständig, damit die Entity-Schemas sie
// später referenzieren statt sie ein zweites Mal zu schreiben.
export const TournamentModeSchema = z.enum(['player', 'team']);
export const TournamentStatusSchema = z.enum([
    'draft',
    'live',
    'finished',
    'archived',
]);
export const GameStatusSchema = z.enum(['upcoming', 'running', 'finished']);

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
    imageUrl: z.url().optional(),
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

/** Ein Ergebnis innerhalb einer Disziplin. */
export const BoardGameEntrySchema = z.object({
    // Verweist auf StandingsEntry — Name, Bild und Farbe stehen genau einmal
    // im Payload und können nicht auseinanderlaufen.
    entrantId: z.string().min(1),
    rank: z.number().int().positive(),
    // Rohwert der Disziplin, identisch mit Score.primaryValue.
    value: SubmitScoreSchema.shape.primaryValue,
    // Platzierungspunkte inkl. Mittelung und Gewichtung (§4.2).
    points: z.number().nonnegative(),
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
    }),
    status: GameStatusSchema,
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

// --- Socket-Events (PROJEKT.md §5, KONVENTIONEN.md §8) ---------------------

export const RoomJoinSchema = z.object({ tournamentId: z.string().min(1) });
export const TournamentStatusEventSchema = RoomJoinSchema.extend({
    status: TournamentStatusSchema,
});

export type TournamentMode = z.infer<typeof TournamentModeSchema>;
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export type StandingsEntry = z.infer<typeof StandingsEntrySchema>;
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
    bannerUrl: z.url().optional(),
});

export const TournamentSchema = TournamentFields.extend({
    id: z.string().min(1),
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
    bannerUrl: z.url().optional(),
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
