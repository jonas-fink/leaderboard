import { Router } from 'express';
import { boardController } from '#controllers';

export const boardRouter = Router();

boardRouter.get('/:userSlug/:tournamentSlug', boardController.getBoard);
