import type { RequestHandler } from 'express';
import * as playerService from '#services/player.service';
import { getPlayerStats } from '#services/leaderboard.service';
import { assertOwned } from '#services/tournament.service';
import { assertQuota } from '#services/quota.service';
import { httpError } from '#utils';
import type { CreatePlayerInput, UpdatePlayerInput } from '#types';

export const getPlayers: RequestHandler = async (req, res) => {
    res.json(await playerService.listPlayers(req.user.id));
};

export const getPlayer: RequestHandler<{ id: string }> = async (req, res) => {
    res.json(await playerService.getPlayer(req.params.id, req.user.id));
};

export const getPlayerStatistics: RequestHandler<
    { id: string },
    unknown,
    unknown,
    { tournamentId?: string }
> = async (req, res) => {
    const { tournamentId } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    await assertOwned(tournamentId, req.user.id);
    res.json(await getPlayerStats(req.params.id, tournamentId, req.user.id));
};

export const postPlayer: RequestHandler<
    unknown,
    unknown,
    CreatePlayerInput
> = async (req, res) => {
    await assertQuota('playersPerUser', req.user.id);
    res.status(201).json(
        await playerService.createPlayer(req.body, req.user.id),
    );
};

export const patchPlayer: RequestHandler<
    { id: string },
    unknown,
    UpdatePlayerInput
> = async (req, res) => {
    res.json(
        await playerService.updatePlayer(
            req.params.id,
            req.user.id,
            req.body,
        ),
    );
};

export const deletePlayer: RequestHandler<{ id: string }> = async (
    req,
    res,
) => {
    await playerService.deletePlayer(req.params.id, req.user.id);
    res.status(204).end();
};
