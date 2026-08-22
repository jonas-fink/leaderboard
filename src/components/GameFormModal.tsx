import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Modal } from './Modal';
import { Field, FormError } from './form';
import {
    fieldErrors,
    ghostButtonClass,
    inputClass,
    primaryButtonClass,
} from '../lib/form';
import { useCreateGame, useUpdateGame } from '../hooks';
import { CreateGameSchema, type Game } from '../schemas';

const GENRES = ['racing', 'sports', 'arcade', 'fps', 'custom'] as const;
const TIMEFRAMES = ['all_time', 'season', 'monthly', 'weekly'] as const;
const FORMATTERS = ['integer', 'decimal', 'time_ms', 'currency'] as const;

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

type FormState = {
    title: string;
    slug: string;
    genre: string;
    coverUrl: string;
    timeframe: string;
    metricLabel: string;
    metricKey: string;
    sortOrder: string;
    formatter: string;
    unit: string;
};

const emptyForm: FormState = {
    title: '',
    slug: '',
    genre: 'arcade',
    coverUrl: '',
    timeframe: 'all_time',
    metricLabel: '',
    metricKey: '',
    sortOrder: 'DESC',
    formatter: 'integer',
    unit: '',
};

const toForm = (game: Game): FormState => ({
    title: game.title,
    slug: game.slug,
    genre: game.genre,
    coverUrl: game.coverUrl ?? '',
    timeframe: game.timeframe,
    metricLabel: game.primaryMetric.label,
    metricKey: game.primaryMetric.key,
    sortOrder: game.primaryMetric.sortOrder,
    formatter: game.primaryMetric.formatter,
    unit: game.primaryMetric.unit ?? '',
});

interface GameFormModalProps {
    open: boolean;
    onClose: () => void;
    /** Gesetzt = Bearbeiten, leer = Anlegen. */
    game?: Game;
}

export const GameFormModal = ({ open, onClose, game }: GameFormModalProps) => {
    const [form, setForm] = useState<FormState>(() =>
        game ? toForm(game) : emptyForm,
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    const createGame = useCreateGame();
    const updateGame = useUpdateGame();
    const pending = createGame.isPending || updateGame.isPending;
    const submitError = createGame.error ?? updateGame.error;

    const set = (key: keyof FormState) => (value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const candidate = {
            title: form.title.trim(),
            slug: (form.slug || slugify(form.title)).trim(),
            genre: form.genre,
            coverUrl: form.coverUrl.trim() || undefined,
            timeframe: form.timeframe,
            pinned: game?.pinned ?? false,
            primaryMetric: {
                label: form.metricLabel.trim(),
                key: form.metricKey.trim() || slugify(form.metricLabel),
                sortOrder: form.sortOrder,
                formatter: form.formatter,
                unit: form.unit.trim() || undefined,
            },
        };

        const parsed = CreateGameSchema.safeParse(candidate);
        if (!parsed.success) {
            setErrors(fieldErrors(parsed.error as z.ZodError));
            return;
        }

        setErrors({});
        const done = { onSuccess: () => onClose() };
        if (game) {
            updateGame.mutate({ id: game.id, patch: parsed.data }, done);
        } else {
            createGame.mutate(parsed.data, done);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={game ? 'Game bearbeiten' : 'Neues Game'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Titel" error={errors.title}>
                    <input
                        className={inputClass}
                        value={form.title}
                        onChange={(e) => {
                            const title = e.target.value;
                            setForm((prev) => ({
                                ...prev,
                                title,
                                // Slug folgt dem Titel, bis er von Hand geändert wird.
                                slug:
                                    prev.slug === slugify(prev.title)
                                        ? slugify(title)
                                        : prev.slug,
                            }));
                        }}
                        placeholder="Rocket League"
                        autoFocus
                    />
                </Field>

                <Field
                    label="Slug"
                    error={errors.slug}
                    hint="Teil der URL, nur Kleinbuchstaben und Bindestriche"
                >
                    <input
                        className={inputClass}
                        value={form.slug}
                        onChange={(e) => set('slug')(e.target.value)}
                        placeholder="rocket-league"
                    />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Genre" error={errors.genre}>
                        <select
                            className={inputClass}
                            value={form.genre}
                            onChange={(e) => set('genre')(e.target.value)}
                        >
                            {GENRES.map((genre) => (
                                <option key={genre} value={genre}>
                                    {genre}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Zeitraum" error={errors.timeframe}>
                        <select
                            className={inputClass}
                            value={form.timeframe}
                            onChange={(e) => set('timeframe')(e.target.value)}
                        >
                            {TIMEFRAMES.map((timeframe) => (
                                <option key={timeframe} value={timeframe}>
                                    {timeframe.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field
                    label="Cover-URL"
                    error={errors.coverUrl}
                    hint="Hintergrundbild der Karte"
                >
                    <input
                        className={inputClass}
                        value={form.coverUrl}
                        onChange={(e) => set('coverUrl')(e.target.value)}
                        placeholder="https://…"
                    />
                </Field>

                <fieldset className="space-y-4 rounded-xl border border-line bg-surface-2/60 p-4">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-mute">
                        Wertung
                    </legend>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Metrik"
                            error={errors['primaryMetric.label']}
                        >
                            <input
                                className={inputClass}
                                value={form.metricLabel}
                                onChange={(e) => {
                                    const metricLabel = e.target.value;
                                    setForm((prev) => ({
                                        ...prev,
                                        metricLabel,
                                        metricKey:
                                            prev.metricKey ===
                                            slugify(prev.metricLabel)
                                                ? slugify(metricLabel)
                                                : prev.metricKey,
                                    }));
                                }}
                                placeholder="Tore"
                            />
                        </Field>

                        <Field
                            label="Einheit"
                            error={errors['primaryMetric.unit']}
                        >
                            <input
                                className={inputClass}
                                value={form.unit}
                                onChange={(e) => set('unit')(e.target.value)}
                                placeholder="Pkt."
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Besser ist"
                            error={errors['primaryMetric.sortOrder']}
                        >
                            <select
                                className={inputClass}
                                value={form.sortOrder}
                                onChange={(e) =>
                                    set('sortOrder')(e.target.value)
                                }
                            >
                                <option value="DESC">
                                    mehr (Tore, Punkte)
                                </option>
                                <option value="ASC">weniger (Zeit)</option>
                            </select>
                        </Field>

                        <Field
                            label="Darstellung"
                            error={errors['primaryMetric.formatter']}
                        >
                            <select
                                className={inputClass}
                                value={form.formatter}
                                onChange={(e) =>
                                    set('formatter')(e.target.value)
                                }
                            >
                                {FORMATTERS.map((formatter) => (
                                    <option key={formatter} value={formatter}>
                                        {formatter}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                </fieldset>

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
