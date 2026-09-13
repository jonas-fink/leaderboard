import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { Field, FormError } from '../components';
import { fieldErrors, inputClass, primaryButtonClass } from '../lib/form';
import { ApiError } from '../lib/api';
import { useLogin } from '../hooks';
import { LoginSchema } from '../schemas';

/**
 * Anmeldung (specs/002, AC-2.1, AC-2.2). Eine E-Mail-/Passwort-Kombination,
 * kein Hinweis, welches der beiden Felder falsch war — der Server antwortet
 * bei falschen Zugangsdaten mit derselben Meldung für beide Fälle, deshalb
 * landet dieser Fehler global und nicht an einem Feld.
 */
const Login = () => {
    const navigate = useNavigate();
    const login = useLogin();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        const parsed = LoginSchema.safeParse({ email: email.trim(), password });
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }

        setErrors({});
        login.mutate(parsed.data, {
            onSuccess: () => navigate('/control', { replace: true }),
            onError: (error) => {
                // 401 trägt bewusst keine Feldzuordnung (AC-2.2) — landet also
                // hier und nicht in `errors`.
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
                    ANMELDEN
                </h1>

                <form onSubmit={submit} className="flex flex-col gap-4 p-5">
                    <Field label="E-Mail" error={errors.email}>
                        <input
                            type="email"
                            className={inputClass}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            autoFocus
                        />
                    </Field>

                    <Field label="Passwort" error={errors.password}>
                        <input
                            type="password"
                            className={inputClass}
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            autoComplete="current-password"
                        />
                    </Field>

                    <FormError
                        error={formError ? new Error(formError) : null}
                    />

                    <button
                        type="submit"
                        disabled={login.isPending}
                        className={primaryButtonClass}
                    >
                        {login.isPending ? 'Anmelden…' : 'Anmelden'}
                    </button>

                    <p className="text-center text-sm text-ink-mute">
                        Noch kein Konto?{' '}
                        <Link
                            to="/register"
                            className="font-semibold text-cyan hover:underline"
                        >
                            Registrieren
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
