import { Router } from 'express';
import { authController } from '#controllers';
import { validateBody } from '#middleware';
import { LoginSchema } from '#schemas';

export const authRouter = Router();

authRouter.post('/', validateBody(LoginSchema), authController.postLogin);
