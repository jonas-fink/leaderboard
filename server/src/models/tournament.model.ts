import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const tournamentSchema = new Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            match: /^[a-z0-9-]+$/,
        },
        title: { type: String, required: true, maxlength: 100 },
        description: { type: String, maxlength: 500 },
        // Gilt für ALLE Games des Turniers: entweder Spieler gegen Spieler
        // oder Team gegen Team. Gemischte Turniere gibt es bewusst nicht.
        mode: { type: String, enum: ['player', 'team'], required: true },
        status: {
            type: String,
            enum: ['draft', 'live', 'finished', 'archived'],
            default: 'draft',
        },
        startsAt: { type: Date, required: true },
        endsAt: Date,
        pointsTable: {
            type: [Number],
            default: [10, 8, 6, 5, 4, 3, 2, 1],
            // Zweite Hälfte des Zod-Refines: points.ts verlässt sich darauf,
            // dass die Tabelle fällt, und prüft es bewusst nicht nach — auch
            // ein Seed-Skript darf die Annahme nicht brechen.
            validate: {
                validator: (table: number[]) =>
                    table.length > 0 &&
                    table.every((v, i) => i === 0 || v <= table[i - 1]!),
                message: 'Die Punktetabelle muss von Platz 1 an fallen',
            },
        },
        // Einziger Wert bis auf Weiteres; das Feld existiert für spätere
        // Varianten der Gleichstandsregel.
        tieBreak: { type: String, enum: ['olympic'], default: 'olympic' },
        bannerUrl: String,
    },
    { timestamps: true, toJSON: toJSONOptions },
);

export const Tournament = model('Tournament', tournamentSchema);
