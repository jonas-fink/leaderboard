import type { RequestHandler } from 'express';
import * as teamService from '#services/team.service';
import { httpError } from '#utils';
import type { CreateTeamInput, UpdateTeamInput } from '#types';

/** Teams gibt es nur turnierbezogen — ohne Turnier gibt es nichts zu listen. */
export const getTeams: RequestHandler<
    unknown,
    unknown,
    unknown,
    { tournamentId?: string }
> = async (req, res) => {
    const { tournamentId } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    res.json(await teamService.listTeams(tournamentId));
};

export const getTeam: RequestHandler<{ id: string }> = async (req, res) => {
    res.json(await teamService.getTeam(req.params.id));
};

export const postTeam: RequestHandler<
    unknown,
    unknown,
    CreateTeamInput
> = async (req, res) => {
    res.status(201).json(await teamService.createTeam(req.body));
};

export const patchTeam: RequestHandler<
    { id: string },
    unknown,
    UpdateTeamInput
> = async (req, res) => {
    res.json(await teamService.updateTeam(req.params.id, req.body));
};

export const deleteTeam: RequestHandler<{ id: string }> = async (req, res) => {
    await teamService.deleteTeam(req.params.id);
    res.status(204).end();
};
