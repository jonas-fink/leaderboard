import type { RequestHandler } from 'express';
import * as scoreService from '#services/score.service';
import { assertOwned, assertEntrantOwned } from '#services/tournament.service';
import { emitBoardUpdate } from '#realtime';
import { httpError } from '#utils';
import type { SubmitScoreInput, UpdateScoreInput } from '#types';

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

export const postScore: RequestHandler<
    unknown,
    unknown,
    SubmitScoreInput
> = async (req, res) => {
    await assertOwned(req.body.tournamentId, req.user.id);
    await assertEntrantOwned(req.body, req.user.id);
    const score = await scoreService.createScore(req.body);
    await emitBoardUpdate(score.tournamentId);
    res.status(201).json(score);
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
