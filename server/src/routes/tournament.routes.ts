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
tournamentRouter.delete('/:id', tournamentController.deleteTournament);
