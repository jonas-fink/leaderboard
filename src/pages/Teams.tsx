import { useState, type SubmitEvent } from 'react';
import { Field, FormError, Modal } from '../components';
import { ghostButtonClass, inputClass, primaryButtonClass } from '../lib/form';
import {
    useCreateTeam,
    useDeleteTeam,
    useTeams,
    useUpdateTeam,
} from '../hooks';
import { useTournamentContext } from '../hooks/useTournamentContext';
import { PixelSprite } from '../components/board';
import type { Team } from '../schemas';

/** Vorauswahl aus der Palette; ein freies Feld bleibt daneben stehen. */
const SUGGESTED = [
    '#ff3fa4',
    '#21e6d8',
    '#ffd23f',
    '#8b5cf6',
    '#4ade80',
    '#ff7a45',
];

/**
 * Teams des laufenden Turniers. Teams gehören zu genau einem Turnier (§3) —
 * dieselbe Crew kann beim nächsten Event unter anderem Namen antreten, ohne
 * dass die Historie falsch wird.
 */
const Teams = () => {
    const { tournament } = useTournamentContext();
    const { data: teams = [], isLoading } = useTeams(tournament?.id);
    const createTeam = useCreateTeam();
    const updateTeam = useUpdateTeam();
    const deleteTeam = useDeleteTeam(tournament?.id ?? '');

    const [editing, setEditing] = useState<Team | null>(null);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState(SUGGESTED[0]!);

    if (!tournament) {
        return (
            <p className="border-2 border-line bg-surface p-6 text-ink-mute">
                Es gibt noch kein Turnier. Lege im Reiter TURNIER eines an.
            </p>
        );
    }

    const start = (team: Team | null) => {
        setEditing(team);
        setName(team?.name ?? '');
        setColor(team?.colorPrimary ?? SUGGESTED[0]!);
        setOpen(true);
    };

    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        const payload = { name: name.trim(), colorPrimary: color };
        if (!payload.name) return;

        const done = { onSuccess: () => setOpen(false) };
        if (editing) {
            updateTeam.mutate({ id: editing.id, patch: payload }, done);
        } else {
            createTeam.mutate(
                { ...payload, tournamentId: tournament.id, members: [] },
                done,
            );
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
                {teams.map((team) => (
                    <div
                        key={team.id}
                        className="flex items-center gap-4 border-2 border-line bg-surface p-4"
                        style={{ borderLeftColor: team.colorPrimary }}
                    >
                        {/* Der Sprite ist Board-Ware, aber hier dieselbe
                            Ableitung — sonst sähe das Team im Panel anders
                            aus als auf der Leinwand. */}
                        <div className="[--u:1px]">
                            <PixelSprite
                                imageUrl={team.bannerUrl}
                                seed={team.avatarSeed}
                                size={48}
                                frame="border-line-strong"
                            />
                        </div>
                        <div className="min-w-0 grow">
                            <div className="truncate font-semibold text-ink">
                                {team.name}
                            </div>
                            <div className="text-xs uppercase tracking-[0.12em] text-ink-mute">
                                {team.members.length} Mitglieder
                            </div>
                        </div>
                        <button
                            type="button"
                            className={ghostButtonClass}
                            onClick={() => start(team)}
                        >
                            Ändern
                        </button>
                        <button
                            type="button"
                            aria-label={`${team.name} löschen`}
                            className="cursor-pointer border-2 border-line px-2 py-1 text-ink-mute transition-colors hover:border-orange hover:text-orange"
                            onClick={() => deleteTeam.mutate(team.id)}
                        >
                            ✕
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => start(null)}
                    className="flex h-20 cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line text-ink-mute transition-colors hover:border-cyan hover:text-cyan"
                >
                    + Team anlegen
                </button>
            </div>

            {isLoading && <p className="text-ink-mute">Lade …</p>}

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Team ändern' : 'Team anlegen'}
            >
                <form onSubmit={submit} className="flex flex-col gap-5 p-5">
                    <Field label="Name">
                        <input
                            className={inputClass}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoFocus
                        />
                    </Field>

                    <Field
                        label="Balkenfarbe"
                        hint="Teamfarben kommen aus der Datenbank, nicht aus den Tokens."
                    >
                        <div className="flex items-center gap-2">
                            {SUGGESTED.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    aria-label={`Farbe ${option}`}
                                    aria-pressed={color === option}
                                    onClick={() => setColor(option)}
                                    className={`h-8 w-8 cursor-pointer border-2 ${color === option ? 'border-ink' : 'border-line'}`}
                                    style={{ backgroundColor: option }}
                                />
                            ))}
                            <input
                                type="color"
                                aria-label="Eigene Farbe"
                                value={color}
                                onChange={(event) =>
                                    setColor(event.target.value)
                                }
                                className="h-8 w-12 cursor-pointer border-2 border-line bg-transparent"
                            />
                        </div>
                    </Field>

                    <FormError
                        error={createTeam.error ?? updateTeam.error ?? null}
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
                            Speichern
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Teams;
