import type { Request, Response } from 'express';
import { config } from '#config';
import { issueToken } from '#services/auth.service';

/**
 * Die einzige Stelle mit Cookie-Flags — sonst schreiben Login, Registrierung
 * und die Schiebe-Erneuerung sie dreimal und driften auseinander.
 */
const COOKIE = 'session';

export const setSessionCookie = (res: Response, userId: string): void =>
    void res.cookie(COOKIE, issueToken(userId), {
        httpOnly: true, // für JavaScript unlesbar, anders als localStorage
        sameSite: 'lax', // ersetzt den CSRF-Token (AD-3)
        secure: config.nodeEnv === 'production', // sonst kommt es über http nie an (E-5)
        maxAge: config.tokenTtlMs,
        path: '/',
    });

export const clearSessionCookie = (res: Response): void =>
    void res.clearCookie(COOKIE, { path: '/' });

/** Eine Zeile statt cookie-parser — es wird genau ein Cookie gelesen. */
export const readSessionCookie = (req: Request): string | undefined =>
    req.headers.cookie
        ?.split('; ')
        .find((c) => c.startsWith(`${COOKIE}=`))
        ?.slice(COOKIE.length + 1);
