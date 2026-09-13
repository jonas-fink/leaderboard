import { rankScores, withPlayers } from '#services/rank';
import { listGames, getGameBySlug } from '#services/game.service';
import { getPlayer, getPlayerMap } from '#services/player.service';
import { boardById } from '#services/board.service';
import { getTournament } from '#services/tournament.service';
import { listTeams } from '#services/team.service';
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
    /** Konto, dem die Spieler gehören — Player ist kontoweit, nicht
     *  turnierweit (AD-8), deshalb kein `tournamentId` hier. */
    ownerId: string,
    limit?: number,
): Promise<LeaderboardChartData[]> => {
    if (games.length === 0) return [];

    const [playerMap, buckets] = await Promise.all([
        getPlayerMap(ownerId),
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
            totalParticipants: entries.length,
            topEntries: limit ? entries.slice(0, limit) : entries,
        };
    });
};

/** Die auf dem Dashboard angepinnten Games eines Turniers, je Karte gekürzt. */
export const getPinnedCharts = async (
    tournamentId: string,
    ownerId: string,
): Promise<LeaderboardChartData[]> => {
    const games = (await listGames(tournamentId)).filter(
        (game) => game.pinned,
    );
    return buildCharts(games, ownerId, CARD_LIMIT);
};

/** Ein einzelnes Board mit vollständiger Rangliste. */
export const getChartBySlug = async (
    slug: string,
    tournamentId: string,
    ownerId: string,
): Promise<LeaderboardChartData> => {
    const game = await getGameBySlug(slug, tournamentId);
    const [chart] = await buildCharts([game], ownerId);
    return chart!;
};

/**
 * Medaillenspiegel + Historie eines Spielers innerhalb eines Turniers.
 * Die Medaillen werden aus den aktuellen Rängen berechnet, nicht gespeichert —
 * so kann kein Zähler veralten, wenn Scores korrigiert werden.
 *
 * Gezählt wird über `boardById`, nicht über `buildCharts`: der Board-Zustand
 * kennt beide Ergebnisformen (Scores **und** Matches) und beide Turniermodi.
 * `buildCharts` liest nur Scores und filtert über `withPlayers` alles ohne
 * `playerId` weg — in einem Team-Turnier und in jeder Versus-Disziplin kam
 * damit immer 0 heraus. `allGames`, weil auch eine ungepinnte Disziplin
 * Medaillen vergibt.
 */
export const getPlayerStats = async (
    playerId: string,
    tournamentId: string,
    ownerId: string,
): Promise<PlayerStats> => {
    const [player, tournament, board, recentScores, totalScores] =
        await Promise.all([
            getPlayer(playerId, ownerId),
            getTournament(tournamentId),
            boardById(tournamentId, true),
            playerHistory(playerId, tournamentId),
            countScores({ playerId, tournamentId }),
        ]);

    // Im Team-Modus steht der Spieler selbst in keiner Wertung — es zählt der
    // Rang des Teams, in dem er gemeldet ist. `String(...)`, weil `members`
    // in-process noch ObjectIds trägt und erst über die HTTP-Grenze zu
    // Strings wird.
    const entrantId =
        tournament.mode === 'team'
            ? (await listTeams(tournamentId)).find((team) =>
                  team.members.some((member) => String(member) === playerId),
              )?.id
            : playerId;

    const medals = { gold: 0, silver: 0, bronze: 0 };
    let gamesPlayed = 0;

    for (const game of entrantId ? board.games : []) {
        const entry = game.entries.find((e) => e.entrantId === entrantId);
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
