# 002 — Benutzerkonten und Mandantentrennung · Tasks

001 muss vollständig und committet sein, bevor hier begonnen wird — `BE-6`
berührt dieselben Controller wie `001/BE-5`.

Reihenfolge: Identität (BE-1..BE-5), dann Besitz (BE-6..BE-9), dann Board-URL
(BE-10), dann Werkzeug und Doku (BE-11..BE-13). Das Frontend beginnt erst, wenn
`BE-5` und `BE-10` stehen.

## Backend

- [ ] **BE-1** `config/index.ts`: `sessionSecret` als Pflicht-Env
      `SESSION_SECRET`, `nodeEnv` (heute nicht vorhanden, das Cookie-Flag
      braucht es), `adminPin` entfernen. `.env.example` mitziehen.
      _done when:_ der Server startet ohne `ADMIN_PIN` und bricht ohne
      `SESSION_SECRET` mit der deutschen Meldung aus `required()` ab.
      _blocks:_ BE-3, BE-4

- [ ] **BE-2** `models/user.model.ts` mit `select: false` am `passwordHash`,
      Konstante `RESERVED_SLUGS`, Export im Barrel. `UserSchema` und
      `RegisterSchema` (inkl. `.refine()` für reservierte Slugs) und das neue
      `LoginSchema` in `shared/schemas.ts`; `AuthTokenSchema` entfernen.
      _done when:_ `npx tsc --noEmit` sauber; ein Konto mit Slug `board` wird
      von `RegisterSchema` abgelehnt.
      _blocks:_ BE-3, BE-4, BE-6, BE-7

- [ ] **BE-3** `auth.service.ts` umbauen — _test-first_, `auth.check.ts`
      erweitern. `hashPassword`/`verifyPassword` (`scrypt`), `issueToken(userId)`,
      `verifyToken` → `{ userId, issuedAt } | null`, zweite Throttle-Bucket für
      die Registrierung. `sign()`, `equals()` und die Fenstergrößen **nicht**
      anfassen; `checkPin` entfernen.
      _done when:_ `npm --prefix server test` grün mit den sieben Fällen aus
      `architecture.md` § »Domain logic«; Signatur wird weiterhin vor dem Inhalt
      geprüft.
      _needs:_ BE-1, BE-2 · _blocks:_ BE-4

- [ ] **BE-4** `services/session.service.ts` — `setSessionCookie`,
      `clearSessionCookie`, `readSessionCookie`. Die einzige Stelle mit
      Cookie-Flags; kein `cookie-parser`.
      _done when:_ das gesetzte Cookie trägt `HttpOnly`, `SameSite=Lax`,
      `Path=/` und `Secure` nur bei `NODE_ENV=production` (AC-2.3, E-5).
      _needs:_ BE-3 · _blocks:_ BE-5

- [ ] **BE-5** `middleware/auth.ts`: `requireUser` mit allen fünf Schritten aus
      `architecture.md` (Cookie → `verifyToken` → `findById` → `sessionsValidFrom`
      → `req.user` + Schiebe-Erneuerung). Deklarations-Merge für
      `Express.Request`. `auth.controller.ts` und `auth.routes.ts`:
      `register`, `login`, `logout`, `me`. In `routes/index.ts` `requireAdmin`
      durch `requireUser` ersetzen — **ohne** die GET-Ausnahme (AC-3.8).
      _done when:_ AC-1.1 bis AC-1.6, AC-2.1 bis AC-2.7, AC-3.8, AC-6.1 und
      AC-6.2 von Hand nachvollziehbar; `PinLock` ist serverseitig
      funktionslos.
      _needs:_ BE-4 · _blocks:_ BE-6, FE-1

- [ ] **BE-6** Besitz an den Modellen: `ownerId` an `Tournament` und `Player`,
      globale `unique` gegen zusammengesetzte Indizes tauschen,
      `ownerId` aus `CreateTournamentSchema` und `CreatePlayerSchema`
      **heraushalten**. Controller setzen es aus `req.user`.
      _done when:_ AC-3.4 und AC-3.5 gehen durch (zwei Konten, gleicher Slug,
      gleicher `username`); `syncIndexes()` beim Boot meldet keinen Fehler.
      _needs:_ BE-2, BE-5 · _blocks:_ BE-7, BE-8

- [ ] **BE-7** `assertOwned` in `tournament.service.ts` (404, nicht 403) und
      Aufruf als erste Zeile in jedem Team-, Game-, Score- und
      Match-Controller. `listTournaments` und `getTournamentBySlug` auf
      `ownerId` filtern. `DELETE /api/tournaments/:id` aktivieren.
      _done when:_ AC-3.1, AC-3.3 und AC-3.7 halten — der Durchlauf »Sitzung A
      auf alle IDs von B« liefert ausnahmslos 404.
      _needs:_ BE-6 · _blocks:_ BE-9

- [ ] **BE-8** Die acht Löcher aus `architecture.md` § »Löcher« schließen:
      `getGameBySlug` mit `tournamentId`; `getPinnedCharts` und `getPlayerStats`
      mit `tournamentId`; `getPlayerMap(ownerId)`; `GET /api/players` auf
      `ownerId`; `loadEntrants` mitziehen; `GET /api/games` und
      `GET /api/scores` mit `tournamentId` als Pflichtparameter (400 ohne).
      _done when:_ AC-3.2 und AC-3.6 halten; kein `find` ohne Besitz- oder
      Turnierbezug bleibt übrig (`grep` über `services/`).
      _needs:_ BE-6

- [ ] **BE-9** `services/quota.service.ts` mit der `LIMITS`-Tabelle und
      `assertQuota`, aufgerufen in den Create-Controllern für Turnier, Spieler,
      Team, Disziplin und Upload. `middleware/upload.ts` und
      `upload.service.ts` schreiben nach `uploads/<userId>/`, Verzeichnis wird
      bei Bedarf angelegt (E-11).
      _done when:_ AC-5.1 bis AC-5.4 halten; das elfte Turnier antwortet 409
      mit deutscher Meldung.
      _needs:_ BE-7

- [ ] **BE-10** `GET /api/board/:userSlug/:tournamentSlug` — `boardBySlug` wird
      `boardBySlugs`; `BoardStateSchema.tournament.ownerSlug` ergänzen.
      `ponytail:`-Kommentar in `realtime/index.ts`, der AD-5 festhält.
      _done when:_ AC-4.1 bis AC-4.3 halten, auch ohne Cookie.
      _needs:_ BE-6 · _blocks:_ FE-2

- [ ] **BE-11** `server/src/user-delete.ts` + `npm run user:delete`, gebaut nach
      `delete-tournament.ts`. Kaskade: Turniere → Teams, Games, Scores, Matches;
      dazu Player und `uploads/<userId>/`. Ohne `--yes` nur Trockenlauf.
      _done when:_ AC-6.3 und AC-6.4 halten.
      _needs:_ BE-9

- [ ] **BE-12** `seed.ts` legt einen Demo-User an und hängt das Beispielturnier
      samt Spielern daran.
      _done when:_ `npm --prefix server run seed -- --yes` läuft durch und der
      Demo-User kann sich anmelden.
      _needs:_ BE-11

- [ ] **BE-13** Doku: `PROJEKT.md` §2 (Routen), §3 (`User`, `ownerId`), **§9
      vollständig neu** — der Absatz »Es gibt keinen Besitzer eines Turniers und
      keine Mandanten« wird sachlich falsch —, §14 ohne »Rollen- und
      Rechteverwaltung«. Ein Eintrag in `SESSIONS.md`, darin auch der Hinweis,
      dass `docs/scoreboard.architecture.json` und `-architektur.html` gedriftet
      sind.
      _done when:_ kein Absatz in `PROJEKT.md` behauptet mehr einen geteilten
      PIN oder fehlenden Besitz.
      _needs:_ BE-12

## Frontend

- [ ] **FE-1** `lib/auth.ts` **löschen**; `lib/api.ts` ohne
      `Authorization`-Header, mit `credentials: 'same-origin'` und der neuen
      401-Meldung; `hooks/index.ts` um `useMe`, `useLogin`, `useRegister`,
      `useLogout` (Letzteres mit `queryClient.clear()`).
      _done when:_ `npx tsc --noEmit` sauber, kein `localStorage`-Zugriff mehr
      im Client (`grep`).
      _needs:_ BE-5 · _blocks:_ FE-2, FE-3

- [ ] **FE-2** `pages/Login.tsx` und `pages/Register.tsx` mit allen vier
      Zuständen; Honeypot-Feld per CSS ausgeblendet und `tabIndex={-1}`.
      Feldfehler aus 400 und 409 werden am Feld angezeigt, nicht nur global.
      _done when:_ Registrieren und Anmelden funktionieren im Browser, ein zu
      kurzes Passwort und eine vergebene E-Mail erzeugen sprechende Meldungen.
      _needs:_ FE-1

- [ ] **FE-3** `RequireSession`-Wrapper und Routen in `App.tsx`:
      `/login`, `/register`, `/board/:userSlug/:slug`,
      `/result/:userSlug/:slug`, `/control` hinter dem Guard.
      `components/layout/PinLock.tsx` **löschen**, `layout/Layout.tsx:46` zeigt
      Kontoname und Abmelden. Board- und Result-Links aus `me.slug`.
      _done when:_ AC-2.8, AC-4.4 und AC-4.5 halten; `npm run build` sauber.
      _needs:_ FE-1, BE-10

- [ ] **FE-4** Durchsehen, dass keine Oberfläche mehr instanzweite Listen
      erwartet: `Players.tsx`, `Games.tsx`, `GameDetail.tsx` und
      `Scoring.tsx` müssen `tournamentId` mitgeben, wo `BE-8` es zur Pflicht
      gemacht hat.
      _done when:_ kein Aufruf im Client löst mehr ein 400 »tournamentId fehlt«
      aus; alle fünf Control-Tabs laden.
      _needs:_ FE-3
