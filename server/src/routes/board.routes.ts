import { Router } from 'express';
import { boardController } from '#controllers';

export const boardRouter = Router();

boardRouter.get('/:slug', boardController.getBoard);
