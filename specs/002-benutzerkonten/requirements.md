# 002 — Benutzerkonten und Mandantentrennung

## Problem

Der Zugriffsschutz ist eine geteilte Passphrase. Das Token aus
`auth.service.ts` trägt genau einen Claim — die Ablaufzeit — und `requireAdmin`
hängt nichts an den Request. Es gibt also kein Subjekt, und deshalb ist keine
einzige Datenbankabfrage besitzergebunden. `PROJEKT.md` §9 sagt das offen: »Wer
den PIN hat, darf alles — auch die Turniere anderer.«

Solange die Instanz einem Veranstalter gehört, geht das. Gewollt ist aber, dass
sich beliebige Veranstalter selbst ein Konto anlegen und ihre eigenen Turniere,
Teams und Spieler führen, ohne die der anderen zu sehen. Die Anwendung läuft
dabei über einen öffentlichen Tailscale Funnel, die Registrierung steht also im
offenen Netz.

## Scope

### In

- Konto anlegen, anmelden, abmelden. Registrierung offen für jeden.
- Sitzung in einem `httpOnly`-Cookie statt eines Tokens im `localStorage`.
- Besitz: `Tournament` und `Player` gehören einem Konto; `Team`, `Game`,
  `Score` und `Match` erben den Besitz über ihr Turnier.
- Jede lesende **und** schreibende Route ist auf das eigene Konto beschränkt.
  Ausnahme bleibt das Board.
- Board und Siegerehrung öffentlich unter `/board/:userSlug/:tournamentSlug`.
- Bremse gegen automatisierte Registrierung: Honeypot, die bestehende Throttle,
  Ressourcen-Obergrenzen je Konto.
- Widerruf einer Sitzung: gelöschtes Konto und »überall abmelden«.
- `npm run user:delete` entfernt ein Konto samt allem, was daran hängt.

### Out (ausdrücklich)

- **JWT.** Das bestehende HMAC-Token wird um ein Subjekt erweitert, nicht
  ersetzt.
- **Refresh-Token-Paar.** Siehe AD-2.
- **Mail-Verifikation.** Das Feld `verifiedAt` entsteht, bleibt aber ungenutzt.
- **Rollen und Rechte.** Es gibt genau eine Sorte Konto. Kein Superuser, keine
  Co-Veranstalter, kein Teilen eines Turniers.
- **Spieler als eigene Identität.** Ein `Player` bleibt ein gewertetes Objekt im
  Besitz eines Kontos, keine Person, die sich anmelden kann.
- **Passwort-Zurücksetzen per Mail.** Ohne SMTP nicht machbar; bis dahin hilft
  das CLI.
- **Captcha** und zugekaufte Rate-Limit-Pakete.
- Migration bestehender Daten. `PROJEKT.md` §12: die Datenbank enthält nur
  Testdaten, `seed` leert und legt neu an.

## User stories

### US-1 — Konto anlegen

Als Veranstalter will ich mir ohne Zutun des Betreibers ein Konto anlegen,
damit ich sofort ein Turnier aufsetzen kann.

**Acceptance criteria**

- AC-1.1 — Gegeben `POST /api/auth/register` mit E-Mail, Passwort ab 12 Zeichen
  und freiem Slug, dann antwortet der Server 201, setzt das Sitzungs-Cookie und
  das Konto existiert.
- AC-1.2 — Gegeben ein Passwort unter 12 Zeichen, dann antwortet der Server 400.
- AC-1.3 — Gegeben eine E-Mail oder ein Slug, die schon vergeben sind, dann
  antwortet der Server 409.
- AC-1.4 — Gegeben ein Slug, der nicht `^[a-z0-9-]+$` entspricht, dann antwortet
  der Server 400.
- AC-1.5 — Gegeben ein ausgefülltes Honeypot-Feld, dann antwortet der Server 400
  und legt kein Konto an.
- AC-1.6 — Gegeben mehr Registrierungsversuche von einem Absender als erlaubt,
  dann antwortet der Server 429.
- AC-1.7 — Das Passwort ist nirgends im Klartext gespeichert und erscheint in
  keiner Antwort.

### US-2 — Anmelden, angemeldet bleiben, abmelden

Als Veranstalter will ich mich am Tablet einmal anmelden und den Abend über
angemeldet bleiben, auch wenn der Aufbau um 14 Uhr war und das Turnier um 2 Uhr
endet.

**Acceptance criteria**

- AC-2.1 — Gegeben richtige Zugangsdaten, dann antwortet
  `POST /api/auth/login` 200 und setzt das Sitzungs-Cookie.
- AC-2.2 — Gegeben ein falsches Passwort, dann antwortet der Server 401 und die
  Antwort verrät nicht, ob die E-Mail existiert.
- AC-2.3 — Das Sitzungs-Cookie trägt `HttpOnly`, `SameSite=Lax` und `Path=/`,
  und `document.cookie` im Browser enthält es **nicht**.
- AC-2.4 — Gegeben eine Sitzung, die mehr als die halbe Laufzeit hinter sich
  hat, wenn ein beliebiger Request kommt, dann sendet der Server ein frisches
  `Set-Cookie` mit.
- AC-2.5 — Gegeben `POST /api/auth/logout`, dann ist das Cookie gelöscht und der
  nächste geschützte Request antwortet 401.
- AC-2.6 — Gegeben `GET /api/auth/me` mit Sitzung, dann kommen `id`, `email`,
  `slug` und `displayName` zurück, kein Passwort-Hash.
- AC-2.7 — Gegeben ein verfälschter Cookie-Wert, dann antwortet der Server 401.
- AC-2.8 — Gegeben `/control` ohne Sitzung im Browser, dann landet der Nutzer
  auf `/login`.

### US-3 — Nur die eigenen Daten

Als Veranstalter will ich ausschließlich meine eigenen Turniere, Teams, Spieler
und Disziplinen sehen und ändern können, damit fremde Events mich nicht
betreffen und meine niemanden sonst.

**Acceptance criteria**

- AC-3.1 — Gegeben zwei Konten, dann listet `GET /api/tournaments` je Konto nur
  die eigenen Turniere.
- AC-3.2 — Gegeben zwei Konten, dann listet `GET /api/players` je Konto nur die
  eigenen Spieler.
- AC-3.3 — Gegeben ein Turnier von B, dann antwortet jeder Zugriff mit der
  Sitzung von A mit **404**, nicht 403 — auch lesend, auch auf Teams, Games,
  Scores und Matches darunter.
- AC-3.4 — Beide Konten können ein Turnier mit **demselben** Slug anlegen.
- AC-3.5 — Beide Konten können einen Spieler mit **demselben** `username`
  anlegen.
- AC-3.6 — Gegeben eine Disziplin mit demselben Slug in zwei Turnieren, dann
  liefert `GET /api/games/:slug` die des angefragten Turniers, nicht die
  erstgefundene.
- AC-3.7 — Gegeben eine Sitzung, dann antwortet `DELETE /api/tournaments/:id`
  für das eigene Turnier 204 und löscht Teams, Games, Scores und Matches mit;
  für ein fremdes 404.
- AC-3.8 — Gegeben keine Sitzung, dann antwortet jede Route außer `/api/health`,
  `/api/auth/*`, `/api/board/*` und `/uploads/*` mit 401 — **auch GET**.

### US-4 — Board öffentlich, ohne Anmeldung

Als Zuschauer beziehungsweise als Rechner an der Leinwand will ich das Board
ohne Anmeldung öffnen, weil die Kiste am Beamer den Abend über nicht angefasst
wird.

**Acceptance criteria**

- AC-4.1 — Gegeben `GET /api/board/:userSlug/:tournamentSlug` ohne Sitzung, dann
  antwortet der Server 200 mit dem Board-Zustand.
- AC-4.2 — Gegeben zwei Konten mit gleichnamigem Turnier-Slug, dann liefern die
  beiden Board-URLs verschiedene Turniere.
- AC-4.3 — Gegeben ein unbekannter `userSlug` oder `tournamentSlug`, dann
  antwortet der Server 404.
- AC-4.4 — `/board/:userSlug/:slug` und `/result/:userSlug/:slug` laden im
  Browser ohne Cookie vollständig.
- AC-4.5 — Die Links zu Board und Siegerehrung im Control-Panel enthalten den
  Slug des angemeldeten Kontos.

### US-5 — Schadensgrenze je Konto

Als Betreiber will ich, dass ein einzelnes Konto die Instanz nicht volllaufen
lassen kann, weil die Registrierung im offenen Netz steht.

**Acceptance criteria**

- AC-5.1 — Gegeben ein Konto an der Turnier-Obergrenze, dann antwortet das
  Anlegen eines weiteren 409 mit deutscher Meldung.
- AC-5.2 — Dasselbe gilt für Spieler je Konto sowie Teams und Disziplinen je
  Turnier.
- AC-5.3 — Gegeben ein Konto an der Upload-Obergrenze, dann antwortet
  `POST /api/uploads` 409.
- AC-5.4 — Ein Upload landet unter `uploads/<userId>/` und ist über den in der
  Antwort genannten Pfad erreichbar.

### US-6 — Konto und Sitzung widerrufen

Als Betreiber will ich ein missbräuchliches Konto restlos entfernen können und
sicher sein, dass seine Sitzung dabei sofort endet.

**Acceptance criteria**

- AC-6.1 — Gegeben eine laufende Sitzung, wenn `sessionsValidFrom` des Kontos
  auf jetzt gesetzt wird, dann antwortet der nächste Request 401, obwohl das
  Token gültig signiert und nicht abgelaufen ist.
- AC-6.2 — Gegeben eine laufende Sitzung, wenn das Konto per CLI gelöscht wird,
  dann antwortet der nächste Request 401 und erreicht **keinen** Controller.
- AC-6.3 — Gegeben `npm run user:delete -- <email> --yes`, dann sind danach
  keine Turniere, Teams, Disziplinen, Scores, Matches oder Spieler dieses Kontos
  mehr vorhanden und `uploads/<userId>/` ist entfernt.
- AC-6.4 — Ohne `--yes` löscht das Skript nichts, sondern nennt nur, was es
  löschen würde.

## Edge cases

| # | Situation | Erwartetes Verhalten |
|---|---|---|
| E-1 | Zugriff auf ein fremdes Objekt | 404, nicht 403 — die Existenz wird nicht bestätigt |
| E-2 | Gültig signiertes Token, Konto gelöscht | 401 in der Middleware, vor jedem Controller |
| E-3 | Gültig signiertes Token, älter als `sessionsValidFrom` | 401 |
| E-4 | Abgelaufenes Token | 401, und die Antwort verrät nicht, dass die Signatur echt war (heutiges Verhalten) |
| E-5 | Dev-Server über `http://localhost` | Cookie ohne `Secure`, sonst käme es nie an. `Secure` hängt an `NODE_ENV` |
| E-6 | Zwei Konten, gleicher Turnier-Slug | Erlaubt; die Board-URL trennt über den `userSlug` |
| E-7 | Zwei Konten, gleicher Spieler-`username` | Erlaubt |
| E-8 | Konto-Slug kollidiert mit einem Routenpfad (`login`, `control`, `board`) | Bei der Registrierung abgelehnt, 400 — sonst wird die Board-URL mehrdeutig |
| E-9 | Socket-Raum eines fremden Turniers betreten | Erlaubt. Der Raum verteilt nur den Board-Zustand, der ohnehin öffentlich ist — siehe AD-5 |
| E-10 | Registrierung mit derselben E-Mail in anderer Schreibweise | Als Dublette behandelt, 409; E-Mail wird kleingeschrieben gespeichert |
| E-11 | Upload, während das Kontoverzeichnis noch nicht existiert | Wird angelegt |
| E-12 | Sitzung läuft während des Eintragens ab | 401, der Guard schickt auf `/login`; der nicht gespeicherte Formularinhalt ist verloren (bewusst) |

## Data touched

- **`User`** — neue Collection: E-Mail, Slug, Anzeigename, Passwort-Hash,
  `sessionsValidFrom`, `verifiedAt` (reserviert).
- **`Tournament`** — neues `ownerId`; `slug` nicht mehr global, sondern je
  Konto eindeutig.
- **`Player`** — neues `ownerId`; `username` nicht mehr global, sondern je
  Konto eindeutig.
- **`Team`, `Game`, `Score`, `Match`** — unverändert; Besitz über `tournamentId`.
- **Upload-Verzeichnis** — Dateien liegen künftig unter `uploads/<userId>/`.
- **Env** — `ADMIN_PIN` entfällt, `SESSION_SECRET` kommt dazu.

## Non-functional

- Die Middleware lädt je Request das Konto: ein indizierter Treffer gegen die in
  `PROJEKT.md` §11 gemessenen ~20 ms Atlas-Grundlast. Das ist der Preis für den
  Widerruf aus AC-6.1 und AC-6.2 und akzeptiert.
- Passwort-Hashing mit `scrypt` aus `node:crypto`, kein neues Paket.
- Kein CSRF-Token: `SameSite=Lax` verhindert fremdinitiierte non-GET-Requests,
  und jede schreibende Route ist non-GET.
- Fehlermeldungen deutsch (`KONVENTIONEN.md` §1).
- `PROJEKT.md` §9 und §14 werden durch dieses Feature sachlich falsch und sind
  Teil der Lieferung.

## Open questions

Keine offenen Entscheidungen. Zwei bewusste Zurückstellungen, beide im Code als
`ponytail:` markiert:

1. **Mail-Verifikation.** `verifiedAt` existiert ungenutzt. Sobald Spam-Konten
   auftreten, kommt SMTP dazu, ohne das Schema zu ändern.
2. **Passwort ändern und zurücksetzen.** `sessionsValidFrom` ist dafür schon
   angelegt; die Route fehlt noch.
