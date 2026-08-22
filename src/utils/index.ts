import type { MetricConfig } from '../types';

export const formatMetricValue = (
    value: number,
    config: MetricConfig,
): string => {
    switch (config.formatter) {
        case 'time_ms': {
            const minutes = Math.floor(value / 60000);
            const seconds = Math.floor((value % 60000) / 1000);
            const ms = Math.floor(value % 1000);
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
        }
        case 'integer':
            return `${value.toLocaleString('de-DE')} ${config.unit ?? ''}`.trim();
        case 'decimal':
            return `${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${config.unit ?? ''}`.trim();
        default:
            return `${value} ${config.unit ?? ''}`.trim();
    }
};
