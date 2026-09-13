const required = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`${key} fehlt — bitte in server/.env eintragen.`);
    }
    return value;
};

export const config = {
    port: Number(process.env.PORT ?? 4000),
    mongoUri: required('MONGODB_URI'),
    dbName: process.env.MONGODB_DB ?? 'leaderboard',
    /** Schlüssel für die HMAC-Signatur des Sitzungs-Tokens (specs/002). */
    sessionSecret: required('SESSION_SECRET'),
    /** Steuert u.a. das `Secure`-Flag des Sitzungs-Cookies (E-5). */
    nodeEnv: process.env.NODE_ENV ?? 'development',
    /** Gemountetes Verzeichnis für Avatare und Banner (§8). */
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    /** Gebautes Frontend. Nur im Container gesetzt; lokal macht das Vite. */
    clientDir: process.env.CLIENT_DIR,
    /** Gültigkeit einer Sitzung. Ein Event dauert einen Abend. */
    tokenTtlMs: 12 * 60 * 60 * 1000,
} as const;
