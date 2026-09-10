import { AnimatePresence } from 'motion/react';
import StandingsRow from './StandingsRow';
import type { BoardState } from '../../schemas';

interface StandingsPanelProps {
    standings: BoardState['standings'];
    mode: BoardState['tournament']['mode'];
}

/**
 * Die Gesamtwertung, dauerhaft sichtbar auf dem linken Drittel (§6). Sie ist
 * der einzige Teil des Boards, der nie rotiert — wer hier steht, steht hier.
 */
const StandingsPanel = ({ standings, mode }: StandingsPanelProps) => (
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
            <div
                className="font-semibold uppercase tracking-[0.12em] text-ink-mute"
                style={{ fontSize: 'calc(var(--u) * 14)' }}
            >
                {standings.length} {mode === 'team' ? 'Teams' : 'Spieler'}
            </div>
        </div>

        {/* min-h-0: ohne das gibt ein Flex-Kind seine Inhaltsgröße nicht auf
            und die Zeilen darin könnten nicht schrumpfen. */}
        <div className="flex min-h-0 grow flex-col gap-10 p-14">
            <AnimatePresence initial={false}>
                {standings.map((entry) => (
                    <StandingsRow key={entry.entrantId} entry={entry} />
                ))}
            </AnimatePresence>
        </div>
    </div>
);

export default StandingsPanel;
