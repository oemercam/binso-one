# Binso One – verbindliches Apple-iOS-Zielbild und Referenz

**Stand:** 21.11.2026 · **Status:** freigegebene UX-/Designrichtung; interaktive **isolierte Simulation**, keine produktive Implementierung und keine vollständige End-to-End-Abnahme.

**Start:** [Klickbare HTML-Gesamtvorschau](./index.html). Die HTML-Datei lokal oder über einen isolierten statischen Preview-Server öffnen; GitHub `blob` zeigt den Quelltext, keine direkt laufende Anwendung. Keine fremden Daten, keine Netzwerkanfragen, keine echte Speicherung.

## 1. Was der Nutzer verbindlich festgelegt hat

- Die vollständige Anwendung folgt einer **Apple-iOS-inspirierten Designsprache** – Light und Dark, mobile und Desktop, auch Login, Onboarding, Operator und Fehlerzustände.
- **Exakte Farben:** Light: Hintergrund `#F2F2F7`, Gruppen `#FFFFFF`, Haupttext `#000000`, Sekundärtext `#63636B`, Separator `#D1D1D6`, Akzent `#007AFF`. Dark: Hintergrund `#000000`, Gruppen `#1C1C1E`, Haupttext `#FFFFFF`, Sekundärtext `#AEAEB2`, Separator `#38383A`, Akzent `#0A84FF`.
- **Keine grauen oder zusätzlich gerahmten Eingabefelder innerhalb der Gruppenkarten.** Eingaben vollständig transparent, rahmenlos, ohne doppelte Ränder; Fokus über den gemeinsamen Accessibility-Owner sichtbar, ohne doppelten Feldrahmen. Lesbare min. 16 px Eingabeschrift auf iPhone. Touchziele min. 44 px.
- Klassische sichtbare Dropdowns bei Kunde, Leistung, Sprache, Fristen, Rollen, Projekt usw. durch **antippbare ganze Apple-Zeilen** ersetzen, die eine eigene Auswahlansicht mit Suche und Häkchen öffnen; iOS-geeignete Kalender-/Datumauswahl.
- Hauptseite mit grossem Titel; Unterseiten zentrierter Titel, **runder Zurück-Button links**; korrekte Elternhierarchie, iPhone-Randgeste und Browser-History. Einheitliche semantisch passende **Lucide-Outline-SVGs**, insbesondere **Mehr = `menu`** (drei horizontale Linien).
- Bisherige fünfteilige **Bottom-Navigation** bei visueller Umstellung erhalten und alle tatsächlich berechtigten Aktionen erreichbar halten. Die globale Plus-Aktion/Fachlisten-Aktionen nicht ersatzlos entfernen; Layoutanpassungen gezielt nach vollständiger Flussprüfung.
- **Gleichrangige Aktionsbuttons sind gleich breit und hoch.** Keine Dopplungen, keine blockierten Aktionsleisten am iPhone-Keyboard, keine ungewollten PWA-Update-Banner. Leere Zustände max. zwei kurze Zeilen.
- Keine überdimensionierten Karten, unnötigen Erklärungen, gemischten Listenstile oder doppelten Header.

## 2. Bereinigte Informationsarchitektur – nur ein Pflegeort

| Fachbereich | Zentrale Quelle | Andere Ansichten |
|---|---|---|
| Meine persönlichen Angaben | Mein Konto → Persönliche Daten | Profil und Kopfbereich zeigen die Daten, ohne getrennte Kopie |
| Passwort, kritische Sicherheitsbestätigung, Passkeys, Sitzungen | Mein Konto → Sicherheit / Sitzungen | Kein Duplikat unter Firmenverwaltung; Kunden-Login bleibt E-Mail/Passwort, Passkey nur gemäss tatsächlich autorisiertem Schutzfluss |
| Unternehmensname, UID, Adresse, Kontakt, Logo | Einstellungen → Unternehmen → Firmendaten | Firmen-Onboarding ergänzt denselben Datensatz; Dokumente beziehen Snapshots |
| Teammitglieder, Rollen, Einladungen | Einstellungen → Unternehmen → Team | Team-Onboarding benutzt sicheren Einladungslink und rechtmässige Rollen |
| Standard-MWST, IBAN / QR-IBAN, Zahlungsfristen, Angebotsgültigkeit, Rechnungs-/Angebotstexte | Einstellungen → Unternehmen → Dokumente und Rechnungen | Neue Belege übernehmen Defaults; ausgestellte Belege werden nie rückwirkend verändert |
| Zeitvorgaben und Freigaberegeln | Einstellungen → Unternehmen → Zeiterfassung | Timer und Erfassung benutzen tatsächliche Rechte / Zuordnungen |
| Zustellpräferenzen / unterstützte Kanäle | Einstellungen → Anwendung → Benachrichtigungen | Geräte-Push-Berechtigung und E-Mail/Push-Backend getrennt ausweisen |
| Sprache und Light/Dark/System | Einstellungen → Anwendung | Keine zweite unabhängig gespeicherte Sprache im Konto |
| Planstatus, Nutzung, Abrechnung, Zahlungen an Plattform | Einstellungen → Abonnement | Nur gültige Hauptaktion, keine widersprüchlichen `Starten/Aktivieren/Verwalten`-Buttons |

`Mehr` ist ein **Navigationseinstieg**, keine parallele Datenhaltung oder zweiter Einstellungsbaum. Sinnvolle Ziele sind Unternehmen, Team, Einstellungen, Support/Hilfe; Mein Konto ist zentral erreichbar. Der Bestand wird vor Änderungen pro Rolle/Paket abgeglichen.

## 3. Fachabläufe und Verbesserungsvorschläge

**Global Search:** Vollflächige fokussierte Suchansicht, keyboard-aware, sichtbare Suchergebnisse oberhalb iPhone-Tastatur, Kategorien nur bei Bedarf; echte serverseitige Treffer mit Tenant-/Rollenfilter, Debouncing, sinnvolle Ergebnisse und zuletzt geöffnete Objekte. Keine überlagerten Schnellzugriffe. Keine technische UUID als Ergebnisname.

**Kunden:** kompakte Liste, Kundendossier mit Kontakten, Projekten, Angeboten, Rechnungen, Zahlungen, Dateien, Verlauf und Stammdaten. Dieselben Fachdatensätze, keine Duplikate. Kundenanlage mit Vor- und Nachname der Kontaktperson, atomare Speicherung. Wiederherstellung von Filter und Scroll beim Zurückkehren.

**Unternehmens-Onboarding:** bestehende Felder einmal zentral erfassen und später in Firmendaten ändern; Pflichtfelder nach tatsächlichem Nutzungsschritt statt gesamte App pauschal blockieren. Vor Rechnungsversand fehlende Zahlungs-/Rechnungsangaben prüfen. Sorgfältige UID, Adresse, IBAN-Validierung. Optionaler Teameinladungsschritt.

**Mitarbeitereinladung:** Administrator vergibt Rolle und Einladung, Empfänger bestätigt E-Mail und richtet Passwort ein. Einladungsstatus/Neusenden/Ablauf/Duplikate; serverseitige Prüfung, Berechtigung und Replay-Schutz. Bestehende Rollen erhalten.

**Rechnungen/Angebote:** vierfacher Ablauf Kunde/Datum → Positionen → Bedingungen → Prüfen, separate echte PDF-Vorschau. Einheitliche Positionen, Preise, Menge und Schweizer Zahlenformat, aber echte MwSt-/Rundungs- und Berechtigungsengine. Zentrale Firmendaten, QR-/Bankdetails, Standardtexte und Fristen. Status, rechtskonforme Ausstellung, Gutschriften, Mahnungen, Teilzahlungen, Revisionsschutz; für Angebote Annahme/Ablehnung/Ablauf und zulässige Übernahme in Aufträge/Rechnungen. Kein Neuberechnen ausgestellter Dokumente.

**Projekt/Timer:** Timer zuerst, danach Kunde/Projekt, keine Zeitverluste, korrekte Budgets und nachvollziehbare Freigaben. Auftragsaktionen als gemeinsames keyboard-aware Bottom Sheet auf Mobile, Dialog/Desktop. Mehrfach- und Doppelaktionen entfernen.

**Abonnement:** Statusbedingte klare Hauptaktion, tatsächliche Preise/Steuern/Laufzeit vor verbindlichem Kauf, Zahlungsbestätigung ausschliesslich vom Provider. Lesen-Rechte für abgelaufene Pläne korrekt. Abrechnungen kompakt; keine unnötig grossen leeren Karten.

**Support und System:** kompakte Ticketnummern, iPhone-Chat über Tastatur, Auth-Fehler, Offline, leere Zustände, Meldungen und sicherer Rückweg.

## 4. Routenabdeckung und Grenzen der Referenz

Die eingebettete HTML-Anwendung enthält **76 explizite Routen** aus dem vorhandenen, historischen `docs/architecture/app-acceptance-routes.md` (20.10.2026) als navigierbaren Ausgangspunkt. Das **heutige** Inventar ist vor der Umsetzung gegen den aktuellen Main-Head neu zu ermitteln. Zusätzlich existierende eingebettete Fachansichten müssen berücksichtigt werden.

Die Referenz simuliert explizit: Hauptnavigation, Light/Dark, Listen/Suche/Filter, Kunden-/Projekt-Details, Formulare, Einstellungen und zentrale Standardwerte, Onboarding, Team-Einladung, Benachrichtigungen, Sprache/Darstellung, Dokument-Wizard, Auswahlseiten, Positionen, Datum, Zusammenfassung, PDF-Layoutrahmen, Zeitsteuerung und Supportchat. Manche Routen sind **Navigations-/Darstellungsplatzhalter** und ausdrücklich **keine** vollständige fachliche End-to-End-Simulation. Reale API-Schreibvorgänge, Mailversand, Zahlungsprovider, steuerrechtliche Ausgaben, echte Sessionverwaltung, iPhone-Gesten und Browser-History sind **nicht** implementiert.

Auch eine grüne Syntaxprüfung ist **kein Browser- oder Funktionstest**. Die 76-Routen-Zahl bedeutet nicht, dass 76 produktive Seiten fertig gestaltet, umgesetzt oder abgenommen seien.

## 5. Codex-Umsetzung

1. Bestehende `AGENTS.md`, Designsystem-Owner `app/design-system/manifest.json`, Navigations-/Rollenverträge und tatsächliche Backend-/Fachlogik lesen. Bestehende CSS-Owner (`theme.css`, `primitives.css`, `layout.css`, `navigation.css`, `documents.css`, `settings.css` etc.) weiterverwenden. Keine zweite Foundation oder Route-lokalen Patches.
2. GitHub-PRs und Qualität prüfen: offene konfliktträchtige Codex-Arbeiten können sich insbesondere mit Login, Navigation und Layout überschneiden. **Keine Änderung laufender Codex-Branches, `main`, Azure, DNS oder Produktionsdaten**, solange ihre Arbeiten/Checks nicht nachweislich abgeschlossen und die Änderungen abgestimmt sind.
3. Nach Konfliktklärung auf isoliertem Entwicklungsbranch gemeinsam genutzte Design-Tokens/Komponenten, Navigation, Felder, Auswahlen, Formulare, Rückwege und responsives Verhalten umsetzen; pro Modul die wirklichen Daten/Status/Rollen integrieren. Keine Attrappen auf echten Seiten.
4. Mobile Safari/iOS-PWA und Desktop, System/Hell/Dunkel, Zoom/Textvergrösserung, Tastatur/Fokus, Scroll/Back, Sheets/Safe-Areas, Browser-Suche, Rechte und Dokument-Snapshots prüfen.
5. Schnelle modulbezogene Checks während der Entwicklung, vollständige verpflichtende Quality-/Security-/Build-/Browser-Prüfungen vor Merge/Release. Änderungen, fehlende Nachweise, Screenshots und Risiken in einer Abnahmematrix dokumentieren; keine vollständige Umsetzung behaupten, solange nicht bewiesen.
6. **Kein Produktionsrelease ohne nachgewiesene Freigabe und erfüllte Qualitätsgates.**

## 6. Referenzhistorie

Diese Referenz präzisiert die frühere [Apple-iOS-Referenz vom 20.11.](../apple-ios-20261120/DESIGNSTANDARD.md) nach den zusätzlich geprüften Screenshots und den später ausdrücklich bestätigten Farb-/Feldregeln. In einem Widerspruch gilt die jüngste ausdrückliche UX-Entscheidung; unveränderte Fach-, Rechte- und Sicherheitsinvarianten bleiben trotzdem bindend.
