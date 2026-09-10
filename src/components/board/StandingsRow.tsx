import { motion, useReducedMotion } from 'motion/react';
import PixelSprite from './PixelSprite';
import type { StandingsEntry } from '../../schemas';

interface StandingsRowProps {
    entry: StandingsEntry;
}

/**
 * Eine Zeile der Gesamtwertung. Platz 1 trägt Gold und einen Glow, alle
 * anderen den ruhigen Rahmen — die Leinwand soll auf zehn Meter zeigen, wer
 * führt, ohne dass man die Rangzahl liest.
 *
 * `layout` animiert die Positionsänderung; die Balkenlänge läuft mit
 * derselben Dauer, damit Sprung und Balken eine Bewegung sind.
 */
const StandingsRow = ({ entry }: StandingsRowProps) => {
    const leading = entry.rank === 1;
    // Wer weniger Bewegung will, bekommt keinen Sprung, sondern eine Blende
    // (KONVENTIONEN §9.3): kein `layout`, kürzere Dauer, nur Deckkraft.
    const calm = useReducedMotion();
    const move = calm
        ? { duration: 0.15 }
        : { duration: 0.42, ease: [0.2, 0.8, 0.2, 1] as const };

    return (
        <motion.div
            layout={!calm}
            transition={move}
            className={`flex h-96 items-center gap-16 border-2 px-16 ${
                leading
                    ? 'border-gold bg-gold/15 shadow-[0_0_24px_rgb(255_210_63/0.28)]'
                    : 'border-line bg-surface-2/60'
            }`}
        >
            <div
                className={`w-46 text-center font-display ${leading ? 'text-gold' : 'text-ink-soft'}`}
                style={{
                    fontSize: `calc(var(--u) * ${leading ? 36 : 32})`,
                }}
            >
                {entry.rank}
            </div>

            <PixelSprite
                imageUrl={entry.imageUrl}
                seed={entry.avatarSeed}
                size={56}
                frame={leading ? 'border-magenta' : 'border-cyan'}
            />

            <div className="flex min-w-0 grow flex-col gap-9">
                <div
                    className="truncate font-bold uppercase tracking-[0.05em] text-ink"
                    style={{ fontSize: 'calc(var(--u) * 23)' }}
                >
                    {entry.name}
                </div>
                <div className="h-14 border border-line bg-surface-2">
                    <motion.div
                        className="h-full"
                        // Teamfarbe kommt aus der Datenbank und ist von den
                        // Tokens ausgenommen (KONVENTIONEN §9.3).
                        style={{
                            backgroundColor:
                                entry.color ??
                                (leading
                                    ? 'var(--color-gold)'
                                    : 'var(--color-cyan)'),
                            backgroundImage:
                                'repeating-linear-gradient(90deg, rgb(11 6 32 / 0.45) 0 1px, transparent 1px 8px)',
                        }}
                        animate={{ width: `${entry.share * 100}%` }}
                        transition={{
                            duration: 0.42,
                            ease: [0.2, 0.8, 0.2, 1],
                        }}
                    />
                </div>
            </div>

            <div
                className="w-104 text-right font-display text-ink"
                style={{ fontSize: 'calc(var(--u) * 24)' }}
            >
                {entry.points.toFixed(1).replace('.', ',')}
            </div>
        </motion.div>
    );
};

export default StandingsRow;
