import { useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { Modal } from './Modal';
import { Field, FormError } from './form';
import {
    fieldErrors,
    ghostButtonClass,
    inputClass,
    primaryButtonClass,
} from '../lib/form';
import { useCreatePlayer, useUpdatePlayer } from '../hooks';
import { CreatePlayerSchema, type Player } from '../schemas';

interface PlayerFormModalProps {
    open: boolean;
    onClose: () => void;
    player?: Player;
}

export const PlayerFormModal = ({
    open,
    onClose,
    player,
}: PlayerFormModalProps) => {
    const [username, setUsername] = useState(player?.username ?? '');
    const [avatarUrl, setAvatarUrl] = useState(player?.avatarUrl ?? '');
    const [countryCode, setCountryCode] = useState(player?.countryCode ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createPlayer = useCreatePlayer();
    const updatePlayer = useUpdatePlayer();
    const pending = createPlayer.isPending || updatePlayer.isPending;
    const submitError = createPlayer.error ?? updatePlayer.error;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const parsed = CreatePlayerSchema.safeParse({
            username: username.trim(),
            avatarUrl: avatarUrl.trim() || undefined,
            countryCode: countryCode.trim() || undefined,
        });

        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }

        setErrors({});
        const done = { onSuccess: () => onClose() };
        if (player) {
            updatePlayer.mutate({ id: player.id, patch: parsed.data }, done);
        } else {
            createPlayer.mutate(parsed.data, done);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={player ? 'Spieler bearbeiten' : 'Neuer Spieler'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Name" error={errors.username}>
                    <input
                        className={inputClass}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Alice"
                        autoFocus
                    />
                </Field>

                <Field label="Avatar-URL" error={errors.avatarUrl}>
                    <input
                        className={inputClass}
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://…"
                    />
                </Field>

                <Field
                    label="Land"
                    error={errors.countryCode}
                    hint="Zwei Buchstaben, z.B. DE"
                >
                    <input
                        className={`${inputClass} uppercase`}
                        value={countryCode}
                        maxLength={2}
                        onChange={(e) => setCountryCode(e.target.value)}
                        placeholder="DE"
                    />
                </Field>

                <FormError error={submitError} />

                <div className="flex justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className={ghostButtonClass}
                    >
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        disabled={pending}
                        className={primaryButtonClass}
                    >
                        {pending ? 'Speichern…' : 'Speichern'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
