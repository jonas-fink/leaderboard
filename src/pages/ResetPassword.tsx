import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Field, FormError } from '../components';
import { fieldErrors, inputClass, primaryButtonClass } from '../lib/form';
import { ApiError } from '../lib/api';
import { useResetPassword } from '../hooks';
import { ResetPasswordSchema } from '../schemas';

/**
 * Ziel des Reset-Links aus der Mail (`?token=`). Nach Erfolg ist man
 * angemeldet, alle anderen Sitzungen sind abgemeldet.
 */
const ResetPassword = () => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const reset = useResetPassword();

    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);
        const parsed = ResetPasswordSchema.safeParse({
            token: params.get('token') ?? '',
            password,
        });
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }
        setErrors({});
        reset.mutate(parsed.data, {
            onSuccess: () => navigate('/control', { replace: true }),
            onError: (error) => {
                if (error instanceof ApiError && error.fieldErrors) {
                    setErrors(error.fieldErrors);
                } else {
                    setFormError(error.message);
                }
            },
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
            <div className="w-full max-w-sm border-2 border-line bg-surface">
                <h1 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
                    NEUES PASSWORT
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-4 p-5">
                    <Field
                        label="Neues Passwort"
                        error={errors.password}
                        hint="Mindestens 12 Zeichen"
                    >
                        <input
                            type="password"
                            className={inputClass}
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            autoComplete="new-password"
                            autoFocus
                        />
                    </Field>

                    {/* Ein fehlender Token ist kein Feld, das man korrigieren kann. */}
                    <FormError
                        error={
                            formError || errors.token
                                ? new Error(formError ?? 'Link ungültig')
                                : null
                        }
                    />

                    <button
                        type="submit"
                        disabled={reset.isPending}
                        className={primaryButtonClass}
                    >
                        {reset.isPending ? 'Speichern…' : 'Passwort setzen'}
                    </button>

                    <p className="text-center text-sm text-ink-mute">
                        Link abgelaufen?{' '}
                        <Link
                            to="/forgot-password"
                            className="font-semibold text-cyan hover:underline"
                        >
                            Neuen anfordern
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
