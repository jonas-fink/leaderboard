import { z } from 'zod';

// Sortier- & Format-Enums
export const SortOrderSchema = z.enum(['ASC', 'DESC']);
export const MetricFormatterSchema = z.enum([
    'time_ms',
    'integer',
    'decimal',
    'currency',
]);

// Konfiguration einzelner Metriken
export const MetricConfigSchema = z.object({
    key: z.string().min(1).max(50),
    label: z.string().min(1).max(50),
    sortOrder: SortOrderSchema,
    formatter: MetricFormatterSchema,
    unit: z.string().max(20).optional(),
});

// Game Schema
export const GameSchema = z.object({
    id: z.string().uuid().or(z.string().min(1)),
    slug: z
        .string()
        .regex(
            /^[a-z0-9-]+$/,
            'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        ),
    title: z.string().min(1).max(100),
    genre: z.enum(['racing', 'sports', 'arcade', 'fps', 'custom']),
    coverUrl: z.string().url().optional(),
    primaryMetric: MetricConfigSchema,
    secondaryMetrics: z.array(MetricConfigSchema).optional(),
});

// Player Schema
export const PlayerSchema = z.object({
    id: z.string().min(1),
    username: z.string().min(2).max(30),
    avatarUrl: z.string().url().optional(),
    countryCode: z.string().length(2).toUpperCase().optional(),
});

// Score-Submit Schema (für POST-Requests /api/scores)
export const SubmitScoreSchema = z.object({
    gameId: z.string().min(1),
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

// Dashboard Aggregation Schema (Response für /api/leaderboard/[gameSlug])
export const LeaderboardChartDataSchema = z.object({
    game: GameSchema,
    timeframe: z.enum(['all_time', 'monthly', 'weekly', 'season']),
    totalParticipants: z.number().int().nonnegative(),
    topEntries: z.array(LeaderboardEntrySchema),
    userEntry: LeaderboardEntrySchema.optional(),
});

// Type Exports via Inference
export type SortOrder = z.infer<typeof SortOrderSchema>;
export type MetricFormatter = z.infer<typeof MetricFormatterSchema>;
export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type Game = z.infer<typeof GameSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type SubmitScoreInput = z.infer<typeof SubmitScoreSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardChartData = z.infer<typeof LeaderboardChartDataSchema>;
