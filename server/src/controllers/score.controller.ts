import type { RequestHandler } from 'express';
import * as scoreService from '#services/score.service';
import type { SubmitScoreInput, UpdateScoreInput } from '#types';

export const getScores: RequestHandler<
    unknown,
    unknown,
    unknown,
    { gameId?: string; playerId?: string }
> = async (req, res) => {
    const { gameId, playerId } = req.query;
    res.json(
        await scoreService.listScores({
            ...(gameId ? { gameId } : {}),
            ...(playerId ? { playerId } : {}),
        }),
    );
};

export const postScore: RequestHandler<
    unknown,
    unknown,
    SubmitScoreInput
> = async (req, res) => {
    res.status(201).json(await scoreService.createScore(req.body));
};

export const patchScore: RequestHandler<
    { id: string },
    unknown,
    UpdateScoreInput
> = async (req, res) => {
    res.json(await scoreService.updateScore(req.params.id, req.body));
};

export const deleteScore: RequestHandler<{ id: string }> = async (req, res) => {
    await scoreService.deleteScore(req.params.id);
    res.status(204).end();
};
