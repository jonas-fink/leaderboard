import type { RequestHandler } from 'express';
import { httpError } from '#utils';
import {
    checkPin,
    clearFailedLogins,
    isThrottled,
    issueToken,
    noteFailedLogin,
} from '#services/auth.service';
import type { LoginInput } from '#types';

/** Wartezeit nach falschem PIN. Bremst einen einzelnen Versuch; gegen viele
 *  parallele hilft nur der Zähler in `isThrottled`. */
const PENALTY_MS = 500;

export const postLogin: RequestHandler<unknown, unknown, LoginInput> = async (
    req,
    res,
) => {
    // Hinter dem Funnel ist die Verbindung immer localhost; die echte Adresse
    // steht im X-Forwarded-For, dem Express über `trust proxy` glaubt.
    const ip = req.ip ?? 'unbekannt';

    if (isThrottled(ip)) {
        throw httpError(429, 'Zu viele Fehlversuche — später erneut versuchen');
    }

    if (!checkPin(req.body.pin)) {
        noteFailedLogin(ip);
        await new Promise((resolve) => setTimeout(resolve, PENALTY_MS));
        throw httpError(401, 'Falscher PIN');
    }

    clearFailedLogins(ip);
    res.json({ token: issueToken() });
};
