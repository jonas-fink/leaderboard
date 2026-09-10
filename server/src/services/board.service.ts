import {
    getTournament,
    getTournamentBySlug,
} from '#services/tournament.service';
import { listTeams } from '#services/team.service';
import { getPlayerMap } from '#services/player.service';
import { listGames } from '#services/game.service';
import { scoresByGame } from '#services/score.service';
import { rankScores } from '#services/rank';
import { placementPoints } from '#services/points';
import { computeStandings } from '#services/standings';
import type {
    BoardGameEntry,
    BoardState,
    StandingsEntry,
    Tournament,
} from '#types';

/** Die Teilnehmerdaten, die `standings.ts` nicht liefert, weil es keine DB kennt. */
type Entrant = Omit<StandingsEntry, 'rank' | 'points' | 'share' | 'rankCounts'>;

/**
 * Wer im Turnier steht.
 *
 * Im Team-Modus sind das die Teams des Turniers — sie sind ausdrücklich
 * gemeldet und stehen auch ohne ein einziges Ergebnis mit 0 Punkten in der
 * Wertung. Spieler sind dagegen global und haben keine Turniermeldung; dort
 * gilt als Teilnehmer, wer mindestens ein Ergebnis hat.
 *
 * ponytail: keine Player-Roster-Collection. Kommt, sobald /control Spieler
 * für ein Turnier melden soll — bis dahin meldet die Score-Eingabe an.
 */
const loadEntrants = async (
    tournament: Tournament,
    scoredIds: string[],
): Promise<Map<string, Entrant>> => {
    if (tournament.mode === 'team') {
        const teams = await listTeams(tournament.id);
        return new Map(
            teams.map((team) => [
                team.id,
                {
                    entrantId: team.id,
                    name: team.name,
                    imageUrl: team.bannerUrl,
                    avatarSeed: team.avatarSeed,
                    color: team.colorPrimary,
                },
            ]),
        );
    }

    const players = await getPlayerMap();
    const entrants = new Map<string, Entrant>();
    for (const id of scoredIds) {
        const player = players.get(id);
        // Score eines gelöschten Spielers: fällt hier und weiter unten raus.
        if (!player || entrants.has(id)) continue;
        entrants.set(id, {
            entrantId: id,
            name: player.displayName || player.username,
            imageUrl: player.avatarUrl,
            avatarSeed: player.avatarSeed,
        });
    }
    return entrants;
};

/**
 * Baut den vollständigen Board-Zustand (PROJEKT.md §5) und ist damit die
 * Verkettung `rank` → `points` → `standings` samt Teilnehmerdaten.
 *
 * Gerechnet wird über **alle** Games des Turniers, angezeigt werden nur die
 * gepinnten: die Gesamtwertung kennt kein Streichresultat (§4.3), das Board
 * dagegen zeigt eine Auswahl in `boardOrder`.
 *
 * Kein Rule-Modul — hier wird geladen, nicht gerechnet; die Regeln stehen
 * in den drei aufgerufenen Modulen.
 */
export const buildBoardState = async (
    tournament: Tournament,
): Promise<BoardState> => {
    const games = (await listGames(tournament.id)).sort(
        (a, b) => a.boardOrder - b.boardOrder,
    );
    const buckets = await scoresByGame(games.map((game) => game.id));

    const results = games.map((game) => {
        const ranked = rankScores(
            buckets.get(game.id) ?? [],
            game.primaryMetric.sortOrder,
        );
        const points = placementPoints(
            ranked.map((entry) => entry.rank),
            tournament.pointsTable,
            game.weight,
        );
        return {
            game,
            entries: ranked.map((entry, i): BoardGameEntry => ({
                entrantId: entry.entrantId,
                rank: entry.rank,
                value: entry.primaryValue,
                points: points[i]!,
            })),
        };
    });

    const entrants = await loadEntrants(
        tournament,
        results.flatMap((result) =>
            result.entries.map((entry) => entry.entrantId),
        ),
    );

    // Ergebnisse ohne Teilnehmer verweisen ins Leere: der Client schlägt
    // jeden Game-Eintrag in den Standings nach.
    const scored = results.map((result) => ({
        ...result,
        entries: result.entries.filter((entry) =>
            entrants.has(entry.entrantId),
        ),
    }));

    const rows = computeStandings(
        [...entrants.keys()],
        scored.flatMap((result) => result.entries),
    );

    return {
        tournament: {
            id: tournament.id,
            slug: tournament.slug,
            title: tournament.title,
            mode: tournament.mode,
            status: tournament.status,
        },
        standings: rows.map((row) => ({
            ...entrants.get(row.entrantId)!,
            ...row,
        })),
        games: scored
            .filter((result) => result.game.pinned)
            .map(({ game, entries }) => ({
                game: {
                    id: game.id,
                    slug: game.slug,
                    title: game.title,
                    genre: game.genre,
                    coverUrl: game.coverUrl,
                    primaryMetric: game.primaryMetric,
                },
                status: game.status,
                entries,
            })),
        computedAt: new Date().toISOString(),
    };
};

/** Für den REST-Abruf des Boards — die Leinwand kennt nur den Slug. */
export const boardBySlug = async (slug: string): Promise<BoardState> =>
    buildBoardState(await getTournamentBySlug(slug));

/** Für die Realtime-Schicht — die Räume und die Scores tragen die ID. */
export const boardById = async (id: string): Promise<BoardState> =>
    buildBoardState(await getTournament(id));
