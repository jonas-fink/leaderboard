import type { RawScore, RankedScore, SortOrder, Player } from '#types';

/**
 * Reduziert alle Scores eines Games auf den besten Eintrag je Spieler und
 * vergibt Ränge.
 *
 * `sortOrder` entscheidet, was "besser" heißt: bei ASC ist der kleinere Wert
 * besser (Rundenzeit), bei DESC der größere (Tore). Gleichstand teilt sich
 * einen Rang, der Folgerang wird übersprungen (1, 2, 2, 4).
 *
 * Bewusst frei von DB-Zugriffen, damit sie ohne laufende Mongo testbar ist.
 */
export const rankScores = (
    entries: RawScore[],
    sortOrder: SortOrder,
): RankedScore[] => {
    const dir = sortOrder === 'ASC' ? 1 : -1;

    const best = new Map<string, RawScore>();
    for (const entry of entries) {
        const current = best.get(entry.playerId);
        if (!current || (entry.primaryValue - current.primaryValue) * dir < 0) {
            best.set(entry.playerId, entry);
        }
    }

    const sorted = [...best.values()].sort(
        (a, b) => (a.primaryValue - b.primaryValue) * dir,
    );

    let lastValue: number | undefined;
    let lastRank = 0;
    return sorted.map((entry, i) => {
        const rank = entry.primaryValue === lastValue ? lastRank : i + 1;
        lastValue = entry.primaryValue;
        lastRank = rank;
        return { ...entry, rank };
    });
};

/** Hängt die Spielerdaten an; Scores ohne (gelöschten) Spieler fallen raus. */
export const withPlayers = (
    ranked: RankedScore[],
    playerMap: Map<string, Player>,
) =>
    ranked
        .filter((entry) => playerMap.has(entry.playerId))
        .map((entry) => ({ ...entry, player: playerMap.get(entry.playerId)! }));
