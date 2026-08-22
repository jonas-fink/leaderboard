import { Router } from 'express';
import { leaderboardController } from '#controllers';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', leaderboardController.getLeaderboards);
leaderboardRouter.get('/:slug', leaderboardController.getLeaderboard);
