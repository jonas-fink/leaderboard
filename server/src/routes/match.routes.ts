import { Router } from 'express';
import { matchController } from '#controllers';
import { validateBody } from '#middleware';
import { SubmitMatchSchema } from '#schemas';

export const matchRouter = Router();

matchRouter.get('/', matchController.getMatches);
matchRouter.post(
    '/',
    validateBody(SubmitMatchSchema),
    matchController.postMatch,
);
matchRouter.delete('/:id', matchController.deleteMatch);
