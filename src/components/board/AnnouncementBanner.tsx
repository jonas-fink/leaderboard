import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import PixelSprite from './PixelSprite';
import type { Announcement, BoardState } from '../../schemas';

interface AnnouncementBannerProps {
    toasts: Announcement[];
    standings: BoardState['standings'];
}

/**
 * Die Toasts (§7). Der Text kommt fertig gerendert vom Server — der Client
 * setzt keine Platzhalter ein und formatiert keine Werte nach.
 *
 * Ein Ereignis ohne Teilnehmer (`tournament_finished`) zeigt keinen Sprite,
 * sonst stünde dort ein Gesicht, das niemandem gehört.
 */
const AnnouncementBanner = ({ toasts, standings }: AnnouncementBannerProps) => {
    const byId = new Map(standings.map((entry) => [entry.entrantId, entry]));
    // Ohne Bewegung blendet der Banner nur ein und aus, statt hereinzufahren.
    const calm = useReducedMotion();
    const slide = calm ? 0 : 40;

    return (
        <div className="flex flex-col gap-12">
            <AnimatePresence>
                {toasts.map((toast, index) => {
                    const who = toast.entrantId
                        ? byId.get(toast.entrantId)
                        : undefined;
                    return (
                        <motion.div
                            key={`${toast.type}-${toast.entrantId ?? ''}-${index}`}
                            initial={{ opacity: 0, x: slide }}
                            animate={{ opacity: 1, x: 0 }}
                            // Ein 180 ms · aus 240 ms — das Verschwinden darf
                            // ruhiger sein als das Auftauchen (Canvas).
                            exit={{
                                opacity: 0,
                                x: slide,
                                transition: { duration: calm ? 0.15 : 0.24 },
                            }}
                            transition={{
                                duration: calm ? 0.15 : 0.18,
                                ease: [0.2, 0.8, 0.2, 1],
                            }}
                            className="flex items-stretch border-2 border-magenta bg-surface shadow-[8px_8px_0_rgb(0_0_0/0.55),0_0_36px_rgb(255_63_164/0.4)]"
                        >
                            <div className="w-12 shrink-0 bg-magenta" />
                            <div className="flex min-w-0 grow items-center gap-20 px-22 py-18">
                                {who && (
                                    <PixelSprite
                                        imageUrl={who.imageUrl}
                                        seed={who.avatarSeed}
                                        size={62}
                                        frame="border-magenta"
                                    />
                                )}
                                <div
                                    className="min-w-0 font-semibold text-ink"
                                    style={{ fontSize: 'calc(var(--u) * 24)' }}
                                >
                                    {toast.text}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default AnnouncementBanner;
