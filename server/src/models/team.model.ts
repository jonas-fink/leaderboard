import { Schema, model } from 'mongoose';
import { toJSONOptions } from '#db';

const HEX = /^#[0-9a-fA-F]{6}$/;

const teamSchema = new Schema(
    {
        tournamentId: {
            type: Schema.Types.ObjectId,
            ref: 'Tournament',
            required: true,
        },
        name: { type: String, required: true, trim: true, maxlength: 50 },
        // Balkenfarbe auf dem Board und Akzent auf der Team-Karte.
        colorPrimary: { type: String, required: true, match: HEX },
        colorSecondary: { type: String, match: HEX },
        bannerUrl: String,
        // Deterministischer Fallback-Sprite, wenn kein Banner hochgeladen ist.
        avatarSeed: { type: String, required: true },
        // Eingebettet statt eigene Membership-Collection: der Kader ist klein
        // und wird immer zusammen mit dem Team gelesen.
        members: {
            type: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
            default: [],
        },
    },
    { timestamps: true, toJSON: toJSONOptions },
);

// Der Name ist nur innerhalb eines Turniers eindeutig — dieselbe Crew darf
// beim nächsten Event wieder "Die Rentner" heißen.
teamSchema.index({ tournamentId: 1, name: 1 }, { unique: true });

export const Team = model('Team', teamSchema);
