import { AnimatePresence } from 'motion/react';
import StandingsRow from './StandingsRow';
import { useRotation } from '../../hooks/useRotation';
import type { BoardState } from '../../schemas';

interface StandingsPanelProps {
    standings: BoardState['standings'];
    mode: BoardState['tournament']['mode'];
}

/**
 * Wie viele Zeilen gleichzeitig stehen. Mehr passen in die 690 Canvas-Pixel
 * des Panels nicht, ohne dass Name und Punktzahl auf zehn Meter unleserlich
 * werden — der Rest blättert durch, im selben 20-Sekunden-Takt wie die
 * Disziplin-Karten.
 */
const ROWS = 5;

/**
 * Die Gesamtwertung, dauerhaft sichtbar auf dem linken Drittel (§6). Wer auf
 * Seite 1 steht, ist der Rang nach — die Reihenfolge bleibt, nur der
 * Ausschnitt wandert.
 */
const StandingsPanel = ({ standings, mode }: StandingsPanelProps) => {
    const rotation = useRotation(standings, ROWS);

    return (
        // `h-full`, sonst wächst das Panel über den Rahmen hinaus, den die Seite
        // ihm gibt, und die letzte Zeile wird abgeschnitten.
        <div className="flex h-full flex-col border-2 border-line bg-surface/85 shadow-card">
            <div className="flex items-center justify-between gap-12 border-b-2 border-line bg-linear-to-r from-magenta/15 to-transparent px-18 py-14">
                <div
                    className="font-display tracking-[0.16em] text-ink"
                    style={{ fontSize: 'calc(var(--u) * 18)' }}
                >
                    GESAMTWERTUNG
                </div>
                <div className="flex items-center gap-10">
                    {rotation.pages > 1 && (
                        <div className="flex items-center gap-6">
                            {Array.from({ length: rotation.pages }, (_, i) => (
                                <div
                                    key={i}
                                    className={`h-6 ${i === rotation.page ? 'w-18 bg-magenta' : 'w-8 bg-line'}`}
                                />
                            ))}
                        </div>
                    )}
                    <div
                        className="font-semibold uppercase tracking-[0.12em] text-ink-mute"
                        style={{ fontSize: 'calc(var(--u) * 14)' }}
                    >
                        {standings.length}{' '}
                        {mode === 'team' ? 'Teams' : 'Spieler'}
                    </div>
                </div>
            </div>

            {/* min-h-0: ohne das gibt ein Flex-Kind seine Inhaltsgröße nicht auf
                und die Zeilen darin könnten nicht schrumpfen. */}
            <div className="flex min-h-0 grow flex-col gap-10 p-14">
                <AnimatePresence initial={false}>
                    {rotation.visible.map((entry) => (
                        <StandingsRow
                            key={entry.entrantId}
                            entry={entry}
                            fixedHeight={rotation.pages > 1}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StandingsPanel;
