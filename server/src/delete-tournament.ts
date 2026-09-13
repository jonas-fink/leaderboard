import { config } from '#config';
import { connectDb, disconnectDb } from '#db';
import { User } from '#models';
import {
    getTournamentBySlug,
    deleteTournament,
} from '#services/tournament.service';
import { notFound } from '#utils';

/**
 * Löscht ein Turnier samt Teams, Games, Scores und Matches.
 *
 * Der Slug ist seit specs/002-benutzerkonten nur je Konto eindeutig
 * (AC-3.4) — deshalb braucht das Skript die E-Mail des Kontos, um das
 * richtige Turnier zu finden.
 *
 *   npm run tournament:delete -- <email> <slug> --yes
 */
const email = process.argv[2];
const slug = process.argv[3];
const confirmed = process.argv.includes('--yes');

if (!email || !slug || email.startsWith('--') || slug.startsWith('--')) {
    console.error(
        'Aufruf: npm run tournament:delete -- <email> <slug> --yes',
    );
    process.exit(1);
}

await connectDb();

const owner = await User.findOne({ email: email.toLowerCase() });
if (!owner) {
    await disconnectDb();
    throw notFound(`Konto "${email}"`);
}

const tournament = await getTournamentBySlug(slug, owner.id);

if (!confirmed) {
    console.error(
        `Würde "${tournament.title}" (${slug}) von ${email} samt Teams,\n` +
            `Disziplinen, Wertungen und Matches aus "${config.dbName}" auf\n` +
            `${new URL(config.mongoUri).host} löschen.\n` +
            `Wenn das gewollt ist: npm run tournament:delete -- ${email} ${slug} --yes`,
    );
    await disconnectDb();
    process.exit(1);
}

await deleteTournament(tournament.id);
console.log(`"${tournament.title}" (${email}) gelöscht.`);
await disconnectDb();
