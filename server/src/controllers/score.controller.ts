import type { RequestHandler } from 'express';
import * as scoreService from '#services/score.service';
import { assertOwned, assertEntrantOwned } from '#services/tournament.service';
import { getTeam } from '#services/team.service';
import { getGame } from '#services/game.service';
import { emitBoardUpdate } from '#realtime';
import { httpError } from '#utils';
import type {
    Game,
    Tournament,
    SubmitScoreInput,
    SubmitTeamScoreInput,
    UpdateScoreInput,
} from '#types';

/** `tournamentId` ist Pflicht — ohne Turnierbezug gibt es keine sinnvolle
 *  Abgrenzung (dasselbe Muster wie `GET /api/teams`, `GET /api/games`). */
export const getScores: RequestHandler<
    unknown,
    unknown,
    unknown,
    {
        tournamentId?: string;
        gameId?: string;
        playerId?: string;
        limit?: string;
    }
> = async (req, res) => {
    const { tournamentId, gameId, playerId, limit } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    await assertOwned(tournamentId, req.user.id);
    res.json(
        await scoreService.listScores(
            {
                tournamentId,
                ...(gameId ? { gameId } : {}),
                ...(playerId ? { playerId } : {}),
            },
            Number(limit) || 0,
        ),
    );
};

/**
 * Wer in dieser Disziplin gewertet wird: im Team-Turnier mit "Punkte pro
 * Spieler" die Spieler, sonst der Modus des Turniers.
 */
const scoredBy = (tournament: Tournament, game: Game) =>
    tournament.mode === 'team' &&
    game.scoring === 'metric' &&
    game.teamScoring === 'players'
        ? 'player'
        : tournament.mode;

/** Spiel gehört zum Turnier und erwartet diese Art Ergebnis. */
const assertScoreFits = async (
    tournament: Tournament,
    gameId: string,
    entrantType: 'player' | 'team',
) => {
    const game = await getGame(gameId);
    if (game.tournamentId !== tournament.id) {
        throw httpError(400, 'Die Disziplin gehört nicht zu diesem Turnier');
    }
    if (scoredBy(tournament, game) !== entrantType) {
        throw httpError(
            400,
            entrantType === 'team'
                ? 'Diese Disziplin wertet Spieler, nicht Teams'
                : 'Diese Disziplin wertet Teams, nicht Spieler',
        );
    }
};

export const postScore: RequestHandler<
    unknown,
    unknown,
    SubmitScoreInput
> = async (req, res) => {
    const tournament = await assertOwned(req.body.tournamentId, req.user.id);
    await assertScoreFits(tournament, req.body.gameId, req.body.entrantType);
    await assertEntrantOwned(req.body, req.user.id);
    const score = await scoreService.createScore(req.body);
    await emitBoardUpdate(score.tournamentId);
    res.status(201).json(score);
};

/** Teamchallenge im Einzelmodus: ein Request, ein Score je Mitglied. */
export const postTeamScore: RequestHandler<
    unknown,
    unknown,
    SubmitTeamScoreInput
> = async (req, res) => {
    const tournament = await assertOwned(req.body.tournamentId, req.user.id);
    // Kader-Eingabe gibt es nur im Einzelturnier — sie schreibt Spieler-Scores.
    if (tournament.mode !== 'player') {
        throw httpError(400, 'Kader-Eingabe gibt es nur im Einzelturnier');
    }
    await assertScoreFits(tournament, req.body.gameId, 'player');
    const team = await getTeam(req.body.teamId);
    // Sonst ließe sich der Kader eines fremden Turniers einschleusen.
    if (team.tournamentId !== req.body.tournamentId) {
        throw httpError(400, 'Das Team gehört nicht zu diesem Turnier');
    }
    if (team.members.length === 0) {
        throw httpError(400, 'Das Team hat keine Mitglieder');
    }
    const scores = await scoreService.createTeamScores(req.body, team.members);
    await emitBoardUpdate(req.body.tournamentId);
    res.status(201).json(scores);
};

export const patchScore: RequestHandler<
    { id: string },
    unknown,
    UpdateScoreInput
> = async (req, res) => {
    const existing = await scoreService.getScore(req.params.id);
    await assertOwned(existing.tournamentId, req.user.id);
    const score = await scoreService.updateScore(req.params.id, req.body);
    await emitBoardUpdate(score.tournamentId);
    res.json(score);
};

export const deleteScore: RequestHandler<{ id: string }> = async (req, res) => {
    const existing = await scoreService.getScore(req.params.id);
    await assertOwned(existing.tournamentId, req.user.id);
    const score = await scoreService.deleteScore(req.params.id);
    await emitBoardUpdate(score.tournamentId);
    res.status(204).end();
};
