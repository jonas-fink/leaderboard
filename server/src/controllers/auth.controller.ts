import type { RequestHandler } from 'express';
import { httpError } from '#utils';
import {
    hashPassword,
    verifyPassword,
    isThrottled,
    noteFailedLogin,
    clearFailedLogins,
    isRegisterThrottled,
    noteRegisterAttempt,
} from '#services/auth.service';
import {
    setSessionCookie,
    clearSessionCookie,
} from '#services/session.service';
import { User } from '#models';
import type { UserDocument } from '#models';
import type { RegisterInput, LoginInput, User as UserType } from '#types';

/** Wartezeit nach falschen Zugangsdaten. Bremst einen einzelnen Versuch;
 *  gegen viele parallele hilft nur der Zähler in `isThrottled`. */
const PENALTY_MS = 500;

/** Hinter dem Funnel ist die Verbindung immer localhost; die echte Adresse
 *  steht im X-Forwarded-For, dem Express über `trust proxy` glaubt. */
const clientIp = (req: { ip?: string }): string => req.ip ?? 'unbekannt';

/**
 * `asApi`/`toJSON` reicht hier ausnahmsweise nicht: `select: false` am
 * `passwordHash` schützt nur *Abfragen* über das Schema, nicht ein Dokument,
 * das gerade erst mit `.create()` gebaut oder per `.select('+passwordHash')`
 * absichtlich mit Hash geladen wurde. Ohne dieses Herauspicken stünde der
 * Hash im Klartext in der Antwort (AC-1.7, AC-2.6).
 */
const toUserResponse = (user: UserDocument): UserType => ({
    id: user.id,
    email: user.email,
    slug: user.slug,
    displayName: user.displayName ?? undefined,
});

export const postRegister: RequestHandler<
    unknown,
    unknown,
    RegisterInput
> = async (req, res) => {
    const ip = clientIp(req);

    if (isRegisterThrottled(ip)) {
        throw httpError(
            429,
            'Zu viele Registrierungen — später erneut versuchen',
        );
    }
    noteRegisterAttempt(ip);

    // Honeypot: per CSS ausgeblendet, ein echter Nutzer füllt es nie
    // (AC-1.5). Kein Konto wird angelegt.
    if (req.body.trap) {
        throw httpError(400, 'Ungültige Anfrage');
    }

    const user = await User.create({
        email: req.body.email,
        slug: req.body.slug,
        displayName: req.body.displayName,
        passwordHash: hashPassword(req.body.password),
    });

    setSessionCookie(res, user.id);
    res.status(201).json(toUserResponse(user));
};

export const postLogin: RequestHandler<unknown, unknown, LoginInput> = async (
    req,
    res,
) => {
    const ip = clientIp(req);

    if (isThrottled(ip)) {
        throw httpError(429, 'Zu viele Fehlversuche — später erneut versuchen');
    }

    const user = await User.findOne({
        email: req.body.email.toLowerCase(),
    }).select('+passwordHash');
    const valid = user
        ? verifyPassword(req.body.password, user.passwordHash)
        : false;

    if (!user || !valid) {
        noteFailedLogin(ip);
        await new Promise((resolve) => setTimeout(resolve, PENALTY_MS));
        // Eine Meldung für beide Fälle (AC-2.2) — verrät nicht, ob die
        // E-Mail überhaupt existiert.
        throw httpError(401, 'E-Mail oder Passwort falsch');
    }

    clearFailedLogins(ip);
    setSessionCookie(res, user.id);
    res.json(toUserResponse(user));
};

export const postLogout: RequestHandler = (_req, res) => {
    // Kein `requireUser` auf dieser Route: ein abgelaufenes Cookie soll sich
    // auch löschen lassen.
    clearSessionCookie(res);
    res.status(204).end();
};

export const getMe: RequestHandler = (req, res) => {
    res.json(toUserResponse(req.user));
};
