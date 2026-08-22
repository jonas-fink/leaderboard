import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const scoreSchema = new Schema(
    {
        gameId: {
            type: Schema.Types.ObjectId,
            ref: 'Game',
            required: true,
        },
        playerId: {
            type: Schema.Types.ObjectId,
            ref: 'Player',
            required: true,
        },
        primaryValue: { type: Number, required: true, min: 0 },
        secondaryValues: { type: Map, of: Number, default: undefined },
        metadata: { type: Schema.Types.Mixed, default: undefined },
        recordedAt: { type: Date, default: Date.now },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

// Deckt die Leaderboard-Abfrage (alle Scores eines Games) und die
// Spieler-Historie (neueste zuerst) ab.
scoreSchema.index({ gameId: 1, primaryValue: 1 });
scoreSchema.index({ playerId: 1, recordedAt: -1 });

export const Score = model('Score', scoreSchema);
