import { Router } from 'express';
import { scoreController } from '#controllers';
import { validateBody } from '#middleware';
import { SubmitScoreSchema, UpdateScoreSchema } from '#schemas';

export const scoreRouter = Router();

scoreRouter.get('/', scoreController.getScores);
scoreRouter.post(
    '/',
    validateBody(SubmitScoreSchema),
    scoreController.postScore,
);
scoreRouter.patch(
    '/:id',
    validateBody(UpdateScoreSchema),
    scoreController.patchScore,
);
scoreRouter.delete('/:id', scoreController.deleteScore);
