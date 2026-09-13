import type { RequestHandler } from 'express';
import * as gameService from '#services/game.service';
import { assertOwned } from '#services/tournament.service';
import { assertQuota } from '#services/quota.service';
import { emitBoardUpdate } from '#realtime';
import { httpError } from '#utils';
import type { CreateGameInput, UpdateGameInput } from '#types';

export const getGames: RequestHandler<
    unknown,
    unknown,
    unknown,
    { tournamentId?: string }
> = async (req, res) => {
    const { tournamentId } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    await assertOwned(tournamentId, req.user.id);
    res.json(await gameService.listGames(tournamentId));
};

export const getGame: RequestHandler<
    { slug: string },
    unknown,
    unknown,
    { tournamentId?: string }
> = async (req, res) => {
    const { tournamentId } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    await assertOwned(tournamentId, req.user.id);
    res.json(await gameService.getGameBySlug(req.params.slug, tournamentId));
};

export const postGame: RequestHandler<
    unknown,
    unknown,
    CreateGameInput
> = async (req, res) => {
    await assertOwned(req.body.tournamentId, req.user.id);
    await assertQuota('gamesPerTournament', req.body.tournamentId);
    const game = await gameService.createGame(req.body);
    await emitBoardUpdate(game.tournamentId);
    res.status(201).json(game);
};

export const patchGame: RequestHandler<
    { id: string },
    unknown,
    UpdateGameInput
> = async (req, res) => {
    const existing = await gameService.getGame(req.params.id);
    await assertOwned(existing.tournamentId, req.user.id);
    // Status, pinned, weight und boardOrder ändern das Board unmittelbar.
    const game = await gameService.updateGame(req.params.id, req.body);
    await emitBoardUpdate(game.tournamentId);
    res.json(game);
};

export const deleteGame: RequestHandler<{ id: string }> = async (req, res) => {
    const existing = await gameService.getGame(req.params.id);
    await assertOwned(existing.tournamentId, req.user.id);
    const game = await gameService.deleteGame(req.params.id);
    await emitBoardUpdate(game.tournamentId);
    res.status(204).end();
};
