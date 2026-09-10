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
    /** Geteilte Passphrase für alle schreibenden Routen (PROJEKT.md §9). */
    adminPin: required('ADMIN_PIN'),
    /** Gemountetes Verzeichnis für Avatare und Banner (§8). */
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    /** Gültigkeit eines Admin-Tokens. Ein Event dauert einen Abend. */
    tokenTtlMs: 12 * 60 * 60 * 1000,
} as const;
