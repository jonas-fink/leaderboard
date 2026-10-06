import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Modal } from '../Modal';
import { Field, FormError } from '../form';
import {
    fieldErrors,
    ghostButtonClass,
    parseTable,
    inputClass,
    primaryButtonClass,
} from '../../lib/form';
import {
    useCreateGame,
    useGamesOf,
    useUpdateGame,
    useTournaments,
} from '../../hooks';
import { useTournamentContext } from '../../hooks/useTournamentContext';
import { ImageField } from './ImageField';
import { CreateGameSchema, type Game } from '../../schemas';

const GENRES = ['racing', 'sports', 'arcade', 'fps', 'custom'] as const;
const FORMATTERS = ['integer', 'decimal', 'time_ms', 'currency'] as const;

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

type FormState = {
    tournamentId: string;
    title: string;
    slug: string;
    genre: string;
    coverUrl: string;
    // 'metric' (Einzelwerte, bestehend) oder 'versus' (Matches mit zwei
    // Seiten, architecture.md 001-match-wertung).
    scoring: string;
    metricLabel: string;
    metricKey: string;
    sortOrder: string;
    formatter: string;
    unit: string;
    // Leer = Tabelle des Turniers.
    pointsTable: string;
    tieMode: string;
    teamScoring: string;
};

const emptyForm: FormState = {
    tournamentId: '',
    title: '',
    slug: '',
    genre: 'arcade',
    coverUrl: '',
    scoring: 'metric',
    metricLabel: '',
    metricKey: '',
    sortOrder: 'DESC',
    formatter: 'integer',
    unit: '',
    pointsTable: '',
    tieMode: 'average',
    teamScoring: 'team',
};

const toForm = (game: Game): FormState => ({
    tournamentId: game.tournamentId,
    title: game.title,
    slug: game.slug,
    genre: game.genre,
    coverUrl: game.coverUrl ?? '',
    scoring: game.scoring,
    metricLabel: game.primaryMetric.label,
    metricKey: game.primaryMetric.key,
    sortOrder: game.primaryMetric.sortOrder,
    formatter: game.primaryMetric.formatter,
    unit: game.primaryMetric.unit ?? '',
    pointsTable: game.pointsTable?.join(', ') ?? '',
    tieMode: game.tieMode,
    teamScoring: game.teamScoring,
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

    const { data: tournaments = [] } = useTournaments();
    const { tournament: active } = useTournamentContext();
    // Solange keine Wahl getroffen wurde, gilt das Turnier aus der Kopfzeile.
    const tournamentId =
        form.tournamentId || active?.id || tournaments[0]?.id || '';

    // Vorlagen: Disziplinen aus allen anderen Turnieren, je Titel nur die
    // neueste (Turniere kommen nach Start absteigend).
    const templates = useGamesOf(
        game
            ? []
            : tournaments.filter((t) => t.id !== tournamentId).map((t) => t.id),
    ).filter(
        (item, i, all) => all.findIndex((x) => x.title === item.title) === i,
    );
    const applyTemplate = (id: string) => {
        const template = templates.find((item) => item.id === id);
        // Das Zielturnier bleibt, alles andere kommt aus der Vorlage.
        setForm({
            ...(template ? toForm(template) : emptyForm),
            tournamentId,
        });
    };
    const target = tournaments.find(
        (tournament) => tournament.id === tournamentId,
    );
    const tournamentTable = target?.pointsTable.join(', ');

    const createGame = useCreateGame();
    const updateGame = useUpdateGame();
    const pending = createGame.isPending || updateGame.isPending;
    const submitError = createGame.error ?? updateGame.error;

    const set = (key: keyof FormState) => (value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    // AC-1.1: eine Versus-Disziplin ist auf DESC festgelegt (AD-5) — das Feld
    // wird deaktiviert, nicht nur validiert, damit es gar nicht erst falsch
    // eingestellt werden kann.
    const isVersus = form.scoring === 'versus';

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        const candidate = {
            title: form.title.trim(),
            slug: (form.slug || slugify(form.title)).trim(),
            genre: form.genre,
            coverUrl: form.coverUrl.trim() || undefined,
            tournamentId,
            scoring: form.scoring,
            pinned: game?.pinned ?? false,
            weight: game?.weight ?? 1,
            boardOrder: game?.boardOrder ?? 0,
            status: game?.status ?? 'upcoming',
            pointsTable: parseTable(form.pointsTable),
            tieMode: form.tieMode,
            teamScoring: form.teamScoring,
            primaryMetric: {
                label: form.metricLabel.trim(),
                key: form.metricKey.trim() || slugify(form.metricLabel),
                sortOrder: isVersus ? 'DESC' : form.sortOrder,
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
                {templates.length > 0 && (
                    <Field
                        label="Vorlage"
                        hint="Übernimmt alle Felder einer Disziplin aus einem anderen Turnier"
                    >
                        <select
                            className={inputClass}
                            defaultValue=""
                            onChange={(e) => applyTemplate(e.target.value)}
                        >
                            <option value="">Leer beginnen</option>
                            {templates.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}

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
                    <Field
                        label="Turnier"
                        error={errors.tournamentId}
                        hint={
                            tournaments.length === 0
                                ? 'Kein Turnier vorhanden.'
                                : undefined
                        }
                    >
                        <select
                            className={inputClass}
                            value={tournamentId}
                            onChange={(e) =>
                                set('tournamentId')(e.target.value)
                            }
                            // Eine bestehende Disziplin zieht nicht um — ihre
                            // Scores tragen die Turnier-ID mit.
                            disabled={!!game}
                        >
                            {tournaments.map((tournament) => (
                                <option
                                    key={tournament.id}
                                    value={tournament.id}
                                >
                                    {tournament.title}
                                </option>
                            ))}
                        </select>
                    </Field>

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
                </div>

                <ImageField
                    label="Cover"
                    value={form.coverUrl}
                    onChange={set('coverUrl')}
                    error={errors.coverUrl}
                    hint="Hintergrundbild der Karte"
                />

                <fieldset className="space-y-4 border-2 border-line bg-surface-2/60 p-4">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-ink-mute">
                        Wertung
                    </legend>

                    <Field
                        label="Wertungsart"
                        error={errors.scoring}
                        hint={
                            isVersus
                                ? 'Ergebnisse werden als Match zweier Seiten erfasst (z. B. 3:1).'
                                : 'Ergebnisse werden als Einzelwert je Teilnehmer erfasst.'
                        }
                    >
                        <select
                            className={inputClass}
                            value={form.scoring}
                            onChange={(e) => {
                                const scoring = e.target.value;
                                setForm((prev) => ({
                                    ...prev,
                                    scoring,
                                    // AC-1.1: beim Wechsel auf versus sofort
                                    // auf DESC festlegen, nicht erst beim Absenden.
                                    sortOrder:
                                        scoring === 'versus'
                                            ? 'DESC'
                                            : prev.sortOrder,
                                }));
                            }}
                        >
                            <option value="metric">
                                Metrisch (Einzelwerte)
                            </option>
                            <option value="versus">
                                Versus (Match, zwei Seiten)
                            </option>
                        </select>
                    </Field>

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
                            hint={
                                isVersus
                                    ? 'Bei Versus-Disziplinen fest auf „mehr“ (AD-5).'
                                    : undefined
                            }
                        >
                            <select
                                className={inputClass}
                                value={isVersus ? 'DESC' : form.sortOrder}
                                disabled={isVersus}
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

                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Punktetabelle"
                            error={errors.pointsTable}
                            hint="Leer = Tabelle des Turniers"
                        >
                            <input
                                className={inputClass}
                                value={form.pointsTable}
                                onChange={(e) =>
                                    set('pointsTable')(e.target.value)
                                }
                                placeholder={tournamentTable ?? '5, 3, 1'}
                            />
                        </Field>

                        <Field
                            label="Gleichstand"
                            error={errors.tieMode}
                            hint={
                                form.tieMode === 'shared'
                                    ? 'Alle Gleichplatzierten bekommen die vollen Punkte, die nächste Gruppe den nächsten Platz.'
                                    : undefined
                            }
                        >
                            <select
                                className={inputClass}
                                value={form.tieMode}
                                onChange={(e) => set('tieMode')(e.target.value)}
                            >
                                <option value="average">Punkte mitteln</option>
                                <option value="shared">
                                    Volle Punkte (Teamchallenge)
                                </option>
                            </select>
                        </Field>
                    </div>

                    {target?.mode === 'team' && !isVersus && (
                        <Field
                            label="Wertung im Teamturnier"
                            error={errors.teamScoring}
                            hint={
                                form.teamScoring === 'players'
                                    ? 'Jeder Spieler wird einzeln platziert, sein Team bekommt die Summe der Punkte seiner Mitglieder.'
                                    : 'Ein Ergebnis je Team, das beste zählt.'
                            }
                        >
                            <select
                                className={inputClass}
                                value={form.teamScoring}
                                onChange={(e) =>
                                    set('teamScoring')(e.target.value)
                                }
                            >
                                <option value="team">Ergebnis je Team</option>
                                <option value="players">
                                    Punkte pro Spieler
                                </option>
                            </select>
                        </Field>
                    )}
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
