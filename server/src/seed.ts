import { config } from '#config';
import { connectDb, disconnectDb } from '#db';
import { Tournament, Team, Game, Player, Score, Match } from '#models';

/**
 * Legt ein Beispielturnier an. Die Datenbank enthält ausschließlich Testdaten,
 * deshalb gibt es keine Migration — alle fünf Collections werden geleert und
 * neu befüllt (PROJEKT.md §12).
 *
 * Das Beispiel läuft im `player`-Modus, weil die Score-Eingabe derzeit nur
 * Spieler kennt. Ein Team-Beispiel folgt, sobald /control Teamwertungen
 * eintragen kann.
 */

/**
 * Der Riegel ist kein Zeremoniell: MONGODB_URI zeigt möglicherweise auf einen
 * gehosteten Cluster, und ein versehentliches `npm run seed` wäre dort nicht
 * rückholbar.
 */
const confirmed = process.argv.includes('--yes');
const target = new URL(config.mongoUri).host;

if (!confirmed) {
    console.error(
        `Seed würde ALLE Collections in "${config.dbName}" auf ${target} leeren.\n` +
            'Wenn das gewollt ist: npm run seed -- --yes',
    );
    process.exit(1);
}

const startsAt = new Date('2026-10-02T18:00:00.000Z');

const wipe = () =>
    Promise.all([
        Tournament.deleteMany({}),
        Team.deleteMany({}),
        Game.deleteMany({}),
        Player.deleteMany({}),
        Score.deleteMany({}),
        Match.deleteMany({}),
    ]);

const seed = async () => {
    await connectDb();
    console.log(`Seed läuft gegen "${config.dbName}" auf ${target}.`);
    await wipe();

    const tournament = await Tournament.create({
        slug: 'future-space-night',
        title: 'Future Space Gaming Night',
        description: 'Beispielturnier zum Entwickeln.',
        mode: 'player',
        status: 'live',
        startsAt,
    });
    const tournamentId = tournament._id;

    const players = await Player.insertMany(
        ['nova', 'byte', 'pixel', 'glitch', 'echo', 'vector'].map(
            (username) => ({ username, avatarSeed: username }),
        ),
    );
    const id = (username: string) =>
        players.find((p) => p.username === username)!._id;

    const games = await Game.insertMany([
        {
            tournamentId,
            slug: 'mario-kart',
            title: 'Mario Kart',
            genre: 'racing',
            primaryMetric: {
                key: 'lap',
                label: 'Rundenzeit',
                sortOrder: 'ASC',
                formatter: 'time_ms',
            },
            pinned: true,
            boardOrder: 0,
            status: 'finished',
        },
        {
            // Versus-Disziplin (architecture.md 001-match-wertung): Matches
            // statt Scores, primaryMetric beschreibt den Wert je Seite.
            tournamentId,
            slug: 'rocket-league',
            title: 'Rocket League',
            genre: 'sports',
            scoring: 'versus',
            primaryMetric: {
                key: 'goals',
                label: 'Tore',
                sortOrder: 'DESC',
                formatter: 'integer',
                unit: 'Tore',
            },
            pinned: true,
            boardOrder: 1,
            status: 'running',
        },
        {
            // Doppelt gewichtet — damit der Faktor aus §4.2 echte Daten hat.
            tournamentId,
            slug: 'finale',
            title: 'Finale: Tetris',
            genre: 'arcade',
            primaryMetric: {
                key: 'points',
                label: 'Punkte',
                sortOrder: 'DESC',
                formatter: 'integer',
            },
            weight: 2,
            pinned: true,
            boardOrder: 2,
            status: 'upcoming',
        },
    ]);
    const gameId = (slug: string) => games.find((g) => g.slug === slug)!._id;

    // Mario Kart enthält absichtlich einen Gleichstand auf Rang 2, damit die
    // Mittelung der Platzierungspunkte gleich sichtbares Futter hat.
    const results: [string, string, number][] = [
        ['mario-kart', 'nova', 71_350],
        ['mario-kart', 'byte', 74_120],
        ['mario-kart', 'pixel', 74_120],
        ['mario-kart', 'glitch', 79_640],
        ['mario-kart', 'echo', 83_010],
    ];

    await Score.insertMany(
        results.map(([slug, username, primaryValue]) => ({
            tournamentId,
            gameId: gameId(slug),
            entrantType: 'player',
            playerId: id(username),
            primaryValue,
            recordedAt: startsAt,
        })),
    );

    // Rocket League ist die Versus-Disziplin: sechs Matches, damit die
    // Tabelle (table.ts) ohne Handarbeit im Browser sichtbar ist — inklusive
    // zweier Unentschieden und eines Gleichstands bei Punkten und Differenz
    // (glitch vs. pixel), der erst über die erzielten Tore aufgelöst wird.
    const matches: [string, number, string, number][] = [
        ['nova', 3, 'byte', 1],
        ['pixel', 2, 'glitch', 2],
        ['echo', 4, 'vector', 0],
        ['nova', 1, 'pixel', 1],
        ['byte', 5, 'vector', 2],
        ['glitch', 3, 'echo', 3],
    ];

    await Match.insertMany(
        matches.map(([homeUsername, homeValue, awayUsername, awayValue]) => ({
            tournamentId,
            gameId: gameId('rocket-league'),
            entrantType: 'player',
            sides: [
                { playerId: id(homeUsername), value: homeValue },
                { playerId: id(awayUsername), value: awayValue },
            ],
            playedAt: startsAt,
        })),
    );

    console.log(
        `Fertig: 1 Turnier, ${players.length} Spieler, ${games.length} Games, ` +
            `${results.length} Scores, ${matches.length} Matches.`,
    );
    await disconnectDb();
};

await seed();
