import type { RequestHandler } from 'express';
import { getPinnedCharts, getChartBySlug } from '#services/leaderboard.service';
import { assertOwned } from '#services/tournament.service';
import { httpError } from '#utils';

/** Alle angepinnten Games eines Turniers als Dashboard-Karten. */
export const getLeaderboards: RequestHandler<
    unknown,
    unknown,
    unknown,
    { tournamentId?: string }
> = async (req, res) => {
    const { tournamentId } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    await assertOwned(tournamentId, req.user.id);
    res.json(await getPinnedCharts(tournamentId, req.user.id));
};

/** Ein Board mit vollständiger Rangliste. */
export const getLeaderboard: RequestHandler<
    { slug: string },
    unknown,
    unknown,
    { tournamentId?: string }
> = async (req, res) => {
    const { tournamentId } = req.query;
    if (!tournamentId) throw httpError(400, 'tournamentId fehlt');
    await assertOwned(tournamentId, req.user.id);
    res.json(
        await getChartBySlug(req.params.slug, tournamentId, req.user.id),
    );
};
