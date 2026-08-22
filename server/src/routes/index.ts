import { Router } from 'express';
import { gameRouter } from './game.routes.ts';
import { playerRouter } from './player.routes.ts';
import { scoreRouter } from './score.routes.ts';
import { leaderboardRouter } from './leaderboard.routes.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true }));
apiRouter.use('/games', gameRouter);
apiRouter.use('/players', playerRouter);
apiRouter.use('/scores', scoreRouter);
apiRouter.use('/leaderboard', leaderboardRouter);

export { gameRouter, playerRouter, scoreRouter, leaderboardRouter };
