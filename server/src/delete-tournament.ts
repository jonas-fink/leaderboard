import { config } from '#config';
import { connectDb, disconnectDb } from '#db';
import {
    getTournamentBySlug,
    deleteTournament,
} from '#services/tournament.service';

/**
 * Löscht ein Turnier samt Teams, Games und Scores.
 *
 * Diese Kaskade hängt bewusst an keiner Route: die Anwendung steht öffentlich
 * hinter dem Funnel, und ein erratener PIN wäre damit nicht ein falscher
 * Punktestand, sondern das Ende des Events (PROJEKT.md §9). Wer löschen will,
 * hat Zugriff auf den Server — und tippt es dort.
 *
 *   npm run tournament:delete -- <slug> --yes
 */
const slug = process.argv[2];
const confirmed = process.argv.includes('--yes');

if (!slug || slug.startsWith('--')) {
    console.error('Aufruf: npm run tournament:delete -- <slug> --yes');
    process.exit(1);
}

await connectDb();
const tournament = await getTournamentBySlug(slug);

if (!confirmed) {
    console.error(
        `Würde "${tournament.title}" (${slug}) samt Teams, Disziplinen und\n` +
            `Wertungen aus "${config.dbName}" auf ${new URL(config.mongoUri).host} löschen.\n` +
            `Wenn das gewollt ist: npm run tournament:delete -- ${slug} --yes`,
    );
    await disconnectDb();
    process.exit(1);
}

await deleteTournament(tournament.id);
console.log(`"${tournament.title}" gelöscht.`);
await disconnectDb();
