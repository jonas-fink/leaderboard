import { Match, Game, Tournament } from '#models';
import { asApi, httpError, notFound } from '#utils';
import type { Match as MatchType, RawMatch, SubmitMatchInput } from '#types';

/** Nur die Felder, die die beiden Serialisierer lesen. */
type RawSide = { playerId?: unknown; teamId?: unknown; value: number };
type DualSides = [RawSide, RawSide];

/**
 * `db/serialize.ts` transformiert nur die oberste Ebene eines Dokuments — die
 * ObjectIds in den verschachtelten `sides` blieben sonst Objekte statt
 * Strings, und die Zod-Typen wären an der Stelle gelogen. Deshalb werden sie
 * hier explizit überführt, statt sich auf `asApi` allein zu verlassen.
 */
const apiSide = (side: RawSide): MatchType['sides'][number] => ({
    playerId: side.playerId != null ? String(side.playerId) : undefined,
    teamId: side.teamId != null ? String(side.teamId) : undefined,
    value: side.value,
});

const toApi = (doc: { toJSON: () => unknown }): MatchType => {
    const json = asApi<Omit<MatchType, 'sides'> & { sides: DualSides }>(doc);
    return {
        ...json,
        sides: [apiSide(json.sides[0]), apiSide(json.sides[1])],
    };
};

/**
 * Kollabiert `playerId ?? teamId` zu `entrantId`, genau wie `toRaw` in
 * score.service.ts — der Fallback auf `''` existiert nur für den Typ, der
 * Mongoose-Validator garantiert, dass genau eine ID gesetzt ist.
 */
const rawSide = (side: RawSide): RawMatch['sides'][number] => ({
    entrantId: String(side.playerId ?? side.teamId ?? ''),
    value: side.value,
});

const toRaw = (doc: { toJSON: () => unknown }): RawMatch => {
    const json = asApi<Omit<RawMatch, 'sides'> & { sides: DualSides }>(doc);
    return {
        ...json,
        sides: [rawSide(json.sides[0]), rawSide(json.sides[1])],
    };
};

/** Neueste zuerst — /control zeigt die zuletzt erfassten Matches zum Zurücknehmen. */
export const listMatches = async (gameId: string): Promise<MatchType[]> => {
    const docs = await Match.find({ gameId }).sort({ playedAt: -1 });
    return docs.map(toApi);
};

/**
 * Prüft, was `Match.create` selbst nicht prüfen kann: dass Turnier und
 * Disziplin existieren, und dass die Disziplin überhaupt matchbasiert
 * gewertet wird. `Score.create` prüft das bewusst nicht — Matches haben
 * dafür einen eigenen Fehlerfall (API contract, architecture.md 001).
 */
export const createMatch = async (
    input: SubmitMatchInput,
): Promise<MatchType> => {
    const game = await Game.findById(input.gameId);
    if (!game) throw notFound('Game');
    if (game.scoring !== 'versus') {
        throw httpError(400, 'Diese Disziplin wird über Einzelwerte gewertet');
    }

    const tournament = await Tournament.findById(input.tournamentId);
    if (!tournament) throw notFound('Turnier');

    const doc = await Match.create(input);
    return toApi(doc);
};

/** Für die Besitzprüfung vor dem Löschen. */
export const getMatch = async (id: string): Promise<MatchType> => {
    const doc = await Match.findById(id);
    if (!doc) throw notFound('Match');
    return toApi(doc);
};

/** Gibt das gelöschte Match zurück — der Emitter braucht die tournamentId. */
export const deleteMatch = async (id: string): Promise<MatchType> => {
    const doc = await Match.findByIdAndDelete(id);
    if (!doc) throw notFound('Match');
    return toApi(doc);
};

/** Für die 409-Sperre beim Wechsel der Wertungsart (PATCH /api/games/:id). */
export const countMatches = (gameId: string): Promise<number> =>
    Match.countDocuments({ gameId });

/** Alle Matches mehrerer Games auf einmal, gebündelt nach gameId — Eingabe
 * für `buildTable` in board.service.ts, analog zu `scoresByGame`. */
export const matchesByGame = async (
    gameIds: string[],
): Promise<Map<string, RawMatch[]>> => {
    const docs = await Match.find({ gameId: { $in: gameIds } });

    const buckets = new Map<string, RawMatch[]>();
    for (const doc of docs) {
        const match = toRaw(doc);
        const bucket = buckets.get(match.gameId);
        if (bucket) bucket.push(match);
        else buckets.set(match.gameId, [match]);
    }
    return buckets;
};
