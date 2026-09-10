import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateTournamentSchema } from '#schemas';

const turnier = (überschreiben: Record<string, unknown> = {}) => ({
    slug: 'retro-night',
    title: 'Retro Night',
    mode: 'team',
    startsAt: '2026-10-01T18:00:00.000Z',
    tieBreak: 'olympic',
    ...überschreiben,
});

test('ohne Angabe gelten Entwurf, Standardtabelle und olympischer Tie-Break', () => {
    const parsed = CreateTournamentSchema.parse(turnier());
    assert.equal(parsed.status, 'draft');
    assert.deepEqual(parsed.pointsTable, [10, 8, 6, 5, 4, 3, 2, 1]);
    assert.equal(parsed.tieBreak, 'olympic');
});

test('eine fallende Punktetabelle wird angenommen', () => {
    const parsed = CreateTournamentSchema.parse(
        turnier({ pointsTable: [12, 9, 9, 4, 0] }),
    );
    assert.deepEqual(parsed.pointsTable, [12, 9, 9, 4, 0]);
});

test('eine steigende Punktetabelle wird abgelehnt', () => {
    // Sonst brächte ein schlechterer Rang mehr Punkte ein als ein besserer;
    // points.ts verlässt sich auf die Monotonie und prüft sie nicht nach.
    assert.equal(
        CreateTournamentSchema.safeParse(turnier({ pointsTable: [10, 5, 8] }))
            .success,
        false,
    );
});

test('eine leere Punktetabelle wird abgelehnt', () => {
    assert.equal(
        CreateTournamentSchema.safeParse(turnier({ pointsTable: [] })).success,
        false,
    );
});
