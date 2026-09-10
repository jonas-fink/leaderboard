# Scoreboard — Future Space Kassel

Dynamisches Scoreboard für die Gaming-Events des Future Space Kassel.
Eingabe und Anzeige laufen auf getrennten Geräten: auf einem Tablet werden
Punkte eingetragen, auf der Leinwand erscheint das Board ohne manuellen
Refresh.

## Für den Einstieg

Drei Dateien, in dieser Reihenfolge — sie sind die Wahrheit, nicht der Code:

| Datei             | Inhalt                                                          |
| ----------------- | --------------------------------------------------------------- |
| `PROJEKT.md`      | Datenmodell, Wertungslogik, Socket-Architektur, **Stand (§12)** |
| `KONVENTIONEN.md` | Code-Standards, Ableitungsregeln, Testkonventionen              |
| `SESSIONS.md`     | Kurzlog: was gebaut, was entschieden, was offen                 |

Was als Nächstes ansteht, steht in `PROJEKT.md` §12.

## Befehle

```bash
npm install && npm --prefix server install

npm run dev              # Client (Vite)
npm run dev:server       # API mit --watch
npm run test:server      # node --test über alle *.check.ts
npm run typecheck:server
npm run lint
npm run build

npm --prefix server run seed -- --yes   # leert die DB, legt ein Beispielturnier an
```

Das `--yes` beim Seed ist Absicht: `MONGODB_URI` zeigt auf einen gehosteten
Cluster, und das Skript leert alle Collections der Datenbank `leaderboard`.

## Aufbau

```
shared/     Zod-Vertrag und Formatter, von Client und Server geteilt
server/     Express 5, Mongoose, Wertungslogik in services/
src/        React 19, Vite, Tailwind v4, React Query
```

Konfiguration über `server/.env` (Vorlage: `server/.env.example`).
