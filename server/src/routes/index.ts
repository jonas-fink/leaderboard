import { Router } from 'express';
import { tournamentRouter } from './tournament.routes.ts';
import { teamRouter } from './team.routes.ts';
import { gameRouter } from './game.routes.ts';
import { playerRouter } from './player.routes.ts';
import { scoreRouter } from './score.routes.ts';
import { leaderboardRouter } from './leaderboard.routes.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true }));
apiRouter.use('/tournaments', tournamentRouter);
apiRouter.use('/teams', teamRouter);
apiRouter.use('/games', gameRouter);
apiRouter.use('/players', playerRouter);
apiRouter.use('/scores', scoreRouter);
apiRouter.use('/leaderboard', leaderboardRouter);

export {
    tournamentRouter,
    teamRouter,
    gameRouter,
    playerRouter,
    scoreRouter,
    leaderboardRouter,
};
