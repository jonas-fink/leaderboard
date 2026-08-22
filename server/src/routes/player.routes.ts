import { Router } from 'express';
import { playerController } from '#controllers';
import { validateBody } from '#middleware';
import { CreatePlayerSchema, UpdatePlayerSchema } from '#schemas';

export const playerRouter = Router();

playerRouter.get('/', playerController.getPlayers);
playerRouter.post(
    '/',
    validateBody(CreatePlayerSchema),
    playerController.postPlayer,
);
playerRouter.get('/:id', playerController.getPlayer);
playerRouter.get('/:id/stats', playerController.getPlayerStatistics);
playerRouter.patch(
    '/:id',
    validateBody(UpdatePlayerSchema),
    playerController.patchPlayer,
);
playerRouter.delete('/:id', playerController.deletePlayer);
