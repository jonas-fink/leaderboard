import { Player, Score } from '#models';
import { asApi, notFound } from '#utils';
import type {
    Player as PlayerType,
    CreatePlayerInput,
    UpdatePlayerInput,
} from '#types';

/** Nur die eigenen Spieler des Kontos (AC-3.2). */
export const listPlayers = async (ownerId: string): Promise<PlayerType[]> => {
    const docs = await Player.find({ ownerId }).sort({ username: 1 });
    return docs.map((doc) => asApi<PlayerType>(doc));
};

export const getPlayer = async (
    id: string,
    ownerId: string,
): Promise<PlayerType> => {
    const doc = await Player.findOne({ _id: id, ownerId });
    if (!doc) throw notFound('Spieler');
    return asApi<PlayerType>(doc);
};

/** Alle Spieler eines Kontos als Map — die Leaderboard-Aggregation schlägt
 *  darin nach. */
export const getPlayerMap = async (
    ownerId: string,
): Promise<Map<string, PlayerType>> => {
    const players = await listPlayers(ownerId);
    return new Map(players.map((player) => [player.id, player]));
};

export const createPlayer = async (
    input: CreatePlayerInput,
    ownerId: string,
): Promise<PlayerType> => {
    // Wie beim Team: der Seed fällt aus dem Namen und wird bei einer
    // Umbenennung nicht neu abgeleitet — das Sprite bleibt dem Spieler.
    const doc = await Player.create({
        ...input,
        ownerId,
        avatarSeed: input.username.trim().toLowerCase(),
    });
    return asApi<PlayerType>(doc);
};

export const updatePlayer = async (
    id: string,
    ownerId: string,
    patch: UpdatePlayerInput,
): Promise<PlayerType> => {
    const doc = await Player.findOneAndUpdate({ _id: id, ownerId }, patch, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!doc) throw notFound('Spieler');
    return asApi<PlayerType>(doc);
};

/** Löscht den Spieler samt seiner Scores. */
export const deletePlayer = async (
    id: string,
    ownerId: string,
): Promise<void> => {
    const doc = await Player.findOneAndDelete({ _id: id, ownerId });
    if (!doc) throw notFound('Spieler');
    await Score.deleteMany({ playerId: id });
};
