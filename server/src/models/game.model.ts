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
        slug: {
            type: String,
            required: true,
            unique: true,
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
        timeframe: {
            type: String,
            enum: ['all_time', 'monthly', 'weekly', 'season'],
            default: 'all_time',
        },
        // Steuert, welche Games auf dem Dashboard als Chart erscheinen.
        pinned: { type: Boolean, default: false },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

export const Game = model('Game', gameSchema);
