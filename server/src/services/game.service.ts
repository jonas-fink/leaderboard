import { Game, Score } from '#models';
import { asApi, httpError, notFound } from '#utils';
import { countMatches } from '#services/match.service';
import type {
    Game as GameType,
    CreateGameInput,
    UpdateGameInput,
} from '#types';

/** Immer turnierbezogen — ohne Turnier gibt es keine sinnvolle Abgrenzung
 *  (specs/002-benutzerkonten, "Löcher"-Tabelle). */
export const listGames = async (tournamentId: string): Promise<GameType[]> => {
    const docs = await Game.find({ tournamentId }).sort({ title: 1 });
    return docs.map((doc) => asApi<GameType>(doc));
};

/** Der Slug ist nur je Turnier eindeutig (AC-3.6) — ohne `tournamentId` liefert
 *  `findOne` sonst die erstgefundene Disziplin instanzweit. */
export const getGameBySlug = async (
    slug: string,
    tournamentId: string,
): Promise<GameType> => {
    const doc = await Game.findOne({ slug, tournamentId });
    if (!doc) throw notFound(`Game "${slug}"`);
    return asApi<GameType>(doc);
};

/** Für die Besitzprüfung vor Patch/Delete — der Slug allein reicht dafür
 *  nicht, weil er nur je Turnier eindeutig ist. */
export const getGame = async (id: string): Promise<GameType> => {
    const doc = await Game.findById(id);
    if (!doc) throw notFound('Game');
    return asApi<GameType>(doc);
};

export const createGame = async (input: CreateGameInput): Promise<GameType> => {
    const doc = await Game.create(input);
    return asApi<GameType>(doc);
};

/**
 * Ein Wechsel der Wertungsart macht vorhandene Ergebnisse unsichtbar, ohne
 * sie zu löschen (E-6 in requirements.md) — deshalb 409, solange welche
 * vorliegen. Scores zählen bei `metric`, Matches bei `versus`: die aktuelle
 * Wertungsart entscheidet, welche Collection gemeint ist.
 *
 * Lädt das Dokument und speichert per `save()`, statt `findByIdAndUpdate` zu
 * nutzen (BE-9): nur so feuert `pre('validate')` und damit die
 * DESC-Invariante aus AD-5 auch, wenn ein Patch nur `primaryMetric` ändert
 * und `scoring` — bereits `'versus'` aus einem früheren Request — gar nicht
 * mitschickt. `findByIdAndUpdate` ist Query-Middleware und löst keinen
 * Dokument-Hook aus.
 */
export const updateGame = async (
    id: string,
    patch: UpdateGameInput,
): Promise<GameType> => {
    const current = await Game.findById(id);
    if (!current) throw notFound('Game');

    if (patch.scoring !== undefined && patch.scoring !== current.scoring) {
        const hasResults =
            current.scoring === 'metric'
                ? (await Score.countDocuments({ gameId: id })) > 0
                : (await countMatches(id)) > 0;
        if (hasResults) {
            throw httpError(
                409,
                'Die Wertungsart lässt sich nicht ändern, solange Ergebnisse vorliegen',
            );
        }
    }

    current.set(patch);
    await current.save();
    return asApi<GameType>(current);
};

/** Gibt das gelöschte Game zurück — der Emitter braucht die tournamentId. */
export const deleteGame = async (id: string): Promise<GameType> => {
    const doc = await Game.findByIdAndDelete(id);
    if (!doc) throw notFound('Game');
    await Score.deleteMany({ gameId: id });
    return asApi<GameType>(doc);
};
