import type { RequestHandler } from 'express';
import { httpError } from '#utils';
import { isValidToken } from '#services/auth.service';

/**
 * Verlangt ein gültiges Admin-Token — für **jede** Methode, auch lesend.
 *
 * Die Anwendung läuft vollständig über den Tailscale Funnel, es gibt also
 * keine Netzwerkgrenze mehr, hinter der man sich verstecken könnte
 * (PROJEKT.md §9). Öffentlich ist nur, was das Board zum Anzeigen braucht;
 * das wird in `routes/index.ts` *vor* dieser Middleware montiert. Alles
 * darunter ist zu, ohne dass eine neue Route daran denken muss.
 */
export const requireAdmin: RequestHandler = (req, _res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer /, '');
    if (!token || !isValidToken(token)) {
        throw httpError(401, 'Nicht angemeldet');
    }
    next();
};
