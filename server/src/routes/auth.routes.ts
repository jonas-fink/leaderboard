import { Router } from 'express';
import { authController } from '#controllers';
import { validateBody, requireUser } from '#middleware';
import { RegisterSchema, LoginSchema } from '#schemas';

export const authRouter = Router();

authRouter.post(
    '/register',
    validateBody(RegisterSchema),
    authController.postRegister,
);
authRouter.post('/login', validateBody(LoginSchema), authController.postLogin);
// Kein `requireUser`: ein abgelaufenes oder fehlendes Cookie soll sich auch
// löschen lassen.
authRouter.post('/logout', authController.postLogout);
// Dieser Router hängt in routes/index.ts *vor* dem globalen `requireUser` —
// `/me` braucht die Sitzung trotzdem, deshalb hier gezielt.
authRouter.get('/me', requireUser, authController.getMe);
