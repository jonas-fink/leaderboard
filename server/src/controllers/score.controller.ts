import type { RequestHandler } from 'express';
import * as scoreService from '#services/score.service';
import { emitBoardUpdate } from '#realtime';
import type { SubmitScoreInput, UpdateScoreInput } from '#types';

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
    res.json(
        await scoreService.listScores(
            {
                ...(tournamentId ? { tournamentId } : {}),
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
    const score = await scoreService.createScore(req.body);
    await emitBoardUpdate(score.tournamentId);
    res.status(201).json(score);
};

export const patchScore: RequestHandler<
    { id: string },
    unknown,
    UpdateScoreInput
> = async (req, res) => {
    const score = await scoreService.updateScore(req.params.id, req.body);
    await emitBoardUpdate(score.tournamentId);
    res.json(score);
};

export const deleteScore: RequestHandler<{ id: string }> = async (req, res) => {
    const score = await scoreService.deleteScore(req.params.id);
    await emitBoardUpdate(score.tournamentId);
    res.status(204).end();
};
