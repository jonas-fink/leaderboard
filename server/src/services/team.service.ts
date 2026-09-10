import { Team, Score } from '#models';
import { asApi, notFound } from '#utils';
import type {
    Team as TeamType,
    CreateTeamInput,
    UpdateTeamInput,
} from '#types';

/** Deterministischer Sprite-Seed, solange kein Banner hochgeladen ist. */
const seedFrom = (name: string) => name.trim().toLowerCase();

export const listTeams = async (tournamentId: string): Promise<TeamType[]> => {
    const docs = await Team.find({ tournamentId }).sort({ name: 1 });
    return docs.map((doc) => asApi<TeamType>(doc));
};

export const getTeam = async (id: string): Promise<TeamType> => {
    const doc = await Team.findById(id);
    if (!doc) throw notFound('Team');
    return asApi<TeamType>(doc);
};

export const createTeam = async (input: CreateTeamInput): Promise<TeamType> => {
    const doc = await Team.create({
        ...input,
        avatarSeed: seedFrom(input.name),
    });
    return asApi<TeamType>(doc);
};

/**
 * Der Seed wird bei einer Umbenennung bewusst nicht neu abgeleitet: das Team
 * behält sein Sprite, statt mitten im Turnier ein anderes Gesicht zu bekommen.
 */
export const updateTeam = async (
    id: string,
    patch: UpdateTeamInput,
): Promise<TeamType> => {
    const doc = await Team.findByIdAndUpdate(id, patch, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!doc) throw notFound('Team');
    return asApi<TeamType>(doc);
};

export const deleteTeam = async (id: string): Promise<void> => {
    const doc = await Team.findByIdAndDelete(id);
    if (!doc) throw notFound('Team');
    await Score.deleteMany({ teamId: id });
};
