// Der Formatter liegt in shared/, weil der Server dieselbe Darstellung für die
// Toast-Texte braucht. Re-Export, damit die Komponenten weiter aus utils/ ziehen.
export * from '../../shared/format';
