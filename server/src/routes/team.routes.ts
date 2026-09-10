import { Router } from 'express';
import { teamController } from '#controllers';
import { validateBody } from '#middleware';
import { CreateTeamSchema, UpdateTeamSchema } from '#schemas';

export const teamRouter = Router();

teamRouter.get('/', teamController.getTeams);
teamRouter.post('/', validateBody(CreateTeamSchema), teamController.postTeam);
teamRouter.get('/:id', teamController.getTeam);
teamRouter.patch(
    '/:id',
    validateBody(UpdateTeamSchema),
    teamController.patchTeam,
);
teamRouter.delete('/:id', teamController.deleteTeam);
