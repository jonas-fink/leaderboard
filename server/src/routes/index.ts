import { Router } from 'express';
import { requireAdmin } from '#middleware';
import { tournamentRouter } from './tournament.routes.ts';
import { teamRouter } from './team.routes.ts';
import { gameRouter } from './game.routes.ts';
import { playerRouter } from './player.routes.ts';
import { scoreRouter } from './score.routes.ts';
import { leaderboardRouter } from './leaderboard.routes.ts';
import { boardRouter } from './board.routes.ts';
import { authRouter } from './auth.routes.ts';
import { uploadRouter } from './upload.routes.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true }));
apiRouter.use('/auth', authRouter);

// Öffentlich, ohne Token: genau das, was die Leinwand anzeigt. Der
// Beamer-Rechner steht nicht im selben Netz und kommt wie alle anderen über
// den Funnel — er kann sich nicht anmelden und soll es auch nicht müssen.
apiRouter.use('/board', boardRouter);

// Ab hier ist alles zu, auch das Lesen (PROJEKT.md §9). Ein Besucher sieht
// das Board und sonst nichts: kein Spielerverzeichnis, keine Rohdaten.
// Bewusst einmal zentral statt je Route, damit keine neue Route offen bleibt.
apiRouter.use(requireAdmin);
apiRouter.use('/uploads', uploadRouter);
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
    boardRouter,
    authRouter,
    uploadRouter,
};
