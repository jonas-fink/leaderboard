import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import PixelSprite from './PixelSprite';
import StandingsRow from './StandingsRow';
import type { BoardState } from '../../schemas';
import { formatPoints, winLabel } from '../../utils';

interface RevealStageProps {
    standings: BoardState['standings'];
    /** 0 = Vorspann, 1 = letzter Platz, `standings.length` = Sieger. */
    step: number;
    played: Map<string, number>;
    gameCount: number;
    teams: boolean;
}

/** Wie viele schon aufgedeckte Plätze rechts stehen bleiben. */
// ponytail: ältere fallen raus — Blättern erst, wenn jemand sie vermisst.
const TRAIL = 6;

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Die Siegerehrung Schritt für Schritt: vom letzten Platz aufwärts, ein Platz
 * je Tastendruck. Erst steht die Rangzahl allein, Name und Punkte kommen mit
 * Verzögerung — die kurze Pause ist die Spannung. Der Sieger wartet länger.
 */
const RevealStage = ({
    standings,
    step,
    played,
    gameCount,
    teams,
}: RevealStageProps) => {
    const calm = useReducedMotion();
    const total = standings.length;
    const current = step > 0 ? standings[total - step] : undefined;
    // Alles, was vorher aufgedeckt wurde — die Wertung ist nach Rang sortiert,
    // der Beste steht also oben.
    const trail = standings.slice(total - step + 1).slice(0, TRAIL);

    const winner = current?.rank === 1;
    const pause = calm ? 0 : winner ? 1.4 : 0.6;
    const appear = (delay: number) => ({
        initial: calm ? { opacity: 0 } : { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: calm ? 0.15 : 0.32, ease: EASE, delay },
    });

    return (
        <>
            <div className="absolute left-40 top-130 flex h-690 w-900 items-center justify-center">
                <AnimatePresence mode="wait">
                    {current ? (
                        <motion.div
                            key={current.entrantId}
                            initial={
                                calm
                                    ? { opacity: 0 }
                                    : {
                                          opacity: 0,
                                          scale: winner ? 0.85 : 0.95,
                                      }
                            }
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.15 },
                            }}
                            transition={{
                                duration: calm ? 0.15 : winner ? 0.6 : 0.24,
                                ease: EASE,
                            }}
                            className={`flex w-820 flex-col items-center gap-24 border-2 px-40 py-40 ${
                                winner
                                    ? 'border-gold bg-linear-160 from-gold/20 to-surface/90 shadow-[8px_8px_0_rgb(0_0_0/0.5),0_0_60px_rgb(255_210_63/0.4)]'
                                    : current.rank <= 3
                                      ? 'border-cyan bg-surface/90 shadow-[8px_8px_0_rgb(0_0_0/0.5)]'
                                      : 'border-line bg-surface/90 shadow-[8px_8px_0_rgb(0_0_0/0.5)]'
                            }`}
                        >
                            <div className="flex flex-col items-center gap-6">
                                <div
                                    className={`font-display tracking-[0.24em] ${winner ? 'text-gold' : 'text-ink-soft'}`}
                                    style={{ fontSize: 'calc(var(--u) * 18)' }}
                                >
                                    {winner ? 'GESAMTSIEGER' : 'PLATZ'}
                                </div>
                                <div
                                    className={`font-display leading-none ${winner ? 'text-gold [text-shadow:0_0_28px_rgb(255_210_63/0.6)]' : 'text-ink'}`}
                                    style={{ fontSize: 'calc(var(--u) * 120)' }}
                                >
                                    {current.rank}
                                </div>
                            </div>

                            <motion.div
                                {...appear(pause)}
                                className="flex min-w-0 max-w-full items-center gap-24"
                            >
                                <PixelSprite
                                    imageUrl={current.imageUrl}
                                    seed={current.avatarSeed}
                                    size={112}
                                    frame={
                                        winner
                                            ? 'border-magenta'
                                            : 'border-cyan'
                                    }
                                />
                                <div
                                    className="truncate font-bold uppercase leading-[1.05] tracking-[0.03em] text-ink"
                                    style={{ fontSize: 'calc(var(--u) * 48)' }}
                                >
                                    {current.name}
                                </div>
                            </motion.div>

                            <motion.div
                                {...appear(pause + (calm ? 0 : 0.3))}
                                className="flex flex-col items-center gap-8"
                            >
                                <div className="flex items-baseline gap-12">
                                    <div
                                        className={`font-display ${winner ? 'text-gold' : 'text-ink'}`}
                                        style={{
                                            fontSize: 'calc(var(--u) * 44)',
                                        }}
                                    >
                                        {formatPoints(current.points)}
                                    </div>
                                    <div
                                        className="font-semibold uppercase tracking-[0.14em] text-ink-soft"
                                        style={{
                                            fontSize: 'calc(var(--u) * 16)',
                                        }}
                                    >
                                        Punkte
                                    </div>
                                </div>
                                <div
                                    className="font-semibold uppercase tracking-widest text-ink-soft"
                                    style={{ fontSize: 'calc(var(--u) * 16)' }}
                                >
                                    {winLabel(current.rankCounts[0] ?? 0)} · in{' '}
                                    {played.get(current.entrantId) ?? 0} von{' '}
                                    {gameCount} angetreten
                                </div>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.15 },
                            }}
                            className="flex flex-col items-center gap-28"
                        >
                            <div
                                className="font-display tracking-[0.12em] text-ink [text-shadow:0_0_20px_rgb(255_210_63/0.5)]"
                                style={{ fontSize: 'calc(var(--u) * 56)' }}
                            >
                                WER HOLT DEN TITEL?
                            </div>
                            <div
                                className="font-semibold uppercase tracking-[0.16em] text-ink-soft"
                                style={{ fontSize: 'calc(var(--u) * 20)' }}
                            >
                                {total} {teams ? 'Teams' : 'Spieler'} ·{' '}
                                {gameCount} Disziplinen
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bereits aufgedeckt — die Zeilen rücken mit `layout` nach unten. */}
            <div className="absolute left-980 top-130 flex w-580 flex-col gap-12">
                <AnimatePresence initial={false}>
                    {trail.map((entry) => (
                        <motion.div
                            key={entry.entrantId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StandingsRow entry={entry} fixedHeight />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Bedienhinweis für den Moderator, im Stil der Board-Statuszeile */}
            <div className="absolute inset-x-40 bottom-34 flex h-46 items-center justify-between gap-20 border-2 border-line bg-surface/90 px-18">
                <div
                    className="font-semibold uppercase tracking-[0.16em] text-ink-mute"
                    style={{ fontSize: 'calc(var(--u) * 13)' }}
                >
                    Leertaste · Weiter &nbsp;&nbsp; ← · Zurück &nbsp;&nbsp; Esc
                    · Überspringen
                </div>
                <div
                    className="font-display tracking-[0.12em] text-cyan"
                    style={{ fontSize: 'calc(var(--u) * 13)' }}
                >
                    {step} / {total}
                </div>
            </div>
        </>
    );
};

export default RevealStage;
