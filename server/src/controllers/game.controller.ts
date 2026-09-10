import type { RequestHandler } from 'express';
import * as gameService from '#services/game.service';
import { emitBoardUpdate } from '#realtime';
import type { CreateGameInput, UpdateGameInput } from '#types';

export const getGames: RequestHandler = async (_req, res) => {
    res.json(await gameService.listGames());
};

export const getGame: RequestHandler<{ slug: string }> = async (req, res) => {
    res.json(await gameService.getGameBySlug(req.params.slug));
};

export const postGame: RequestHandler<
    unknown,
    unknown,
    CreateGameInput
> = async (req, res) => {
    const game = await gameService.createGame(req.body);
    await emitBoardUpdate(game.tournamentId);
    res.status(201).json(game);
};

export const patchGame: RequestHandler<
    { id: string },
    unknown,
    UpdateGameInput
> = async (req, res) => {
    // Status, pinned, weight und boardOrder ändern das Board unmittelbar.
    const game = await gameService.updateGame(req.params.id, req.body);
    await emitBoardUpdate(game.tournamentId);
    res.json(game);
};

export const deleteGame: RequestHandler<{ id: string }> = async (req, res) => {
    const game = await gameService.deleteGame(req.params.id);
    await emitBoardUpdate(game.tournamentId);
    res.status(204).end();
};
