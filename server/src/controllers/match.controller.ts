import type { RequestHandler } from 'express';
import * as matchService from '#services/match.service';
import * as gameService from '#services/game.service';
import { assertOwned, assertEntrantOwned } from '#services/tournament.service';
import { emitBoardUpdate } from '#realtime';
import { httpError } from '#utils';
import type { SubmitMatchInput } from '#types';

/** Matches gibt es nur je Disziplin — ohne gameId gibt es nichts zu listen. */
export const getMatches: RequestHandler<
    unknown,
    unknown,
    unknown,
    { gameId?: string }
> = async (req, res) => {
    const { gameId } = req.query;
    if (!gameId) throw httpError(400, 'gameId fehlt');
    // Ein Match kennt seine tournamentId erst nach dem Laden — der Bezug
    // führt über die Disziplin.
    const game = await gameService.getGame(gameId);
    await assertOwned(game.tournamentId, req.user.id);
    res.json(await matchService.listMatches(gameId));
};

export const postMatch: RequestHandler<
    unknown,
    unknown,
    SubmitMatchInput
> = async (req, res) => {
    await assertOwned(req.body.tournamentId, req.user.id);
    // Beide Seiten prüfen — ein Match hat immer zwei Teilnehmer (§ Löcher).
    await Promise.all(
        req.body.sides.map((side) => assertEntrantOwned(side, req.user.id)),
    );
    const match = await matchService.createMatch(req.body);
    await emitBoardUpdate(match.tournamentId);
    res.status(201).json(match);
};

export const deleteMatch: RequestHandler<{ id: string }> = async (req, res) => {
    const existing = await matchService.getMatch(req.params.id);
    await assertOwned(existing.tournamentId, req.user.id);
    const match = await matchService.deleteMatch(req.params.id);
    await emitBoardUpdate(match.tournamentId);
    res.status(204).end();
};
