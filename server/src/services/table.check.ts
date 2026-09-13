import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTable } from '#services/table';
import type { MatchResult } from '#services/table';

const match = (
    entrantA: string,
    valueA: number,
    entrantB: string,
    valueB: number,
): MatchResult => ({
    sides: [
        { entrantId: entrantA, value: valueA },
        { entrantId: entrantB, value: valueB },
    ],
});

test('Sieg bringt 3 Punkte, Niederlage bringt 0', () => {
    const table = buildTable([match('a', 3, 'b', 1)]);
    const a = table.find((row) => row.entrantId === 'a')!;
    const b = table.find((row) => row.entrantId === 'b')!;
    assert.equal(a.leaguePoints, 3);
    assert.equal(a.won, 1);
    assert.equal(a.lost, 0);
    assert.equal(b.leaguePoints, 0);
    assert.equal(b.won, 0);
    assert.equal(b.lost, 1);
});

test('Unentschieden bringt beiden je 1 Punkt', () => {
    const table = buildTable([match('a', 2, 'b', 2)]);
    const a = table.find((row) => row.entrantId === 'a')!;
    const b = table.find((row) => row.entrantId === 'b')!;
    assert.equal(a.leaguePoints, 1);
    assert.equal(a.drawn, 1);
    assert.equal(b.leaguePoints, 1);
    assert.equal(b.drawn, 1);
});

test('0:0 ist ein Unentschieden', () => {
    const table = buildTable([match('a', 0, 'b', 0)]);
    const a = table.find((row) => row.entrantId === 'a')!;
    const b = table.find((row) => row.entrantId === 'b')!;
    assert.equal(a.leaguePoints, 1);
    assert.equal(b.leaguePoints, 1);
    assert.equal(a.goalsFor, 0);
    assert.equal(a.goalsAgainst, 0);
});

test('Sieg, Unentschieden und Niederlage ergeben zusammen 4 Punkte (AC-4.1)', () => {
    const table = buildTable([
        match('a', 3, 'b', 1),
        match('a', 2, 'c', 2),
        match('a', 0, 'd', 1),
    ]);
    const a = table.find((row) => row.entrantId === 'a')!;
    assert.equal(a.leaguePoints, 4);
    assert.equal(a.played, 3);
});

test('bei gleichen Punkten steht die bessere Tordifferenz vorn (AC-4.2)', () => {
    const table = buildTable([
        // a: 1 Sieg (3:0), 1 Niederlage (0:3) -> 3 Punkte, Differenz 0
        match('a', 3, 'p1', 0),
        match('a', 0, 'p2', 3),
        // d: 1 Sieg (5:0), 1 Niederlage (1:2) -> 3 Punkte, Differenz +4
        match('d', 5, 'p3', 0),
        match('d', 1, 'p4', 2),
    ]);
    const a = table.find((row) => row.entrantId === 'a')!;
    const d = table.find((row) => row.entrantId === 'd')!;
    assert.equal(a.leaguePoints, d.leaguePoints);
    assert.ok(d.rank < a.rank, 'd hat die bessere Differenz und steht vorn');
});

test('bei gleichen Punkten und gleicher Tordifferenz zählen die erzielten Tore (AC-4.2)', () => {
    const table = buildTable([
        // a: 5:0 (Sieg) -> 3 Punkte, Differenz +5, 5 Tore erzielt
        match('a', 5, 'x', 0),
        // b: 6:1 (Sieg) -> 3 Punkte, Differenz +5, 6 Tore erzielt
        match('b', 6, 'y', 1),
    ]);
    const a = table.find((row) => row.entrantId === 'a')!;
    const b = table.find((row) => row.entrantId === 'b')!;
    assert.equal(a.leaguePoints, b.leaguePoints);
    assert.equal(a.goalsFor - a.goalsAgainst, b.goalsFor - b.goalsAgainst);
    assert.equal(table[0]!.entrantId, 'b');
    assert.equal(table[1]!.entrantId, 'a');
});

test('vollständiger Gleichstand teilt den Rang, der Folgerang wird übersprungen (AC-4.3, E-3)', () => {
    const table = buildTable([
        match('a', 3, 'x', 0),
        match('b', 3, 'y', 0),
        match('c', 3, 'z', 0),
        match('d', 1, 'w', 0),
    ]);
    const ranks = new Map(table.map((row) => [row.entrantId, row.rank]));
    assert.equal(ranks.get('a'), 1);
    assert.equal(ranks.get('b'), 1);
    assert.equal(ranks.get('c'), 1);
    assert.equal(ranks.get('d'), 4);
});

test('ungleiche Spielzahl wird summiert, played zählt korrekt (E-2)', () => {
    const table = buildTable([
        match('a', 1, 'b', 0),
        match('a', 1, 'c', 0),
        match('a', 1, 'd', 0),
        match('b', 0, 'c', 0),
    ]);
    const a = table.find((row) => row.entrantId === 'a')!;
    const b = table.find((row) => row.entrantId === 'b')!;
    assert.equal(a.played, 3);
    assert.equal(b.played, 2);
});

test('leere Eingabe ergibt eine leere Tabelle (E-1)', () => {
    assert.deepEqual(buildTable([]), []);
});

test('die Eingabe wird nicht mutiert', () => {
    const matches = [match('a', 3, 'b', 1)];
    const snapshot = JSON.parse(JSON.stringify(matches));
    buildTable(matches);
    assert.deepEqual(matches, snapshot);
});

test('Teilnehmer werden aus den Matches abgeleitet, wer nicht gespielt hat taucht nicht auf (AC-4.5)', () => {
    const table = buildTable([match('a', 3, 'b', 1)]);
    assert.deepEqual(table.map((row) => row.entrantId).sort(), ['a', 'b']);
});
