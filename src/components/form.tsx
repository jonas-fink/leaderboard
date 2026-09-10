import type { ReactNode } from 'react';
import { labelClass } from '../lib/form';

interface FieldProps {
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
}

export const Field = ({ label, error, hint, children }: FieldProps) => (
    <label className="block">
        <span className={labelClass}>{label}</span>
        {children}
        {error ? (
            <span className="mt-1 block text-xs font-medium text-orange">
                {error}
            </span>
        ) : hint ? (
            <span className="mt-1 block text-xs text-ink-mute">{hint}</span>
        ) : null}
    </label>
);

export const FormError = ({ error }: { error: Error | null }) =>
    error ? (
        <p className=" border-2 border-orange bg-orange/10 px-3 py-2 text-sm text-orange">
            {error.message}
        </p>
    ) : null;
