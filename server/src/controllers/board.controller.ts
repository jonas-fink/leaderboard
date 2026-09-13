import type { RequestHandler } from 'express';
import { boardBySlugs } from '#services/board.service';

/**
 * Der Board-Zustand per REST. Der Socket ist der Normalweg (§5), das hier ist
 * das Sicherheitsnetz: das Board pollt alle 30s und heilt sich damit selbst,
 * wenn eine Verbindung ausgefallen war.
 *
 * Öffentlich, ohne Sitzung — `userSlug` trennt die Turniere zweier Konten mit
 * demselben Turnier-Slug (AC-4.1, AC-4.2).
 */
export const getBoard: RequestHandler<
    { userSlug: string; tournamentSlug: string },
    unknown,
    unknown,
    { all?: string }
> = async (req, res) => {
    // `?all=1` liefert auch die ungepinnten Disziplinen — das braucht die
    // Siegerehrung. Dieselbe Route, damit die öffentliche Fläche eine bleibt.
    res.json(
        await boardBySlugs(
            req.params.userSlug,
            req.params.tournamentSlug,
            req.query.all === '1',
        ),
    );
};
