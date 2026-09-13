import type { RequestHandler } from 'express';
import * as matchService from '#services/match.service';
import { emitBoardUpdate } from '#realtime';
import { httpError } from '#utils';
import type { SubmitMatchInput } from '#types';

/** Matches gibt es nur je Disziplin — ohne gameId gibt es nichts zu listen. */
export const getMatches: RequestHandler<
    unknown,
    unknown,
    unknown,
    { gameId?: string }
> = async (req, res) => {
    const { gameId } = req.query;
    if (!gameId) throw httpError(400, 'gameId fehlt');
    res.json(await matchService.listMatches(gameId));
};

export const postMatch: RequestHandler<
    unknown,
    unknown,
    SubmitMatchInput
> = async (req, res) => {
    const match = await matchService.createMatch(req.body);
    await emitBoardUpdate(match.tournamentId);
    res.status(201).json(match);
};

export const deleteMatch: RequestHandler<{ id: string }> = async (req, res) => {
    const match = await matchService.deleteMatch(req.params.id);
    await emitBoardUpdate(match.tournamentId);
    res.status(204).end();
};
