import { Link } from 'react-router';
import type { ReactNode } from 'react';

interface ExitLinkProps {
    children: ReactNode;
    /** Token-Klasse der Kopfzeile; das Board trägt Magenta, die Ehrung Gold. */
    tone?: string;
}

/**
 * Der Rückweg von der Leinwand ins Control-Panel.
 *
 * `/board` und `/result` sind bedienelementfrei (PROJEKT.md §2) — der Rechner
 * am Beamer soll die Seite öffnen und nicht mehr angefasst werden. Deshalb
 * kommt hier nichts hinzu: die Kopfzeile, die ohnehin über dem Turniernamen
 * steht, ist der Link. Der Pfeil liegt außerhalb des Textflusses und
 * erscheint erst beim Überfahren, damit auf der Leinwand kein Zeichen mehr
 * steht als vorher.
 */
const ExitLink = ({ children, tone = 'text-magenta' }: ExitLinkProps) => (
    <Link
        to="/control"
        aria-label="Zurück zum Control-Panel"
        // py/-my vergrößert die Trefferfläche, ohne im Layout etwas zu
        // verschieben: die Zeile ist sonst nur zwölf Pixel hoch.
        className={`group relative -my-10 w-fit py-10 font-display uppercase tracking-[0.34em] transition-colors hover:text-cyan ${tone}`}
        style={{ fontSize: 'calc(var(--u) * 13)' }}
    >
        <span
            aria-hidden
            className="absolute top-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            style={{ left: 'calc(var(--u) * -22)' }}
        >
            ←
        </span>
        {children}
    </Link>
);

export default ExitLink;
