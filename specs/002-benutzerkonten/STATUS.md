# 002 — Benutzerkonten und Mandantentrennung

| Phase | State | Signed off | Note |
|---|---|---|---|
| requirements | approved | 2026-09-13 | Aus dem Interview geschrieben, nicht über `/requirements` |
| architecture | approved | 2026-09-13 | AD-1 bis AD-9 ohne Änderung bestätigt |
| frontend | approved | 2026-09-13 | FE-1 bis FE-4, `tsc -b`/`build` sauber |
| backend | approved | 2026-09-13 | BE-1 bis BE-13 plus BE-14 (F-1), 85/85 Tests |
| qa | approved | 2026-09-13 | Runde 2 ohne Blocker und Majors, drei Minors |

## Abhängigkeit

**001 muss committet sein, bevor hier begonnen wird.** `BE-6` und `BE-7`
berühren dieselben Controller wie `001/BE-5`; parallel gebaut kollidieren die
Diffs. Die Freigabe hier ist die Freigabe des Entwurfs, nicht die Erlaubnis,
vor 001 anzufangen.

## Freigabe

Dieses Feature kehrt `PROJEKT.md` §9 und §14 um. Beide Abschnitte sind Teil der
Lieferung (`BE-13`), nicht Nacharbeit.

AD-1 bis AD-3 entstanden aus dem Einwand, ob JWT, Refresh-Tokens und
Cookie-Header nicht sicherer wären. Ergebnis: Cookie ja — `httpOnly` ist der
eigentliche Gewinn und kostet weniger Code, weil `src/lib/auth.ts` wegfällt.
JWT nein — das bestehende HMAC-Token ist schon ein signiertes Token, ein JWT
brächte nur den `alg`-Header und dessen Fallen. Refresh-Paar nein — sein Zweck
entfällt, sobald das Token für JavaScript unlesbar ist; was davon gebraucht
wird, ist der **Widerruf**, und der steckt in zwei Zeilen in `requireUser`
(`findById` + `sessionsValidFrom`) statt in einer Collection mit Rotation.

Beim Schreiben der Spec dazugekommen und nicht im Plan:

- `config` hat heute kein `nodeEnv`; das Cookie-Flag `secure` braucht es → Teil
  von `BE-1`. Ohne das käme das Cookie im Dev-Betrieb über `http` nie an (E-5).
- Ein Konto-Slug wie `board` oder `control` macht `/board/:userSlug/:slug`
  mehrdeutig → `RESERVED_SLUGS` und E-8.
- E-Mails werden kleingeschrieben gespeichert, sonst sind Dubletten in anderer
  Schreibweise möglich (E-10).

## Anmerkungen

Zwei bewusste Zurückstellungen, im Code als `ponytail:` zu markieren: die
Mail-Verifikation (`verifiedAt` liegt bereit) und das Ändern beziehungsweise
Zurücksetzen des Passworts (`sessionsValidFrom` liegt bereit).

Die ADR halten auch die **verworfenen** Optionen fest — JWT, Refresh-Paar,
CSRF-Token, Einladungscode, Superuser-Rolle, `Player` je Turnier, `ownerId` an
jedem Modell —, damit sie nicht in der nächsten Sitzung erneut vorgeschlagen
werden.
