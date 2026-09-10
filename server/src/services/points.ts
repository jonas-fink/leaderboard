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
 * Die Reihenfolge der Ausgabe entspricht der Eingabe. Gruppiert wird über
 * den Rangwert, nicht über benachbarte Einträge — die Funktion ist damit
 * auch für eine unsortierte Rangliste korrekt.
 */
export const placementPoints = (
    ranks: number[],
    pointsTable: number[],
    weight = 1,
): number[] => {
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
