import { useState } from 'react';
import { IoLockClosedOutline, IoLockOpenOutline } from 'react-icons/io5';
import { login } from '../../lib/api';
import { clearToken, getToken } from '../../lib/auth';
import { inputClass, primaryButtonClass } from '../../lib/form';

/**
 * PIN-Eingabe für die schreibenden Routen (PROJEKT.md §9).
 *
 * ponytail: bewusst ein Feld in der Navbar, keine Login-Seite und kein
 * Auth-Context. Der Zustand ist ein Eintrag im localStorage, den nur diese
 * Komponente setzt — ein Kontext hätte genau einen Leser. Die richtige
 * Anmeldemaske entsteht mit `/control`.
 */
const PinLock = () => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Nur der Startwert kommt aus dem Storage; danach führt dieser State.
    const [unlocked, setUnlocked] = useState(() => getToken() !== null);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        try {
            await login({ pin });
            setPin('');
            setUnlocked(true);
        } catch (cause) {
            setError((cause as Error).message);
        }
    };

    if (unlocked) {
        return (
            <button
                type="button"
                title="Abmelden"
                aria-label="Abmelden"
                className="cursor-pointer text-gold hover:-translate-y-0.5"
                onClick={() => {
                    clearToken();
                    setUnlocked(false);
                }}
            >
                <IoLockOpenOutline size={32} />
            </button>
        );
    }

    return (
        <form onSubmit={submit} className="flex items-center gap-2">
            <IoLockClosedOutline size={32} className="text-gold" />
            <input
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="PIN"
                aria-label="Admin-PIN"
                aria-invalid={error !== null}
                title={error ?? undefined}
                className={`${inputClass} w-28`}
            />
            <button type="submit" className={primaryButtonClass}>
                OK
            </button>
        </form>
    );
};

export default PinLock;
