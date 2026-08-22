import type { ZodError } from 'zod';

export const inputClass =
    'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-arcane-teal focus:ring-2 focus:ring-arcane-teal/30';

export const labelClass =
    'mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-mute';

export const primaryButtonClass =
    'cursor-pointer rounded-lg bg-linear-to-br from-runeterra-sapphire to-midnight-cobal px-4 py-2 text-sm font-semibold text-logo transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

export const ghostButtonClass =
    'cursor-pointer rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-line hover:text-ink';

/** ZodError -> { 'primaryMetric.label': 'Pflichtfeld' } für die Feldanzeige. */
export const fieldErrors = (error: ZodError): Record<string, string> =>
    Object.fromEntries(
        error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
