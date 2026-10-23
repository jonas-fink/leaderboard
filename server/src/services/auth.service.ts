import {
    createHmac,
    randomBytes,
    scryptSync,
    timingSafeEqual,
} from 'node:crypto';
import { config } from '#config';

// ---------------------------------------------------------------------------
// Passwort-Hashing
// ---------------------------------------------------------------------------

/** Länge des abgeleiteten Schlüssels in Byte — unabhängig vom Passwort. */
const KEY_LEN = 64;
/** Salt-Länge in Byte, wie von `scrypt` üblicherweise verlangt. */
const SALT_LEN = 16;

/**
 * `scrypt` aus `node:crypto`, kein zusätzliches Paket. Format der
 * gespeicherten Zeichenkette: `"<salt-hex>:<hash-hex>"` — der Salt reist mit,
 * weil `verifyPassword` ihn braucht, um denselben Hash erneut zu bilden.
 */
export const hashPassword = (plain: string): string => {
    const salt = randomBytes(SALT_LEN);
    const hash = scryptSync(plain, salt, KEY_LEN);
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
};

/** Zeitkonstant, damit der Vergleich nichts über das Geheimnis verrät. */
const buffersEqual = (a: Buffer, b: Buffer): boolean =>
    a.length === b.length && timingSafeEqual(a, b);

export const verifyPassword = (plain: string, stored: string): boolean => {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(plain, salt, expected.length || KEY_LEN);
    return buffersEqual(expected, actual);
};

// ---------------------------------------------------------------------------
// Sitzungs-Token
//
// Signiertes Token ohne Bibliothek: `<userId>.<issuedAt>.<expiresAt>`, per
// HMAC-SHA256 signiert und base64url kodiert. Der Schlüssel ist
// `config.sessionSecret` (SESSION_SECRET) — anders als früher kein Geheimnis,
// das zugleich der Zugriffsschutz selbst ist.
//
// ponytail: kein JWT. Genau drei Claims und ein Aussteller; ein Format mit
// Header, Algorithmenwahl und Bibliothek dahinter wäre mehr Angriffsfläche
// als Nutzen (siehe ADR AD-2 in specs/002-benutzerkonten/architecture.md).
// ---------------------------------------------------------------------------

const sign = (payload: string): string =>
    createHmac('sha256', config.sessionSecret)
        .update(payload)
        .digest('base64url');

/** Zeitkonstant, damit der Vergleich nichts über das Geheimnis verrät. */
const equals = (a: string, b: string): boolean => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};

export const issueToken = (userId: string, now = Date.now()): string => {
    const expiresAt = now + config.tokenTtlMs;
    const payload = `${userId}.${now}.${expiresAt}`;
    return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
};

export const verifyToken = (
    token: string,
    now = Date.now(),
): { userId: string; issuedAt: number } | null => {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;

    const payload = Buffer.from(encoded, 'base64url').toString();
    // Erst die Signatur, dann der Inhalt: ein abgelaufenes Token soll nicht
    // verraten, dass es wenigstens echt war.
    if (!equals(signature, sign(payload))) return null;

    const [userId, issuedAtRaw, expiresAtRaw] = payload.split('.');
    if (!userId || !issuedAtRaw || !expiresAtRaw) return null;

    const issuedAt = Number(issuedAtRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) return null;
    if (!(expiresAt > now)) return null;

    return { userId, issuedAt };
};

// ---------------------------------------------------------------------------
// Mail-Token
//
// Derselbe Aufbau wie das Sitzungs-Token, nur mit Zweck und optionaler
// Adresse — als JSON, weil eine E-Mail Punkte enthält. Zustandslos: Einmal-
// Nutzung entsteht über den Abgleich mit dem Konto, nicht über eine Tabelle.
//   reset  — gilt nur, solange `iat >= sessionsValidFrom`; jeder Passwort-
//            wechsel verschiebt das und entwertet damit den Link.
//   verify — `email` muss noch die Adresse des Kontos sein.
//   email  — `email` ist die neue Adresse.
// ---------------------------------------------------------------------------

export type MailPurpose = 'reset' | 'verify' | 'email';

const MAIL_TTL_MS: Record<MailPurpose, number> = {
    reset: 60 * 60 * 1000,
    verify: 7 * 24 * 60 * 60 * 1000,
    email: 60 * 60 * 1000,
};

type MailClaims = {
    p: MailPurpose;
    u: string;
    iat: number;
    x: number;
    e?: string;
};

export const issueMailToken = (
    purpose: MailPurpose,
    userId: string,
    email?: string,
    now = Date.now(),
): string => {
    const claims: MailClaims = {
        p: purpose,
        u: userId,
        iat: now,
        x: now + MAIL_TTL_MS[purpose],
        e: email,
    };
    const payload = JSON.stringify(claims);
    return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
};

export const verifyMailToken = (
    token: string,
    purpose: MailPurpose,
    now = Date.now(),
): { userId: string; issuedAt: number; email?: string } | null => {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;

    const payload = Buffer.from(encoded, 'base64url').toString();
    if (!equals(signature, sign(payload))) return null;

    let claims: MailClaims;
    try {
        claims = JSON.parse(payload) as MailClaims;
    } catch {
        return null;
    }
    // Der Zweck steht mit in der Signatur: ein Bestätigungslink taugt nicht
    // als Reset-Link.
    if (claims.p !== purpose || !(claims.x > now)) return null;

    return { userId: claims.u, issuedAt: claims.iat, email: claims.e };
};

// ---------------------------------------------------------------------------
// Bremse gegen Durchprobieren
// ---------------------------------------------------------------------------

/** Zeitfenster, nach dem die Zähler eines Absenders verfallen. */
const WINDOW_MS = 10 * 60 * 1000;
/**
 * Fehlversuche je Absender im Fenster.
 *
 * Bewusst großzügig: gegen einen zufälligen Wert helfen auch 20 Versuche je
 * 10 Minuten nichts. Eng zu zählen brächte keine Sicherheit, würde aber
 * während der Sperre auch den richtigen Versuch abweisen — ein Fremder
 * könnte den Veranstalter mitten im Event aussperren.
 */
const MAX_PER_IP = 20;
/** Deckel über alle Absender zusammen, gegen verteiltes Durchprobieren.
 *  Aus demselben Grund hoch angesetzt. */
const MAX_TOTAL = 200;

type Window = { count: number; resetAt: number };

/**
 * Eine Zähl-Bucket im Prozessspeicher, parametrisiert über einen Absender.
 *
 * ponytail: keine Bibliothek und kein Redis. Es gibt einen Serverprozess,
 * und ein Neustart, der die Zähler verliert, ist kein Angriffsweg — dafür
 * müsste der Angreifer den Server neu starten können. Persistenz erst, wenn
 * mehrere Instanzen laufen.
 */
const createThrottleBucket = ({
    windowMs = WINDOW_MS,
    max = MAX_PER_IP,
    maxTotal = MAX_TOTAL,
} = {}) => {
    const attempts = new Map<string, Window>();
    const TOTAL = '*';

    const windowFor = (key: string, now: number): Window => {
        const existing = attempts.get(key);
        if (existing && existing.resetAt > now) return existing;

        const fresh = { count: 0, resetAt: now + windowMs };
        attempts.set(key, fresh);
        return fresh;
    };

    const isThrottled = (ip: string, now = Date.now()): boolean =>
        windowFor(ip, now).count >= max ||
        windowFor(TOTAL, now).count >= maxTotal;

    const note = (ip: string, now = Date.now()): void => {
        // Abgelaufene Einträge räumen, damit die Map nicht mit jeder fremden
        // Adresse weiterwächst.
        for (const [key, window] of attempts) {
            if (window.resetAt <= now) attempts.delete(key);
        }
        windowFor(ip, now).count++;
        windowFor(TOTAL, now).count++;
    };

    const clear = (ip: string): void => {
        attempts.delete(ip);
    };

    return { isThrottled, note, clear };
};

/** Bremse für `POST /api/auth/login`. */
const loginThrottle = createThrottleBucket();
export const isThrottled = loginThrottle.isThrottled;
export const noteFailedLogin = loginThrottle.note;
/** Nach erfolgreicher Anmeldung ist der Absender wieder unbescholten. */
export const clearFailedLogins = loginThrottle.clear;

/**
 * Zweite, unabhängige Bremse für `POST /api/auth/register` (AC-1.6). Getrennt
 * von der Anmeldebremse, sonst könnte ein Registrierungs-Bot einen echten
 * Veranstalter mitten im Event aussperren.
 */
const registerThrottle = createThrottleBucket();
export const isRegisterThrottled = registerThrottle.isThrottled;
export const noteRegisterAttempt = registerThrottle.note;

/**
 * Dritte Bremse für alles, was eine Mail verschickt (Passwort vergessen,
 * Bestätigung erneut, Adresswechsel) — gegen Mail-Bombing über unser Konto
 * bei Resend. Zählt je Absender-IP.
 */
const mailThrottle = createThrottleBucket();
export const isMailThrottled = mailThrottle.isThrottled;
export const noteMailSent = mailThrottle.note;

/**
 * Vierte Bremse, je Empfängeradresse: 3 Mails pro Stunde. Ergänzt die
 * IP-Bremse — die hält einen Absender auf, der viele Adressen beschießt;
 * diese einen Angreifer, der eine Adresse über viele IPs flutet.
 * Kein Gesamtdeckel: den trägt schon die IP-Bremse.
 */
const recipientThrottle = createThrottleBucket({
    windowMs: 60 * 60 * 1000,
    max: 3,
    maxTotal: Infinity,
});

/** Zählt die Mail gleich mit, wenn sie raus darf. Adresse klein geschrieben,
 *  sonst wäre `A@x.de` ein frischer Zähler. */
export const allowMailTo = (email: string, now = Date.now()): boolean => {
    const key = email.toLowerCase();
    if (recipientThrottle.isThrottled(key, now)) return false;
    recipientThrottle.note(key, now);
    return true;
};
