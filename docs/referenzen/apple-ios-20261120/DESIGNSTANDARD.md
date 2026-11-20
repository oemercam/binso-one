# Binso One – Apple-inspirierter Gesamtstandard (Designreferenz)

**Datum:** 20. November 2026  
**Status:** vom Nutzer bestätigte **Designrichtung** für Binso One, noch keine produktive Implementierung oder vollständige seitenweise Browserabnahme.  
**Referenz:** [Klickbare App](./index.html) – alle Navigationseinstiege, repräsentative Detail- und Formularabläufe, Zugang, Systemzustände, Light/Dark.

## Ziel und Geltung
Die gesamte Kunden-App, der Zugang, die öffentliche Produktstrecke, alle Fachlisten, Fachdetails, Formulare, Einstellungen mit tiefen Untermenüs, Support, Dokumente, Finanzen und der getrennte Operator-Bereich sollen dieselbe Apple-/iOS-inspirierte **Gestaltungslogik** nutzen. Keine wild gemischten Designs und keine zweite CSS-Foundation. Inhaltliche Details und Rollen bleiben modulbezogen.

Der Nutzer hat ausdrücklich bestätigt:
- Apple-inspirierte gruppierte Einstellungslisten, **Header und runder Zurück-Pfeil**, zentrierter Unterseitentitel und **echte Menütiefe**.
- Light-Mode-Seitentitel, Header und primäre Beschriftung **schwarz #000000**, Dark-Mode entsprechend **weiss #FFFFFF**.
- Systemfarben: heller Hintergrund `#F2F2F7`, weisse Gruppen `#FFFFFF`; Dark `#000000` und `#1C1C1E`. Dezent getrennte Zeilen, kein schwerer Doppelrahmen.
- Echte, semantisch passende **Lucide-Icons** mit gleicher Grösse und Strichstärke, nicht die alten Unicode-/Pseudo-Symbole. **„Mehr“ = menu (drei horizontale Linien)**.
- Formen, Typografie, Schalter, Fokus und Hover-Zustände durchgehend einheitlich, ausreichender Kontrast.
- Vor Umsetzung die im Chat klickbar ausgearbeitete Gestaltungsrichtung als Referenz auf GitHub ablegen.
- **Geltung A–Z**, nicht nur Login und Einstellungen.

**Wichtig:** Die neue Referenz ist eine **Designfreigabe auf Ebene der Richtung**, nicht die Behauptung, jede der vielen produktiven Unteransichten sei bereits individuell abgenommen. Bei widersprüchlichen historischen Regeln (z. B. alte unveränderliche Bottom-Navigation/Plus-Button und Microsoft-Design) ist die neue ausdrückliche, neuere Apple-Designentscheidung für die **Zielgestaltung** zu berücksichtigen; bevor Codex die Navigation oder Aktionsplatzierung produktiv ersetzt, sind die konkreten Zustände/Verfügbarkeit/Rollen abzugleichen und funktionale Regressionen nachweislich zu verhindern. Kein blindes Löschen bestehender Funktionen.

## Design-Tokens: Zielwerte zur Browserabnahme
| Element | Light | Dark |
| --- | --- | --- |
| Hintergrund | `#F2F2F7` | `#000000` |
| Gruppierte Flächen | `#FFFFFF` | `#1C1C1E` |
| Titel/Header/primärer Text | `#000000` | `#FFFFFF` |
| Sekundärtext | `#63636B` | `#AEAEB2` |
| Separator | `#D1D1D6` | `#38383A` |
| Interaktive Hervorhebung | `#007AFF` | `#0A84FF` |
| Positive Schalter | `#34C759` | `#30D158` |

- Schrift: `-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif`; keine proprietären Apple-Schriftdateien kopieren/verteilen.
- Grosser Hauptseitentitel etwa 32px; zentrierter Unterseitentitel etwa 17px; Zeilentext 15–16px; Metadaten 12–13px; Etiketten 12px.
- Bearbeitbare Eingabefelder auf iPhone **mindestens 16px**, Touchziele **mindestens 44×44px**. Dynamische Schriftgrössen/Zoom respektieren, keine starren Zeilenhöhen mit Clipping.
- Gruppenkarten etwa 20–22px Radius, Icons in Gruppen etwa 31×31px, kleine Kontrollen etwa 11–14px Radius; keine vollständige Pillenform für alle Elemente.
- Separatoren nur **zwischen** Zeilen, links an Icons/Text sinnvoll eingerückt, keine doppelten Linien.
- Dark-Mode-Flächen, Kontraste und Bilder/Diagramme unabhängig prüfen. Nutze Systemfarben nur dort, wo sie Bedeutung tragen; wichtige Status zusätzlich textlich.
- Native iPhone-Safe-Areas, Tastatur, Scroll und Zurückgesten berücksichtigen. Kein glassmorphism als Pflicht.

## Navigation, Hierarchie und Icons
- Hauptseiten mit grossem Titel, Unterseiten mit **zentriertem Header-Titel** und **rundem Zurück links**. Der Zurück-Pfeil führt zur tatsächlichen unmittelbaren Elternansicht, nicht standardmässig zur Übersicht.
- iPhone-Randgeste, Browser-Back und sichtbarer Zurück-Button: dieselbe Hierarchie. Deep Links erhalten sinnvolles Elternziel; offene Sheets werden zuerst geschlossen; Scroll, Suche, Filter und nicht verworfene Eingaben bleiben erhalten.
- Mobile Bottom-Navigation immer erreichbar und beschriftet, bei Tastatur/Sheet fachlich angepasst; im neuen Design echter `menu`-Icon für **Mehr**. Desktop verwendet eigenständige passende Seitennavigation. Weder ein Demo-Dock noch eine dekorative Navigation ist automatisch produktiv freigegeben.
- Den bisherigen globalen Plus-Button nicht einfach entfernen, ohne Ersatz für sämtliche berechtigten Schnellaktionen (Kunde, Angebot, Rechnung, Projekt, Zeiteintrag, Ausgabe) und Fachlisten-Aktionen geprüft zu haben. Der Nutzer hat in den jüngsten Chat-Vorschauen einen neuen Aufbau beauftragt; endgültige Aktionsplatzierung gegen reale Rollen und Mobile prüfen.
- Lucide, semantische Zuordnung: `house`, `users`, `file-text`, `receipt`, `clock-3`, `menu`, `chevron-left`, `chevron-right`, `settings`, `bell`, `building-2`, `wallet`, `chart-no-axes-column`, `folder`, `shield-check`, `circle-help`, `plus`, `search`. Einheitliche SVG-Quelle im Anwendungscode. Kein Emoji-/Unicode-Icon-Mix.

## A–Z-Scope der Implementierung
1. **Zugang:** Login, Registrierung, E-Mail-Bestätigung, Passwort-Reset, Einladung, Onboarding, Sicherheitsbestätigung, Sitzungsablauf, gesperrtes Konto.
2. **App-Shell:** Kopfzeilen, Hauptnavigation, Mehr, Menüebenen, Benachrichtigungen, Suche, Filter, Sortierung, Shortcuts, Light/Dark, responsives Layout.
3. **Verkauf:** Kunden samt Detail/Dossier/Kontakten/Dateien, Angebote, Rechnungen mit Erfassung und separates PDF, Produkte/Leistungen, Zahlungsstatus.
4. **Arbeit:** Aufträge/Projekte, Zeiterfassung (Timer **vor** Zuordnung), Mitarbeiter, Abwesenheiten.
5. **Finanzen:** Zahlungen, Spesen, Belege, Lieferanten, Verträge, Finanzen/Analyse/Berichte, MWST und Exporte.
6. **Service:** Support-Tickets mit kurzen Nummern, keyboard-aware Chat und Anhängen; Dokumentenverwaltung und Benachrichtigungen.
7. **Konto und Betrieb:** Firmen- und persönliche Einstellungen, Team, Rollen, Sprache, Darstellung, Datenschutz, Abonnement; Operator/Plattform-Administration klar getrennt.
8. **Systemzustände:** Laden, leer (max. zwei Zeilen), Offline, 401/403/404/500, Fehler, Speichern/Verwerfen, Session-Timeout, Konflikt/Doppelaktion.
9. **Öffentlich:** Produkt, Tarife, Registrierung, Datenschutz, rechtliche Seiten und Weiterleitungen – gemeinsame Designsprache ohne Verwechslung von Marketing- und App-Funktion.

## Fachliche Sicherheit
- Kundenzugang bleibt gemäss `docs/architecture/customer-password-login-20261027.md` E-Mail/Passwort, E-Mail-Verifizierung nur wo der Server sie verlangt. **Nicht** stillschweigend Passkeys als Kundenlogin einführen.
- Operator-Anmeldung und Rollen bleiben unabhängig; offene Auth-PRs #361, #354, #351 müssen vor Eingriff geprüft werden.
- Finanzlogik, MWST, Rechnungsnummerierung, immutable Dokumente, Tenant-Isolation, RLS, Auth, Audit und serverseitige Rechte erhalten. In der HTML-Vorschau ist **alles synthetisch**.
- E-Mail/OTP/Testversand nur für freigegebene TEST-Empfänger; keine echte Testmail aus der Referenz.
- Kurzformulare als Sheet, umfangreiche Abläufe als eigenständige Seite; keine doppelte Aktion, Verlust von Entwürfen verhindern.
- Kein PWA-Update-Banner.

## Codex-Implementierungsstrategie
1. Zuerst alle aktuell vorhandenen Routen und Komponenten anhand des **aktuellen Head** inventarisieren. Das vorhandene `docs/architecture/app-acceptance-routes.md` (76 Routen, historischer Stand) als Startpunkt verwenden, **nicht** als nachgewiesene Vollständigkeit.
2. Offene Codex-PRs und Pflichtchecks prüfen. Bis zu deren Abschluss **keinen bestehenden Branch, main oder Azure verändern**. Dieser Referenzbranch enthält ausschliesslich Dokumentation.
3. Beim Implementieren auf einem **isolierten, konfliktfreien Arbeitsbranch** zentrale Design-Tokens in den zuständigen `app/design-system/*.css` und vorhandene Komponenten integrieren; keine lokalen CSS-Abkürzungen oder unnötige parallele Foundations.
4. Umsetzung modulweise, aber **einheitliche Gesamtwirkung** verpflichtend. Alle vorhandenen Routen und Unterzustände in der A–Z-Matrix prüfen und gegen die Referenz vergleichen.
5. Desktop, iPhone Safari/PWA (wo verfügbar), Tablet, Chromium/WebKit, Light/Dark, Zoom, Touch, VoiceOver/Tastatur, Fokus, Scroll und Back testen. Gezielt schnell entwickeln, aber Pflichtchecks vor Merge/Release niemals überspringen.
6. Für jeden Bereich Änderungen, tatsächliche Browsertests, Screenshots, offene Abweichungen und Commit/PR dokumentieren. Kein „vollständig fertig“, solange reale Routen/Flüsse nicht geprüft sind.
7. Kein Merge/Produktivdeployment, keine Azure-/DNS-/kostenpflichtigen Änderungen ohne erforderliche Freigabe und Nachweise.

## Grenzen der HTML-Referenz
Die Vorschau ist ein **Designvertrag**, keine ausführbare Geschäftssoftware. Auth, Chat, Timer, Suche, Formularspeicherung und Rechnungsstatus sind interaktive **lokale Simulationen**. Die HTML-Datei nutzt ein eigenständig eingebettetes SVG-Iconset in konsistenter Lucide-Outline-Form, ohne externe CDN-Abhängigkeit. Im Produkt wird das vorhandene Lucide-Paket verwendet. Jedes Aussehen und jede Behauptung ist gegen die echte Anwendung zu prüfen.

## Referenzhierarchie
- Diese am 20.11.2026 ausdrücklich gewünschte durchgängige Apple-iOS-Designrichtung ist die neue UX-Zielgestaltung.
- Bestehende fachliche, Sicherheits-, Daten- und Berechtigungsvorschriften aus `AGENTS.md`, `docs/architecture/ux-current-approval.md`, `docs/architecture/app-acceptance-routes.md`, `app/design-system/manifest.json` bleiben als technische und fachliche Prüfgrundlage.
- Bei Konflikten zwischen historischen Designfreigaben und diesem Ziel **explizit** im PR dokumentieren statt stillschweigend abzuwerten. Eine Designreferenz allein ist keine Freigabe für riskante Produktionseingriffe.
