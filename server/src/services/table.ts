/** Punkte pro Sieg bzw. Unentschieden — fest, siehe AD-2 in architecture.md. */
const WIN_POINTS = 3;
const DRAW_POINTS = 1;

export type MatchResult = {
    sides: [
        { entrantId: string; value: number },
        { entrantId: string; value: number },
    ];
};

export type TableRow = {
    entrantId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    leaguePoints: number;
    rank: number;
};

/** Zeile ohne Rang — der Rang entsteht erst nach der Sortierung. */
type Tally = Omit<TableRow, 'rank'>;

const emptyTally = (entrantId: string): Tally => ({
    entrantId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    leaguePoints: 0,
});

/**
 * Vergleicht zwei Zeilen: Liga-Punkte → Tordifferenz → erzielte Tore, alle
 * absteigend (AD-3). Gibt `0` zurück, wenn alle drei gleich sind — genau
 * dann teilen sich zwei Teilnehmer einen Rang.
 */
const byTableOrder = (a: Tally, b: Tally): number => {
    if (a.leaguePoints !== b.leaguePoints)
        return b.leaguePoints - a.leaguePoints;

    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffA !== diffB) return diffB - diffA;

    return b.goalsFor - a.goalsFor;
};

/**
 * Baut die Tabelle einer Versus-Disziplin aus ihren Matches (PROJEKT.md §4.2,
 * architecture.md »Domain logic«).
 *
 * Teilnehmer werden ausschließlich aus den Matches abgeleitet — wer nicht
 * gespielt hat, taucht nicht auf und bekommt über `computeStandings` 0
 * Turnierpunkte (AC-4.5), genau wie bei `rankScores`.
 *
 * Rein und DB-frei: keine Mutation der Eingabe, kein `Date.now()`.
 */
export const buildTable = (matches: MatchResult[]): TableRow[] => {
    const tallies = new Map<string, Tally>();

    for (const { sides } of matches) {
        const [first, second] = sides;
        const rowFirst =
            tallies.get(first.entrantId) ?? emptyTally(first.entrantId);
        const rowSecond =
            tallies.get(second.entrantId) ?? emptyTally(second.entrantId);

        rowFirst.played += 1;
        rowSecond.played += 1;
        rowFirst.goalsFor += first.value;
        rowFirst.goalsAgainst += second.value;
        rowSecond.goalsFor += second.value;
        rowSecond.goalsAgainst += first.value;

        if (first.value === second.value) {
            rowFirst.drawn += 1;
            rowSecond.drawn += 1;
            rowFirst.leaguePoints += DRAW_POINTS;
            rowSecond.leaguePoints += DRAW_POINTS;
        } else if (first.value > second.value) {
            rowFirst.won += 1;
            rowSecond.lost += 1;
            rowFirst.leaguePoints += WIN_POINTS;
        } else {
            rowSecond.won += 1;
            rowFirst.lost += 1;
            rowSecond.leaguePoints += WIN_POINTS;
        }

        tallies.set(first.entrantId, rowFirst);
        tallies.set(second.entrantId, rowSecond);
    }

    const sorted = [...tallies.values()].sort(byTableOrder);

    let lastRank = 0;
    return sorted.map((tally, i) => {
        const previous = sorted[i - 1];
        const rank =
            previous && byTableOrder(previous, tally) === 0 ? lastRank : i + 1;
        lastRank = rank;
        return { ...tally, rank };
    });
};
