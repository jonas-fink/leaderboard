# SESSIONS.md

Kurzlog. Ein Eintrag pro abgeschlossenem Schritt: **was** gebaut wurde, welche
**Entscheidung** dabei fiel, was **offen** blieb. Neueste Einträge oben.

Kein Ersatz für `git log` — hier steht, was der Commit nicht erklärt.
Fachliche Wahrheit liegt in `PROJEKT.md`, Code-Standards in `KONVENTIONEN.md`.

**Wer neu einsteigt, liest nicht diesen Log, sondern `PROJEKT.md` §12** —
dort steht, was fertig ist und was als Nächstes ansteht. Hier unten liegen
die Begründungen zu einzelnen Schritten.

**Format:**

```
## JJJJ-MM-TT — Titel
**Gebaut:** was fertig wurde
**Entschieden:** die Entscheidung und der Grund
**Offen:** was als Nächstes ansteht oder ungeklärt blieb
```

---

## 2026-09-10 — Pulsender Statuspunkt, Uploads und Kader

**Gebaut**

- `.pulse-status` in `index.css`: der Verbindungs- und der LIVE-Punkt pulsen
  langsam (2 s, alternierend). Auf Wunsch — eine Leinwand, auf der sich
  minutenlang nichts rührt, sieht aus wie ein eingefrorenes Bild.
- `components/control/ImageField.tsx`: Bild hochladen **oder** Adresse
  eintippen. Eingebaut in Spieler-, Game- und Team-Formular. Damit hängt der
  Upload-Endpunkt zum ersten Mal an einer Oberfläche.
- Kader am Team: `members` ist im Team-Formular als Auswahlliste pflegbar.

**Entschieden**

- **CSS-Keyframes statt Motion für den Punkt.** Eine Endlosschleife ohne
  Zustand braucht kein JavaScript. Die Farbe kommt über `currentColor`,
  damit derselbe Punkt in Grün, Cyan oder Orange leuchtet, ohne die Regel zu
  verdoppeln. Unter `prefers-reduced-motion` steht er still (§9.3).
- **Beide Wege fürs Bild bleiben offen.** Ein Team-Logo kann schon irgendwo
  liegen; der Upload ist der bequeme, nicht der einzige Weg.

**Nebenbei behoben**

- Der Punktebalken in `StandingsRow` hatte seine Dauer fest verdrahtet statt
  `move` zu benutzen. Unter `prefers-reduced-motion` wäre die Zeile in 150 ms
  geblendet, während der Balken weiter 420 ms lang gelaufen wäre — zwei
  Bewegungen, wo eine gemeint ist.

**Zur Frage nach der Rangwechsel-Animation:** die gab es schon —
`motion.div layout` auf der Standings-Zeile, 420 ms mit
`cubic-bezier(.2,.8,.2,1)` aus dem Canvas, der Balken läuft synchron mit,
`AnimatePresence` für Ein- und Austritte, und bei `prefers-reduced-motion`
fällt beides auf einen Crossfade in 150 ms zurück.

**Geprüft**

- Upload-Kette am laufenden Server: Multipart wie aus dem Browser → 128×128
  PNG → Adresse per PATCH an `avatarUrl` → Board liefert sie als `imageUrl`.
  Testbild und Feld danach wieder entfernt.

**Offen**

- Die Oberflächen sind weiterhin nicht im Browser gesehen.
- `GameFormModal` und `PlayerFormModal` benutzen noch die Alias-Farben.

## 2026-09-10 — Die Oberfläche: /board, /result, /control

**Gebaut**

- **Token:** der freigegebene Design-Canvas ist nach `index.css` übersetzt —
  Palette, Schriften (Silkscreen, Chakra Petch), harte Kanten, Bewegungswerte.
- **`/board/:slug`** mit `StandingsPanel`, `GamePanel`, `AnnouncementBanner`,
  `PixelSprite`, dazu `useBoard` (REST + 30s-Poll + Socket) und `useRotation`.
- **`/result/:slug`**: Podium, gestapelte Balken je Disziplin, Sieger je Spiel.
  Der Board-Endpunkt kennt dafür `?all=1`.
- **`/control`** als Schale mit Reitern: Wertung eintragen und zurücknehmen,
  Disziplinen, Teams, Spieler, Turnier. Team-CRUD, Turnier anlegen und
  Status schalten sind neu; die alte Dashboard-Seite ist ersetzt.
- `npm run tournament:delete -- <slug> --yes`.

**Entschieden**

- **`--u` statt Skalierungs-JavaScript.** Der Canvas ist auf 1600×900
  gezeichnet; `--u: clamp(0px, 0.0625vw, 0.11111vh)` ist genau ein
  Canvas-Pixel. Weil `.board` zusätzlich Tailwinds `--spacing` darauf setzt,
  rechnet jede Zahlen-Utility (`w-580`, `top-130`) unmittelbar in
  Canvas-Pixel — kein ResizeObserver, keine Umrechnung von Hand.
- **Die alten Farbnamen bleiben als Alias** auf die neue Palette, bis die
  letzten Control-Komponenten umgebaut sind. Sie an zwanzig Stellen
  gleichzeitig zu ersetzen wäre ein zweiter Umbau im selben Schritt gewesen.
- **Keine Rangvorschau im Eingabeformular.** Sie wäre eine zweite
  Rechenquelle neben dem Server (KONVENTIONEN §8); der Platz steht eine
  Sekunde später in der Liste daneben.
- **`useSyncExternalStore` für den Verbindungszustand.** Er gehört dem
  Socket, nicht React — die erste Fassung spiegelte ihn per `setState` im
  Effekt und der Linter hat zu Recht gemeckert.
- **Toasts über eine Pumpe statt Timer je Toast.** Ein `setTimeout` im
  Effect-Cleanup wird bei jeder Zustandsänderung abgeräumt; der erste Toast
  wäre stehen geblieben. Jetzt eine reine Funktion und ein Takt.
- **Das Turnier wird nicht ausgewählt, sondern gefunden** — das laufende,
  sonst das neueste. Ein Umschalter wäre ein Bedienelement, das bei einem
  Event pro Abend niemand anfasst; als `ponytail:` vermerkt.
- **Turnier löschen als Skript**, nicht als Route — die Begründung stand
  schon in §9, das Skript fehlte bis jetzt.

**Gefunden und behoben**

- **`Game` trug noch einen globalen `slug_1 UNIQUE`** aus der Zeit vor dem
  Turnier-Umbau. Mongoose legt fehlende Indizes an, entfernt aber keine
  überzähligen — zwei Turniere hätten deshalb nie beide ein "Mario Kart"
  haben können, und das Anlegen scheiterte im Test mit 409. `connectDb` ruft
  jetzt `syncIndexes()`, das den veralteten Index abräumt und die Schemas zur
  einzigen Wahrheit macht. Beim ersten Start protokolliert:
  `Veraltete Indizes entfernt — Game: slug_1`.

**Geprüft** (gegen die laufende API)

- Teamturnier angelegt, zwei Teams, eine Disziplin mit demselben Slug wie im
  anderen Turnier (nach dem Index-Fix erlaubt), zwei Teamwertungen: Board
  liefert `mode: team`, Rangfolge 1/2, Punkte 10/8, Teamfarbe und Seed dabei.
  `?all=1` liefert die Disziplinen für die Siegerehrung.
- Das Löschskript ohne `--yes` warnt mit Datenbank und Host, mit `--yes`
  räumt es ab; das Seed-Turnier blieb unversehrt.
- Board-Utilities im gebauten CSS geprüft (`w-580`, `h-690`, `left-680` …) —
  alle über `var(--spacing)`, außerhalb des Boards bleibt es bei `.25rem`.

**Offen**

- **Die Oberflächen sind nicht im Browser gesehen.** Die Chrome-Extension war
  in dieser Sitzung nicht verbunden; geprüft sind Typecheck, Lint, Build und
  das erzeugte CSS, nicht die Optik.
- Upload ist serverseitig fertig, aber an kein Formular angeschlossen —
  Avatare und Banner lassen sich noch nicht über die Oberfläche setzen.
- `GameFormModal` und `PlayerFormModal` benutzen noch die Alias-Farben.
- Teams haben kein Mitglieder-Feld in der Oberfläche.

## 2026-09-10 — Alles über den Funnel: Leserouten zu, Anmeldebremse

**Anlass**

Durchgesprochen, was der Zugriffsschutz garantiert, wenn die Anwendung
öffentlich steht. Ergebnis: **nichts über den PIN hinaus.** Es gibt keinen
Besitzer eines Turniers, kein Nutzermodell, keine Mandanten. Der Entwurf trug
seine Sicherheit auf der Netzwerkebene (§9: `/control` nur im Tailnet) — und
genau die fällt weg, weil das Control-Panel von fremden Geräten aus bedienbar
sein soll, ohne sie ins Tailnet aufzunehmen. Server steht beim Projektleiter,
der Funnel liefert HTTPS, der Beamer-Rechner hängt in einem anderen Netz.

**Gebaut**

- `requireAdminForWrites` heißt jetzt `requireAdmin` und verlangt ein Token
  für **jede** Methode, auch lesend.
- `routes/index.ts` zieht die Grenze neu: öffentlich sind `/api/health`,
  `POST /api/auth` und `GET /api/board/:slug`. Alles andere — auch
  `/api/players`, `/api/scores`, `/api/leaderboard` — liegt darunter.
- Anmeldebremse in `services/auth.service.ts`: Fehlversuche je Absender und
  über alle zusammen, 10-Minuten-Fenster, `429` statt `401`. Vier Tests.
- `app.set('trust proxy', 'loopback')`, damit hinter dem Funnel nicht jeder
  Besucher als `127.0.0.1` gezählt wird.
- `DELETE /api/tournaments/:id` ist weg; der Service bleibt für ein Skript.
- Neuer PIN in `server/.env`, `.env.example` erklärt, wie man einen erzeugt.

**Entschieden**

- **Die Leserouten waren das eigentliche Loch.** Alle 14 GET-Routen liefen an
  der Middleware vorbei: ein Fremder konnte Turniere, Spieler, Teams, Games
  und sämtliche Scores abrufen. Für eine Jugendeinrichtung ist das der Punkt,
  der zählt — nicht die Score-Manipulation.
- **Öffentlich ist genau `GET /api/board/:slug`.** Der Beamer-Rechner kann
  sich nicht anmelden und soll es nicht müssen. `/api/leaderboard` gehört
  ausdrücklich nicht dazu: es liefert Spielerdaten und ist die Datenquelle
  der alten Dashboard-Oberfläche, also Control-Seite.
- **Die Bremse ist absichtlich großzügig** (20 je Absender, 200 gesamt, je 10
  Minuten). Gegen einen zufälligen PIN richtet auch das Zehnfache nichts aus,
  aber während einer Sperre wird auch der **richtige** PIN abgewiesen — eng
  gezählt könnte ein Fremder den Veranstalter mitten im Event aussperren.
  Erster Entwurf stand bei 10/60 und genau das trat im Test ein.
- **Ein bereits angemeldetes Gerät bleibt bei Sperre arbeitsfähig**, weil die
  Bremse nur an `/api/auth` hängt und das Token 12 Stunden gilt. Damit kostet
  ein Sperrversuch mitten im Event keine Eingabemöglichkeit. Geprüft.
- **Turnier löschen kann die API nicht mehr.** Die Kaskade räumt Teams, Games
  und Scores mit ab; über den öffentlichen Funnel wäre ein erratener PIN
  damit nicht ein falscher Punktestand, sondern das Ende des Events. Der
  Controller ist gelöscht, der Service dokumentiert als Skript-Weg.
- **Kein Mandantenmodell.** `ownerId`, Nutzer und turnierbezogene Leserouten
  wären ein Datenmodell-Umbau und stehen in §14 ausdrücklich außerhalb des
  Scopes. Solange eine Instanz einem Veranstalter gehört, ist der PIN die
  richtige Granularität.
- **Kein `express-rate-limit`.** Eine `Map` mit Zeitfenster ist kürzer als
  die Konfiguration der Bibliothek und läuft im selben Prozess wie alles
  andere.

**Geprüft** (Server auf Port 4001, hinter dem Funnel simuliert)

- Ohne Token: `/api/board/:slug` 200, `/tournaments`, `/players`, `/scores`,
  `/teams`, `/games`, `/leaderboard` je 401.
- `DELETE /api/tournaments/:id` gibt es nicht mehr.
- 25 parallele Fehlversuche → ab dem 21. `429`; ein vorher angemeldetes Gerät
  schreibt währenddessen weiter mit `200`.
- Kein Operator-Injection über Query-Strings: Express 5 nutzt den einfachen
  Parser, `?gameId[$ne]=x` wird schlicht ignoriert.

**Offen**

- Die Oberflächen `/board`, `/control`, `/result`.
- Die alte Dashboard-Oberfläche braucht ab sofort ein Token, um überhaupt
  etwas anzuzeigen — die PIN-Eingabe steht in der Navbar.
- Der Socket ist weiterhin unauthentifiziert: `room:join` nimmt jede
  `tournamentId`. Für das öffentliche Board ist das richtig, heißt aber, dass
  auch ein Turnier im Status `draft` live mitgelesen werden kann.
- Ein Log für Fehlanmeldungen gibt es nicht.

## 2026-09-10 — Zugriffsschutz und Upload

**Gebaut**

- `services/auth.service.ts`: PIN-Prüfung und signiertes Token, dazu
  `middleware/auth.ts` (`requireAdminForWrites`) und `POST /api/auth`.
  Fünf Tests in `services/auth.check.ts`.
- Upload: `middleware/upload.ts` (multer, 2 MB, PNG/JPEG/WebP),
  `services/upload.service.ts` (sharp → 128×128 PNG, Nearest-Neighbour),
  `POST /api/uploads`, ausgeliefert über `express.static` auf `/uploads`.
- `shared/schemas.ts`: `ImageUrlSchema`, `LoginSchema`, `AuthTokenSchema`,
  `UploadResultSchema`. Neue Env-Werte `ADMIN_PIN` und `UPLOAD_DIR`.
- Client: `lib/auth.ts` (Token im localStorage), `api.ts` schickt den
  `Authorization`-Header und kennt `login()` und `uploadImage()`,
  `components/layout/PinLock.tsx` in der Navbar.

**Entschieden**

- **Kein JWT, kein `jsonwebtoken`.** Es gibt genau einen Claim (das
  Ablaufdatum) und einen Aussteller. `createHmac` aus `node:crypto` reicht:
  `<ablauf>.<hmac>`, base64url. Verglichen wird mit `timingSafeEqual`.
- **Signiert wird mit dem `ADMIN_PIN` selbst.** Ein zweites Geheimnis brächte
  nichts — wer den PIN kennt, darf ohnehin schreiben. Nebeneffekt: ein
  geänderter PIN entwertet alle ausgegebenen Tokens sofort.
- **Die Middleware hängt einmal zentral in `routes/index.ts`**, nicht je
  Route. Sie lässt GET, HEAD und OPTIONS durch und verlangt sonst ein Token.
  So kann eine neu hinzugefügte Route nicht versehentlich offen bleiben —
  der Fehler, den die Variante „je Route eintragen" jedes Mal erlaubt.
- **500 ms Wartezeit nach falschem PIN.** Netzwerkseitig ist die Eingabe
  ohnehin nur im Tailnet erreichbar (§9); die Bremse kostet nichts und nimmt
  dem Durchprobieren die Geschwindigkeit.
- **`z.url()` reicht für Bildfelder nicht.** Ein eigener Upload liefert
  `/uploads/<name>.png`, also eine relative Adresse — `z.url()` hätte genau
  die abgelehnt. Neu ist `ImageUrlSchema`: externe URL **oder** ein Pfad
  unterhalb von `/uploads/`. Gilt für `coverUrl`, `avatarUrl`, `bannerUrl`
  und `imageUrl` im Board-Vertrag.
- **`token.ts` liegt in `services/`, nicht in `utils/`.** Erster Versuch war
  der Utils-Barrel — der zieht damit `#config` in jede Datei, die
  `formatMetricValue` importiert, und `announce.check.ts` fiel sofort um
  (kein `MONGODB_URI` im Testlauf). Die Rule-Module bleiben nur rein, wenn
  der Barrel, den sie anfassen, nichts lädt.
- **Multer-Fehler bekommen einen Status.** `MulterError` trägt keinen, lief
  also als 500 durch. Jetzt 413 mit deutscher Meldung bei zu großer Datei,
  sonst 400.
- **Die Datei bleibt im Speicher, bis sharp fertig ist.** `memoryStorage`
  statt `diskStorage`: eine Zwischendatei wäre nur Müll, den jemand
  aufräumen müsste.
- **`PinLock` ist ein Feld in der Navbar, kein Auth-Context.** Der Zustand
  ist ein Eintrag im localStorage mit genau einem Leser. Als
  `ponytail:`-Notiz vermerkt; die richtige Anmeldemaske kommt mit `/control`.
- **Ein 401 löscht das Token nur, wenn eines mitgeschickt wurde.** Sonst
  überschriebe der Client die Servermeldung „Falscher PIN" mit
  „Sitzung abgelaufen".

**Geprüft** (Server auf Port 4001)

- Schreiben ohne Token 401, Lesen ohne Token 200, falscher PIN 401 mit
  „Falscher PIN", richtiger PIN gibt ein Token, manipulierte Signatur 401,
  Schreiben mit Token 201.
- Upload: 900×300 JPEG kommt als 128×128 PNG zurück und ist unter der
  gelieferten Adresse abrufbar; `text/plain` 415; 25 MB 413; Upload ohne
  Token 401. Die Adresse ließ sich per PATCH an `avatarUrl` hängen — das
  neue `ImageUrlSchema` nimmt sie an.
- Testspieler und Testbilder wieder entfernt.

**Offen**

- Die Oberflächen `/board`, `/control`, `/result` — der letzte Punkt aus §12.
- `ADMIN_PIN` steht mit einem generierten Entwicklungswert in `server/.env`
  und gehört vor dem Event ersetzt.
- `npm audit` meldet weiterhin die moderate `qs`-Lücke über Express.

## 2026-09-10 — Board-Service, Spruch-Pool, Socket-Layer

**Gebaut**

- `services/board.service.ts`: lädt Turnier, Games, Scores und Teilnehmer und
  verkettet `rank` → `points` → `standings` zum `BoardState`. Dazu
  `GET /api/board/:slug` als Poll-Netz (§5).
- `content/announcements.de.json` mit sechs Varianten je Ereignistyp, plus
  `content/index.ts`: Pool-Validierung beim Start und `createPicker()`, der
  `announce`s `pick` erfüllt. Alias `#content`.
- `realtime/index.ts`: Socket.IO am selben HTTP-Server, Räume
  `tournament:<id>`, `emitBoardUpdate` und `emitTournamentStatus`. Verdrahtet
  in Score-, Game- und Tournament-Controller. Alias `#realtime`.
- Vite proxyt `/socket.io` mit `ws: true`; `socket.io-client` liegt schon im
  Client-`package.json` für die spätere Oberfläche.

**Entschieden**

- **Gerechnet wird über alle Games, angezeigt nur die gepinnten.** Die
  Gesamtwertung kennt kein Streichresultat (§4.3), das Board zeigt dagegen
  eine Auswahl in `boardOrder`. Ein Filter, zwei Bedeutungen.
- **Teilnehmer im Spieler-Modus sind die mit mindestens einem Ergebnis.**
  Teams sind am Turnier gemeldet und stehen auch ohne Ergebnis mit 0 Punkten
  drin; Spieler sind global, es gibt keine Turniermeldung. Die Score-Eingabe
  ist damit die Anmeldung. Als `ponytail:`-Notiz im Code vermerkt — eine
  Roster-Liste kommt, wenn /control sie braucht.
- **Ergebnisse ohne Teilnehmer fallen raus.** Der Client schlägt jeden
  Game-Eintrag in den Standings nach; ein Score eines gelöschten Spielers
  hinterließe dort eine Leerzeile.
- **`buildBoardState` nimmt ein Turnier, nicht einen Slug.** Die Leinwand
  kennt den Slug, die Räume und Scores tragen die ID — daher `boardBySlug`
  und `boardById` als zwei dünne Einstiege statt zweier Ladepfade.
- **`deleteScore` und `deleteGame` geben das gelöschte Dokument zurück.**
  Ohne das kennt der Controller nach dem Löschen die `tournamentId` nicht
  mehr und kann den Raum nicht bedienen.
- **Der Pool wird beim Start geprüft, nicht beim Ziehen.** Die Datei soll vor
  jedem Event von Hand angepasst werden (§7); ein Tippfehler soll den Server
  laut nicht hochkommen lassen statt mitten im Event einen leeren Toast zu
  erzeugen.
- **Der Vorrat des Ziehers hängt per `WeakMap` an der Variantenliste selbst.**
  `pick` bekommt nur das Array — damit hat jeder Ereignistyp automatisch
  seinen eigenen Vorrat, ohne dass der Zieher die Typen kennen muss.
- **Der vorherige Board-Zustand liegt im Prozessspeicher.** Ein Neustart
  mitten im Event kostet die Toasts des nächsten Scores, nicht die Wertung —
  die wird bei jedem Abruf neu gerechnet.
- **Emittiert wird nur aus `realtime/`** (KONVENTIONEN §8); ohne
  initialisierten Socket tut `emitBoardUpdate` nichts, damit Skripte laufen.
- **Kein TDD für Board-Service und Realtime** — beides fasst Mongo
  beziehungsweise Sockets an (§7.1). Der Zieher hat trotzdem vier Tests, weil
  er Zustand hält: `content/content.check.ts`.

**Geprüft** (Server auf Port 4001, weil auf 4000 noch ein alter Prozess lief)

- `GET /api/board/future-space-night`: Gesamtwertung mit echtem Gleichstand
  auf Rang 1 (nova/byte, 17 Punkte, Folgerang 3), Mittelung bei Gleichstand
  in Mario Kart (je 7), `computedAt` als ISO-String.
- Socket-Durchstich: `room:join`, dann zwei Scores per REST — erster Emit
  ohne Toasts (kein Vorzustand), zweiter mit
  `personal_best: echo legt in Mario Kart nach — 00:50.000, Platz 1`. Der
  Wert kommt formatiert, nicht als `50000`.
- Nach dem Aufräumen der Testscores steht die Seed-Wertung unverändert da.

**Offen**

- Upload (`multer` + `sharp`) und Admin-PIN.
- Die Oberflächen `/board`, `/control`, `/result`.
- `npm audit` meldet eine moderate Lücke in `qs` (transitiv über Express);
  nicht angefasst, weil der Fix Express-Abhängigkeiten anhebt.
- Auf Port 4000 läuft noch ein Serverprozess aus einer früheren Session mit
  altem Code — der kennt `/api/board` nicht und muss neu gestartet werden.

## 2026-09-10 — Docs auf den Umsetzungsstand gezogen

**Gebaut**

- `PROJEKT.md` §12 heißt nicht mehr „Umbau gegenüber dem Ist-Stand", sondern
  **„Stand der Umsetzung"**: was fertig ist, wo es liegt, was in welcher
  Reihenfolge als Nächstes kommt, und was bewusst noch nicht existiert.
  Die alte Umbau-Tabelle ist abgearbeitet und damit weg.
- Kopfzeile und §13 nachgezogen; der erledigte Payload-Punkt ist raus.
- `KONVENTIONEN.md`: die `as`-Regel nennt jetzt beide erlaubten Stellen
  (`asApi` und den `pre('validate')`-Hook), `seed.ts` steht im Strukturbaum,
  und dass Prettier absichtlich keine devDependency ist, steht bei §3.
- `README.md` war noch die unveränderte Vite-Vorlage und ist jetzt ein
  Einstieg: die drei Dokumente, die Befehle, der Aufbau.

**Entschieden**

- **Der Stand gehört nach `PROJEKT.md`, nicht in diesen Log.** SESSIONS
  wächst nach unten und beantwortet „warum", nicht „wo stehen wir". Ein
  frischer Einstieg braucht eine Stelle, und das ist das Einstiegsdokument.

**Offen** — unverändert, siehe `PROJEKT.md` §12:

1. Board-Service, der die vier Rule-Module verkettet und `BoardState` baut.
2. Spruch-Pool plus Zieher mit Gedächtnis für `announce`s `pick`.
3. Socket-Layer in `realtime/`.
4. Upload und Admin-PIN.
5. Die Oberflächen `/board`, `/control`, `/result`.

---

## 2026-09-10 — Player: displayName und avatarSeed

**Gebaut**

- `PlayerFields` nach dem Ableitungsmuster aus §5, dazu `displayName?` und
  `avatarSeed`. Modell, Service, Seed und `PlayerFormModal` nachgezogen.
- Damit ist der Datenmodell-Umbau aus §12 vollständig.

**Entschieden**

- **`avatarSeed` fällt im Service aus dem `username`**, genau wie beim Team
  aus dem Namen, und wird bei einer Umbenennung nicht neu abgeleitet — das
  Sprite bleibt dem Spieler.
- **`CreatePlayerSchema` kennt `avatarSeed` gar nicht** (`omit`), ein vom
  Client mitgeschickter Wert wird dadurch verworfen statt übernommen. Am
  Endpunkt geprüft.
- **`UpdatePlayerSchema` leitet jetzt von `PlayerFields` ab**, nicht mehr von
  `CreatePlayerSchema` — sonst ließe sich `avatarSeed` auch per PATCH nicht
  korrigieren, obwohl es ein echtes Feld der Entität ist. Entspricht Regel 4
  aus KONVENTIONEN §5.
- **`displayName` bekommt ein Formularfeld.** Ohne Eingabemöglichkeit wäre
  das Feld tot; das Board fällt bei leerem Wert auf den `username` zurück.

**Geprüft**

- Neu geseedet; Spieler tragen ihren Seed, ein neu angelegter leitet ihn ab
  (`Zenith` → `zenith`), ein gefälschter wird verworfen.

**Offen**

- `content/announcements.de.json` und der Zieher mit Gedächtnis.
- Der Board-Service, der die vier Rule-Module verkettet und `BoardState`
  baut — jetzt nicht mehr blockiert, weil `avatarSeed` überall existiert.

---

## 2026-09-10 — Seed-Skript

**Gebaut**

- `server/src/seed.ts` plus `npm run seed`: leert alle fünf Collections und
  legt ein Beispielturnier an — 6 Spieler, 3 Games, 9 Scores.

**Entschieden**

- **`npm run seed` allein tut nichts.** `MONGODB_URI` zeigt auf einen
  gehosteten Atlas-Cluster; ein versehentlicher Lauf wäre dort nicht
  rückholbar. Das Skript nennt Datenbank und Host und verlangt
  `npm run seed -- --yes`.
- **Das Beispiel läuft im `player`-Modus.** Die Score-Eingabe kennt derzeit
  nur Spieler; ein Team-Beispiel wäre nicht bespielbar. Kommt, sobald
  /control Teamwertungen eintragen kann — `Team` bleibt bis dahin ungeseedet.
- **Die Daten sind auf die Wertungsregeln zugeschnitten:** ein Gleichstand
  auf Rang 2 in Mario Kart für die Punktemittelung, ein Finale mit
  `weight: 2` für den Gewichtungsfaktor, drei verschiedene `status`-Werte und
  beide Sortierrichtungen (`time_ms`/ASC und `integer`/DESC).
- **Eine Datei, kein `scripts/`-Ordner.** Ein neuer Ordner bräuchte nach
  KONVENTIONEN §2 einen eigenen Alias; für ein Skript ist das zu viel.

**Ausgeführt und geprüft** (nach Freigabe: `dbName` ist auf `leaderboard`
festgelegt, die übrigen Datenbanken im Cluster sieht die Verbindung nicht):

- REST-Durchstich über die laufende API: Turnier, Games mit `weight`,
  `status`, `boardOrder`, beide Sortierrichtungen.
- `startsAt` kommt als ISO-String zurück — der Serializer-Umbau bestätigt.
- Ranglisten mit Gleichstand korrekt: 1, 2, 2, 4, 5 bei ASC wie bei DESC.
- Beide Refines greifen am echten Endpunkt: ein Score mit
  `entrantType: 'team'` und `playerId` und eine steigende `pointsTable`
  werden mit den deutschen Meldungen abgelehnt.

**Offen**

- `Player` fehlen weiterhin `displayName` und `avatarSeed` (§12); das Seed
  legt sie deshalb nur mit `username` an.
- `content/announcements.de.json` und der Zieher mit Gedächtnis.
- Der Board-Service, der die vier Rule-Module verkettet.

---

## 2026-09-10 — Turnier-Picker im Game-Formular

**Gebaut**

- `api.fetchTournaments`, `useTournaments`, `queryKeys.tournaments`.
- `GameFormModal`: Turnier-Select neben dem Genre; damit ist die Zwei-Spalten-
  Zeile wieder gefüllt, die der Wegfall von `timeframe` hinterlassen hat.

**Entschieden**

- **Die Auswahl fällt abgeleitet, nicht per Effect.**
  `form.tournamentId || tournaments[0]?.id || ''` — beim Anlegen gilt das
  erste Turnier, bis eines gewählt wird. Ein `useEffect`, der den Formstate
  nach dem Laden nachzieht, wäre eine Synchronisationsquelle mehr für
  denselben Effekt.
- **Nur Lesen.** Turniere anlegen, ändern oder löschen kann die Oberfläche
  nicht — das gehört nach `/control` (§2) und war hier nicht gefragt.
- **Kein TDD.** UI-Code, KONVENTIONEN §7.1.

**Offen**

- **Der Picker ist leer, solange kein Turnier existiert**, und angelegt
  werden kann derzeit keines. Das Seed-Skript aus §12 ist die vorgesehene
  Quelle und damit der nächste sinnvolle Schritt — ohne das bleibt das
  Anlegen von Games blockiert.
- `Player` fehlen weiterhin `displayName` und `avatarSeed` (§12).
- `content/announcements.de.json` und der Zieher mit Gedächtnis.
- Der Board-Service, der die vier Rule-Module verkettet.

---

## 2026-09-10 — REST für Tournament und Team

**Gebaut**

- Services, Controller und Routen für beide Entitäten nach dem Muster von
  Game: `/api/tournaments` (Liste, Slug, POST, PATCH, DELETE) und
  `/api/teams?tournamentId=…`.
- `db/serialize.ts`: Daten werden jetzt zentral zu ISO-Strings.

**Entschieden**

- **Der Serializer stringifiziert Daten, nicht jeder Service einzeln.**
  `startsAt` ist im Vertrag ein String, kam aus Mongo aber als `Date` — der
  Typ wäre an der Stelle schlicht gelogen gewesen. Der Transform machte das
  für ObjectIds längst, aus genau demselben Grund. Damit ist die Umrechnung
  in `score.service.toRaw` doppelt und fällt weg.
- **Turnier löschen räumt Teams, Games und Scores mit ab.** Weil Scores die
  `tournamentId` denormalisiert tragen, geht das ohne Join — der Grund, aus
  dem das Feld überhaupt da ist.
- **`GET /api/teams` verlangt `tournamentId`** und antwortet sonst mit 400.
  Eine turnierübergreifende Teamliste hat keine Bedeutung: dieselbe Person
  spielt beim nächsten Event in einem anderen Team.
- **`avatarSeed` fällt beim Anlegen aus dem Namen** (getrimmt, klein) und
  wird bei einer Umbenennung bewusst _nicht_ neu abgeleitet — ein Team soll
  nicht mitten im Turnier ein anderes Gesicht bekommen.
- **Keine Tests.** Services fassen Mongo an, KONVENTIONEN §7.1 nimmt sie von
  TDD aus. Stattdessen ein Import-Smoketest auf den Router.

**Offen**

- Turnier-Picker im Control-Panel, damit Games wieder anlegbar sind.
- `Player` fehlen weiterhin `displayName` und `avatarSeed` (§12).
- `content/announcements.de.json` und der Zieher mit Gedächtnis.
- Der Board-Service, der die vier Rule-Module verkettet.
- Seed-Skript für ein Beispielturnier (§12).

---

## 2026-09-10 — Tournament- und Team-Modelle

**Gebaut**

- `models/tournament.model.ts` und `models/team.model.ts`, im Barrel vorn,
  weil Game, Score und Team per `ref` auf sie zeigen.

**Entschieden**

- **Die Monotonie der `pointsTable` steht auch im Mongoose-Validator.**
  Dieselbe Begründung wie beim polymorphen Score: Seed-Skripte schreiben am
  Zod-Schema vorbei, und `points.ts` verlässt sich auf die fallende Tabelle,
  ohne sie nachzuprüfen. Die Regel steht damit an genau den beiden Stellen,
  an denen Daten hereinkommen.
- **Team-Name ist nur je Turnier eindeutig**, als zusammengesetzter Index —
  wie schon der Game-Slug. Dieselbe Crew darf beim nächsten Event wieder
  denselben Namen tragen.
- **`members` bleibt eingebettet** statt in einer Membership-Collection: der
  Kader ist klein und wird immer zusammen mit dem Team gelesen. Weil das Team
  am Turnier hängt, ist die Zugehörigkeit automatisch turnierbezogen.
- **Keine Tests.** Modelle fassen Mongo an, KONVENTIONEN §7.1 nimmt sie
  ausdrücklich von TDD aus. Die Punktetabellen-Regel ist über
  `schemas.check.ts` auf der Zod-Seite abgedeckt.

**Offen**

- Services, Controller und Routen für Tournament und Team; erst danach kann
  ein Turnier-Picker entstehen.
- `Player` fehlen weiterhin `displayName` und `avatarSeed` (§12).
- `content/announcements.de.json` und der Zieher mit Gedächtnis.
- Der Board-Service, der die vier Rule-Module verkettet.

---

## 2026-09-10 — Game- und Score-Umbau

**Gebaut**

- `shared/schemas.ts`: Game bekommt `tournamentId`, `weight`, `boardOrder`,
  `status` und verliert `timeframe`; `TimeframeSchema` ist ersatzlos weg.
  Score wird polymorph (`ScoreFields` + `.refine()`), bekommt
  `tournamentId` und `entrantType`, `playerId` wird optional.
- Modelle: beide Felder-Sätze gespiegelt, Slug nur noch je Turnier eindeutig,
  die vier Indizes aus §3, Mongoose-Validator für den polymorphen Score.
- `rank.ts` von `playerId` auf `entrantId` verallgemeinert, Tests zuerst.
- `leaderboard.service.ts`, `score.service.ts`, `#types` nachgezogen.
- Client: `GameCard`, `LeaderChartCard`, `GameFormModal`, `ScoreFormModal`,
  `hooks/index.ts`.

**Entschieden**

- **`rank.ts` musste mit.** `RawScore.playerId` wird optional, damit bricht
  die Gruppierung — §12 sieht die Verallgemeinerung ohnehin vor. `RawScore`
  trägt jetzt ein abgeleitetes `entrantId` (`playerId ?? teamId`), das der
  Score-Service an der DB-Grenze setzt. Die Rangliste ist damit für Spieler-
  und Team-Turniere dieselbe Funktion.
- **Die Ableitungen hängen an `ScoreFields`, nicht an `SubmitScoreSchema`.**
  `.refine()` liefert kein `ZodObject` mehr, auf dem `.extend()` existiert;
  `LeaderboardEntry` und `ScoreRecord` leiten deshalb von den Feldern ab und
  das Refine sitzt nur auf dem Submit-Schema.
- **Das Refine prüft die Zuordnung, nicht nur die Anzahl.** Zu
  `entrantType: 'player'` muss `playerId` gesetzt und `teamId` leer sein —
  das fängt zusätzlich einen Score, dessen Typ nicht zur ID passt.
- **`UpdateScoreSchema` lässt nur noch Wert und Zusatzwerte zu.** Ein Score
  ist korrigierbar, aber nicht auf einen anderen Teilnehmer oder in eine
  andere Disziplin umhängbar.
- **Alte UI nur kompilierfähig gehalten** (so entschieden): die
  Zeitraum-Anzeigen sind raus, `GameFormModal` kann bis `/control` kein neues
  Game anlegen — `tournamentId` bleibt leer und die Validierung schlägt
  sichtbar im Formular fehl. Bearbeiten funktioniert weiter.
  `ScoreFormModal` läuft vollständig, weil `game.tournamentId` sowohl das
  Turnier als auch `entrantType: 'player'` hergibt.
- **`as unknown as` im Score-Validator.** Der Hook bekommt das Dokument über
  `this` und Mongoose typisiert das nicht mit — eine der in KONVENTIONEN §4
  vorgesehenen Ausnahmen, mit Begründung im Code.

**Offen**

- Mongoose-Modelle für Tournament und Team.
- Turnier-Picker im Control-Panel, damit Games wieder anlegbar sind.
- `Player` fehlt noch `displayName` und `avatarSeed` (§12).
- `content/announcements.de.json` und der Zieher mit Gedächtnis.
- Der Board-Service, der die vier Rule-Module verkettet.

---

## 2026-09-10 — Tournament- und Team-Schemas

**Gebaut**

- `shared/schemas.ts`: `TournamentSchema`, `TeamSchema` samt Create- und
  Update-Varianten nach den Ableitungsregeln aus KONVENTIONEN §5.
- `server/src/schemas/schemas.check.ts`: vier Prüfungen für die Defaults und
  die Monotonie der Punktetabelle.

**Entschieden**

- **Nur Tournament und Team, kein Game- und Score-Umbau.** `timeframe`
  entfällt laut §12 ersatzlos, hängt aber an `LeaderboardChartDataSchema`,
  `GameFormModal`, der Leaderboard-Query und der Games-Seite. Schema-only
  bräche dort den Typecheck; der Umbau geht nur zusammen mit dem abhängigen
  Code und wird ein eigener Schritt. Tournament und Team sind rein additiv
  und brechen nichts.
- **`pointsTable` bekommt das `.refine()` auf monotones Fallen.** Damit ist
  der offene Punkt aus dem points.ts-Schritt erledigt: die Annahme, auf die
  sich `placementPoints` verlässt, wird an der Eingabegrenze erzwungen statt
  im Rule-Modul nachgeprüft. Gleiche Werte hintereinander sind erlaubt, die
  Garantie hält auch dann.
- **`avatarSeed` fehlt in `CreateTeamSchema`.** Der Seed wird deterministisch
  aus dem Namen abgeleitet, das ist Sache des Service — nicht des Aufrufers.
- **Die Schemas stehen hinter dem Board-Vertrag in der Datei**, weil sie
  `TournamentModeSchema` und `TournamentStatusSchema` von dort mitbenutzen.
  Genau dafür wurden die Enums damals vorgezogen.

**Offen**

- Game- und Score-Umbau samt abhängigem Code: `+tournamentId`, `+weight`,
  `+boardOrder`, `+status`, `−timeframe`; Score polymorph mit `.refine()`.
- Mongoose-Modelle für Tournament und Team.
- `content/announcements.de.json` und der Zieher mit Gedächtnis für `pick`.
- Der Board-Service, der die vier Rule-Module verkettet.

---

## 2026-09-10 — announce.ts: Board-Diff zu Toast-Ereignissen

**Gebaut**

- `services/announce.check.ts` (16 Tests), danach `services/announce.ts`
  mit `announce(previous, next, pool, pick)`. Damit sind alle vier
  Rule-Module aus §4.5 fertig.
- `#types`: der Board-Vertrag ist re-exportiert, dazu `AnnouncementPool`
  und `PickVariant`.
- Prettier über die Dateien dieser Session gezogen; `standings.*` war noch
  nicht formatiert.

**Entschieden**

- **Die Wiederholungsfreiheit steckt in `pick`, nicht im Modul.** §7 will
  zufällig und ohne Wiederholung ziehen — das ist Zustand über Aufrufe
  hinweg und widerspricht §7.2. Ein injiziertes `pick` ist die eine Naht für
  beides: der Test übergibt `v => v[0]`, die Realtime-Schicht später den
  Zieher mit Gedächtnis.
- **`previous === undefined` ergibt `[]`.** Sonst wirft der erste berechnete
  Zustand für jeden Teilnehmer einen Toast.
- **Führungswechsel nur für Teilnehmer, die schon in der Wertung standen.**
  Sonst meldet jeder neu angelegte Spieler einen `new_leader`, weil er ohne
  Punkte auf Rang 1 einsteigt.
- **`overtake` schließt den neuen Führenden aus**, sonst kommen für denselben
  Sprung zwei Toasts.
- **`tie_broken` wird für den Vorderen der ehemaligen Gruppe gemeldet**, mit
  seinem neuen Rang — nicht für alle Beteiligten.
- **`game_finished` trägt den Sieger der Disziplin**, damit der Toast dessen
  Avatar zeigen und ein Spruch `{entrant} gewinnt {game}` lauten kann.
- **Reihenfolge der Rückgabe ist die Dringlichkeit**, absteigend von
  `tournament_finished` bis `first_score`. Das Board zeigt zwei gleichzeitig
  und stellt den Rest in die Warteschlange; was hinten steht, sieht das
  Publikum erst später.
- **Nicht belegte Platzhalter bleiben im Text stehen**, statt still zu
  verschwinden — ein Tippfehler im Spruch-Pool soll auffallen.

**Offen**

- `content/announcements.de.json` — der Spruch-Pool selbst, plus der Zieher
  mit Gedächtnis, der `pick` erfüllt.
- Der Board-Service, der `rank` → `points` → `standings` → `announce`
  verkettet und Teilnehmerdaten dazulädt. Kein Rule-Modul, kein TDD.
- Prettier ist keine devDependency; `npx prettier` zieht es bei Bedarf.
- Weiterhin: `.refine()` auf monoton fallende `pointsTable`.

---

## 2026-09-10 — formatMetricValue nach shared/

**Gebaut**

- `shared/format.ts`; `src/utils/index.ts` und `server/src/utils/index.ts`
  re-exportieren daraus. Die beiden Client-Aufrufer bleiben unverändert.
- KONVENTIONEN §2: `shared/` wächst im Baum von einer Datei auf zwei.

**Entschieden**

- **Der Formatter wird geteilt statt verdoppelt.** `announce.ts` rendert den
  Toast-Text serverseitig fertig (§7), und `{value}` muss dieselbe
  Darstellung haben wie die Game-Karte daneben — sonst steht auf derselben
  Leinwand einmal `01:11.350` und einmal `71350`.
- Strukturänderung an KONVENTIONEN §2: `shared/` war bisher als eine Datei
  dokumentiert. Der Grund, warum es shared/ gibt, gilt für den Formatter
  genauso wie für die Schemas.

**Offen**

- `announce.ts` — der eigentliche Schritt, für den der Formatter gebraucht
  wird.

---

## 2026-09-10 — standings.ts: Gesamtwertung und olympischer Tie-Break

**Gebaut**

- `services/standings.check.ts` (12 Tests), danach `services/standings.ts`
  mit `computeStandings(entrantIds, placements)`. Im Services-Barrel.
- `#types`: `Placement` und `StandingsRow`, beide als `Pick<>` aus den
  Board-Schemas — kein Typ steht doppelt.

**Entschieden**

- **`placements` kommt flach über alle Disziplinen, ohne `gameId`.** Weder
  die Punktsumme (§4.3) noch das Platzhistogramm (§4.4) interessiert, aus
  welchem Spiel ein Ergebnis stammt. Weil `Placement` ein `Pick` von
  `BoardGameEntry` ist, passt `games.flatMap(g => g.entries)` ohne Adapter.
- **`entrantIds` ist ein eigener Parameter**, nicht aus den Placements
  abgeleitet. Sonst verschwindet, wer noch nichts gespielt hat — und genau
  der soll mit 0 Punkten in der Liste stehen.
- **Rückgabe ist nicht der fertige `StandingsEntry`.** Name, Bild und Farbe
  kommen aus Player- bzw. Team-Dokumenten und setzt der Board-Service dazu;
  das Rule-Modul bleibt DB-frei.
- **`share` ist 0, solange niemand Punkte hat.** Das Board wird vor dem
  ersten Score geöffnet; ohne Guard stünde dort NaN und die Validierung
  gegen `min(0).max(1)` würde werfen.
- **`rankCounts` wird aufgefüllt statt direkt indiziert.** Ein Loch im Array
  käme als `null` durch `JSON.stringify` und bräche das Schema.
- **Bei echtem Gleichstand entscheidet die Reihenfolge in `entrantIds`**,
  weil die Sortierung stabil ist — auf der Leinwand also Roster-Reihenfolge,
  nicht Alphabet.

**Offen**

- `announce.ts`: Vergleich zweier `BoardState` → Toast-Ereignisse. Braucht
  den Spruch-Pool `content/announcements.de.json` und einen injizierten
  Zufallsgenerator (KONVENTIONEN §7.2).
- Der Board-Service, der `rank` → `points` → `standings` verkettet und die
  Teilnehmerdaten dazulädt. Kein Rule-Modul, also kein TDD.
- Weiterhin offen: `.refine()` auf monoton fallende `pointsTable` am
  Tournament-Schema.

---

## 2026-09-10 — points.ts: Platzierungspunkte

**Gebaut**

- `services/points.check.ts` (13 Tests) und danach `services/points.ts` mit
  `placementPoints(ranks, pointsTable, weight = 1)`. Im Services-Barrel.

**Entschieden**

- **Signatur nur über `number[]`.** Das Modul kennt weder `RankedScore` noch
  `Game`. `standings.ts` reicht `ranked.map(e => e.rank)` hinein und zippt
  das Ergebnis per Index zurück. Genau das, was §4.2 beschreibt, sonst nichts.
- **Gruppiert wird über den Rangwert, nicht über benachbarte Einträge.**
  `rankScores` liefert zwar sortiert, aber eine Zählung per Map ist gleich
  kurz und bleibt bei unsortierter Eingabe korrekt.
- **Fehlende Tabellenplätze werden als 0 mit eingemittelt.** Zwei auf Rang 2
  bei Tabelle `[10,8]` bekommen je 4, nicht 8. Nur so bleibt die
  ausgeschüttete Summe konstant — die Begründung, mit der §4.2 das Mitteln
  überhaupt einführt.
- **Monotonie ist Invariante, nicht Zufall.** Zwei Ranggruppen mitteln
  disjunkte, aufeinanderfolgende Ausschnitte einer fallenden Tabelle; ein
  schlechterer Rang kann einen besseren nie überholen. Steht als eigener
  Test, weil das die Frage ist, die man sich bei diesem Modul stellt.

**Offen**

- **`pointsTable` muss monoton fallen**, sonst kippt die Monotonie-Garantie.
  `points.ts` prüft das bewusst nicht — es rechnet, es validiert nicht. Gehört
  als `.refine()` an `TournamentFields`, sobald dieses Schema entsteht.
- `standings.ts` nach TDD: Summe über alle Games, olympischer Tie-Break,
  `share` und `rankCounts` für den Board-Payload.

---

## 2026-09-10 — Payload-Vertrag für board:update und event:announce

**Gebaut**

- `shared/schemas.ts`: `BoardStateSchema`, `AnnouncementSchema`, dazu
  `RoomJoinSchema`, `TournamentStatusEventSchema` und die getypten
  Event-Maps `ServerToClientEvents` / `ClientToServerEvents`.
- Vorgezogen, weil an drei Stellen gebraucht: `TournamentModeSchema`,
  `TournamentStatusSchema`, `GameStatusSchema`. Die Entity-Schemas von
  `Tournament` und `Game` referenzieren sie später, statt sie zu wiederholen.

**Entschieden**

- **Ein flacher `StandingsEntry` statt Player | Team.** Das Board rendert in
  beiden Turniermodi dieselbe Zeile. Der Server entscheidet einmal, was Name,
  Bild und Farbe sind; der Client verzweigt nie über den Modus. `entrantType`
  entfällt auf der Leitung — der Modus steht am Turnier im selben Payload.
- **Game-Einträge verweisen per `entrantId`**, statt Name und Avatar je
  Disziplin zu wiederholen. Jeder Teilnehmer steht genau einmal im Payload
  und kann nicht auseinanderlaufen.
- **`rankCounts: number[]` statt `firstPlaces: number`.** §4.4 vergleicht
  erste, dann zweite, dann dritte Plätze, und die Siegerehrung braucht den
  Medaillenspiegel. Ein Array bedient beides; zwei Felder wären Redundanz.
- **`computedAt` im Board-Zustand.** Das Board pollt zusätzlich alle 30s per
  REST. Ohne Zeitstempel kann eine langsame Poll-Antwort einen neueren
  Socket-Zustand überschreiben — ein sichtbar falsches Board.
- **`BoardGame` zeigt kein `weight`, `boardOrder`, `pinned`.** Reihenfolge ist
  die Array-Reihenfolge, ungepinnte Games stehen gar nicht drin.
- **Kein diskriminierter Union für `Announcement`.** Sieben Typen, aber nur
  `tournament_finished` fällt aus dem Muster; für die Darstellung ist die
  Unterscheidung egal. Flaches Objekt mit optionalen Feldern.
- **Keine Tests.** Deklarative Schemas ohne Verzweigung; KONVENTIONEN §7.1
  führt sie nicht als TDD-pflichtig.

**Offen**

- `GameSchema.pick(...)` in `BoardGameSchema` leitet noch vom Vor-Umbau-Stand
  ab. Das ist Absicht: verschwindet eines der gepickten Felder beim Umbau,
  bricht der Typecheck. `timeframe` und `pinned` sind bewusst nicht dabei.
- `points.ts` und `standings.ts` nach TDD — der Vertrag steht jetzt.

---

## 2026-09-10 — Housekeeping: Prettier, Test-Glob, Kontextdateien

**Gebaut**

- `.prettierrc` mit den Werten aus KONVENTIONEN.md §3.
- `server/package.json`: `npm test` läuft jetzt über `'src/**/*.check.ts'`
  statt nur `rank.check.ts`. Die sechs bestehenden Tests laufen unverändert.
- `PROJEKT.md`, `KONVENTIONEN.md`, `SESSIONS.md` erstmals versioniert.

**Entschieden**

- **`dist/` war bereits sauber.** Weder getrackt noch in `.gitignore`
  fehlend — die Notiz in KONVENTIONEN.md §11 und der offene Punkt vom
  2026-09-09 waren veraltet. Statt einer erfundenen Änderung wurden beide
  Stellen korrigiert.

**Offen**

- Payload-Vertrag für `board:update` und `event:announce` (Schritt 2 dieser
  Session).

---

## 2026-09-10 — Design freigegeben, Punktetabelle bestätigt

**Entschieden**

- **Design-Canvas ist abgenommen.** 16-Bit-Neon, Silkscreen + Chakra Petch,
  Palette und Bewegungswerte wie im Canvas. Die Tokens können nach `index.css`
  übersetzt werden, sobald die UI dran ist.
- **Punktetabelle `[10,8,6,5,4,3,2,1]` vom Projektleiter bestätigt.** Bleibt
  trotzdem pro Turnier konfigurierbar; die Tests in `points.ts` behandeln sie
  als Parameter und erwarten sie nicht hart.

**Offen**

- Payload-Vertrag für `board:update` und `event:announce` — muss vor den
  Rule-Modulen stehen.

---

## 2026-09-09 — Spezifikation, Konventionen, Design-Canvas

**Gebaut**

- `PROJEKT.md`: vollständiges Datenmodell (Tournament, Team, Player, Game,
  Score), Wertungslogik, Socket-Architektur, Board-Layout, Deployment.
- `KONVENTIONEN.md`: Code-Standards, festgeschrieben aus dem Bestand plus
  sechs neue Regeln (Prettier-Config, Test-Glob, injizierte Zeit und Zufall in
  Rule-Modulen, Emits nur aus `realtime/`, getrennte Board- und
  Control-Komponenten, Conventional Commits).
- Design-Canvas mit sechs Artboards: Board-Screen, Siegerehrung, Palette und
  Tokens, Control-Panel, Team-Zeile in fünf Zuständen, Live-Banner in vier
  Varianten.

**Entschieden**

- **Turnier statt globalem Board.** `Tournament` klammert Games, Teams,
  Zeitraum und Punktetabelle. Ohne diese Ebene vermischen sich die Daten ab
  dem zweiten Event.
- **`mode` sitzt am Turnier, nicht am Game.** Ein Turnier ist entweder
  Spieler gegen Spieler oder Team gegen Team. Das löst die Frage auf, wie eine
  Einzelleistung in eine Teamwertung überführt wird — sie stellt sich nicht.
  `Score` bleibt trotzdem polymorph (`playerId` ODER `teamId`), damit gemischte
  Turniere später kein Schemabruch wären.
- **Platzierungspunkte statt Rohwerten.** Nur die Platzierung zählt, Tabelle
  `[10,8,6,5,4,3,2,1]`, Gewichtungsfaktor je Disziplin. Damit sind
  Millisekunden und Torzahlen ohne Umrechnung vergleichbar.
- **Punkte werden bei geteiltem Rang gemittelt.** Zwei auf Rang 2 belegen die
  Plätze 2 und 3 und bekommen je 7. Die ausgeschüttete Summe bleibt konstant —
  nur so sind verschiedene Turniere untereinander vergleichbar.
- **Nicht-Teilnahme kostet Punkte**, kein Streichresultat. Wunsch des Kunden.
- **Gleichstand olympisch:** mehr erste Plätze, dann zweite, dann dritte.
- **`board:update` schickt den kompletten Zustand**, kein Delta. Wenige
  Kilobyte je Eintrag, dafür heilt sich ein Board, das kurz offline war, mit
  dem nächsten Ereignis von selbst.
- **Gesamtwertung zählt laufende Disziplinen mit.** Sie ist damit jederzeit
  live; die Platzierungen schwanken dafür, solange gespielt wird.
- **Socket.IO statt SSE.** Der Datenfluss wäre einseitig genug für SSE, aber
  Rooms, Reconnect und Polling-Fallback sind vor Ort robuster.
- **Motion für die Reorder-Animation**, gestuftes Easing statt weichem, damit
  die Bewegung zum Pixel-Look passt.
- **Design: 16-Bit-Neon**, nicht 8-Bit. Press Start 2P ist auf zehn Meter
  schlecht lesbar. Display-Font Silkscreen, Fließtext Chakra Petch.
- **Betrieb auf dem eigenen Ubuntu-Server**, öffentlich per Tailscale Funnel.
  Board-Route öffentlich, Control-Panel nur im Tailnet — die Score-Eingabe ist
  damit von außen gar nicht erreichbar, unabhängig vom Admin-PIN.
- **Keine Migration.** Die DB enthält nur Testdaten; Collections werden
  geleert, ein Seed-Skript legt ein Beispielturnier an.
- **Siegerehrung zeigt gestapelte Balken je Disziplin**, nicht nur die Summe.
  Nur so ist auf der Leinwand ablesbar, wo ein Team stark und wo es schwach
  war; eine Nicht-Teilnahme bleibt als Lücke im Balken sichtbar.

**Offen**

- Auflösung und Seitenverhältnis der Leinwand unbekannt — bis dahin wird
  strikt auflösungsunabhängig gebaut.
- ~~`dist/` liegt eingecheckt im Repo und fehlt in `.gitignore`.~~ Trifft
  nicht zu, siehe Eintrag 2026-09-10 (Housekeeping).
- Spruch-Pool muss noch geschrieben werden; der Canvas zeigt vier Beispiele
  je Ereignistyp.

**Nächster Schritt:** Implementierung in VS Code mit Claude Code, beginnend mit
`points.ts` und `standings.ts` nach TDD. Session dort mit `PROJEKT.md` und
`KONVENTIONEN.md` starten.
