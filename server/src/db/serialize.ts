import { Types } from 'mongoose';
import type { SchemaOptions } from 'mongoose';

/**
 * Einheitliche JSON-Form aller Modelle: `_id`/`__v` raus, `id` als String rein,
 * ObjectId-Referenzen (gameId, playerId) und Daten (startsAt, recordedAt)
 * werden zu Strings — sonst müsste jeder Service einzeln casten, bevor er
 * Werte vergleicht, und die Zod-Typen wären an der Stelle schlicht gelogen.
 */

export const toJSONOptions: SchemaOptions['toJSON'] = {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        for (const [key, value] of Object.entries(ret)) {
            if (value instanceof Types.ObjectId) ret[key] = value.toString();
            else if (value instanceof Date) ret[key] = value.toISOString();
        }
        return ret;
    },
};
