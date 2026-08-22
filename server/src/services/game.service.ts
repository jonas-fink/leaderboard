import { Game, Score } from '#models';
import { asApi, notFound } from '#utils';
import type {
    Game as GameType,
    CreateGameInput,
    UpdateGameInput,
} from '#types';

export const listGames = async (): Promise<GameType[]> => {
    const docs = await Game.find().sort({ title: 1 });
    return docs.map((doc) => asApi<GameType>(doc));
};

export const getGameBySlug = async (slug: string): Promise<GameType> => {
    const doc = await Game.findOne({ slug });
    if (!doc) throw notFound(`Game "${slug}"`);
    return asApi<GameType>(doc);
};

export const createGame = async (input: CreateGameInput): Promise<GameType> => {
    const doc = await Game.create(input);
    return asApi<GameType>(doc);
};

export const updateGame = async (
    id: string,
    patch: UpdateGameInput,
): Promise<GameType> => {
    const doc = await Game.findByIdAndUpdate(id, patch, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!doc) throw notFound('Game');
    return asApi<GameType>(doc);
};

export const deleteGame = async (id: string): Promise<void> => {
    const doc = await Game.findByIdAndDelete(id);
    if (!doc) throw notFound('Game');
    await Score.deleteMany({ gameId: id });
};
