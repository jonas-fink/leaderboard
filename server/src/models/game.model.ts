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
    },
    { timestamps: true, toJSON: toJSONOptions },
);

// Der Slug ist nur innerhalb eines Turniers eindeutig — dasselbe Spiel darf
// beim nächsten Event wieder "mario-kart" heißen.
gameSchema.index({ tournamentId: 1, slug: 1 }, { unique: true });

export const Game = model('Game', gameSchema);
