import type { RequestHandler } from 'express';
import * as playerService from '#services/player.service';
import { getPlayerStats } from '#services/leaderboard.service';
import type { CreatePlayerInput, UpdatePlayerInput } from '#types';

export const getPlayers: RequestHandler = async (_req, res) => {
    res.json(await playerService.listPlayers());
};

export const getPlayer: RequestHandler<{ id: string }> = async (req, res) => {
    res.json(await playerService.getPlayer(req.params.id));
};

export const getPlayerStatistics: RequestHandler<{ id: string }> = async (
    req,
    res,
) => {
    res.json(await getPlayerStats(req.params.id));
};

export const postPlayer: RequestHandler<
    unknown,
    unknown,
    CreatePlayerInput
> = async (req, res) => {
    res.status(201).json(await playerService.createPlayer(req.body));
};

export const patchPlayer: RequestHandler<
    { id: string },
    unknown,
    UpdatePlayerInput
> = async (req, res) => {
    res.json(await playerService.updatePlayer(req.params.id, req.body));
};

export const deletePlayer: RequestHandler<{ id: string }> = async (
    req,
    res,
) => {
    await playerService.deletePlayer(req.params.id);
    res.status(204).end();
};
