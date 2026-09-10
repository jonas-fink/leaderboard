import type {
    AnnouncementType,
    BoardGameEntry,
    StandingsEntry,
} from '#schemas';

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
    TournamentMode,
    TournamentStatus,
    GameStatus,
    StandingsEntry,
    BoardGameEntry,
    BoardGame,
    BoardState,
    AnnouncementType,
    Announcement,
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

/** Ein Disziplin-Ergebnis, reduziert auf das, was die Gesamtwertung braucht. */
export type Placement = Pick<BoardGameEntry, 'entrantId' | 'rank' | 'points'>;

/**
 * Die gerechneten Felder einer Zeile der Gesamtwertung. Name, Bild und Farbe
 * kommen erst im Board-Service dazu — das Rule-Modul kennt keine DB.
 */
export type StandingsRow = Pick<
    StandingsEntry,
    'entrantId' | 'rank' | 'points' | 'share' | 'rankCounts'
>;

/** Die Spruchvarianten je Ereignistyp, wie sie in content/ liegen. */
export type AnnouncementPool = Record<AnnouncementType, string[]>;

/**
 * Zieht eine Variante aus dem Pool. Injiziert, weil die Auswahl zufällig und
 * wiederholungsfrei sein soll (PROJEKT.md §7) — beides ist Zustand über
 * Aufrufe hinweg und hat in einem reinen Rule-Modul nichts verloren.
 */
export type PickVariant = (variants: string[]) => string;
