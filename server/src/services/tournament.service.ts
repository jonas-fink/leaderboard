import { Tournament, Team, Game, Score } from '#models';
import { asApi, notFound } from '#utils';
import type {
    Tournament as TournamentType,
    CreateTournamentInput,
    UpdateTournamentInput,
} from '#types';

/** Neueste zuerst — das Control-Panel zeigt das laufende Event oben. */
export const listTournaments = async (): Promise<TournamentType[]> => {
    const docs = await Tournament.find().sort({ startsAt: -1 });
    return docs.map((doc) => asApi<TournamentType>(doc));
};

export const getTournament = async (id: string): Promise<TournamentType> => {
    const doc = await Tournament.findById(id);
    if (!doc) throw notFound('Turnier');
    return asApi<TournamentType>(doc);
};

export const getTournamentBySlug = async (
    slug: string,
): Promise<TournamentType> => {
    const doc = await Tournament.findOne({ slug });
    if (!doc) throw notFound(`Turnier "${slug}"`);
    return asApi<TournamentType>(doc);
};

export const createTournament = async (
    input: CreateTournamentInput,
): Promise<TournamentType> => {
    const doc = await Tournament.create(input);
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
 * Löscht das Turnier samt allem, was daran hängt. Scores tragen die
 * tournamentId denormalisiert, deshalb reicht ein Aufräumen ohne Join.
 *
 * Hängt bewusst an keiner Route: über den öffentlich erreichbaren Funnel
 * wäre ein durchprobierter PIN sonst das Ende des ganzen Events. Aufgerufen
 * wird das von Hand — aus einem Skript auf dem Server.
 */
export const deleteTournament = async (id: string): Promise<void> => {
    const doc = await Tournament.findByIdAndDelete(id);
    if (!doc) throw notFound('Turnier');
    await Promise.all([
        Team.deleteMany({ tournamentId: id }),
        Game.deleteMany({ tournamentId: id }),
        Score.deleteMany({ tournamentId: id }),
    ]);
};
