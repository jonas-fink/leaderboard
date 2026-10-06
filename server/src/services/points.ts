/**
 * Rechnet Ränge einer Disziplin in Platzierungspunkte um.
 *
 * Der Rohwert fließt bewusst nicht ein — nur die Platzierung. Damit sind
 * Rundenzeiten in Millisekunden und Torzahlen ohne Umrechnung vergleichbar.
 *
 * Bei geteiltem Rang werden die Punkte der belegten Plätze gemittelt: zwei
 * auf Rang 2 belegen die Plätze 2 und 3 und bekommen je (8 + 6) / 2 = 7.
 * Plätze jenseits der Tabelle zählen als 0 und werden mit eingemittelt —
 * nur so bleibt die ausgeschüttete Gesamtsumme unabhängig von der Zahl der
 * Gleichstände, und nur so sind verschiedene Turniere vergleichbar.
 *
 * Gerechnet wird ungerundet; gerundet wird erst in der Darstellung.
 *
 * Ausnahme `tieMode: 'shared'` (Teamchallenges): jede Ranggruppe bekommt die
 * vollen Punkte ihres Platzes, die nächste Gruppe den nächsten Platz — vier
 * Sieger je 10, vier Verlierer je 8. Die Gesamtsumme hängt dann bewusst von
 * den Gleichständen ab.
 *
 * Die Reihenfolge der Ausgabe entspricht der Eingabe. Gruppiert wird über
 * den Rangwert, nicht über benachbarte Einträge — die Funktion ist damit
 * auch für eine unsortierte Rangliste korrekt.
 */
export const placementPoints = (
    ranks: number[],
    pointsTable: number[],
    weight = 1,
    tieMode: 'average' | 'shared' = 'average',
): number[] => {
    if (tieMode === 'shared') {
        const dense = [...new Set(ranks)].sort((a, b) => a - b);
        return ranks.map(
            (rank) => (pointsTable[dense.indexOf(rank)] ?? 0) * weight,
        );
    }

    const groupSize = new Map<number, number>();
    for (const rank of ranks) {
        groupSize.set(rank, (groupSize.get(rank) ?? 0) + 1);
    }

    return ranks.map((rank) => {
        const size = groupSize.get(rank)!;
        let sum = 0;
        for (let place = rank; place < rank + size; place++) {
            sum += pointsTable[place - 1] ?? 0;
        }
        return (sum / size) * weight;
    });
};

/**
 * "Punkte pro Spieler" im Team-Turnier: jeder Spieler holt Platzierungspunkte
 * für sich, sein Team bekommt die Summe seiner Mitglieder. Die Teams werden
 * nach dieser Summe gerankt (Gleichstand teilt den Rang, 1, 2, 2, 4) — der
 * Rang zählt für Medaillen und die olympische Reihenfolge.
 *
 * Spieler ohne Team fallen raus; Teams ohne wertenden Spieler erscheinen
 * nicht. `value` ist die Punktsumme, weil der Rohwert über mehrere Spieler
 * keinen Sinn mehr ergibt.
 */
export const teamPointsFromPlayers = (
    players: { entrantId: string; points: number }[],
    teamOf: Map<string, string>,
): { entrantId: string; rank: number; value: number; points: number }[] => {
    const sums = new Map<string, number>();
    for (const { entrantId, points } of players) {
        const team = teamOf.get(entrantId);
        if (team) sums.set(team, (sums.get(team) ?? 0) + points);
    }

    const sorted = [...sums].sort((a, b) => b[1] - a[1]);
    return sorted.map(([entrantId, points]) => {
        const first = sorted.findIndex(([, p]) => p === points);
        return { entrantId, rank: first + 1, value: points, points };
    });
};
