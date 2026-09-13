import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const metricConfigSchema = new Schema(
    {
        key: { type: String, required: true, maxlength: 50 },
        label: { type: String, required: true, maxlength: 50 },
        sortOrder: { type: String, enum: ['ASC', 'DESC'], required: true },
        formatter: {
            type: String,
            enum: ['time_ms', 'integer', 'decimal', 'currency'],
            required: true,
        },
        unit: { type: String, maxlength: 20 },
    },
    { _id: false },
);

const gameSchema = new Schema(
    {
        tournamentId: {
            type: Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true,
        },
        slug: {
            type: String,
            required: true,
            match: /^[a-z0-9-]+$/,
        },
        title: { type: String, required: true, maxlength: 100 },
        genre: {
            type: String,
            enum: ['racing', 'sports', 'arcade', 'fps', 'custom'],
            required: true,
        },
        coverUrl: String,
        // Metrisch (bestehend) oder Versus (Matches). Bestehende Dokumente
        // ohne das Feld liest Mongoose als 'metric' — ihr Verhalten bleibt
        // unverändert (AC-1.3).
        scoring: {
            type: String,
            enum: ['metric', 'versus'],
            default: 'metric',
            required: true,
        },
        primaryMetric: { type: metricConfigSchema, required: true },
        secondaryMetrics: { type: [metricConfigSchema], default: undefined },
        // Gewichtungsfaktor der Disziplin — ein Finale zählt z.B. doppelt.
        weight: { type: Number, default: 1, min: 0 },
        // Steuert, welche Games auf dem Board erscheinen.
        pinned: { type: Boolean, default: false },
        boardOrder: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['upcoming', 'running', 'finished'],
            default: 'upcoming',
        },
        // Ziel des Board-Countdowns. Wird beim Start der Disziplin gesetzt
        // und beim Zurückschalten auf null geräumt.
        endsAt: { type: Date, default: null },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

/** Nur die Felder, die der Validator liest. */
type ScoringRefs = {
    scoring: string;
    primaryMetric?: { sortOrder?: string };
};

/**
 * Zweite Hälfte der DESC-Invariante aus shared/schemas.ts (AD-5): bei einem
 * Match entscheidet der höhere Wert den Sieg, also muss `sortOrder` bei
 * `scoring: 'versus'` `DESC` sein.
 *
 * Greift zusätzlich über zwei Requests hinweg (BE-9): `updateGame` lädt das
 * Dokument, wendet den Patch per `.set()` an und ruft `save()` — anders als
 * `findByIdAndUpdate` löst das diesen Hook aus, auch wenn nur eines der
 * beiden Felder im Patch steht.
 *
 * `this.invalidate(...)` statt `throw new Error(...)`, damit `validate()`
 * eine echte `ValidationError` wirft — die übersetzt `errorHandler` bereits
 * nach 400, ein einfacher `Error` würde als 500 durchfallen.
 *
 * `function` statt Arrow, weil der Hook das Dokument über `this` bekommt —
 * dieselbe Ausnahme wie in score.model.ts.
 */
gameSchema.pre('validate', function () {
    const game = this as unknown as ScoringRefs;
    if (game.scoring === 'versus' && game.primaryMetric?.sortOrder !== 'DESC') {
        this.invalidate(
            'primaryMetric.sortOrder',
            'Versus-Disziplinen benötigen primaryMetric.sortOrder: DESC',
        );
    }
});

// Der Slug ist nur innerhalb eines Turniers eindeutig — dasselbe Spiel darf
// beim nächsten Event wieder "mario-kart" heißen.
gameSchema.index({ tournamentId: 1, slug: 1 }, { unique: true });

export const Game = model('Game', gameSchema);
