import { Tournament, Team, Game, Score, Match } from '#models';
import { asApi, notFound } from '#utils';
import { getPlayer } from '#services/player.service';
import { getTeam } from '#services/team.service';
import type {
    Tournament as TournamentType,
    CreateTournamentInput,
    UpdateTournamentInput,
} from '#types';

/** Neueste zuerst — das Control-Panel zeigt das laufende Event oben. Nur die
 *  eigenen Turniere des Kontos (AC-3.1). */
export const listTournaments = async (
    ownerId: string,
): Promise<TournamentType[]> => {
    const docs = await Tournament.find({ ownerId }).sort({ startsAt: -1 });
    return docs.map((doc) => asApi<TournamentType>(doc));
};

/**
 * Ungeprüfter Zugriff über die ID — für interne Aufrufe, deren Besitz bereits
 * feststeht (etwa `board.service.ts`, nachdem `assertOwned` oder ein
 * öffentlicher Board-Slug-Lookup den Zugriff schon geklärt hat).
 */
export const getTournament = async (id: string): Promise<TournamentType> => {
    const doc = await Tournament.findById(id);
    if (!doc) throw notFound('Turnier');
    return asApi<TournamentType>(doc);
};

/** Slug ist nur je Konto eindeutig (AC-3.4) — deshalb hier immer mit
 *  `ownerId` zusammen abgefragt. */
export const getTournamentBySlug = async (
    slug: string,
    ownerId: string,
): Promise<TournamentType> => {
    const doc = await Tournament.findOne({ slug, ownerId });
    if (!doc) throw notFound(`Turnier "${slug}"`);
    return asApi<TournamentType>(doc);
};

export const createTournament = async (
    input: CreateTournamentInput,
    ownerId: string,
): Promise<TournamentType> => {
    const doc = await Tournament.create({ ...input, ownerId });
    return asApi<TournamentType>(doc);
};

export const updateTournament = async (
    id: string,
    patch: UpdateTournamentInput,
): Promise<TournamentType> => {
    const doc = await Tournament.findByIdAndUpdate(id, patch, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!doc) throw notFound('Turnier');
    return asApi<TournamentType>(doc);
};

/**
 * Die einzige Stelle, an der Besitz geprüft wird (architecture.md). Wirft
 * 404, nicht 403 — ein fremdes Turnier soll nicht einmal seine Existenz
 * bestätigen (AD-4, AC-3.3). Jeder Team-, Game-, Score- und Match-Controller
 * ruft sie auf, bevor er liest oder schreibt.
 */
export const assertOwned = async (
    tournamentId: string,
    ownerId: string,
): Promise<TournamentType> => {
    const doc = await Tournament.findOne({ _id: tournamentId, ownerId });
    if (!doc) throw notFound('Turnier');
    return asApi<TournamentType>(doc);
};

/**
 * Prüft, dass eine im Request-Body genannte `playerId` oder `teamId` dem
 * aufrufenden Konto gehört, bevor sie an ein eigenes Turnier gehängt wird
 * (F-1 aus `qa-report.md`). `Player` trägt `ownerId` direkt, ein `Team` erbt
 * den Besitz über sein Turnier — deshalb läuft dieser Zweig wieder über
 * `assertOwned`. Wirft 404 wie `assertOwned`, nicht 403 (AD-4).
 */
export const assertEntrantOwned = async (
    entrant: { playerId?: string; teamId?: string },
    ownerId: string,
): Promise<void> => {
    if (entrant.playerId) {
        await getPlayer(entrant.playerId, ownerId);
    }
    if (entrant.teamId) {
        const team = await getTeam(entrant.teamId);
        await assertOwned(team.tournamentId, ownerId);
    }
};

/**
 * Löscht das Turnier samt allem, was daran hängt. Scores und Matches tragen
 * die tournamentId denormalisiert, deshalb reicht ein Aufräumen ohne Join
 * (AC-3.7).
 *
 * Über die API nur nach `assertOwned` erreichbar (`DELETE
 * /api/tournaments/:id`); der Aufruf selbst prüft keinen Besitz mehr nach —
 * das ist Aufgabe des Controllers.
 */
export const deleteTournament = async (id: string): Promise<void> => {
    const doc = await Tournament.findByIdAndDelete(id);
    if (!doc) throw notFound('Turnier');
    await Promise.all([
        Team.deleteMany({ tournamentId: id }),
        Game.deleteMany({ tournamentId: id }),
        Score.deleteMany({ tournamentId: id }),
        Match.deleteMany({ tournamentId: id }),
    ]);
};
