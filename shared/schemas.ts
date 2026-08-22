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
