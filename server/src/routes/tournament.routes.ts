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
// Löscht Teams, Games, Scores und Matches mit (Kaskade in tournament.service).
// Erst mit `assertOwned` vertretbar (AD-4): ein fremdes Turnier lässt sich
// nicht einmal erraten, geschweige denn löschen.
tournamentRouter.delete('/:id', tournamentController.deleteTournament);
