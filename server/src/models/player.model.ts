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
        avatarUrl: String,
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
