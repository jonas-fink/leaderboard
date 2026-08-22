import type { RequestHandler } from 'express';
import { getPinnedCharts, getChartBySlug } from '#services/leaderboard.service';

/** Alle angepinnten Games als Dashboard-Karten. */
export const getLeaderboards: RequestHandler = async (_req, res) => {
    res.json(await getPinnedCharts());
};

/** Ein Board mit vollständiger Rangliste. */
export const getLeaderboard: RequestHandler<{ slug: string }> = async (
    req,
    res,
) => {
    res.json(await getChartBySlug(req.params.slug));
};
