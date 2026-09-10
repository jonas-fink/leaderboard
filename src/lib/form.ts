import type { ZodError } from 'zod';

export const inputClass =
    'w-full  border-2 border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-cyan focus:ring-2 focus:ring-cyan/30';

export const labelClass =
    'mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-mute';

export const primaryButtonClass =
    'cursor-pointer  bg-surface-2 px-4 py-2 text-sm font-semibold text-gold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

export const ghostButtonClass =
    'cursor-pointer  border-2 border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-line hover:text-ink';

/** ZodError -> { 'primaryMetric.label': 'Pflichtfeld' } für die Feldanzeige. */
export const fieldErrors = (error: ZodError): Record<string, string> =>
    Object.fromEntries(
        error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );

/**
 * `time_ms` wird als mm:ss.mmm eingegeben — niemand tippt 92450 für 1:32,450.
 * Alle anderen Formate sind einfache Zahlen.
 */
export const parseTime = (input: string): number | null => {
    const match = input
        .trim()
        .match(/^(?:(\d+):)?([0-5]?\d)(?:[.,](\d{1,3}))?$/);
    if (!match) return null;
    const [, minutes = '0', seconds, millis = '0'] = match;
    return (
        Number(minutes) * 60_000 +
        Number(seconds) * 1000 +
        Number(millis.padEnd(3, '0'))
    );
};
