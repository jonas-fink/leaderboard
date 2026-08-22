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
} as const;
