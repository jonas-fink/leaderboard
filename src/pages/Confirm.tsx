import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FormError } from '../components';
import { useConfirmLink } from '../hooks';

/**
 * Ziel der Bestätigungslinks (`?token=&type=verify|email`). Schickt den
 * Token einmal ab und zeigt das Ergebnis — ohne Sitzung, der Link kann auf
 * einem anderen Gerät geöffnet werden als dem angemeldeten.
 */
const Confirm = () => {
    const [params] = useSearchParams();
    const type = params.get('type') === 'email' ? 'email' : 'verify';
    const confirm = useConfirmLink(type);
    const sent = useRef(false);

    // StrictMode ruft Effekte doppelt auf; der Link soll nur einmal zählen.
    useEffect(() => {
        if (sent.current) return;
        sent.current = true;
        confirm.mutate({ token: params.get('token') ?? '' });
    }, [confirm, params]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-6">
            <div className="flex w-full max-w-sm flex-col gap-4 border-2 border-line bg-surface p-5">
                <h1 className="font-display text-[15px] tracking-[0.12em] text-ink">
                    {type === 'email' ? 'NEUE ADRESSE' : 'E-MAIL BESTÄTIGEN'}
                </h1>

                {confirm.isSuccess && (
                    <p className="text-sm text-ink-soft">
                        {type === 'email'
                            ? 'Deine neue Adresse ist bestätigt — melde dich ab jetzt damit an.'
                            : 'Danke, deine Adresse ist bestätigt.'}
                    </p>
                )}
                {confirm.isPending && (
                    <p className="text-sm text-ink-mute">Prüfe Link…</p>
                )}
                <FormError error={confirm.error} />

                <Link
                    to="/control"
                    className="font-semibold text-cyan hover:underline"
                >
                    Zum Control-Panel
                </Link>
            </div>
        </div>
    );
};

export default Confirm;
