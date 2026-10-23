import { useState, type FormEvent, type ReactNode } from 'react';
import type { z } from 'zod';
import { useNavigate } from 'react-router';
import { Field, FormError, Modal } from '../components';
import {
    fieldErrors,
    ghostButtonClass,
    inputClass,
    primaryButtonClass,
} from '../lib/form';
import { ApiError } from '../lib/api';
import {
    useChangeEmail,
    useChangePassword,
    useDeleteAccount,
    useMe,
} from '../hooks';
import {
    ChangeEmailSchema,
    ChangePasswordSchema,
    DeleteAccountSchema,
} from '../schemas';

const Section = ({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) => (
    <section className="border-2 border-line bg-surface">
        <h2 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
            {title}
        </h2>
        <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
);

/** Serverfehler mit Feldzuordnung ans Feld, alles andere global. */
const splitError = (
    error: Error | null,
): { fields: Record<string, string>; form: Error | null } =>
    error instanceof ApiError && error.fieldErrors
        ? { fields: error.fieldErrors, form: null }
        : { fields: {}, form: error };

const PasswordForm = () => {
    const change = useChangePassword();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const server = splitError(change.error);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const parsed = ChangePasswordSchema.safeParse({
            currentPassword,
            newPassword,
        });
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }
        setErrors({});
        change.mutate(parsed.data, {
            onSuccess: () => {
                setCurrentPassword('');
                setNewPassword('');
            },
        });
    };

    const shown = { ...server.fields, ...errors };
    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Aktuelles Passwort" error={shown.currentPassword}>
                <input
                    type="password"
                    className={inputClass}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                />
            </Field>
            <Field
                label="Neues Passwort"
                error={shown.newPassword}
                hint="Mindestens 12 Zeichen. Andere Geräte werden abgemeldet."
            >
                <input
                    type="password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                />
            </Field>
            <FormError error={server.form} />
            {change.isSuccess && (
                <p className="text-sm text-cyan">Passwort geändert.</p>
            )}
            <button
                type="submit"
                disabled={change.isPending}
                className={`${primaryButtonClass} self-start`}
            >
                {change.isPending ? 'Speichern…' : 'Passwort ändern'}
            </button>
        </form>
    );
};

const EmailForm = () => {
    const change = useChangeEmail();
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const server = splitError(change.error);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const parsed = ChangeEmailSchema.safeParse({
            newEmail: newEmail.trim(),
            currentPassword,
        });
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }
        setErrors({});
        change.mutate(parsed.data, {
            onSuccess: () => setCurrentPassword(''),
        });
    };

    const shown = { ...server.fields, ...errors };
    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Neue E-Mail" error={shown.newEmail}>
                <input
                    type="email"
                    className={inputClass}
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    autoComplete="email"
                />
            </Field>
            <Field label="Aktuelles Passwort" error={shown.currentPassword}>
                <input
                    type="password"
                    className={inputClass}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                />
            </Field>
            <FormError error={server.form} />
            {change.isSuccess && (
                <p className="text-sm text-cyan">
                    Bestätigungslink an {newEmail} gesendet. Die Adresse
                    wechselt erst nach dem Klick.
                </p>
            )}
            <button
                type="submit"
                disabled={change.isPending}
                className={`${primaryButtonClass} self-start`}
            >
                {change.isPending ? 'Senden…' : 'Adresse ändern'}
            </button>
        </form>
    );
};

const dangerButtonClass =
    'cursor-pointer border-2 border-orange bg-orange/10 px-4 py-2 text-sm font-semibold text-orange transition-colors hover:bg-orange hover:text-bg disabled:cursor-not-allowed disabled:opacity-50';

/** Was mit dem Konto verschwindet — dieselbe Kaskade wie `deleteAccount`. */
const DELETED_DATA = [
    'alle Turniere mit ihren Teams, Disziplinen, Wertungen und Matches',
    'alle Spieler',
    'alle hochgeladenen Bilder (Avatare, Banner)',
    'die öffentlichen Board-Links — Leinwände zeigen danach nichts mehr an',
];

/**
 * Kontolöschung hinter einem eigenen Dialog statt `window.confirm`: der
 * Nutzer soll lesen, was verloren geht, und mit seinem Passwort bestätigen.
 */
const DeleteAccount = () => {
    const navigate = useNavigate();
    const remove = useDeleteAccount();
    const [open, setOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const server = splitError(remove.error);

    const close = () => {
        setOpen(false);
        setCurrentPassword('');
        setErrors({});
        remove.reset();
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const parsed = DeleteAccountSchema.safeParse({ currentPassword });
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }
        setErrors({});
        remove.mutate(parsed.data, {
            onSuccess: () => navigate('/register', { replace: true }),
        });
    };

    const shown = { ...server.fields, ...errors };
    return (
        <>
            <p className="text-sm text-ink-soft">
                Löscht dein Konto und alles, was daran hängt. Das lässt sich
                nicht rückgängig machen.
            </p>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`${dangerButtonClass} self-start`}
            >
                Konto löschen…
            </button>

            <Modal open={open} onClose={close} title="Konto endgültig löschen?">
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <div className="border-2 border-orange bg-orange/10 px-4 py-3 text-sm text-orange">
                        <p className="font-semibold">
                            Alle deine Daten werden mit deinem Konto gelöscht.
                        </p>
                        <p className="mt-1">
                            Es gibt kein Backup und keinen Papierkorb — weg ist
                            weg.
                        </p>
                    </div>

                    <div className="text-sm text-ink-soft">
                        <p>Unwiderruflich entfernt werden:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            {DELETED_DATA.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <Field
                        label="Zur Bestätigung dein Passwort"
                        error={shown.currentPassword}
                    >
                        <input
                            type="password"
                            className={inputClass}
                            value={currentPassword}
                            onChange={(event) =>
                                setCurrentPassword(event.target.value)
                            }
                            autoComplete="current-password"
                            autoFocus
                        />
                    </Field>

                    <FormError error={server.form} />

                    <div className="flex flex-wrap justify-end gap-3">
                        <button
                            type="button"
                            onClick={close}
                            className={ghostButtonClass}
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={remove.isPending}
                            className={dangerButtonClass}
                        >
                            {remove.isPending
                                ? 'Lösche…'
                                : 'Konto und alle Daten löschen'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

/** Kontoeinstellungen unter `/control/account`. */
const Account = () => {
    const { data: me } = useMe();

    return (
        <div className="flex max-w-xl flex-col gap-6">
            <Section title="KONTO">
                <p className="text-sm text-ink-soft">
                    {me?.email}{' '}
                    <span
                        className={me?.verified ? 'text-cyan' : 'text-orange'}
                    >
                        ({me?.verified ? 'bestätigt' : 'nicht bestätigt'})
                    </span>
                </p>
            </Section>
            <Section title="PASSWORT ÄNDERN">
                <PasswordForm />
            </Section>
            <Section title="E-MAIL ÄNDERN">
                <EmailForm />
            </Section>
            <Section title="KONTO LÖSCHEN">
                <DeleteAccount />
            </Section>
        </div>
    );
};

export default Account;
