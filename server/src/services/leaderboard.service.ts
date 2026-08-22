import { rankScores, withPlayers } from '#services/rank';
import { listGames, getGameBySlug } from '#services/game.service';
import { getPlayer, getPlayerMap } from '#services/player.service';
import {
    scoresByGame,
    playerHistory,
    countScores,
} from '#services/score.service';
import type { Game, LeaderboardChartData, PlayerStats } from '#types';

// Wie viele Einträge eine Dashboard-Karte zeigt.
const CARD_LIMIT = 5;

/**
 * Baut die Chart-Daten zu einer Liste von Games.
 * lädt die Scores der Games und rankt in JS statt per
 * $sort/$group-Aggregation. Für ein Board auf einer Maschine reicht das
 * locker; ab ~10k Scores pro Game auf eine Pipeline umstellen.
 */
export const buildCharts = async (
    games: Game[],
    limit?: number,
): Promise<LeaderboardChartData[]> => {
    if (games.length === 0) return [];

    const [playerMap, buckets] = await Promise.all([
        getPlayerMap(),
        scoresByGame(games.map((game) => game.id)),
    ]);

    return games.map((game) => {
        const ranked = rankScores(
            buckets.get(game.id) ?? [],
            game.primaryMetric.sortOrder,
        );
        const entries = withPlayers(ranked, playerMap);

        return {
            game,
            timeframe: game.timeframe,
            totalParticipants: entries.length,
            topEntries: limit ? entries.slice(0, limit) : entries,
        };
    });
};

/** Die auf dem Dashboard angepinnten Games, je Karte gekürzt. */
export const getPinnedCharts = async (): Promise<LeaderboardChartData[]> => {
    const games = (await listGames()).filter((game) => game.pinned);
    return buildCharts(games, CARD_LIMIT);
};

/** Ein einzelnes Board mit vollständiger Rangliste. */
export const getChartBySlug = async (
    slug: string,
): Promise<LeaderboardChartData> => {
    const game = await getGameBySlug(slug);
    const [chart] = await buildCharts([game]);
    return chart!;
};

/**
 * Medaillenspiegel + Historie eines Spielers.
 * Die Medaillen werden aus den aktuellen Rängen berechnet, nicht gespeichert —
 * so kann kein Zähler veralten, wenn Scores korrigiert werden.
 */

export const getPlayerStats = async (
    playerId: string,
): Promise<PlayerStats> => {
    const [player, games, recentScores, totalScores] = await Promise.all([
        getPlayer(playerId),
        listGames(),
        playerHistory(playerId),
        countScores({ playerId }),
    ]);

    const charts = await buildCharts(games);

    const medals = { gold: 0, silver: 0, bronze: 0 };
    let gamesPlayed = 0;

    for (const chart of charts) {
        const entry = chart.topEntries.find((e) => e.playerId === playerId);
        if (!entry) continue;
        gamesPlayed += 1;
        if (entry.rank === 1) medals.gold += 1;
        else if (entry.rank === 2) medals.silver += 1;
        else if (entry.rank === 3) medals.bronze += 1;
    }

    return {
        player,
        medals,
        gamesPlayed,
        totalScores,
        recentScores,
    };
};
