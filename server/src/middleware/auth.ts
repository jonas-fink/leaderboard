import type { RequestHandler } from 'express';
import { httpError } from '#utils';
import { config } from '#config';
import { verifyToken } from '#services/auth.service';
import {
    readSessionCookie,
    setSessionCookie,
} from '#services/session.service';
import { User } from '#models';

/** Eine Meldung für jeden der Fälle unten — keiner darf verraten, welcher
 *  Schritt genau gescheitert ist. */
const UNAUTHENTICATED = 'Nicht angemeldet';

/**
 * Verlangt eine gültige Sitzung — für **jede** Methode, auch lesend
 * (AC-3.8). Öffentlich ist nur, was in `routes/index.ts` *vor* dieser
 * Middleware montiert wird: `/health`, `/auth/*`, `/board/*`, `/uploads/*`.
 *
 * Fünf Schritte, in dieser Reihenfolge (architecture.md, specs/002):
 */
export const requireUser: RequestHandler = async (req, res, next) => {
    // 1. Cookie fehlt.
    const token = readSessionCookie(req);
    if (!token) throw httpError(401, UNAUTHENTICATED);

    // 2. Signatur oder Inhalt ungültig, oder abgelaufen.
    const verified = verifyToken(token);
    if (!verified) throw httpError(401, UNAUTHENTICATED);

    // 3. Konto existiert nicht (mehr) — AC-6.2: ein per CLI gelöschtes Konto
    // darf nicht bis zum Ablauf des Tokens weiterschreiben können.
    const user = await User.findById(verified.userId);
    if (!user) throw httpError(401, UNAUTHENTICATED);

    // 4. Sitzung wurde widerrufen — AC-6.1 ("überall abmelden").
    if (verified.issuedAt < user.sessionsValidFrom.getTime()) {
        throw httpError(401, UNAUTHENTICATED);
    }

    // 5. Konto an den Request hängen; über der halben Laufzeit ein frisches
    // Cookie mitsenden (AC-2.4), damit eine durchgehend genutzte Sitzung nie
    // mitten im Event abläuft.
    req.user = user;
    if (Date.now() - verified.issuedAt > config.tokenTtlMs / 2) {
        setSessionCookie(res, user.id);
    }

    next();
};
