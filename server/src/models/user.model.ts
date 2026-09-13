import {
    Schema,
    model,
    type HydratedDocument,
    type InferSchemaType,
} from 'mongoose';
import { toJSONOptions } from '#db';

/**
 * Slugs, die mit einem Routenpfad kollidieren würden (E-8). Die Konstante
 * lebt in `shared/schemas.ts`, weil der Zod-`.refine()` in `RegisterSchema`
 * sie braucht — hier nur re-exportiert, damit sie neben dem Mongoose-Schema
 * auffindbar bleibt.
 */
export { RESERVED_SLUGS } from '#schemas';

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // Trägt die öffentliche Board-URL: /board/<slug>/<turnier>
        slug: {
            type: String,
            required: true,
            unique: true,
            match: /^[a-z0-9-]+$/,
            minlength: 2,
            maxlength: 30,
        },
        displayName: { type: String, trim: true, maxlength: 50 },
        // select: false, damit der Hash nie versehentlich in einer Antwort
        // landet (AC-1.7). verifyPassword fordert ihn ausdrücklich mit
        // `.select('+passwordHash')` an.
        passwordHash: { type: String, required: true, select: false },
        // Jedes davor ausgestellte Token gilt nicht mehr. Deckt "überall
        // abmelden" und den (noch fehlenden) Passwortwechsel mit einem Feld ab.
        sessionsValidFrom: { type: Date, default: Date.now },
        // ponytail: keine Mail-Verifikation. Feld reserviert, damit SMTP
        // später ohne Schemaänderung nachrüstbar ist.
        verifiedAt: Date,
    },
    { timestamps: true, toJSON: toJSONOptions },
);

export const User = model('User', userSchema);

/** Das hydrierte Mongoose-Dokument, wie es an `req.user` hängt (`middleware/auth.ts`). */
export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;
