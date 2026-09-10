import { Router } from 'express';
import { tournamentController } from '#controllers';
import { validateBody } from '#middleware';
import { CreateTournamentSchema, UpdateTournamentSchema } from '#schemas';

export const tournamentRouter = Router();

tournamentRouter.get('/', tournamentController.getTournaments);
tournamentRouter.post(
    '/',
    validateBody(CreateTournamentSchema),
    tournamentController.postTournament,
);
tournamentRouter.get('/:slug', tournamentController.getTournament);
tournamentRouter.patch(
    '/:id',
    validateBody(UpdateTournamentSchema),
    tournamentController.patchTournament,
);
// Kein DELETE über die API: das Löschen räumt Teams, Games und Scores mit ab
// (Kaskade in tournament.service). Über den Funnel wäre ein durchprobierter
// PIN damit nicht ein falscher Punktestand, sondern das ganze Event.
// Zum Aufräumen: `npm run seed -- --yes` oder direkt an der Datenbank.
