import { Router } from 'express';
import { authController } from '#controllers';
import { validateBody, requireUser } from '#middleware';
import {
    RegisterSchema,
    LoginSchema,
    TokenSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
    ChangePasswordSchema,
    ChangeEmailSchema,
    DeleteAccountSchema,
} from '#schemas';

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
authRouter.delete(
    '/me',
    requireUser,
    validateBody(DeleteAccountSchema),
    authController.deleteMe,
);

// Kontosicherheit. Die Links aus Mails kommen ohne Sitzung an, deshalb sind
// die Bestätigungen öffentlich — der signierte Token ist der Ausweis.
authRouter.post(
    '/verify',
    validateBody(TokenSchema),
    authController.postVerify,
);
authRouter.post('/verify/resend', requireUser, authController.postVerifyResend);
authRouter.post(
    '/password/forgot',
    validateBody(ForgotPasswordSchema),
    authController.postForgotPassword,
);
authRouter.post(
    '/password/reset',
    validateBody(ResetPasswordSchema),
    authController.postResetPassword,
);
authRouter.post(
    '/password',
    requireUser,
    validateBody(ChangePasswordSchema),
    authController.postChangePassword,
);
authRouter.post(
    '/email',
    requireUser,
    validateBody(ChangeEmailSchema),
    authController.postChangeEmail,
);
authRouter.post(
    '/email/confirm',
    validateBody(TokenSchema),
    authController.postConfirmEmail,
);
