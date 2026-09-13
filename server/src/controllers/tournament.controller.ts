import type { RequestHandler } from 'express';
import * as tournamentService from '#services/tournament.service';
import { assertQuota } from '#services/quota.service';
import { emitBoardUpdate, emitTournamentStatus } from '#realtime';
import type { CreateTournamentInput, UpdateTournamentInput } from '#types';

export const getTournaments: RequestHandler = async (req, res) => {
    res.json(await tournamentService.listTournaments(req.user.id));
};

export const getTournament: RequestHandler<{ slug: string }> = async (
    req,
    res,
) => {
    res.json(
        await tournamentService.getTournamentBySlug(
            req.params.slug,
            req.user.id,
        ),
    );
};

export const postTournament: RequestHandler<
    unknown,
    unknown,
    CreateTournamentInput
> = async (req, res) => {
    await assertQuota('tournamentsPerUser', req.user.id);
    res.status(201).json(
        await tournamentService.createTournament(req.body, req.user.id),
    );
};

export const patchTournament: RequestHandler<
    { id: string },
    unknown,
    UpdateTournamentInput
> = async (req, res) => {
    await tournamentService.assertOwned(req.params.id, req.user.id);
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

/** Löscht Teams, Games, Scores und Matches mit (AC-3.7) — freigeschaltet, weil
 *  `assertOwned` den Besitz jetzt vor jeder Ausführung sicherstellt. */
export const deleteTournament: RequestHandler<{ id: string }> = async (
    req,
    res,
) => {
    await tournamentService.assertOwned(req.params.id, req.user.id);
    await tournamentService.deleteTournament(req.params.id);
    res.status(204).end();
};
