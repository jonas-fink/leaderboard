import { Player, Score } from '#models';
import { asApi, notFound } from '#utils';
import type {
    Player as PlayerType,
    CreatePlayerInput,
    UpdatePlayerInput,
} from '#types';

export const listPlayers = async (): Promise<PlayerType[]> => {
    const docs = await Player.find().sort({ username: 1 });
    return docs.map((doc) => asApi<PlayerType>(doc));
};

export const getPlayer = async (id: string): Promise<PlayerType> => {
    const doc = await Player.findById(id);
    if (!doc) throw notFound('Spieler');
    return asApi<PlayerType>(doc);
};

/** Alle Spieler als Map — die Leaderboard-Aggregation schlägt darin nach. */
export const getPlayerMap = async (): Promise<Map<string, PlayerType>> => {
    const players = await listPlayers();
    return new Map(players.map((player) => [player.id, player]));
};

export const createPlayer = async (
    input: CreatePlayerInput,
): Promise<PlayerType> => {
    // Wie beim Team: der Seed fällt aus dem Namen und wird bei einer
    // Umbenennung nicht neu abgeleitet — das Sprite bleibt dem Spieler.
    const doc = await Player.create({
        ...input,
        avatarSeed: input.username.trim().toLowerCase(),
    });
    return asApi<PlayerType>(doc);
};

export const updatePlayer = async (
    id: string,
    patch: UpdatePlayerInput,
): Promise<PlayerType> => {
    const doc = await Player.findByIdAndUpdate(id, patch, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!doc) throw notFound('Spieler');
    return asApi<PlayerType>(doc);
};

/** Löscht den Spieler samt seiner Scores. */
export const deletePlayer = async (id: string): Promise<void> => {
    const doc = await Player.findByIdAndDelete(id);
    if (!doc) throw notFound('Spieler');
    await Score.deleteMany({ playerId: id });
};
