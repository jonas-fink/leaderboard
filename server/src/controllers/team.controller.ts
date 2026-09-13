import type { RequestHandler } from 'express';
import * as teamService from '#services/team.service';
import { assertOwned } from '#services/tournament.service';
import { assertQuota } from '#services/quota.service';
import { getPlayer } from '#services/player.service';
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
    await assertOwned(tournamentId, req.user.id);
    res.json(await teamService.listTeams(tournamentId));
};

export const getTeam: RequestHandler<{ id: string }> = async (req, res) => {
    const team = await teamService.getTeam(req.params.id);
    await assertOwned(team.tournamentId, req.user.id);
    res.json(team);
};

export const postTeam: RequestHandler<
    unknown,
    unknown,
    CreateTeamInput
> = async (req, res) => {
    await assertOwned(req.body.tournamentId, req.user.id);
    await assertQuota('teamsPerTournament', req.body.tournamentId);
    // `members` sind Spieler-IDs — jede muss dem Konto gehören (F-1, BE-14).
    await Promise.all(
        req.body.members.map((playerId) => getPlayer(playerId, req.user.id)),
    );
    res.status(201).json(await teamService.createTeam(req.body));
};

export const patchTeam: RequestHandler<
    { id: string },
    unknown,
    UpdateTeamInput
> = async (req, res) => {
    const team = await teamService.getTeam(req.params.id);
    await assertOwned(team.tournamentId, req.user.id);
    // `UpdateTeamSchema` lässt `members` durch — derselbe Bug wie bei
    // `postTeam` über ein anderes Verb, deshalb dieselbe Prüfung (F-1, BE-14).
    if (req.body.members) {
        await Promise.all(
            req.body.members.map((playerId) =>
                getPlayer(playerId, req.user.id),
            ),
        );
    }
    res.json(await teamService.updateTeam(req.params.id, req.body));
};

export const deleteTeam: RequestHandler<{ id: string }> = async (req, res) => {
    const team = await teamService.getTeam(req.params.id);
    await assertOwned(team.tournamentId, req.user.id);
    await teamService.deleteTeam(req.params.id);
    res.status(204).end();
};
