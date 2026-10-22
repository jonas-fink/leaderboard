// Der Formatter liegt in shared/, weil der Server dieselbe Darstellung für die
// Toast-Texte braucht. Re-Export, damit die Komponenten weiter aus utils/ ziehen.
export * from '../../shared/format';

/** Punkte mit einer Nachkommastelle und deutschem Komma. */
export const formatPoints = (value: number) =>
    value.toFixed(1).replace('.', ',');

/** "1 Disziplinsieg" / "3 Disziplinsiege". */
export const winLabel = (count: number) =>
    `${count} Disziplinsieg${count === 1 ? '' : 'e'}`;
