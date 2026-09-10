import type { RequestHandler } from 'express';
import * as tournamentService from '#services/tournament.service';
import type { CreateTournamentInput, UpdateTournamentInput } from '#types';

export const getTournaments: RequestHandler = async (_req, res) => {
    res.json(await tournamentService.listTournaments());
};

export const getTournament: RequestHandler<{ slug: string }> = async (
    req,
    res,
) => {
    res.json(await tournamentService.getTournamentBySlug(req.params.slug));
};

export const postTournament: RequestHandler<
    unknown,
    unknown,
    CreateTournamentInput
> = async (req, res) => {
    res.status(201).json(await tournamentService.createTournament(req.body));
};

export const patchTournament: RequestHandler<
    { id: string },
    unknown,
    UpdateTournamentInput
> = async (req, res) => {
    res.json(await tournamentService.updateTournament(req.params.id, req.body));
};

export const deleteTournament: RequestHandler<{ id: string }> = async (
    req,
    res,
) => {
    await tournamentService.deleteTournament(req.params.id);
    res.status(204).end();
};
