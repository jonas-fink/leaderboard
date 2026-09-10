import test from 'node:test';
import assert from 'node:assert/strict';
import { rankScores } from '#services/rank';
import type { RawScore } from '#types';

const score = (entrantId: string, primaryValue: number): RawScore => ({
    id: `${entrantId}-${primaryValue}`,
    tournamentId: 't1',
    gameId: 'g1',
    entrantType: 'player',
    entrantId,
    playerId: entrantId,
    primaryValue,
    recordedAt: '2026-01-01T00:00:00.000Z',
});

test('DESC: größter Wert führt', () => {
    const ranked = rankScores(
        [score('bob', 9), score('alice', 12), score('john', 7)],
        'DESC',
    );
    assert.deepEqual(
        ranked.map((e) => [e.entrantId, e.rank]),
        [
            ['alice', 1],
            ['bob', 2],
            ['john', 3],
        ],
    );
});

test('ASC: kleinster Wert führt (Rundenzeit)', () => {
    const ranked = rankScores(
        [score('bob', 90_000), score('alice', 120_000), score('john', 70_000)],
        'ASC',
    );
    assert.deepEqual(
        ranked.map((e) => [e.entrantId, e.rank]),
        [
            ['john', 1],
            ['bob', 2],
            ['alice', 3],
        ],
    );
});

test('nur der beste Score je Teilnehmer zählt, die Historie bleibt unangetastet', () => {
    const entries = [score('alice', 5), score('alice', 12), score('bob', 9)];
    const ranked = rankScores(entries, 'DESC');

    assert.equal(ranked.length, 2, 'ein Eintrag pro Teilnehmer');
    assert.equal(ranked[0]!.entrantId, 'alice');
    assert.equal(ranked[0]!.primaryValue, 12);
    assert.equal(entries.length, 3, 'Eingabe wird nicht mutiert');
});

test('bei ASC ist der kleinere Wert der bessere, auch beim Reduzieren', () => {
    const ranked = rankScores([score('alice', 80), score('alice', 50)], 'ASC');
    assert.equal(ranked[0]!.primaryValue, 50);
});

test('Gleichstand teilt den Rang, der Folgerang wird übersprungen', () => {
    const ranked = rankScores(
        [score('a', 10), score('b', 10), score('c', 5)],
        'DESC',
    );
    assert.deepEqual(
        ranked.map((e) => e.rank),
        [1, 1, 3],
    );
});

test('leere Eingabe ergibt leere Rangliste', () => {
    assert.deepEqual(rankScores([], 'DESC'), []);
});

test('ein Team wird über dieselbe Rangliste gewertet wie ein Spieler', () => {
    // entrantId ist der Schlüssel, nicht playerId — sonst fielen alle
    // Team-Scores in denselben Topf.
    const team = (entrantId: string, primaryValue: number): RawScore => ({
        id: `${entrantId}-${primaryValue}`,
        tournamentId: 't1',
        gameId: 'g1',
        entrantType: 'team',
        entrantId,
        teamId: entrantId,
        primaryValue,
        recordedAt: '2026-01-01T00:00:00.000Z',
    });

    const ranked = rankScores([team('rot', 9), team('blau', 12)], 'DESC');
    assert.deepEqual(
        ranked.map((e) => [e.entrantId, e.rank]),
        [
            ['blau', 1],
            ['rot', 2],
        ],
    );
});
