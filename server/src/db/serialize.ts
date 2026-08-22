import { Types } from 'mongoose';
import type { SchemaOptions } from 'mongoose';

/**
 * Einheitliche JSON-Form aller Modelle: `_id`/`__v` raus, `id` als String rein,
 * und ObjectId-Referenzen (gameId, playerId) werden zu Strings — sonst müsste
 * jeder Service einzeln casten, bevor er Werte vergleicht.
 */

export const toJSONOptions: SchemaOptions['toJSON'] = {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        for (const [key, value] of Object.entries(ret)) {
            if (value instanceof Types.ObjectId) ret[key] = value.toString();
        }
        return ret;
    },
};
