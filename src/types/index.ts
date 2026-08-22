export type SortOrder = 'ASC' | 'DESC';

export type MetricFormatter = 'time_ms' | 'integer' | 'decimal' | 'currency';

export interface MetricConfig {
    key: string;
    label: string;
    sortOrder: SortOrder;
    formatter: MetricFormatter;
    unit?: string;
}

export interface Game {
    id: string;
    slug: string;
    title: string;
    genre: 'racing' | 'sports' | ' arcade' | 'fps' | 'custom';
    primaryMetric: MetricConfig;
    secondaryMetric?: MetricConfig[];
}

export interface Player {
    id: string;
    username: string;
    avatarUrl?: string;
    countryCode?: string;
}

export interface LeaderBoardEntry {
    id: string;
    gameId: string;
    player: Player;
    primaryValue: number;
    secondaryValues?: Record<string, number>;
    rank: number;
    recordedAt: string;
    metaData?: Record<string, string | number | boolean>;
}

export interface LeaderboardChatData {
    game: Game;
    timeframe: 'all_time' | 'monthly' | 'weekly' | 'season';
    totalParticipants: number;
    topEntries: LeaderBoardEntry[];
    userEntry?: LeaderBoardEntry;
}
