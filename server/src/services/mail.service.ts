import { config } from '#config';

type Mail = { subject: string; text: string; html: string };

/**
 * Versand über die Resend-REST-API, ein `fetch` statt SDK. Jede Mail geht
 * als HTML und als Klartext raus — Clients ohne HTML (oder Spamfilter, die
 * reine HTML-Mails abwerten) bekommen dieselben Worte.
 */
export const sendMail = async (
    to: string,
    { subject, text, html }: Mail,
): Promise<void> => {
    // Ohne Schlüssel (lokal, Tests) in den Log — der Link ist dort klickbar.
    if (!config.resendApiKey) {
        console.log(`[mail] an ${to}: ${subject}\n${text}`);
        return;
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: config.mailFrom,
            to,
            subject,
            text,
            html,
        }),
    });
    if (!res.ok) {
        throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
};

/**
 * Für Mails, deren Ausbleiben die eigentliche Aktion nicht ungeschehen
 * machen darf (Hinweise, Bestätigungslink nach der Registrierung): Fehler
 * nur loggen, die Antwort an den Nutzer nicht scheitern lassen.
 */
export const sendMailQuietly = (to: string, mail: Mail) =>
    void sendMail(to, mail).catch((error: unknown) =>
        console.error('[mail] Versand fehlgeschlagen', error),
    );

// ---------------------------------------------------------------------------
// Vorlage
//
// Eine Funktion baut aus Überschrift, Absätzen und optionalem Knopf beide
// Fassungen. HTML nach Mail-Regeln: Tabellen-Layout und Inline-Styles, weil
// Outlook & Co. weder Flexbox noch <style>-Blöcke zuverlässig können. Farben
// aus src/index.css (16-Bit-Neon).
// ---------------------------------------------------------------------------

const C = {
    bg: '#0b0620',
    surface: '#150b33',
    line: '#2f1e6b',
    ink: '#f2ecff',
    soft: '#b9a8e8',
    mute: '#7e6db8',
    magenta: '#ff3fa4',
};

/** Alles Eingesetzte wird escaped — eine E-Mail-Adresse ist Nutzereingabe. */
const escapeHtml = (value: string): string =>
    value.replace(
        /[&<>"']/g,
        (ch) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[ch]!,
    );

type Template = {
    subject: string;
    heading: string;
    paragraphs: string[];
    action?: { label: string; url: string };
    /** Kleingedrucktes unter dem Knopf: "nicht angefordert? …" */
    note?: string;
};

export const compose = ({
    subject,
    heading,
    paragraphs,
    action,
    note,
}: Template): Mail => {
    const text = [
        'Hallo,',
        ...paragraphs,
        ...(action ? [`${action.label}: ${action.url}`] : []),
        ...(note ? [note] : []),
        '— Pixelboard',
    ].join('\n\n');

    const p = (content: string, color = C.soft, size = 15) =>
        `<p style="margin:0 0 16px;font-size:${size}px;line-height:1.6;color:${color};">${content}</p>`;

    const button = action
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:${C.magenta};box-shadow:4px 4px 0 rgba(0,0,0,0.45);">
<a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;letter-spacing:0.06em;color:${C.bg};text-decoration:none;">${escapeHtml(action.label)}</a>
</td></tr></table>
${p(`Knopf funktioniert nicht? Diese Adresse in den Browser kopieren:<br><a href="${escapeHtml(action.url)}" style="color:${C.soft};word-break:break-all;">${escapeHtml(action.url)}</a>`, C.mute, 13)}`
        : '';

    const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.surface};border:2px solid ${C.line};box-shadow:6px 6px 0 rgba(0,0,0,0.45);">
<tr><td style="padding:18px 28px;border-bottom:2px solid ${C.line};font-family:'Courier New',monospace;font-size:14px;font-weight:700;letter-spacing:0.18em;color:${C.magenta};">PIXELBOARD</td></tr>
<tr><td style="padding:28px;">
<h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;color:${C.ink};">${escapeHtml(heading)}</h1>
${p('Hallo,')}
${paragraphs.map((text) => p(escapeHtml(text))).join('\n')}
${button}
${note ? p(escapeHtml(note), C.mute, 13) : ''}
</td></tr>
</table>
<p style="margin:20px 0 0;font-size:12px;color:${C.mute};">Pixelboard · <a href="${escapeHtml(config.appUrl)}" style="color:${C.mute};">${escapeHtml(new URL(config.appUrl).host)}</a></p>
</td></tr></table>
</body></html>`;

    return { subject, text, html };
};

// ---------------------------------------------------------------------------
// Die einzelnen Mails
// ---------------------------------------------------------------------------

const link = (path: string, params: Record<string, string>) =>
    `${config.appUrl}${path}?${new URLSearchParams(params)}`;

export const verifyMail = (token: string) =>
    compose({
        subject: 'Bitte bestätige deine E-Mail-Adresse',
        heading: 'Willkommen bei Pixelboard',
        paragraphs: [
            'bitte bestätige noch kurz, dass diese Adresse dir gehört. Der Link gilt 7 Tage.',
        ],
        action: {
            label: 'Adresse bestätigen',
            url: link('/confirm', { token, type: 'verify' }),
        },
        note: 'Du hast dich nicht registriert? Dann ignoriere diese Mail.',
    });

export const resetMail = (token: string) =>
    compose({
        subject: 'Passwort zurücksetzen',
        heading: 'Neues Passwort festlegen',
        paragraphs: [
            'über den Knopf setzt du ein neues Passwort. Der Link gilt eine Stunde und funktioniert nur einmal.',
        ],
        action: {
            label: 'Passwort zurücksetzen',
            url: link('/reset-password', { token }),
        },
        note: 'Du hast das nicht angefordert? Dann ignoriere diese Mail, dein Passwort bleibt unverändert.',
    });

export const passwordChangedMail = () =>
    compose({
        subject: 'Dein Passwort wurde geändert',
        heading: 'Passwort geändert',
        paragraphs: [
            'das Passwort deines Kontos wurde soeben geändert. Alle anderen Sitzungen sind abgemeldet.',
            'Warst du das nicht? Dann setze dein Passwort sofort zurück.',
        ],
        action: {
            label: 'Passwort zurücksetzen',
            url: `${config.appUrl}/forgot-password`,
        },
    });

export const emailChangeMail = (token: string) =>
    compose({
        subject: 'Neue E-Mail-Adresse bestätigen',
        heading: 'Neue Adresse bestätigen',
        paragraphs: [
            'bestätige, dass diese Adresse künftig zu deinem Pixelboard-Konto gehört. Erst danach wird umgestellt. Der Link gilt eine Stunde.',
        ],
        action: {
            label: 'Adresse bestätigen',
            url: link('/confirm', { token, type: 'email' }),
        },
        note: 'Du hast das nicht angefordert? Dann ignoriere diese Mail, es ändert sich nichts.',
    });

export const emailChangedMail = (newEmail: string) =>
    compose({
        subject: 'Deine E-Mail-Adresse wurde geändert',
        heading: 'E-Mail-Adresse geändert',
        paragraphs: [
            `dein Konto ist ab sofort mit ${newEmail} verknüpft. Anmeldung und Mails laufen über diese Adresse.`,
            'Warst du das nicht? Antworte auf diese Mail, dann kümmern wir uns darum.',
        ],
    });

export const accountDeletedMail = () =>
    compose({
        subject: 'Dein Konto wurde gelöscht',
        heading: 'Konto gelöscht',
        paragraphs: [
            'dein Pixelboard-Konto ist gelöscht, samt aller Turniere, Teams, Disziplinen, Wertungen, Spieler und hochgeladenen Bilder.',
            'Schade, dass du gehst. Du kannst jederzeit ein neues Konto anlegen.',
        ],
        note: 'Warst du das nicht? Antworte auf diese Mail.',
    });
