import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '#config';
import { User, Tournament, Player } from '#models';
import { deleteTournament } from '#services/tournament.service';

/** Was zu einem Konto gehört — für den Trockenlauf der CLI und die Löschung. */
export const accountFootprint = async (userId: string) => ({
    tournaments: await Tournament.find({ ownerId: userId }),
    playerCount: await Player.countDocuments({ ownerId: userId }),
    uploadDir: join(config.uploadDir, userId),
});

/**
 * Entfernt ein Konto restlos (AC-6.3): seine Turniere samt Teams,
 * Disziplinen, Wertungen und Matches (dieselbe Kaskade wie
 * `tournament:delete`), seine Spieler und `uploads/<userId>/`. Das Konto
 * selbst zuletzt — bricht vorher etwas ab, bleibt es bestehen und der
 * Nutzer kann es erneut versuchen, statt Waisen zu hinterlassen.
 *
 * Geteilt von `DELETE /api/auth/me` und `npm run user:delete`.
 */
export const deleteAccount = async (userId: string) => {
    const footprint = await accountFootprint(userId);
    for (const tournament of footprint.tournaments) {
        await deleteTournament(tournament.id);
    }
    await Player.deleteMany({ ownerId: userId });
    await rm(footprint.uploadDir, { recursive: true, force: true });
    await User.deleteOne({ _id: userId });
    return footprint;
};
