import type { RequestHandler } from 'express';
import * as gameService from '#services/game.service';
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
    res.status(201).json(await gameService.createGame(req.body));
};

export const patchGame: RequestHandler<
    { id: string },
    unknown,
    UpdateGameInput
> = async (req, res) => {
    res.json(await gameService.updateGame(req.params.id, req.body));
};

export const deleteGame: RequestHandler<{ id: string }> = async (req, res) => {
    await gameService.deleteGame(req.params.id);
    res.status(204).end();
};
