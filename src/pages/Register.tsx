import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { Field, FormError } from '../components';
import { fieldErrors, inputClass, primaryButtonClass } from '../lib/form';
import { ApiError } from '../lib/api';
import { useRegister } from '../hooks';
import { RegisterSchema } from '../schemas';

/**
 * Registrierung, offen für jeden (specs/002, US-1). Vier Zustände: Ruhe,
 * Senden, Feldfehler (Client-Validierung wie 400/409 vom Server) und
 * Serverfehler (429 Throttle, Netzwerkfehler).
 *
 * `trap` ist der Honeypot (AC-1.5): per CSS aus dem sichtbaren Bereich
 * geschoben und `tabIndex={-1}`, damit ihn niemand mit der Tastatur trifft.
 * Ein echter Nutzer füllt ihn nie; der Server lehnt einen gefüllten Wert ab.
 */
const Register = () => {
    const navigate = useNavigate();
    const register = useRegister();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [slug, setSlug] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [trap, setTrap] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        const parsed = RegisterSchema.safeParse({
            email: email.trim(),
            password,
            slug: slug.trim(),
            displayName: displayName.trim() || undefined,
            trap: trap || undefined,
        });

        if (!parsed.success) {
            const parsedErrors = fieldErrors(parsed.error as z.ZodError);
            // Die Slug-Reservierung sitzt in einem `.refine()` auf dem
            // gesamten Objekt (kein `path`) — inhaltlich gehört sie zum
            // Slug-Feld, sonst bliebe sie unsichtbar.
            if ('' in parsedErrors) {
                parsedErrors.slug = parsedErrors[''];
                delete parsedErrors[''];
            }
            setErrors(parsedErrors);
            return;
        }

        setErrors({});
        register.mutate(parsed.data, {
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
                    KONTO ANLEGEN
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

                    <Field
                        label="Passwort"
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
                        />
                    </Field>

                    <Field
                        label="Slug"
                        error={errors.slug}
                        hint="Erscheint in der Board-Adresse, z.B. /board/dein-slug/turnier"
                    >
                        <input
                            className={inputClass}
                            value={slug}
                            onChange={(event) => setSlug(event.target.value)}
                            placeholder="future-space-kassel"
                            autoComplete="off"
                        />
                    </Field>

                    <Field
                        label="Anzeigename"
                        error={errors.displayName}
                        hint="Optional"
                    >
                        <input
                            className={inputClass}
                            value={displayName}
                            onChange={(event) =>
                                setDisplayName(event.target.value)
                            }
                        />
                    </Field>

                    {/* Honeypot — für Menschen unsichtbar, kein Tab-Stopp. */}
                    <label
                        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
                        aria-hidden="true"
                    >
                        Bitte freilassen
                        <input
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={trap}
                            onChange={(event) => setTrap(event.target.value)}
                        />
                    </label>

                    <FormError
                        error={formError ? new Error(formError) : null}
                    />

                    <button
                        type="submit"
                        disabled={register.isPending}
                        className={primaryButtonClass}
                    >
                        {register.isPending ? 'Anlegen…' : 'Konto anlegen'}
                    </button>

                    <p className="text-center text-sm text-ink-mute">
                        Schon ein Konto?{' '}
                        <Link
                            to="/login"
                            className="font-semibold text-cyan hover:underline"
                        >
                            Anmelden
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
