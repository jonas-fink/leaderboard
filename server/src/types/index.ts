import type {
    AnnouncementType,
    BoardGameEntry,
    StandingsEntry,
    TournamentMode,
} from '#schemas';

export type {
    Game,
    Player,
    MetricConfig,
    MetricFormatter,
    SortOrder,
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
    Tournament,
    Team,
    CreateTournamentInput,
    UpdateTournamentInput,
    CreateTeamInput,
    UpdateTeamInput,
    TournamentMode,
    TournamentStatus,
    GameStatus,
    StandingsEntry,
    BoardGameEntry,
    BoardGame,
    BoardState,
    AnnouncementType,
    Announcement,
    RoomJoin,
    TournamentStatusEvent,
    ServerToClientEvents,
    ClientToServerEvents,
    LoginInput,
    AuthToken,
    UploadResult,
} from '#schemas';

/** Ein Score, wie er die DB verlässt — flach, IDs als Strings. */
export type RawScore = {
    id: string;
    tournamentId: string;
    gameId: string;
    entrantType: TournamentMode;
    /**
     * Spieler- oder Team-ID, je nach entrantType. Der Schlüssel, über den die
     * Rangliste gruppiert — sonst fielen alle Team-Scores in einen Topf.
     */
    entrantId: string;
    playerId?: string;
    teamId?: string;
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
