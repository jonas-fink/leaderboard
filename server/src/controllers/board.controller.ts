import type { RequestHandler } from 'express';
import { boardBySlug } from '#services/board.service';

/**
 * Der Board-Zustand per REST. Der Socket ist der Normalweg (§5), das hier ist
 * das Sicherheitsnetz: das Board pollt alle 30s und heilt sich damit selbst,
 * wenn eine Verbindung ausgefallen war.
 */
export const getBoard: RequestHandler<{ slug: string }> = async (req, res) => {
    res.json(await boardBySlug(req.params.slug));
};
