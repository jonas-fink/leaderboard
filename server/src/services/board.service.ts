import {
    getTournament,
    getTournamentBySlug,
} from '#services/tournament.service';
import { listTeams } from '#services/team.service';
import { getPlayerMap } from '#services/player.service';
import { listGames } from '#services/game.service';
import { scoresByGame } from '#services/score.service';
import { matchesByGame } from '#services/match.service';
import { rankScores } from '#services/rank';
import { buildTable } from '#services/table';
import { placementPoints } from '#services/points';
import { computeStandings } from '#services/standings';
import { User } from '#models';
import { notFound } from '#utils';
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

    // Player gehört dem Konto, nicht dem Turnier (AD-8) — der Besitzer des
    // Turniers ist auch der Besitzer der gemeldeten Spieler.
    const players = await getPlayerMap(tournament.ownerId);
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
    /** Konto-Slug des Besitzers — für die öffentliche Board-URL (AC-4.5). */
    ownerSlug: string,
    /**
     * Die Siegerehrung zeigt jede Disziplin, auch die ungepinnte — sonst
     * fehlen Punkte, die in der Gesamtwertung längst stecken.
     */
    allGames = false,
): Promise<BoardState> => {
    const games = (await listGames(tournament.id)).sort(
        (a, b) => a.boardOrder - b.boardOrder,
    );
    // Matches werden nur für Versus-Disziplinen geladen, Scores nur für
    // metrische — jede Disziplin liefert genau eine der beiden Ergebnisformen
    // (AD-1 in architecture.md 001-match-wertung).
    const metricGameIds = games
        .filter((game) => game.scoring !== 'versus')
        .map((game) => game.id);
    const versusGameIds = games
        .filter((game) => game.scoring === 'versus')
        .map((game) => game.id);
    const [buckets, matchBuckets] = await Promise.all([
        scoresByGame(metricGameIds),
        matchesByGame(versusGameIds),
    ]);

    const results = games.map((game) => {
        // Die einzige Verzweigung der Wertungskette: beide Module liefern
        // Zeilen mit `entrantId` und `rank`, also bleibt der Aufruf von
        // `placementPoints` darunter für beide Zweige unverändert.
        const ranked =
            game.scoring === 'versus'
                ? buildTable(matchBuckets.get(game.id) ?? [])
                : rankScores(
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
            entries: ranked.map((entry, i): BoardGameEntry =>
                'leaguePoints' in entry
                    ? {
                          entrantId: entry.entrantId,
                          rank: entry.rank,
                          // Bei scoring: 'versus' sind die Liga-Punkte der
                          // Wert, nicht die Tordifferenz — die rechnet der
                          // Client aus goalsFor/goalsAgainst (architecture.md).
                          value: entry.leaguePoints,
                          points: points[i]!,
                          record: {
                              played: entry.played,
                              won: entry.won,
                              drawn: entry.drawn,
                              lost: entry.lost,
                              goalsFor: entry.goalsFor,
                              goalsAgainst: entry.goalsAgainst,
                          },
                      }
                    : {
                          entrantId: entry.entrantId,
                          rank: entry.rank,
                          value: entry.primaryValue,
                          points: points[i]!,
                      },
            ),
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
            ownerSlug,
            title: tournament.title,
            mode: tournament.mode,
            status: tournament.status,
        },
        standings: rows.map((row) => ({
            ...entrants.get(row.entrantId)!,
            ...row,
        })),
        games: scored
            .filter((result) => allGames || result.game.pinned)
            .map(({ game, entries }) => ({
                game: {
                    id: game.id,
                    slug: game.slug,
                    title: game.title,
                    genre: game.genre,
                    coverUrl: game.coverUrl,
                    primaryMetric: game.primaryMetric,
                    scoring: game.scoring,
                },
                status: game.status,
                entries,
            })),
        computedAt: new Date().toISOString(),
    };
};

/**
 * Für den REST-Abruf des Boards — die Leinwand kennt beide Slugs
 * (`/api/board/:userSlug/:tournamentSlug`, AC-4.1). Öffentlich, ohne
 * Sitzung: `userSlug` löst das Konto auf, `tournamentSlug` ist nur innerhalb
 * dieses Kontos eindeutig (AC-4.2). Ein unbekannter Slug ergibt in beiden
 * Schritten 404 (AC-4.3).
 */
export const boardBySlugs = async (
    userSlug: string,
    tournamentSlug: string,
    allGames = false,
): Promise<BoardState> => {
    const owner = await User.findOne({ slug: userSlug });
    if (!owner) throw notFound(`Konto "${userSlug}"`);

    const tournament = await getTournamentBySlug(tournamentSlug, owner.id);
    return buildBoardState(tournament, owner.slug, allGames);
};

/** Für die Realtime-Schicht — die Räume und die Scores tragen die ID. */
export const boardById = async (id: string): Promise<BoardState> => {
    const tournament = await getTournament(id);
    const owner = await User.findById(tournament.ownerId);
    if (!owner) throw notFound('Konto');
    return buildBoardState(tournament, owner.slug);
};
