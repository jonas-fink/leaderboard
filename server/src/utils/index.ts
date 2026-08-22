import type { HttpError } from '#types';

export const httpError = (status: number, message: string): HttpError => {
    const error = new Error(message) as HttpError;
    error.status = status;
    return error;
};

export const notFound = (what: string) =>
    httpError(404, `${what} nicht gefunden`);

/**
 * Mongoose-Dokument -> API-Typ.
 *
 * Der Transform in db/serialize.ts ersetzt `_id` durch `id` und stringifiziert
 * ObjectIds.
 */
export const asApi = <T>(doc: { toJSON: () => unknown }): T =>
    doc.toJSON() as T;
