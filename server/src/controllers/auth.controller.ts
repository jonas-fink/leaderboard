import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { httpError } from '#utils';
import {
    hashPassword,
    verifyPassword,
    isThrottled,
    noteFailedLogin,
    clearFailedLogins,
    isRegisterThrottled,
    noteRegisterAttempt,
    issueMailToken,
    verifyMailToken,
    isMailThrottled,
    noteMailSent,
    allowMailTo,
} from '#services/auth.service';
import {
    setSessionCookie,
    clearSessionCookie,
} from '#services/session.service';
import {
    sendMail,
    sendMailQuietly,
    verifyMail,
    resetMail,
    passwordChangedMail,
    emailChangeMail,
    emailChangedMail,
    accountDeletedMail,
} from '#services/mail.service';
import { deleteAccount } from '#services/account.service';
import { User } from '#models';
import type { UserDocument } from '#models';
import type {
    RegisterInput,
    LoginInput,
    TokenInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    ChangePasswordInput,
    ChangeEmailInput,
    DeleteAccountInput,
    User as UserType,
} from '#types';

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
    verified: Boolean(user.verifiedAt),
});

const INVALID_LINK = 'Link ungültig oder abgelaufen';

/** Fehlversuche beim aktuellen Passwort zählen wie fehlgeschlagene
 *  Anmeldungen — sonst wäre eine offene Sitzung ein Rateorakel. */
const checkCurrentPassword = async (
    ip: string,
    userId: string,
    plain: string,
): Promise<UserDocument> => {
    if (isThrottled(ip)) {
        throw httpError(429, 'Zu viele Fehlversuche — später erneut versuchen');
    }

    const user = await User.findById(userId).select('+passwordHash');
    if (user && verifyPassword(plain, user.passwordHash)) return user;

    noteFailedLogin(ip);
    await new Promise((resolve) => setTimeout(resolve, PENALTY_MS));
    // 400 mit Feldzuordnung statt 401: der Client soll das als Formular-
    // fehler zeigen, nicht als abgelaufene Sitzung.
    throw new ZodError([
        {
            code: 'custom',
            path: ['currentPassword'],
            message: 'Passwort falsch',
            input: undefined,
        },
    ]);
};

const TOO_MANY_MAILS = 'Zu viele Mails angefordert — später erneut versuchen';

/**
 * Beide Mail-Bremsen für angemeldete Anfragen. Hier darf die Empfänger-
 * bremse laut scheitern: die Adresse gehört dem Konto selbst oder ist
 * gerade als frei bestätigt, die 429 verrät also nichts.
 * `postForgotPassword` prüft die Empfängerbremse dagegen stumm.
 */
const throttleMail = (ip: string, to?: string): void => {
    if (isMailThrottled(ip)) throw httpError(429, TOO_MANY_MAILS);
    noteMailSent(ip);
    if (to && !allowMailTo(to)) throw httpError(429, TOO_MANY_MAILS);
};

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

    // Leise: ein Resend-Ausfall darf die Registrierung nicht kippen, der
    // Banner bietet "erneut senden" an.
    sendMailQuietly(
        user.email,
        verifyMail(issueMailToken('verify', user.id, user.email)),
    );
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

// --- E-Mail bestätigen -----------------------------------------------------

export const postVerifyResend: RequestHandler = async (req, res) => {
    const user = req.user;
    if (!user.verifiedAt) {
        throttleMail(clientIp(req), user.email);
        // Nicht leise: wer ausdrücklich klickt, soll einen Fehler sehen.
        await sendMail(
            user.email,
            verifyMail(issueMailToken('verify', user.id, user.email)),
        );
    }
    res.status(204).end();
};

export const postVerify: RequestHandler<unknown, unknown, TokenInput> = async (
    req,
    res,
) => {
    const claims = verifyMailToken(req.body.token, 'verify');
    const user = claims && (await User.findById(claims.userId));
    // Nach einem Adresswechsel bestätigt der alte Link nichts mehr.
    if (!user || user.email !== claims.email) {
        throw httpError(400, INVALID_LINK);
    }

    if (!user.verifiedAt) {
        user.verifiedAt = new Date();
        await user.save();
    }
    res.status(204).end();
};

// --- Passwort ----------------------------------------------------------------

export const postForgotPassword: RequestHandler<
    unknown,
    unknown,
    ForgotPasswordInput
> = async (req, res) => {
    throttleMail(clientIp(req));

    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    // Immer 204 und ohne auf den Versand zu warten — weder Antwort noch
    // Antwortzeit verraten, ob es das Konto gibt. Auch eine gebremste
    // Adresse bekommt 204, nur eben keine Mail.
    if (user && allowMailTo(user.email)) {
        sendMailQuietly(
            user.email,
            resetMail(issueMailToken('reset', user.id)),
        );
    }
    res.status(204).end();
};

export const postResetPassword: RequestHandler<
    unknown,
    unknown,
    ResetPasswordInput
> = async (req, res) => {
    const claims = verifyMailToken(req.body.token, 'reset');
    const user = claims && (await User.findById(claims.userId));
    // Jeder Passwortwechsel verschiebt `sessionsValidFrom` — damit ist auch
    // dieser Link nach der ersten Nutzung verbraucht.
    if (!user || claims.issuedAt < user.sessionsValidFrom.getTime()) {
        throw httpError(400, INVALID_LINK);
    }

    user.passwordHash = hashPassword(req.body.password);
    user.sessionsValidFrom = new Date();
    // Wer den Link aus dem Postfach geöffnet hat, besitzt die Adresse.
    user.verifiedAt ??= new Date();
    await user.save();

    sendMailQuietly(user.email, passwordChangedMail());
    setSessionCookie(res, user.id);
    res.json(toUserResponse(user));
};

export const postChangePassword: RequestHandler<
    unknown,
    unknown,
    ChangePasswordInput
> = async (req, res) => {
    const user = await checkCurrentPassword(
        clientIp(req),
        req.user.id,
        req.body.currentPassword,
    );

    user.passwordHash = hashPassword(req.body.newPassword);
    // Meldet alle anderen Geräte ab; dieses bekommt gleich ein frisches Cookie.
    user.sessionsValidFrom = new Date();
    await user.save();

    sendMailQuietly(user.email, passwordChangedMail());
    setSessionCookie(res, user.id);
    res.status(204).end();
};

// --- E-Mail-Adresse ändern ---------------------------------------------------

export const postChangeEmail: RequestHandler<
    unknown,
    unknown,
    ChangeEmailInput
> = async (req, res) => {
    const ip = clientIp(req);
    const user = await checkCurrentPassword(
        ip,
        req.user.id,
        req.body.currentPassword,
    );

    const newEmail = req.body.newEmail.toLowerCase();
    if (newEmail === user.email) {
        throw httpError(400, 'Das ist bereits deine Adresse');
    }
    // Gleiche Antwortform wie der Duplicate-Key-Fehler, damit der Client sie
    // ans Feld hängt. Spätestens beim Bestätigen fängt der Index den Rest.
    if (await User.exists({ email: newEmail })) {
        res.status(409).json({
            message: 'Eintrag existiert bereits',
            keys: { newEmail },
        });
        return;
    }

    throttleMail(ip, newEmail);
    // Erst nach dem Klick auf den Link wird umgestellt — so kann sich niemand
    // per Tippfehler aus dem eigenen Konto aussperren.
    await sendMail(
        newEmail,
        emailChangeMail(issueMailToken('email', user.id, newEmail)),
    );
    res.status(204).end();
};

export const postConfirmEmail: RequestHandler<
    unknown,
    unknown,
    TokenInput
> = async (req, res) => {
    const claims = verifyMailToken(req.body.token, 'email');
    const user = claims?.email && (await User.findById(claims.userId));
    if (!user || !claims?.email) throw httpError(400, INVALID_LINK);

    // Doppelt geklickt: schon erledigt.
    if (user.email !== claims.email) {
        const oldEmail = user.email;
        user.email = claims.email;
        user.verifiedAt = new Date();
        await user.save();
        // Der Hinweis an die alte Adresse ist die Bremse gegen eine
        // gekaperte Sitzung.
        sendMailQuietly(oldEmail, emailChangedMail(claims.email));
    }
    res.status(204).end();
};

// --- Konto löschen -----------------------------------------------------------

export const deleteMe: RequestHandler<
    unknown,
    unknown,
    DeleteAccountInput
> = async (req, res) => {
    const user = await checkCurrentPassword(
        clientIp(req),
        req.user.id,
        req.body.currentPassword,
    );

    await deleteAccount(user.id);
    sendMailQuietly(user.email, accountDeletedMail());
    clearSessionCookie(res);
    res.status(204).end();
};
