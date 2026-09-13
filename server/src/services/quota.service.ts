import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Tournament, Team, Game, Player } from '#models';
import { config } from '#config';
import { httpError } from '#utils';

/**
 * Schadensgrenze je Konto (US-5, AD-6): das Risiko der offenen Registrierung
 * ist nicht das Konto selbst, sondern dass es unbegrenzt Turniere anlegen und
 * Bilder ins Named Volume schieben kann. Eine Zählung vor dem Anlegen
 * begrenzt den Schaden unabhängig davon, wie viele Konten entstehen.
 */
const LIMITS = {
    tournamentsPerUser: 10,
    playersPerUser: 200,
    teamsPerTournament: 32,
    gamesPerTournament: 20,
    uploadsPerUser: 100, // × 2 MB Obergrenze je Datei = 200 MB
} as const;

type Kind = keyof typeof LIMITS;

const MESSAGES: Record<Kind, string> = {
    tournamentsPerUser: 'Obergrenze von 10 Turnieren je Konto erreicht',
    playersPerUser: 'Obergrenze von 200 Spielern je Konto erreicht',
    teamsPerTournament: 'Obergrenze von 32 Teams je Turnier erreicht',
    gamesPerTournament: 'Obergrenze von 20 Disziplinen je Turnier erreicht',
    uploadsPerUser: 'Obergrenze von 100 Uploads je Konto erreicht',
};

/**
 * Uploads zählen über `readdir` statt über ein Zählerfeld am User (AD-9) —
 * sonst müsste jede Löschung einer Datei den Zähler mitführen. Ohne
 * Verzeichnis (noch kein Upload) gilt die Zählung als 0 (E-11).
 */
const countUploads = async (userId: string): Promise<number> => {
    try {
        const files = await readdir(join(config.uploadDir, userId));
        return files.length;
    } catch {
        return 0;
    }
};

const countFor = (kind: Kind, scopeId: string): Promise<number> => {
    switch (kind) {
        case 'tournamentsPerUser':
            return Tournament.countDocuments({ ownerId: scopeId });
        case 'playersPerUser':
            return Player.countDocuments({ ownerId: scopeId });
        case 'teamsPerTournament':
            return Team.countDocuments({ tournamentId: scopeId });
        case 'gamesPerTournament':
            return Game.countDocuments({ tournamentId: scopeId });
        case 'uploadsPerUser':
            return countUploads(scopeId);
    }
};

/**
 * Wirft `409` mit deutscher Meldung, sobald `scopeId` (Konto- oder
 * Turnier-ID, je nach `kind`) die Obergrenze bereits erreicht hat. Aufgerufen
 * als eine der ersten Zeilen in jedem Create-Controller (Turnier, Spieler,
 * Team, Disziplin, Upload) — vor dem eigentlichen Anlegen.
 */
export const assertQuota = async (
    kind: Kind,
    scopeId: string,
): Promise<void> => {
    const count = await countFor(kind, scopeId);
    if (count >= LIMITS[kind]) {
        throw httpError(409, MESSAGES[kind]);
    }
};
