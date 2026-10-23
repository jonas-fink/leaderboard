import { config } from '#config';
import { connectDb, disconnectDb } from '#db';
import { User } from '#models';
import { accountFootprint, deleteAccount } from '#services/account.service';

/**
 * Entfernt ein Konto restlos: seine Turniere (samt Teams, Disziplinen,
 * Wertungen und Matches — dieselbe Kaskade wie `tournament:delete`), seine
 * Spieler und `uploads/<userId>/` (AC-6.3).
 *
 * Ohne `--yes` nur ein Trockenlauf: nennt, was gelöscht würde, löscht aber
 * nichts (AC-6.4) — gebaut nach `delete-tournament.ts`.
 *
 *   npm run user:delete -- <email> --yes
 */
const email = process.argv[2];
const confirmed = process.argv.includes('--yes');

if (!email || email.startsWith('--')) {
    console.error('Aufruf: npm run user:delete -- <email> --yes');
    process.exit(1);
}

await connectDb();

const user = await User.findOne({ email: email.toLowerCase() });
if (!user) {
    console.error(`Kein Konto mit der E-Mail "${email}" gefunden.`);
    await disconnectDb();
    process.exit(1);
}

const { tournaments, playerCount, uploadDir } = await accountFootprint(user.id);

if (!confirmed) {
    console.error(
        `Würde das Konto "${email}" (${user.slug}) aus "${config.dbName}" auf\n` +
            `${new URL(config.mongoUri).host} löschen:\n` +
            `  ${tournaments.length} Turnier(e) samt Teams, Disziplinen, Wertungen und Matches\n` +
            `  ${playerCount} Spieler\n` +
            `  ${uploadDir}\n` +
            `Wenn das gewollt ist: npm run user:delete -- ${email} --yes`,
    );
    await disconnectDb();
    process.exit(1);
}

await deleteAccount(user.id);

console.log(
    `Konto "${email}" (${user.slug}) gelöscht: ${tournaments.length} Turnier(e), ` +
        `${playerCount} Spieler, ${uploadDir}.`,
);
await disconnectDb();
