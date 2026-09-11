# PROJEKT.md — Scoreboard Future Space Kassel

Einstiegsdokument. Wer eine neue Session beginnt, liest diese Datei zuerst,
danach `KONVENTIONEN.md` (Code-Standards) und `SESSIONS.md` (Kurzlog).

Stand: 2026-09-10 · Status: Server und Oberflächen stehen — Board,
Siegerehrung und Control-Panel. Offen sind Feinarbeiten, Einzelheiten in §12.

---

## 1. Zweck

Dynamisches Scoreboard für die Gaming-Events des Future Space Kassel.
Mehrere Disziplinen laufen parallel, die Ergebnisse werden manuell erfasst und
erscheinen ohne Zutun live auf einer Leinwand. Am Ende eines Turniers steht ein
disziplinübergreifender Gesamtsieger fest.

Kernanforderung des Kunden: **Eingabe und Anzeige sind getrennte Geräte.**
Auf einem Tablet werden Punkte eingetragen, auf der Leinwand ist ausschließlich
das Board sichtbar. Zwischen beidem darf kein manueller Refresh liegen.

---

## 2. Ansichten

| Route                     | Gerät                  | Inhalt                                                             |
| ------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `/board/:tournamentSlug`  | Leinwand / Beamer      | Gesamtwertung + rotierende Game-Karten, keine Bedienelemente       |
| `/control`                | Tablet / Laptop        | Turniere, Teams, Spieler, Games anlegen; Scores eintragen          |
| `/result/:tournamentSlug` | Leinwand / Nachbericht | Siegerehrung: Gesamtwertung, Punkte je Disziplin, Medaillenspiegel |

`/board` ist bewusst zustandslos und ohne Eingaben: der Rechner an der Leinwand
soll die Seite öffnen und für den Rest des Abends nicht angefasst werden.

Die einzige Ausnahme ist der Rückweg: die kleine Kopfzeile über dem
Turniernamen ist auf `/board` und `/result` ein Link ins Control-Panel. Sie
sieht unverändert aus und bekommt erst beim Überfahren einen Pfeil — auf der
Leinwand steht dadurch kein Zeichen mehr als vorher.

---

## 3. Datenmodell

Vier neue beziehungsweise geänderte Collections. `Player` bleibt weitgehend wie
bisher, `Game` und `Score` werden umgebaut, `Tournament` und `Team` kommen dazu.

### Tournament

Klammer um alles. Ein Turnier definiert, **gegen wen** gespielt wird und **wie**
gewertet wird.

```
slug          string, unique, /^[a-z0-9-]+$/
title         string
description   string?
mode          'player' | 'team'        // gilt für ALLE Games des Turniers
status        'draft' | 'live' | 'finished' | 'archived'
startsAt      Date
endsAt        Date?
pointsTable   number[]                 // Index 0 = Platz 1; bestätigt: [10,8,6,5,4,3,2,1]
tieBreak      'olympic'                // Feld existiert für spätere Varianten
bannerUrl     string?
```

`mode` ist die zentrale Entscheidung: entweder treten Spieler gegen Spieler an
oder Teams gegen Teams. Gemischte Turniere gibt es bewusst nicht — das erspart
die Frage, wie eine Einzelleistung in eine Teamwertung überführt wird.

### Team

Teams gehören zu genau einem Turnier. Dieselbe Person kann beim nächsten Event
in einem anderen Team antreten, ohne dass die Historie falsch wird.

```
tournamentId  ObjectId → Tournament, required
name          string, unique je tournamentId
colorPrimary  string, Hex        // Balkenfarbe, Akzent auf der Karte
colorSecondary string?
bannerUrl     string?            // Upload
avatarSeed    string             // Fallback-Sprite, wenn kein Banner da ist
members       ObjectId[] → Player
```

`members` liegt eingebettet statt in einer eigenen Membership-Collection: der
Kader ist klein und wird immer zusammen mit dem Team gelesen. Weil das Team
ohnehin am Turnier hängt, ist die Zugehörigkeit dadurch automatisch
turnierbezogen.

### Player

Global und turnierübergreifend, damit persönliche Historie erhalten bleibt.

```
username      string, unique
displayName   string?
avatarUrl     string?            // Upload
avatarSeed    string             // deterministischer Fallback aus dem Namen
countryCode   string?            // bleibt, wird auf dem Board nicht genutzt
```

### Game

Eine Disziplin innerhalb eines Turniers.

```
tournamentId    ObjectId → Tournament, required
slug            string, unique je tournamentId
title           string
genre           'racing' | 'sports' | 'arcade' | 'fps' | 'custom'
coverUrl        string?
primaryMetric   { key, label, sortOrder: 'ASC'|'DESC', formatter, unit? }
secondaryMetrics MetricConfig[]?
weight          number, default 1     // Gewichtungsfaktor, Finale zählt z.B. 2
pinned          boolean               // erscheint auf dem Board
boardOrder      number                // Reihenfolge in der Rotation
status          'upcoming' | 'running' | 'finished'
```

Geändert gegenüber dem Ist-Stand: `timeframe` entfällt ersatzlos — der Zeitraum
ist jetzt durchs Turnier definiert. Neu sind `tournamentId`, `weight`,
`boardOrder` und `status`. `pinned` behält seine Bedeutung.

### Score

```
tournamentId    ObjectId → Tournament    // denormalisiert, für Turnierabfragen
gameId          ObjectId → Game
entrantType     'player' | 'team'        // gespiegelt vom Turnier
playerId        ObjectId?  ┐ genau eines von beiden ist gesetzt,
teamId          ObjectId?  ┘ erzwungen per Schema-Validator
primaryValue    number
secondaryValues Map<string, number>?
recordedAt      Date
```

`entrantType` ist streng genommen redundant zum Turnier, macht den Score aber
selbsttragend — die Wertungsfunktionen müssen dafür nichts nachladen.

**Indizes**

```
{ gameId: 1, primaryValue: 1 }        // Rangliste je Disziplin
{ tournamentId: 1, recordedAt: -1 }   // Live-Feed und Auswertung
{ playerId: 1, recordedAt: -1 }       // Spielerhistorie
{ teamId: 1, recordedAt: -1 }         // Teamhistorie
```

---

## 4. Wertungslogik

Der Kern des Projekts und der einzige Teil, der strikt testgetrieben entsteht.
Alles hier ist frei von DB-Zugriffen und arbeitet auf einfachen Objekten,
genau wie das bestehende `rank.ts`.

### 4.1 Rangliste je Disziplin

Unverändert zum heutigen Verhalten, nur auf `entrantId` statt `playerId`
verallgemeinert:

- Je Teilnehmer zählt nur der **beste** Wert.
- `sortOrder` entscheidet, was besser heißt (`ASC` = kleiner ist besser).
- Gleiche Werte teilen sich einen Rang, der Folgerang wird übersprungen
  (1, 2, 2, 4).

### 4.2 Platzierungspunkte

Der Rohwert einer Disziplin fließt **nicht** in die Gesamtwertung ein — nur die
Platzierung. Damit sind Rundenzeiten in Millisekunden und Torzahlen ohne
Umrechnung vergleichbar.

```
punkte(rang) = pointsTable[rang - 1] ?? 0
```

Der Wert wird anschließend mit `game.weight` multipliziert.

**Bei geteiltem Rang werden die Punkte der belegten Plätze gemittelt.**
Zwei Teilnehmer auf Rang 2 belegen die Plätze 2 und 3, bekommen also
`(8 + 6) / 2 = 7` Punkte. Die insgesamt ausgeschüttete Punktsumme bleibt
dadurch konstant, egal wie viele Gleichstände auftreten — nur so sind
verschiedene Turniere untereinander vergleichbar. Auf dem Board wird auf eine
Nachkommastelle gerundet dargestellt, gerechnet wird ungerundet.

### 4.3 Gesamtwertung

Summe der Platzierungspunkte über alle Games des Turniers, unabhängig vom
`status` des Spiels — laufende Disziplinen zählen also bereits mit, und die
Wertung ist zu jedem Zeitpunkt live korrekt.

**Nicht-Teilnahme bedeutet 0 Punkte, kein Streichresultat.** Wer eine Disziplin
auslässt, verliert die Punkte. Das ist die vom Kunden gewünschte Regel und
belohnt Teilnahme an allen Stationen.

### 4.4 Gleichstand in der Gesamtwertung

Olympische Zählweise, in dieser Reihenfolge:

1. Höhere Gesamtpunktzahl.
2. Mehr erste Plätze in den Einzeldisziplinen.
3. Mehr zweite Plätze, dann dritte, dann vierte … bis zum höchsten
   vorkommenden Rang.
4. Bleibt es gleich: echter geteilter Rang.

Ein geteilter erster Platz in einer Disziplin zählt für **beide** Teilnehmer als
erster Platz.

### 4.5 Module

| Datei                   | Aufgabe                                                  |
| ----------------------- | -------------------------------------------------------- |
| `services/rank.ts`      | Rangliste je Disziplin (bestehend, verallgemeinert)      |
| `services/points.ts`    | Platzierung → Punkte, inklusive Mittelung und Gewichtung |
| `services/standings.ts` | Gesamtwertung + olympischer Tie-Break                    |
| `services/announce.ts`  | Vergleich zweier Board-Zustände → Ereignisse für Toasts  |

Jedes dieser Module bekommt seine Tests **vor** der Implementierung.

---

## 5. Realtime

Socket.IO zusätzlich zur bestehenden REST-API. REST bleibt die Schreib- und
Leseschnittstelle, der Socket dient ausschließlich der Verteilung.

**Räume:** ein Raum je Turnier, `tournament:<id>`. Board und Control-Panel
treten beim Laden bei.

**Ablauf beim Eintragen eines Scores**

1. Control-Panel schickt `POST /api/scores` (REST, mit Admin-Token).
2. Server schreibt den Score, berechnet den Board-Zustand neu und vergleicht ihn
   per `announce.ts` mit dem vorherigen.
3. Server sendet in den Raum:
    - `board:update` — der **komplette** neu berechnete Board-Zustand
    - `event:announce` — null bis mehrere Ereignisse für die Toasts

Bewusst wird der ganze Zustand geschickt, nicht ein Delta. Der Payload liegt bei
wenigen Kilobyte, dafür kann der Client nicht auseinanderdriften und ein Board,
das kurz offline war, ist mit dem nächsten Ereignis wieder korrekt.

**Weitere Events:** `tournament:status` bei Wechsel von live auf finished
(löst auf dem Board die Siegerehrung aus).

**Ausfallsicherheit:** Socket.IO reconnected selbst. Das Board pollt zusätzlich
alle 30 Sekunden per REST als Sicherheitsnetz und zeigt einen dezenten
Verbindungsindikator in der Ecke.

**Das Board gehört in den Vordergrund.** Chrome drosselt Timer in
Hintergrund-Tabs auf einen Lauf pro Minute; die Toasts blieben dann minutenlang
stehen. Auf dem Beamer-Rechner ist die Seite ohnehin die einzige — wer sie
nebenbei in einem zweiten Tab mitlaufen lässt, sieht Verzögerungen.

---

## 6. Board-Layout

Auflösungsunabhängig gebaut, weil das Zielgerät noch nicht feststeht: ein
Container mit fixem 16:9-Verhältnis, alle Maße relativ zu einer CSS-Variable,
die per `clamp()` an die Viewportgröße gekoppelt ist. Sprites werden nur
ganzzahlig skaliert (`image-rendering: pixelated`), damit die Pixelkanten hart
bleiben.

**Aufteilung**

- Links etwa ein Drittel: **Gesamtwertung**, dauerhaft sichtbar. Eine Zeile je
  Teilnehmer mit Rangnummer, Avatar beziehungsweise Banner, Name, Punktebalken
  und Punktzahl. Platz 1 oben.
- Rechts: **Game-Karten** im 2×2-Raster mit den Top-Plätzen je Disziplin.
- Unten: Laufband oder Statuszeile mit Turniername und Fortschritt.

**Rotation:** sind mehr Games gepinnt als Kartenplätze vorhanden, rotieren die
Karten alle 20 Sekunden weiter. Ein Game, das gerade einen neuen Score bekommen
hat, bleibt für einen Zyklus stehen.

**Animation:** Motion (`framer-motion`), `layout` plus `AnimatePresence` auf der
Liste. Easing bewusst gestuft statt weich, damit die Bewegung zum Pixel-Look
passt. Die Balkenlänge animiert synchron zur Positionsänderung mit.

Reduzierte Bewegung (`prefers-reduced-motion`) wird respektiert: dann Crossfade
statt Verschieben.

---

## 7. Toasts

Bei jedem relevanten Ereignis erscheint ein Banner auf dem Board.

**Ereignistypen:** `first_score`, `personal_best`, `new_leader`,
`overtake` (Platztausch), `tie_broken`, `game_finished`,
`tournament_finished`.

Die Texte liegen kuratiert in `server/src/content/announcements.de.json`,
je Typ mehrere Varianten mit Platzhaltern (`{entrant}`, `{value}`, `{game}`,
`{rank}`). Gezogen wird zufällig, aber ohne Wiederholung, solange noch
ungenutzte Varianten übrig sind. Die Datei ist ohne Deploy anpassbar — die
Sprüche sollen vor jedem Event ans Publikum angepasst werden können.

Anzeigedauer 6 Sekunden, maximal zwei gleichzeitig, Warteschlange bei mehr.

---

## 8. Avatare und Banner

Upload über `multer` in ein gemountetes Verzeichnis, `sharp` normalisiert auf
128×128 mit Nearest-Neighbour-Skalierung, damit hochgeladene Logos den harten
Pixel-Look bekommen statt weich zu verwaschen.

Wer nichts hochlädt, bekommt einen **deterministisch aus dem Namen erzeugten
Pixel-Avatar**: ein 5×5-Raster, an der Mittelachse gespiegelt, Muster und Farbe
aus einem Hash des Namens. Clientseitig als SVG gerendert, ohne Abhängigkeit und
ohne Netzwerkaufruf.

Grenzen: 2 MB je Datei, nur PNG, JPEG und WebP, Dateiname wird serverseitig neu
vergeben.

---

## 9. Zugriffsschutz

Kein User-Modell. Eine geteilte Passphrase aus `ADMIN_PIN` schaltet die Eingabe
frei; der Server gibt dafür ein HMAC-signiertes Token mit 12 Stunden Laufzeit
aus, das im `localStorage` liegt.

**Die gesamte Anwendung läuft über den Tailscale Funnel**, auch das
Control-Panel. Die ursprünglich vorgesehene Netzwerkgrenze (`/control` nur im
Tailnet) ist damit aufgegeben: die Eingabe soll von Geräten der Einrichtung aus
bedienbar sein, ohne diese dauerhaft ins Tailnet aufzunehmen. Der PIN ist
dadurch der einzige Zugriffsschutz und muss ein Zufallswert sein, kein
gewählter.

Daraus folgt die Grenze in `routes/index.ts`:

| Ohne Token                  | Mit Token                                    |
| --------------------------- | -------------------------------------------- |
| `GET /api/board/:slug`      | alles andere, **auch lesend**                |
| `POST /api/auth`, `/health` | `/players`, `/scores`, `/teams`, `/games`, … |
| `/uploads/*`, Socket-Räume  | `/leaderboard`, `/tournaments`, `/uploads`   |

Ein Besucher sieht das Board und sonst nichts — kein Spielerverzeichnis, keine
Rohdaten. `requireAdmin` hängt einmal zentral, damit keine neue Route offen
bleiben kann.

`POST /api/auth` zählt Fehlversuche je Absender (20) und über alle zusammen
(200) in einem 10-Minuten-Fenster und antwortet danach mit `429`. Bewusst
großzügig: gegen einen zufälligen PIN hilft engeres Zählen nicht, aber eine
Sperre weist auch den richtigen PIN ab. Ein bereits angemeldetes Gerät bleibt
davon unberührt, weil die Bremse nur an der Anmeldung hängt.

**Turniere lassen sich über die API nicht löschen.** Die Kaskade räumt Teams,
Games und Scores mit ab; das ist über einen öffentlich erreichbaren Endpunkt
kein vertretbares Risiko. Der Service dafür existiert und wird von Hand aus
einem Skript auf dem Server aufgerufen.

**Was der Entwurf ausdrücklich nicht leistet:** Es gibt keinen Besitzer eines
Turniers und keine Mandanten. Wer den PIN hat, darf alles — auch die Turniere
anderer. Eine Instanz gehört einem Veranstalter. Alles darüber hinaus wäre ein
Datenmodell-Umbau (siehe §14).

---

## 10. Design

16-Bit-Neon (SNES/Synthwave): dunkles Violettblau als Grund, Neon-Magenta und
-Cyan als Akzente, gestufte statt weicher Verläufe, Glow-Kanten, harte 1px-Rahmen.
Bewusst nicht die reine 8-Bit-Schiene, weil Press Start 2P auf zehn Meter
Entfernung schlecht lesbar ist — Display-Font pixelig, Fließtext und Zahlen in
einem gut lesbaren Schnitt.

Die Farbpalette wird als Tailwind-Tokens hinterlegt und ist die einzige Quelle
für Farbwerte im Code. Teamfarben sind davon ausgenommen und kommen aus der DB.

Vor der Umsetzung entsteht ein **Design-Canvas** mit Artboards für Board-Screen,
Control-Panel, Team-Karte, Toast-Varianten und Palette. Erst nach Freigabe wird
in Tokens übersetzt.

---

## 11. Deployment

Eigener Ubuntu-Server (Lenovo-Notebook, Dauerbetrieb per SSH, Deckel zu),
Docker über Portainer, Deploys über GitHub-Runner.

**Ein Compose-Dienst:** `leaderboard` (Node/Express/Socket.IO). Derselbe
Express liefert das gebaute Vite-Frontend aus `dist/` aus, sobald `CLIENT_DIR`
gesetzt ist — das spart Reverse Proxy und zweiten Container und hält alles
same-origin wie der Dev-Proxy. Die Datenbank liegt bei Atlas, also gibt es
keinen `mongo`-Dienst; gemessene Latenz ~20 ms je Query, für ein Board mit ein
paar hundert Schreibvorgängen pro Abend unerheblich. Der Preis ist, dass das
Board ohne Internet steht — ein lokaler `mongo`-Dienst wäre der Plan B, falls
die Leitung am Venue unsicher ist.

**Named Volume — zwingend**, sonst sind die Bilder nach dem nächsten Rebuild
weg: `uploads` → das Upload-Verzeichnis des Servers.

**Erreichbarkeit:** Tailscale Funnel auf Port 443, weitergereicht an 4000 auf
localhost.
Funnel muss einmalig in der Tailnet-Policy freigeschaltet werden
(`nodeAttrs` mit `funnel`); öffentlich verfügbar sind nur 443, 8443 und 10000.

API- und Socket-URL kommen aus Env-Variablen, damit derselbe Build ohne Änderung
auch rein lokal im Venue-Netz läuft, falls die Leitung am Eventabend nicht
mitspielt.

---

## 12. Stand der Umsetzung

Die Datenbank enthält ausschließlich Testdaten. Es gibt **keine Migration** —
`npm --prefix server run seed -- --yes` leert alle Collections und legt ein
Beispielturnier an. Das `--yes` ist Absicht: `MONGODB_URI` zeigt auf einen
gehosteten Cluster.

### Fertig

| Bereich         | Wo                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Wertungslogik   | `services/rank.ts`, `points.ts`, `standings.ts`, `announce.ts` — alle vier aus §4.5, testgetrieben    |
| Payload-Vertrag | `shared/schemas.ts`: `BoardStateSchema`, `AnnouncementSchema`, Socket-Events aus §5                   |
| Datenmodell     | Tournament, Team, Player, Game, Score — Schemas, Modelle, Indizes                                     |
| REST            | `/api/tournaments`, `/api/teams?tournamentId=…` neu; Games, Players, Scores, Leaderboard umgebaut     |
| Formatierung    | `shared/format.ts` — `formatMetricValue`, von Client und Server genutzt                               |
| Seed            | `server/src/seed.ts`                                                                                  |
| Board-Zustand   | `services/board.service.ts` + `GET /api/board/:slug` — Verkettung der vier Rule-Module                |
| Sprüche         | `content/announcements.de.json` + `createPicker()` (zufällig, wiederholungsfrei)                      |
| Realtime        | `realtime/index.ts` — Räume, `emitBoardUpdate`, `emitTournamentStatus`, verdrahtet in den Controllern |
| Zugriffsschutz  | `services/auth.service.ts`, `middleware/auth.ts`, `POST /api/auth` — HMAC-Token, Anmeldebremse, §9    |
| Upload          | `middleware/upload.ts` + `services/upload.service.ts` — 2 MB, PNG/JPEG/WebP → 128×128 PNG             |

`rank.ts` gruppiert über `entrantId` und wertet damit Spieler- wie
Team-Turniere. `points.ts` verlässt sich auf eine monoton fallende
`pointsTable`; erzwungen wird das im Zod-Schema **und** im Mongoose-Validator,
nicht im Rule-Modul.

Gerechnet wird über **alle** Games eines Turniers, auf dem Board stehen nur
die gepinnten. Teilnehmer sind im Team-Modus die gemeldeten Teams (auch ohne
Ergebnis), im Spieler-Modus alle mit mindestens einem Score — Spieler sind
global und haben keine Turniermeldung.

`requireAdminForWrites` hängt einmal zentral in `routes/index.ts` vor allen
Routen außer `/auth`: GET, HEAD und OPTIONS gehen durch, alles andere braucht
das Token. Bildfelder nehmen laut `ImageUrlSchema` eine externe URL **oder**
einen Pfad unter `/uploads/` — genau das, was der eigene Upload ausgibt.

Die Board-Maße hängen an `--u` — einem Canvas-Pixel des 1600×900-Entwurfs,
per `clamp()` an die kleinere Viewport-Achse gekoppelt. `.board` setzt
zusätzlich Tailwinds `--spacing` darauf, sodass jede Zahlen-Utility
unmittelbar in Canvas-Pixeln rechnet.

### Als Nächstes

Alle drei Oberflächen sind im Browser gesehen und der Durchstich vom
Control-Panel über den Socket aufs Board ist geprüft — inklusive Toasts.

1. **Auf dem Zielgerät ansehen.** Geprüft ist 1440×900 im Chrome; die
   Leinwand des Events hat weder diese Auflösung noch diesen Betrachtungs-
   abstand.
2. **Die Sprüche vor dem Event durchgehen** — `content/announcements.de.json`
   ist genau dafür da.

### Bedienung

| Weg                                         | Wozu                        |
| ------------------------------------------- | --------------------------- |
| `/control`                                  | Wertung eintragen           |
| `/board/<slug>`                             | Leinwand                    |
| `/result/<slug>`                            | Siegerehrung                |
| `npm run seed -- --yes`                     | Beispielturnier             |
| `npm run tournament:delete -- <slug> --yes` | Turnier samt Anhang löschen |

### Noch nicht angefasst

- Team-Banner und Avatare sind hochladbar, aber im Seed nicht gesetzt — das
  Board zeichnet überall die Sprites aus dem Namen.

Bestehendes bleibt bestehen: die REST-Struktur, `toJSONOptions`, die
Zod-Schemas als geteilte Wahrheit zwischen Client und Server, React Query als
Cache-Schicht.

---

## 13. Offene Punkte

- Auflösung und Seitenverhältnis der Leinwand sind unbekannt. Bis das geklärt
  ist, wird strikt auflösungsunabhängig gebaut.
- Ob es einen öffentlichen Archivzugang zwischen den Events geben soll, ist
  nicht entschieden.

## 14. Nicht im Scope

- Automatische Score-Erfassung aus den Spielen selbst
- Mehrsprachigkeit (Oberfläche ist deutsch)
- Rollen- und Rechteverwaltung über den Admin-PIN hinaus
- Öffentliche Anmeldung von Teams durch die Teilnehmer selbst
