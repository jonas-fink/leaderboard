import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const playerSchema = new Schema(
    {
        // Besitz (specs/002-benutzerkonten): ein Player gehört einem Konto,
        // nicht einem Turnier (AD-8) — die Historie bleibt über mehrere
        // Events erhalten, nur kontoweit statt instanzweit.
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 30,
        },
        displayName: { type: String, trim: true, maxlength: 30 },
        avatarUrl: String,
        // Deterministischer Fallback-Sprite, wenn kein Avatar hochgeladen ist.
        avatarSeed: { type: String, required: true },
        countryCode: {
            type: String,
            uppercase: true,
            minlength: 2,
            maxlength: 2,
        },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

// Ersetzt den früheren globalen `unique` auf `username` (AC-3.5, E-7).
playerSchema.index({ ownerId: 1, username: 1 }, { unique: true });

export const Player = model('Player', playerSchema);
