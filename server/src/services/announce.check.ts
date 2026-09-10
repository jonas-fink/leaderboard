import test from 'node:test';
import assert from 'node:assert/strict';
import { announce } from '#services/announce';
import type {
    AnnouncementPool,
    BoardGame,
    BoardGameEntry,
    BoardState,
    GameStatus,
    SortOrder,
    StandingsEntry,
    TournamentStatus,
} from '#types';

// Der Name weicht bewusst von der ID ab, damit die Tests belegen, dass
// {entrant} aus `name` gefüllt wird und nicht aus `entrantId`.
const entrant = (id: string, rank: number): StandingsEntry => ({
    entrantId: id,
    name: id.toUpperCase(),
    avatarSeed: id,
    rank,
    points: 0,
    share: 1,
    rankCounts: [],
});

const entry = (
    entrantId: string,
    rank: number,
    value: number,
): BoardGameEntry => ({
    entrantId,
    rank,
    value,
    points: 0,
});

const game = (
    id: string,
    entries: BoardGameEntry[],
    status: GameStatus = 'running',
    sortOrder: SortOrder = 'DESC',
): BoardGame => ({
    game: {
        id,
        slug: id,
        title: `Spiel ${id}`,
        genre: 'arcade',
        primaryMetric: {
            key: 'p',
            label: 'Punkte',
            sortOrder,
            formatter: 'integer',
        },
    },
    status,
    entries,
});

const board = (
    standings: StandingsEntry[],
    games: BoardGame[] = [],
    status: TournamentStatus = 'live',
): BoardState => ({
    tournament: {
        id: 't1',
        slug: 'turnier',
        title: 'Turnier',
        mode: 'player',
        status,
    },
    standings,
    games,
    computedAt: '2026-01-01T00:00:00.000Z',
});

const pool: AnnouncementPool = {
    first_score: ['{entrant} steigt bei {game} ein mit {value}'],
    personal_best: ['{entrant} verbessert sich auf {value}'],
    new_leader: ['{entrant} übernimmt die Führung'],
    overtake: ['{entrant} klettert auf Rang {rank}'],
    tie_broken: ['{entrant} löst den Gleichstand auf Rang {rank}'],
    game_finished: ['{game} ist entschieden'],
    tournament_finished: ['Das Turnier ist gelaufen'],
};

const pick: (variants: string[]) => string = (variants) => variants[0]!;
const typen = (list: ReturnType<typeof announce>) => list.map((a) => a.type);

test('ohne Vorzustand wird nichts angekündigt', () => {
    const jetzt = board([entrant('a', 1)], [game('g1', [entry('a', 1, 100)])]);
    assert.deepEqual(announce(undefined, jetzt, pool, pick), []);
});

test('ein unveränderter Zustand löst nichts aus', () => {
    const zustand = board(
        [entrant('a', 1)],
        [game('g1', [entry('a', 1, 100)])],
    );
    assert.deepEqual(announce(zustand, zustand, pool, pick), []);
});

test('ein neuer Eintrag in einer Disziplin ist ein erster Score', () => {
    const vorher = board([entrant('a', 1)], [game('g1', [])]);
    const jetzt = board([entrant('a', 1)], [game('g1', [entry('a', 1, 100)])]);

    const events = announce(vorher, jetzt, pool, pick);
    assert.deepEqual(typen(events), ['first_score']);
    assert.equal(events[0]!.entrantId, 'a');
    assert.equal(events[0]!.gameId, 'g1');
    assert.equal(events[0]!.value, 100);
});

test('ein verbesserter Wert ist eine persönliche Bestleistung', () => {
    const vorher = board([entrant('a', 1)], [game('g1', [entry('a', 1, 100)])]);
    const jetzt = board([entrant('a', 1)], [game('g1', [entry('a', 1, 140)])]);

    assert.deepEqual(typen(announce(vorher, jetzt, pool, pick)), [
        'personal_best',
    ]);
});

test('bei ASC ist der kleinere Wert die Verbesserung', () => {
    const vorher = board(
        [entrant('a', 1)],
        [game('g1', [entry('a', 1, 90_000)], 'running', 'ASC')],
    );
    const jetzt = board(
        [entrant('a', 1)],
        [game('g1', [entry('a', 1, 71_350)], 'running', 'ASC')],
    );

    assert.deepEqual(typen(announce(vorher, jetzt, pool, pick)), [
        'personal_best',
    ]);
});

test('ein schlechterer Wert wird nicht als Bestleistung gemeldet', () => {
    const vorher = board([entrant('a', 1)], [game('g1', [entry('a', 1, 140)])]);
    const jetzt = board([entrant('a', 1)], [game('g1', [entry('a', 1, 100)])]);

    assert.deepEqual(announce(vorher, jetzt, pool, pick), []);
});

test('ein Wechsel an der Spitze meldet einen neuen Führenden', () => {
    const vorher = board([entrant('a', 1), entrant('b', 2)]);
    const jetzt = board([entrant('b', 1), entrant('a', 2)]);

    const events = announce(vorher, jetzt, pool, pick);
    assert.deepEqual(typen(events), ['new_leader']);
    assert.equal(events[0]!.entrantId, 'b');
});

test('wer sich verbessert, ohne zu führen, überholt', () => {
    const vorher = board([entrant('a', 1), entrant('b', 2), entrant('c', 3)]);
    const jetzt = board([entrant('a', 1), entrant('c', 2), entrant('b', 3)]);

    const events = announce(vorher, jetzt, pool, pick);
    assert.deepEqual(typen(events), ['overtake']);
    assert.equal(events[0]!.entrantId, 'c');
    assert.equal(events[0]!.rank, 2);
});

test('ein aufgelöster Gleichstand wird für den Vorderen gemeldet', () => {
    const vorher = board([entrant('a', 1), entrant('b', 1), entrant('c', 3)]);
    const jetzt = board([entrant('a', 1), entrant('b', 2), entrant('c', 3)]);

    const events = announce(vorher, jetzt, pool, pick);
    assert.deepEqual(typen(events), ['tie_broken']);
    assert.equal(events[0]!.entrantId, 'a');
});

test('eine beendete Disziplin wird mit ihrem Sieger gemeldet', () => {
    const eintraege = [entry('a', 1, 140), entry('b', 2, 100)];
    const vorher = board([entrant('a', 1)], [game('g1', eintraege)]);
    const jetzt = board([entrant('a', 1)], [game('g1', eintraege, 'finished')]);

    const events = announce(vorher, jetzt, pool, pick);
    assert.deepEqual(typen(events), ['game_finished']);
    assert.equal(events[0]!.gameId, 'g1');
    assert.equal(events[0]!.entrantId, 'a', 'der Sieger hängt am Ereignis');
});

test('ein beendetes Turnier wird gemeldet', () => {
    const vorher = board([entrant('a', 1)]);
    const jetzt = board([entrant('a', 1)], [], 'finished');

    assert.deepEqual(typen(announce(vorher, jetzt, pool, pick)), [
        'tournament_finished',
    ]);
});

test('die Platzhalter werden aus dem Ereignis gefüllt', () => {
    const vorher = board([entrant('a', 1)], [game('g1', [])]);
    const jetzt = board([entrant('a', 1)], [game('g1', [entry('a', 1, 1234)])]);

    assert.equal(
        announce(vorher, jetzt, pool, pick)[0]!.text,
        'A steigt bei Spiel g1 ein mit 1.234',
    );
});

test('{value} wird formatiert wie auf der Game-Karte', () => {
    const zeit = (v: number) => ({
        ...game('g1', [entry('a', 1, v)], 'running', 'ASC'),
        game: {
            ...game('g1', []).game,
            primaryMetric: {
                key: 't',
                label: 'Zeit',
                sortOrder: 'ASC' as const,
                formatter: 'time_ms' as const,
            },
        },
    });
    const vorher = board([entrant('a', 1)], [zeit(90_000)]);
    const jetzt = board([entrant('a', 1)], [zeit(71_350)]);

    assert.equal(
        announce(vorher, jetzt, pool, pick)[0]!.text,
        'A verbessert sich auf 01:11.350',
    );
});

test('die Reihenfolge folgt der Dringlichkeit', () => {
    const vorher = board(
        [entrant('a', 1), entrant('b', 2)],
        [game('g1', [entry('a', 1, 100)])],
    );
    const jetzt = board(
        [entrant('b', 1), entrant('a', 2)],
        [game('g1', [entry('b', 1, 200), entry('a', 2, 100)], 'finished')],
        'finished',
    );

    assert.deepEqual(typen(announce(vorher, jetzt, pool, pick)), [
        'tournament_finished',
        'game_finished',
        'new_leader',
        'first_score',
    ]);
});

test('pick bestimmt, welche Variante genommen wird', () => {
    const vorher = board([entrant('a', 1), entrant('b', 2)]);
    const jetzt = board([entrant('b', 1), entrant('a', 2)]);
    const mehrfach: AnnouncementPool = {
        ...pool,
        new_leader: ['erste', '{entrant} ist vorn'],
    };

    assert.equal(
        announce(vorher, jetzt, mehrfach, (v) => v[v.length - 1]!)[0]!.text,
        'B ist vorn',
    );
});

test('die Eingabe wird nicht mutiert', () => {
    const vorher = board([entrant('a', 1)], [game('g1', [])]);
    const jetzt = board([entrant('a', 1)], [game('g1', [entry('a', 1, 100)])]);
    const kopie = structuredClone(vorher);

    announce(vorher, jetzt, pool, pick);
    assert.deepEqual(vorher, kopie);
});
