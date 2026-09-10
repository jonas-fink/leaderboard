import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const scoreSchema = new Schema(
    {
        // Denormalisiert vom Game, damit Turnierabfragen ohne Join auskommen.
        tournamentId: {
            type: Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true,
        },
        gameId: {
            type: Schema.Types.ObjectId,
            ref: 'Game',
            required: true,
        },
        // Vom Turnier gespiegelt; macht den Score selbsttragend, sodass die
        // Wertungsfunktionen nichts nachladen müssen.
        entrantType: {
            type: String,
            enum: ['player', 'team'],
            required: true,
        },
        playerId: { type: Schema.Types.ObjectId, ref: 'Player' },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
        primaryValue: { type: Number, required: true, min: 0 },
        secondaryValues: { type: Map, of: Number, default: undefined },
        metadata: { type: Schema.Types.Mixed, default: undefined },
        recordedAt: { type: Date, default: Date.now },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

/** Nur die Felder, die der Validator liest. */
type EntrantRefs = {
    entrantType: string;
    playerId?: unknown;
    teamId?: unknown;
};

/**
 * Genau die zu entrantType passende ID ist gesetzt. Zweite Hälfte der Regel
 * aus shared/schemas.ts — hier, weil Seed und Skripte am Zod-Schema vorbei
 * schreiben.
 *
 * `function` statt Arrow, weil der Hook das Dokument über `this` bekommt; das
 * `as` ist eine der Stellen, an denen die Mongoose-Typen nicht mitspielen.
 */
scoreSchema.pre('validate', function () {
    const score = this as unknown as EntrantRefs;
    const passt =
        score.entrantType === 'player'
            ? score.playerId != null && score.teamId == null
            : score.teamId != null && score.playerId == null;

    if (!passt) {
        throw new Error(
            'Zu entrantType gehört genau eine ID: playerId oder teamId',
        );
    }
});

// Deckt die Leaderboard-Abfrage (alle Scores eines Games) und die
// Spieler-Historie (neueste zuerst) ab.
scoreSchema.index({ gameId: 1, primaryValue: 1 });
scoreSchema.index({ tournamentId: 1, recordedAt: -1 });
scoreSchema.index({ playerId: 1, recordedAt: -1 });
scoreSchema.index({ teamId: 1, recordedAt: -1 });

export const Score = model('Score', scoreSchema);
