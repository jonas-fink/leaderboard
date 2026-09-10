import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { Field, FormError, Modal } from '../components';
import { ghostButtonClass, inputClass, primaryButtonClass } from '../lib/form';
import { useCreateTournament, useUpdateTournament } from '../hooks';
import { useTournamentContext } from '../hooks/useTournamentContext';
import type { TournamentStatus } from '../schemas';

/** Bestätigt vom Projektleiter, je Turnier trotzdem änderbar (§4.2). */
const DEFAULT_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

const STATUS: { value: TournamentStatus; label: string; hint: string }[] = [
    { value: 'draft', label: 'ENTWURF', hint: 'Wird noch vorbereitet' },
    { value: 'live', label: 'LIVE', hint: 'Läuft — das Board zeigt es an' },
    {
        value: 'finished',
        label: 'BEENDET',
        hint: 'Löst auf dem Board die Siegerehrung aus',
    },
    { value: 'archived', label: 'ARCHIV', hint: 'Vorbei und abgelegt' },
];

const slugify = (title: string) =>
    title
        .toLowerCase()
        .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]!)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

/**
 * Turnier anlegen und seinen Status schalten. Der Statuswechsel auf
 * `finished` ist der Auslöser der Siegerehrung (§5) — deshalb steht er hier
 * und nicht in einem Menü.
 */
const Tournament = () => {
    const { tournament, tournaments } = useTournamentContext();
    const createTournament = useCreateTournament();
    const updateTournament = useUpdateTournament();

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState<'player' | 'team'>('team');

    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;

        createTournament.mutate(
            {
                slug: slugify(trimmed),
                title: trimmed,
                mode,
                startsAt: new Date().toISOString(),
                pointsTable: DEFAULT_POINTS,
                // Die Defaults stehen im Zod-Schema, der abgeleitete Typ ist
                // aber der Ausgabetyp — deshalb hier ausgeschrieben. Ein neues
                // Turnier ist ohnehin ein Entwurf, bis es jemand live schaltet.
                status: 'draft',
                tieBreak: 'olympic',
            },
            { onSuccess: () => setOpen(false) },
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {tournament && (
                <section className="border-2 border-line bg-surface">
                    <h2 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
                        {tournament.title.toUpperCase()}
                    </h2>

                    <div className="flex flex-col gap-5 p-5">
                        <div className="flex flex-wrap gap-3">
                            {STATUS.map((option) => {
                                const active =
                                    tournament.status === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={active}
                                        title={option.hint}
                                        onClick={() =>
                                            updateTournament.mutate({
                                                id: tournament.id,
                                                patch: { status: option.value },
                                            })
                                        }
                                        className={`cursor-pointer border-2 px-4 py-2 font-display text-[13px] tracking-[0.1em] transition-colors ${
                                            active
                                                ? 'border-magenta bg-magenta/15 text-ink'
                                                : 'border-line text-ink-mute hover:border-line-strong hover:text-ink-soft'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-sm text-ink-mute">
                            {
                                STATUS.find(
                                    (s) => s.value === tournament.status,
                                )?.hint
                            }
                        </p>

                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs uppercase tracking-[0.14em] text-ink-mute">
                                    Modus
                                </dt>
                                <dd className="text-ink">
                                    {tournament.mode === 'team'
                                        ? 'Team gegen Team'
                                        : 'Spieler gegen Spieler'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-[0.14em] text-ink-mute">
                                    Punktetabelle
                                </dt>
                                <dd className="font-display text-ink">
                                    {tournament.pointsTable.join(' · ')}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                to={`/board/${tournament.slug}`}
                                className={primaryButtonClass}
                            >
                                Board öffnen
                            </Link>
                            <Link
                                to={`/result/${tournament.slug}`}
                                className={ghostButtonClass}
                            >
                                Siegerehrung öffnen
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            <section className="border-2 border-line bg-surface">
                <h2 className="border-b-2 border-line px-5 py-3.5 font-display text-[15px] tracking-[0.12em] text-ink">
                    ALLE TURNIERE
                </h2>
                <ul className="divide-y divide-line">
                    {tournaments.map((item) => (
                        <li
                            key={item.id}
                            className="flex items-center gap-4 px-5 py-3"
                        >
                            <span className="grow truncate text-ink">
                                {item.title}
                            </span>
                            <span className="text-xs uppercase tracking-[0.14em] text-ink-mute">
                                {item.status}
                            </span>
                        </li>
                    ))}
                    {tournaments.length === 0 && (
                        <li className="px-5 py-6 text-ink-mute">
                            Noch kein Turnier angelegt.
                        </li>
                    )}
                </ul>
                <div className="border-t-2 border-line p-5">
                    <button
                        type="button"
                        className={primaryButtonClass}
                        onClick={() => setOpen(true)}
                    >
                        Turnier anlegen
                    </button>
                </div>
            </section>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Turnier anlegen"
            >
                <form onSubmit={submit} className="flex flex-col gap-5 p-5">
                    <Field
                        label="Titel"
                        hint={
                            title
                                ? `Adresse: /board/${slugify(title)}`
                                : undefined
                        }
                    >
                        <input
                            className={inputClass}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            autoFocus
                        />
                    </Field>

                    <Field
                        label="Modus"
                        hint="Gilt für alle Disziplinen und lässt sich später nicht sinnvoll drehen."
                    >
                        <select
                            className={inputClass}
                            value={mode}
                            onChange={(event) =>
                                setMode(event.target.value as 'player' | 'team')
                            }
                        >
                            <option value="team">Team gegen Team</option>
                            <option value="player">
                                Spieler gegen Spieler
                            </option>
                        </select>
                    </Field>

                    <FormError error={createTournament.error} />

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            className={ghostButtonClass}
                            onClick={() => setOpen(false)}
                        >
                            Abbrechen
                        </button>
                        <button type="submit" className={primaryButtonClass}>
                            Anlegen
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tournament;
