import { Router } from 'express';
import { gameController } from '#controllers';
import { validateBody } from '#middleware';
import { CreateGameSchema, UpdateGameSchema } from '#schemas';

export const gameRouter = Router();

gameRouter.get('/', gameController.getGames);
gameRouter.post('/', validateBody(CreateGameSchema), gameController.postGame);
gameRouter.get('/:slug', gameController.getGame);
gameRouter.patch(
    '/:id',
    validateBody(UpdateGameSchema),
    gameController.patchGame,
);
gameRouter.delete('/:id', gameController.deleteGame);
