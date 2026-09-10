import test from 'node:test';
import assert from 'node:assert/strict';
import { placementPoints } from '#services/points';

// Bestätigte Standardtabelle aus PROJEKT.md §3; die Funktion behandelt sie
// als Parameter, damit ein Turnier eine eigene mitbringen kann.
const table = [10, 8, 6, 5, 4, 3, 2, 1];

test('jeder Rang bekommt den Tabellenwert seines Platzes', () => {
    assert.deepEqual(placementPoints([1, 2, 3], table), [10, 8, 6]);
});

test('geteilter Rang mittelt die Punkte der belegten Plätze', () => {
    // Zwei auf Rang 2 belegen die Plätze 2 und 3: (8 + 6) / 2 = 7.
    assert.deepEqual(placementPoints([1, 2, 2, 4], table), [10, 7, 7, 5]);
});

test('ein geteilter erster Platz mittelt Platz 1 und 2', () => {
    assert.deepEqual(placementPoints([1, 1, 3], table), [9, 9, 6]);
});

test('die ausgeschüttete Summe bleibt konstant, egal wie viele Gleichstände', () => {
    const erwartet = table.slice(0, 4).reduce((a, b) => a + b, 0);
    const summe = (ranks: number[]) =>
        placementPoints(ranks, table).reduce((a, b) => a + b, 0);

    assert.equal(summe([1, 2, 3, 4]), erwartet);
    assert.equal(summe([1, 2, 2, 4]), erwartet);
    assert.equal(summe([1, 1, 3, 4]), erwartet);
    assert.equal(summe([1, 1, 1, 1]), erwartet);
});

test('ein schlechterer Rang bekommt nie mehr Punkte als ein besserer', () => {
    // Zwei Ranggruppen mitteln disjunkte, aufeinanderfolgende Ausschnitte
    // einer monoton fallenden Tabelle — der spätere Durchschnitt kann den
    // früheren nicht überholen. Gilt auch, wenn die Tabelle vorher ausgeht.
    const muster = [
        [1, 2, 2, 4],
        [1, 1, 3, 4],
        [1, 2, 3, 3],
        [1, 1, 1, 4],
    ];
    for (const ranks of muster) {
        for (const tabelle of [table, [10, 8]]) {
            const punkte = placementPoints(ranks, tabelle);
            for (let i = 1; i < punkte.length; i++) {
                assert.ok(
                    punkte[i]! <= punkte[i - 1]!,
                    `${ranks} auf ${tabelle} ergibt ${punkte}`,
                );
            }
        }
    }
});

test('Ränge jenseits der Tabelle bekommen 0 Punkte', () => {
    assert.deepEqual(placementPoints([1, 2, 3], [10, 8]), [10, 8, 0]);
});

test('eine Gruppe an der Tabellenkante mittelt die fehlenden Plätze als 0 ein', () => {
    // Rang 2 belegt die Plätze 2 und 3, Platz 3 steht nicht mehr in der
    // Tabelle: (8 + 0) / 2 = 4.
    assert.deepEqual(placementPoints([1, 2, 2], [10, 8]), [10, 4, 4]);
});

test('das Gewicht der Disziplin multipliziert die Punkte', () => {
    assert.deepEqual(placementPoints([1, 2, 3], table, 2), [20, 16, 12]);
});

test('ohne Gewicht wird mit Faktor 1 gerechnet', () => {
    assert.deepEqual(
        placementPoints([1, 2], table),
        placementPoints([1, 2], table, 1),
    );
});

test('gerechnet wird ungerundet', () => {
    assert.deepEqual(placementPoints([1, 2, 2], [10, 8, 5]), [10, 6.5, 6.5]);
});

test('die Reihenfolge der Eingabe bleibt erhalten, auch unsortiert', () => {
    assert.deepEqual(placementPoints([2, 1, 2], table), [7, 10, 7]);
});

test('leere Eingabe ergibt leere Ausgabe', () => {
    assert.deepEqual(placementPoints([], table), []);
});

test('die Eingabe wird nicht mutiert', () => {
    const ranks = [1, 2, 2, 4];
    placementPoints(ranks, table, 2);
    assert.deepEqual(ranks, [1, 2, 2, 4]);
});
