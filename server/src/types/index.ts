export type {
    Game,
    Player,
    MetricConfig,
    MetricFormatter,
    SortOrder,
    Timeframe,
    SubmitScoreInput,
    LeaderboardEntry,
    LeaderboardChartData,
    ScoreRecord,
    PlayerStats,
    CreateGameInput,
    UpdateGameInput,
    CreatePlayerInput,
    UpdatePlayerInput,
    UpdateScoreInput,
} from '#schemas';

/** Ein Score, wie er die DB verlässt — flach, IDs als Strings. */
export type RawScore = {
    id: string;
    gameId: string;
    playerId: string;
    primaryValue: number;
    secondaryValues?: Record<string, number>;
    metadata?: Record<string, string | number | boolean>;
    recordedAt: string;
};

export type RankedScore = RawScore & { rank: number };

/** Fehler mit HTTP-Status, den die Error-Middleware direkt durchreicht. */
export type HttpError = Error & { status?: number };
