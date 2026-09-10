import type { RequestHandler } from 'express';
import { boardBySlug } from '#services/board.service';

/**
 * Der Board-Zustand per REST. Der Socket ist der Normalweg (§5), das hier ist
 * das Sicherheitsnetz: das Board pollt alle 30s und heilt sich damit selbst,
 * wenn eine Verbindung ausgefallen war.
 */
export const getBoard: RequestHandler<
    { slug: string },
    unknown,
    unknown,
    { all?: string }
> = async (req, res) => {
    // `?all=1` liefert auch die ungepinnten Disziplinen — das braucht die
    // Siegerehrung. Dieselbe Route, damit die öffentliche Fläche eine bleibt.
    res.json(await boardBySlug(req.params.slug, req.query.all === '1'));
};
