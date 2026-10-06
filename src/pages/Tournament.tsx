import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { Field, FormError, Modal } from '../components';
import {
    ghostButtonClass,
    inputClass,
    parseTable,
    primaryButtonClass,
} from '../lib/form';
import {
    useCreateTournament,
    useDeleteTournament,
    useMe,
    useUpdateTournament,
} from '../hooks';
import {
    selectTournament,
    useTournamentContext,
} from '../hooks/useTournamentContext';
import { CreateTournamentSchema, type TournamentStatus } from '../schemas';

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
    const { data: me } = useMe();
    const createTournament = useCreateTournament();
    const updateTournament = useUpdateTournament();
    const deleteTournament = useDeleteTournament();
    // Zweistufig wie beim Spieler: erst "Löschen", dann bestätigen. Gemerkt
    // wird die ID, damit nur die angeklickte Zeile umschaltet.
    const [confirmId, setConfirmId] = useState<string | null>(null);

    const [open, setOpen] = useState(false);
    // Dasselbe Formular legt an und bearbeitet; beim Bearbeiten ohne Modus
    // (die Scores tragen ihn) und ohne neuen Slug (Board-Links bleiben).
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState<'player' | 'team'>('team');
    const [table, setTable] = useState(DEFAULT_POINTS.join(', '));
    const [tableError, setTableError] = useState<string>();

    const openForm = (edit: boolean) => {
        setEditing(edit);
        setTitle(edit && tournament ? tournament.title : '');
        setTable(
            (edit && tournament ? tournament.pointsTable : DEFAULT_POINTS).join(
                ', ',
            ),
        );
        setTableError(undefined);
        setOpen(true);
    };

    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;

        // Vorab prüfen, damit der Grund am Feld steht statt als pauschales
        // "Validierung fehlgeschlagen" vom Server. Leer = Standardtabelle.
        const pointsTable = CreateTournamentSchema.shape.pointsTable.safeParse(
            parseTable(table) ?? DEFAULT_POINTS,
        );
        if (!pointsTable.success) {
            setTableError(pointsTable.error.issues[0]?.message);
            return;
        }
        setTableError(undefined);

        if (editing && tournament) {
            updateTournament.mutate(
                {
                    id: tournament.id,
                    patch: { title: trimmed, pointsTable: pointsTable.data },
                },
                { onSuccess: () => setOpen(false) },
            );
            return;
        }

        createTournament.mutate(
            {
                slug: slugify(trimmed),
                title: trimmed,
                mode,
                startsAt: new Date().toISOString(),
                pointsTable: pointsTable.data,
                // Die Defaults stehen im Zod-Schema, der abgeleitete Typ ist
                // aber der Ausgabetyp — deshalb hier ausgeschrieben. Ein neues
                // Turnier ist ohnehin ein Entwurf, bis es jemand live schaltet.
                status: 'draft',
                tieBreak: 'olympic',
            },
            {
                // Ein neues Turnier will man direkt bespielen.
                onSuccess: (created) => {
                    selectTournament(created.id);
                    setOpen(false);
                },
            },
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

                        {me && (
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    to={`/board/${me.slug}/${tournament.slug}`}
                                    className={primaryButtonClass}
                                >
                                    Board öffnen
                                </Link>
                                <button
                                    type="button"
                                    className={ghostButtonClass}
                                    onClick={() => openForm(true)}
                                >
                                    Bearbeiten
                                </button>
                                <Link
                                    to={`/result/${me.slug}/${tournament.slug}`}
                                    className={ghostButtonClass}
                                >
                                    Siegerehrung öffnen
                                </Link>
                            </div>
                        )}
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
                            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                        >
                            <span className="min-w-0 grow basis-full truncate text-ink sm:basis-0">
                                {item.title}
                            </span>
                            <span className="text-xs uppercase tracking-[0.14em] text-ink-mute">
                                {item.status}
                            </span>
                            {item.id === tournament?.id ? (
                                <span className="w-20 text-center text-xs uppercase tracking-[0.14em] text-magenta">
                                    Aktiv
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className={`${ghostButtonClass} w-20`}
                                    onClick={() => selectTournament(item.id)}
                                >
                                    Öffnen
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={deleteTournament.isPending}
                                onClick={() =>
                                    confirmId === item.id
                                        ? deleteTournament.mutate(item.id, {
                                              onSettled: () =>
                                                  setConfirmId(null),
                                          })
                                        : setConfirmId(item.id)
                                }
                                onBlur={() =>
                                    setConfirmId((id) =>
                                        id === item.id ? null : id,
                                    )
                                }
                                className={`cursor-pointer border-2 px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                                    confirmId === item.id
                                        ? 'border-orange bg-orange/80 text-ink hover:bg-orange'
                                        : 'border-orange text-orange hover:bg-orange/10'
                                }`}
                            >
                                {confirmId === item.id
                                    ? 'Wirklich löschen? Alles darin geht mit.'
                                    : 'Löschen'}
                            </button>
                        </li>
                    ))}
                    {tournaments.length === 0 && (
                        <li className="px-5 py-6 text-ink-mute">
                            Noch kein Turnier angelegt.
                        </li>
                    )}
                </ul>
                <div className="flex flex-col gap-3 border-t-2 border-line p-5">
                    <FormError error={deleteTournament.error} />
                    <button
                        type="button"
                        className={`${primaryButtonClass} self-start`}
                        onClick={() => openForm(false)}
                    >
                        Turnier anlegen
                    </button>
                </div>
            </section>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Turnier bearbeiten' : 'Turnier anlegen'}
            >
                <form onSubmit={submit} className="flex flex-col gap-5 p-5">
                    <Field
                        label="Titel"
                        hint={
                            editing
                                ? 'Die Board-Adresse bleibt gleich.'
                                : title
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

                    {!editing && (
                        <Field
                            label="Modus"
                            hint="Gilt für alle Disziplinen und lässt sich später nicht sinnvoll drehen."
                        >
                            <select
                                className={inputClass}
                                value={mode}
                                onChange={(event) =>
                                    setMode(
                                        event.target.value as 'player' | 'team',
                                    )
                                }
                            >
                                <option value="team">Team gegen Team</option>
                                <option value="player">
                                    Spieler gegen Spieler
                                </option>
                            </select>
                        </Field>
                    )}

                    <Field
                        label="Punktetabelle"
                        error={tableError}
                        hint={
                            editing
                                ? 'Gilt sofort für alle bisherigen Ergebnisse — die Gesamtwertung wird neu berechnet.'
                                : 'Punkte für Platz 1, 2, 3 … — z. B. 5, 3, 1 belohnt nur die ersten drei. Disziplinen können eine eigene haben.'
                        }
                    >
                        <input
                            className={inputClass}
                            value={table}
                            onChange={(event) => setTable(event.target.value)}
                            placeholder={DEFAULT_POINTS.join(', ')}
                        />
                    </Field>

                    <FormError
                        error={
                            editing
                                ? updateTournament.error
                                : createTournament.error
                        }
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            className={ghostButtonClass}
                            onClick={() => setOpen(false)}
                        >
                            Abbrechen
                        </button>
                        <button type="submit" className={primaryButtonClass}>
                            {editing ? 'Speichern' : 'Anlegen'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Tournament;
