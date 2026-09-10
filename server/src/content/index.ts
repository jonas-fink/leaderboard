import { z } from 'zod';
import { AnnouncementTypeSchema } from '#schemas';
import pool from './announcements.de.json' with { type: 'json' };
import type { AnnouncementPool, PickVariant } from '#types';

/**
 * Der Spruch-Pool wird beim Start geprüft, nicht beim Ziehen. Ein Tippfehler
 * in der JSON soll den Server sichtbar nicht hochkommen lassen, statt mitten
 * im Event einen leeren Toast zu erzeugen — die Datei ist ausdrücklich dafür
 * da, vor jedem Event von Hand angepasst zu werden (PROJEKT.md §7).
 */
const PoolSchema = z.record(
    AnnouncementTypeSchema,
    z.array(z.string().min(1)).min(1),
);

export const announcementPool: AnnouncementPool = PoolSchema.parse(pool);

/**
 * Zieht zufällig und wiederholungsfrei, solange ungenutzte Varianten übrig
 * sind; danach beginnt der Vorrat von vorn. Der Zustand liegt hier, damit
 * `announce.ts` rein bleibt (KONVENTIONEN §7.2).
 *
 * Der Vorrat hängt an der Variantenliste selbst — jeder Ereignistyp hat
 * seine eigene, und die Objekte aus dem Pool leben so lange wie der Prozess.
 */
export const createPicker = (random = Math.random): PickVariant => {
    const remaining = new WeakMap<string[], string[]>();

    return (variants) => {
        let left = remaining.get(variants);
        if (!left || left.length === 0) {
            left = [...variants];
            remaining.set(variants, left);
        }
        return left.splice(Math.floor(random() * left.length), 1)[0]!;
    };
};
