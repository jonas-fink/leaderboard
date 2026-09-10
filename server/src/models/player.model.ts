import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const playerSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
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

export const Player = model('Player', playerSchema);
