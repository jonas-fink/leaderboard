import type { Placement, StandingsRow } from '#types';

type Tally = Pick<StandingsRow, 'entrantId' | 'points' | 'rankCounts'>;

/**
 * Olympische Reihenfolge (PROJEKT.md §4.4): erst die Gesamtpunktzahl, dann
 * mehr erste Plätze, dann mehr zweite, dann dritte — bis zum höchsten Rang,
 * den einer der beiden überhaupt belegt hat. Bleibt alles gleich, ist der
 * Gleichstand echt.
 */
const byOlympicOrder = (a: Tally, b: Tally): number => {
    if (a.points !== b.points) return b.points - a.points;

    const depth = Math.max(a.rankCounts.length, b.rankCounts.length);
    for (let i = 0; i < depth; i++) {
        const diff = (b.rankCounts[i] ?? 0) - (a.rankCounts[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

/**
 * Verdichtet die Ergebnisse aller Disziplinen zur Gesamtwertung.
 *
 * `placements` kommt flach über alle Games — welches Spiel ein Ergebnis
 * geliefert hat, ist für Punktsumme und Platzhistogramm ohne Bedeutung.
 * `entrantIds` steht dagegen eigenständig da, weil die Wertung auch die
 * enthalten muss, die noch nichts gespielt haben: Nicht-Teilnahme bedeutet
 * 0 Punkte, kein Streichresultat (§4.3). Ergebnisse zu unbekannten IDs —
 * etwa von einem gelöschten Spieler — fallen raus.
 *
 * Bei echtem Gleichstand entscheidet die Reihenfolge in `entrantIds`, weil
 * die Sortierung stabil ist.
 */
export const computeStandings = (
    entrantIds: string[],
    placements: Placement[],
): StandingsRow[] => {
    const tallies = new Map<string, Tally>(
        entrantIds.map((entrantId) => [
            entrantId,
            { entrantId, points: 0, rankCounts: [] },
        ]),
    );

    for (const placement of placements) {
        const tally = tallies.get(placement.entrantId);
        if (!tally) continue;

        tally.points += placement.points;
        // Aufgefüllt statt direkt indiziert: ein Loch im Array käme als
        // null durch JSON.stringify und bräche das Schema.
        while (tally.rankCounts.length < placement.rank) {
            tally.rankCounts.push(0);
        }
        tally.rankCounts[placement.rank - 1]!++;
    }

    const sorted = [...tallies.values()].sort(byOlympicOrder);
    const leader = sorted[0]?.points ?? 0;

    let lastRank = 0;
    return sorted.map((tally, i) => {
        const previous = sorted[i - 1];
        const rank =
            previous && byOlympicOrder(previous, tally) === 0 ? lastRank : i + 1;
        lastRank = rank;

        return {
            ...tally,
            rank,
            // Vor dem ersten Score ist der Führende bei 0 — ohne Guard stünde
            // hier NaN und das Board-Schema würde beim Validieren werfen.
            share: leader === 0 ? 0 : tally.points / leader,
        };
    });
};
