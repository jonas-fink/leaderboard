import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { Link } from 'react-router';
import { Field, FormError } from '../components';
import { fieldErrors, inputClass, primaryButtonClass } from '../lib/form';
import { useForgotPassword } from '../hooks';
import { ForgotPasswordSchema } from '../schemas';

/**
 * "Passwort vergessen". Der Server antwortet immer gleich, egal ob es das
 * Konto gibt — deshalb auch hier nur eine neutrale Bestätigung.
 */
const ForgotPassword = () => {
    const forgot = useForgotPassword();
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const parsed = ForgotPasswordSchema.safeParse({ email: email.trim() });
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }
        setErrors({});
        forgot.mutate(parsed.data);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
            <div className="w-full max-w-sm border-2 border-line bg-surface">
                <h1 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
                    PASSWORT VERGESSEN
                </h1>

                {forgot.isSuccess ? (
                    <p className="p-5 text-sm text-ink-soft">
                        Falls ein Konto mit dieser Adresse existiert, ist ein
                        Link zum Zurücksetzen unterwegs. Er gilt eine Stunde.
                    </p>
                ) : (
                    <form onSubmit={submit} className="flex flex-col gap-4 p-5">
                        <Field label="E-Mail" error={errors.email}>
                            <input
                                type="email"
                                className={inputClass}
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                autoComplete="email"
                                autoFocus
                            />
                        </Field>

                        <FormError error={forgot.error} />

                        <button
                            type="submit"
                            disabled={forgot.isPending}
                            className={primaryButtonClass}
                        >
                            {forgot.isPending ? 'Senden…' : 'Link senden'}
                        </button>
                    </form>
                )}

                <p className="px-5 pb-5 text-center text-sm text-ink-mute">
                    <Link
                        to="/login"
                        className="font-semibold text-cyan hover:underline"
                    >
                        Zur Anmeldung
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
