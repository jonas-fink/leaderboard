const KEY = 'leaderboard.adminToken';

/**
 * Das Admin-Token liegt im `localStorage` (PROJEKT.md §9). Kein Cookie: die
 * Eingabe läuft auf einem Tablet, das den ganzen Abend offen bleibt, und ein
 * Token ohne Cookie hat auch keine CSRF-Fläche.
 *
 * Das Ablaufdatum steckt signiert im Token; der Client liest es nicht aus,
 * sondern räumt auf, wenn der Server mit 401 antwortet.
 */
export const getToken = (): string | null => localStorage.getItem(KEY);

export const setToken = (token: string): void =>
    localStorage.setItem(KEY, token);

export const clearToken = (): void => localStorage.removeItem(KEY);
