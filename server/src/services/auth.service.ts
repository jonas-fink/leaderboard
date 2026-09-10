import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '#config';

/**
 * Zugriffsschutz (PROJEKT.md §9): signiertes Admin-Token ohne Bibliothek: `<ablauf>.<hmac>`, base64url.
 *
 * Der Schlüssel ist der `ADMIN_PIN` selbst — ein zweites Geheimnis brächte
 * nichts, weil wer den PIN kennt ohnehin schreiben darf. Nebeneffekt: ein
 * geänderter PIN entwertet alle ausgegebenen Tokens sofort.
 *
 * ponytail: kein JWT. Es gibt genau einen Claim (das Ablaufdatum) und einen
 * Aussteller; ein Format mit Header, Algorithmenwahl und Bibliothek dahinter
 * wäre mehr Angriffsfläche als Nutzen.
 */
const sign = (payload: string): string =>
    createHmac('sha256', config.adminPin).update(payload).digest('base64url');

/** Zeitkonstant, damit der Vergleich nichts über das Geheimnis verrät. */
const equals = (a: string, b: string): boolean => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};

export const checkPin = (pin: string): boolean => equals(pin, config.adminPin);

export const issueToken = (now = Date.now()): string => {
    const expiresAt = String(now + config.tokenTtlMs);
    return `${Buffer.from(expiresAt).toString('base64url')}.${sign(expiresAt)}`;
};

export const isValidToken = (token: string, now = Date.now()): boolean => {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return false;

    const expiresAt = Buffer.from(encoded, 'base64url').toString();
    // Erst die Signatur, dann der Inhalt: ein abgelaufenes Token soll nicht
    // verraten, dass es wenigstens echt war.
    if (!equals(signature, sign(expiresAt))) return false;
    return Number(expiresAt) > now;
};

// ---------------------------------------------------------------------------
// Bremse gegen Durchprobieren
// ---------------------------------------------------------------------------

/** Zeitfenster, nach dem die Zähler eines Absenders verfallen. */
const WINDOW_MS = 10 * 60 * 1000;
/**
 * Fehlversuche je Absender im Fenster.
 *
 * Bewusst großzügig: der PIN ist ein Zufallswert, gegen den auch 20 Versuche
 * je 10 Minuten nichts ausrichten. Eng zu zählen brächte keine Sicherheit,
 * würde aber während der Sperre auch den richtigen PIN abweisen — ein
 * Fremder könnte den Veranstalter mitten im Event aussperren.
 */
const MAX_PER_IP = 20;
/** Deckel über alle Absender zusammen, gegen verteiltes Durchprobieren.
 *  Aus demselben Grund hoch angesetzt. */
const MAX_TOTAL = 200;

type Window = { count: number; resetAt: number };

/**
 * Fehlversuche im Prozessspeicher.
 *
 * ponytail: keine Bibliothek und kein Redis. Es gibt einen Serverprozess,
 * und ein Neustart, der die Zähler verliert, ist kein Angriffsweg — dafür
 * müsste der Angreifer den Server neu starten können. Persistenz erst, wenn
 * mehrere Instanzen laufen.
 */
const attempts = new Map<string, Window>();
const TOTAL = '*';

const windowFor = (key: string, now: number): Window => {
    const existing = attempts.get(key);
    if (existing && existing.resetAt > now) return existing;

    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(key, fresh);
    return fresh;
};

/** Ist der Absender oder der Server insgesamt gerade gesperrt? */
export const isThrottled = (ip: string, now = Date.now()): boolean =>
    windowFor(ip, now).count >= MAX_PER_IP ||
    windowFor(TOTAL, now).count >= MAX_TOTAL;

export const noteFailedLogin = (ip: string, now = Date.now()): void => {
    // Abgelaufene Einträge räumen, damit die Map nicht mit jeder fremden
    // Adresse weiterwächst.
    for (const [key, window] of attempts) {
        if (window.resetAt <= now) attempts.delete(key);
    }
    windowFor(ip, now).count++;
    windowFor(TOTAL, now).count++;
};

/** Nach erfolgreicher Anmeldung ist der Absender wieder unbescholten. */
export const clearFailedLogins = (ip: string): void => {
    attempts.delete(ip);
};
