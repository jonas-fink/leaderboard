import { Score } from '#models';
import { asApi, notFound } from '#utils';
import type {
    RawScore,
    ScoreRecord,
    SubmitScoreInput,
    UpdateScoreInput,
    MetricConfig,
} from '#types';

type ScoreQuery = { gameId?: string; playerId?: string };

/** recordedAt kommt als Date aus Mongo, der Vertrag verlangt ISO-String. */
const toRaw = (doc: { toJSON: () => unknown }): RawScore => {
    const json = asApi<RawScore>(doc);
    return { ...json, recordedAt: new Date(json.recordedAt).toISOString() };
};

export const listScores = async (filter: ScoreQuery): Promise<RawScore[]> => {
    const docs = await Score.find(filter).sort({ recordedAt: -1 });
    return docs.map(toRaw);
};

/** Alle Scores mehrerer Games auf einmal, gebündelt nach gameId. */
export const scoresByGame = async (
    gameIds: string[],
): Promise<Map<string, RawScore[]>> => {
    const docs = await Score.find({ gameId: { $in: gameIds } });

    const buckets = new Map<string, RawScore[]>();
    for (const doc of docs) {
        const score = toRaw(doc);
        const bucket = buckets.get(score.gameId);
        if (bucket) bucket.push(score);
        else buckets.set(score.gameId, [score]);
    }
    return buckets;
};

/** Populierte Form: gameId ist nach populate() das Game-Dokument. */
type PopulatedGame = {
    _id: { toString: () => string };
    title: string;
    slug: string;
    primaryMetric: MetricConfig;
};

/** Score-Historie eines Spielers, angereichert mit Game-Titel und Metrik. */
export const playerHistory = async (
    playerId: string,
    limit = 20,
): Promise<ScoreRecord[]> => {
    const docs = await Score.find({ playerId })
        .sort({ recordedAt: -1 })
        .limit(limit)
        .populate<{
            gameId: PopulatedGame | null;
        }>('gameId', 'title slug primaryMetric');

    return docs.map((doc) => {
        const game = doc.gameId;
        return {
            id: doc._id.toString(),
            gameId: game?._id.toString() ?? '',
            playerId: doc.playerId.toString(),
            primaryValue: doc.primaryValue,
            secondaryValues: doc.secondaryValues
                ? Object.fromEntries(doc.secondaryValues)
                : undefined,
            recordedAt: doc.recordedAt.toISOString(),
            gameTitle: game?.title,
            gameSlug: game?.slug,
            primaryMetric: game?.primaryMetric,
        } satisfies ScoreRecord;
    });
};

export const countScores = (filter: ScoreQuery): Promise<number> =>
    Score.countDocuments(filter);

export const createScore = async (
    input: SubmitScoreInput,
): Promise<RawScore> => {
    const doc = await Score.create(input);
    return toRaw(doc);
};

export const updateScore = async (
    id: string,
    patch: UpdateScoreInput,
): Promise<RawScore> => {
    const doc = await Score.findByIdAndUpdate(id, patch, {
        returnDocument: 'after',
        runValidators: true,
    });
    if (!doc) throw notFound('Score');
    return toRaw(doc);
};

export const deleteScore = async (id: string): Promise<void> => {
    const doc = await Score.findByIdAndDelete(id);
    if (!doc) throw notFound('Score');
};
