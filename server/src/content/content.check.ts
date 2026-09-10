import { test } from 'node:test';
import assert from 'node:assert/strict';
import { announcementPool, createPicker } from '#content';
import { AnnouncementTypeSchema } from '#schemas';

test('Der Pool deckt jeden Ereignistyp ab', () => {
    for (const type of AnnouncementTypeSchema.options) {
        assert.ok(announcementPool[type].length > 0, type);
    }
});

test('Innerhalb eines Durchlaufs wiederholt sich keine Variante', () => {
    const variants = ['a', 'b', 'c'];
    const pick = createPicker(() => 0.99);
    const drawn = [pick(variants), pick(variants), pick(variants)];
    assert.deepEqual([...drawn].sort(), variants);
});

test('Ist der Vorrat leer, beginnt er von vorn', () => {
    const variants = ['a', 'b'];
    const pick = createPicker(() => 0);
    assert.deepEqual([pick(variants), pick(variants)], ['a', 'b']);
    assert.equal(pick(variants), 'a');
});

test('Jeder Ereignistyp hat seinen eigenen Vorrat', () => {
    const pick = createPicker(() => 0);
    assert.equal(pick(['a', 'b']), 'a');
    assert.equal(pick(['x', 'y']), 'x');
});
