import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings } from '#services/standings';
import type { Placement } from '#types';

// Die Punkte sind hier freie Eingabe, nicht aus der Punktetabelle abgeleitet —
// das Mitteln und Gewichten hat points.ts schon erledigt.
const place = (entrantId: string, rank: number, points: number): Placement => ({
    entrantId,
    rank,
    points,
});

const kurz = (rows: ReturnType<typeof computeStandings>) =>
    rows.map((r) => [r.entrantId, r.rank, r.points]);

test('die Punkte werden über alle Disziplinen summiert', () => {
    const rows = computeStandings(
        ['a', 'b'],
        [
            place('a', 1, 10),
            place('b', 2, 8),
            place('a', 2, 8),
            place('b', 3, 6),
        ],
    );
    assert.deepEqual(kurz(rows), [
        ['a', 1, 18],
        ['b', 2, 14],
    ]);
});

test('wer eine Disziplin auslässt, bekommt dafür nichts — kein Streichresultat', () => {
    const rows = computeStandings(
        ['a', 'b', 'c'],
        [place('a', 1, 10), place('b', 2, 8)],
    );
    assert.deepEqual(kurz(rows), [
        ['a', 1, 10],
        ['b', 2, 8],
        ['c', 3, 0],
    ]);
});

test('bei Punktgleichheit gewinnt, wer mehr erste Plätze hat', () => {
    const rows = computeStandings(
        ['b', 'a'],
        [
            place('a', 1, 10),
            place('a', 3, 6),
            place('b', 2, 8),
            place('b', 2, 8),
        ],
    );
    assert.deepEqual(kurz(rows), [
        ['a', 1, 16],
        ['b', 2, 16],
    ]);
});

test('bei gleichen ersten Plätzen entscheidet die Zahl der zweiten', () => {
    const rows = computeStandings(
        ['b', 'a'],
        [
            place('a', 1, 10),
            place('a', 2, 5),
            place('b', 1, 10),
            place('b', 3, 5),
        ],
    );
    assert.deepEqual(kurz(rows), [
        ['a', 1, 15],
        ['b', 2, 15],
    ]);
});

test('ein geteilter erster Platz zählt für beide als erster Platz', () => {
    const rows = computeStandings(
        ['a', 'b'],
        [place('a', 1, 9), place('b', 1, 9)],
    );
    assert.deepEqual(
        rows.map((r) => r.rankCounts),
        [[1], [1]],
    );
});

test('bleibt auch der Tie-Break gleich, teilen sich beide den Rang und der Folgerang wird übersprungen', () => {
    const rows = computeStandings(
        ['a', 'b', 'c'],
        [place('a', 1, 10), place('b', 1, 10), place('c', 3, 6)],
    );
    assert.deepEqual(kurz(rows), [
        ['a', 1, 10],
        ['b', 1, 10],
        ['c', 3, 6],
    ]);
});

test('rankCounts zählt die Platzierungen je Rang', () => {
    const rows = computeStandings(
        ['a'],
        [place('a', 1, 10), place('a', 1, 10), place('a', 3, 6)],
    );
    assert.deepEqual(rows[0]!.rankCounts, [2, 0, 1]);
});

test('der Führende hat den vollen Balken, die übrigen anteilig', () => {
    const rows = computeStandings(
        ['a', 'b', 'c'],
        [place('a', 1, 20), place('b', 2, 10), place('c', 3, 5)],
    );
    assert.deepEqual(
        rows.map((r) => r.share),
        [1, 0.5, 0.25],
    );
});

test('vor dem ersten Score hat niemand einen Balken und alle teilen Rang 1', () => {
    const rows = computeStandings(['a', 'b'], []);
    assert.deepEqual(kurz(rows), [
        ['a', 1, 0],
        ['b', 1, 0],
    ]);
    assert.deepEqual(
        rows.map((r) => r.share),
        [0, 0],
    );
});

test('Ergebnisse von Teilnehmern außerhalb des Turniers werden ignoriert', () => {
    const rows = computeStandings(
        ['a'],
        [place('a', 1, 10), place('geloescht', 2, 8)],
    );
    assert.deepEqual(kurz(rows), [['a', 1, 10]]);
});

test('ohne Teilnehmer bleibt die Wertung leer', () => {
    assert.deepEqual(computeStandings([], [place('a', 1, 10)]), []);
});

test('die Eingabe wird nicht mutiert', () => {
    const entrants = ['a', 'b'];
    const placements = [place('b', 1, 10), place('a', 2, 8)];
    computeStandings(entrants, placements);
    assert.deepEqual(entrants, ['a', 'b']);
    assert.deepEqual(placements, [
        { entrantId: 'b', rank: 1, points: 10 },
        { entrantId: 'a', rank: 2, points: 8 },
    ]);
});
