import { useRef, useState } from 'react';
import { Field } from '../form';
import { ghostButtonClass, inputClass } from '../../lib/form';
import { uploadImage } from '../../lib/api';

interface ImageFieldProps {
    label: string;
    /** Aktuelle Adresse: entweder extern oder ein eigener Upload. */
    value: string;
    onChange: (url: string) => void;
    error?: string;
    hint?: string;
}

/**
 * Bild setzen — hochladen **oder** eine Adresse eintippen.
 *
 * Der Server normalisiert jeden Upload auf 128×128 mit harten Kanten und
 * vergibt den Dateinamen neu (PROJEKT.md §8); hier landet nur die Adresse,
 * die er zurückgibt. Beide Wege bleiben offen, weil ein Team-Logo genauso
 * gut schon irgendwo liegen kann.
 */
export const ImageField = ({
    label,
    value,
    onChange,
    error,
    hint,
}: ImageFieldProps) => {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState<string | null>(null);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        setFailed(null);
        try {
            onChange(await uploadImage(file));
        } catch (cause) {
            setFailed((cause as Error).message);
        } finally {
            setBusy(false);
            // Damit dieselbe Datei nach einem Fehlschlag erneut wählbar ist.
            if (input.current) input.current.value = '';
        }
    };

    return (
        <Field label={label} error={error ?? failed ?? undefined} hint={hint}>
            <div className="flex items-center gap-3">
                {value ? (
                    <img
                        src={value}
                        alt=""
                        className="h-12 w-12 shrink-0 border-2 border-line object-cover"
                    />
                ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-dashed border-line text-xs text-ink-mute">
                        —
                    </div>
                )}

                <input
                    className={inputClass}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="https://… oder hochladen"
                />

                <input
                    ref={input}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => void pick(event.target.files?.[0])}
                />
                <button
                    type="button"
                    className={`${ghostButtonClass} shrink-0`}
                    disabled={busy}
                    onClick={() => input.current?.click()}
                >
                    {busy ? 'Lädt …' : 'Hochladen'}
                </button>
            </div>
        </Field>
    );
};
