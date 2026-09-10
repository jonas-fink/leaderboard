import type { RequestHandler } from 'express';
import * as tournamentService from '#services/tournament.service';
import { emitBoardUpdate, emitTournamentStatus } from '#realtime';
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
    const tournament = await tournamentService.updateTournament(
        req.params.id,
        req.body,
    );
    // Der Statuswechsel zuerst: 'finished' startet auf dem Board die
    // Siegerehrung, und die soll auf dem endgültigen Zustand stehen.
    await emitBoardUpdate(tournament.id);
    if (req.body.status) {
        emitTournamentStatus(tournament.id, tournament.status);
    }
    res.json(tournament);
};
