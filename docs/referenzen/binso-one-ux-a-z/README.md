# Binso One – klickbare UX-Referenz A–Z

**Stand:** 20.11.2026 · **Status:** neu abgeleitete, nicht vollständig freigegebene Zusatzreferenz. Kein produktiver Code.

## Klickbarer Einstieg
[Interaktive Modul- und Zustandsvorschau](./binso-one-a-z.html)

Diese Datei zeigt synthetische Beispieldaten, modulabhängige Listen/Formulare, Quick-Create-Menü, Timer, Support-Chat, Authentifizierung sowie Lade-/Fehler-/Offline-Zustände. Sie führt keinerlei API-Aufrufe aus und verändert keine echten Kunden-, Finanz- oder Authentifizierungsdaten.

## Referenzrangfolge – zwingend
1. Aktuelle ausdrückliche Produktfreigaben und `AGENTS.md` (insbesondere Sicherheits-, Release- und Änderungsbeschränkungen).
2. Die bereits verbindlichen ORIGINAL-Dateien `docs/audit/v24/reference/index.html`, `desktop-login.html`, `mobile-app.html`, `komponenten.html`, `IMPLEMENTIERUNG.md`; weitere aktuellere Freigaben in `docs/architecture/ux-current-approval.md`.
3. Vorhandene Design-System-Komponenten und CSS-Owner gemäss `app/design-system/manifest.json`, `app/design-system/*.css`.
4. **Diese neue A–Z-Referenz als ergänzende, abgeleitete Darstellung fehlender Ansichten.** Bei Widersprüchen niemals ältere oder unbestätigte Skizzen stillschweigend als neue Freigabe interpretieren.

## Verifizierter Codebestand
- `components/app-shell.tsx`: tatsächliche Desktop-Navigation inklusive Kunden, Angebote, Rechnungen, Produkte, Zeit, Aufträge, Spesen, Finanzen, Berichte, Mitarbeiter, Abwesenheiten, Lieferanten, Verträge. Weitere Ziele unter `config/workspace-navigation.ts`.
- `components/app-chrome.tsx`, `components/binso-ux.tsx`: bestehende Navigation und zentrale Aktionen.
- `app/login/page.tsx`, `app/operator/login/page.tsx`: getrennte Kunden-/Operator-Authentifizierung.
- `docs/architecture/app-acceptance-routes.md`: bestehendes, älteres Inventar von 76 Seitenrouten und unterschiedlichen Benutzerrollen; als Prüfliste, nicht als bereits bestandene Abnahme.
- `app/design-system/manifest.json`: zentrale CSS-Owner; keine neuen lokalen CSS-Sonderwege.

## Geschützte Binso-One-Grundsätze
- **Bestehende mobile Bottom-Navigation behalten**, nicht durch die Portal-Referenz ersetzen.
- **Schwebenden blauen Plus-Button behalten** (Farbe, Ort, Gestaltung). Auf der Übersicht öffnet er das berechtigungsabhängige Schnellaktionsmenü «Neu erstellen»; Fachlisten behalten kontextbezogene Plus-Aktionen.
- **Timer** mit Start/Pause/Stop und grosser Zeitanzeige vor Kunde/Projekt; eine laufende Zeitmessung darf nicht verloren gehen.
- **Support** mit kurzer Ticketnummer und keyboard-aware Chat; keine technischen UUIDs als primäre Beschriftung.
- **Leere Zustände maximal zwei Textzeilen**; kompakte Listen, einheitliche Inputs, Status, Karten, Texte, FormPage/FormSheet und Feedback.
- **Kein PWA-Update-Banner** – weder auf Web noch Mobile.
- **Kunden-App und Operator/Admin strikt getrennt**. Finanzberechnungen, Rechnungsstatus, MWST, Rechte, RLS, Audit und Unveränderlichkeit historischer Dokumente nicht über UI-Referenzen verändern.
- Login nicht pauschal vereinheitlichen: aktuelle Kunden-, MFA- und Operator-Flows aus dem Code übernehmen; Referenz-Demo ist kein echtes Login.
- Bei Formularen auf iPhone Texteingabe mindestens 16 px, Bedienelemente mindestens 44 px als Touchziel, kein verdecktes Aktionsfeld. Bestehende produktive Navigation und Farb-/Design-Tokens bevorzugen.

## A–Z-Abnahme nach realer Route
Für **alle tatsächlich vorhandenen** Routen, Unterseiten, Tabellen, Sheets, Formulare und Operator-Varianten den aktuellen Codebestand neu inventarisieren und dokumentieren:
1. Darstellung Desktop (1440×900), iPhone (390×844/393×852), Tablet; Light/Dark, Zoom/Accessibility.
2. Leer, Laden, Fehler, Offline, Daten vorhanden, Such-/Filter-/Detailzustand.
3. Speichern gültig/ungültig, Dirty-Abbruch, Double-submit, Tastatur, Back/Swipe, Scroll/Filter erhalten.
4. Session, Rollen, Paket- und Tenantgrenzen; keine echten Nutzer/Kundendaten in Referenztests.
5. Migrationen, Exporte, Rechnungen, Zahlungsstatus, E-Mails, Angebote und Freigaben **niemals** als simuliert erfolgreich im Produkt darstellen.
6. Screenshots Referenz/Ist in identischen Viewports, Abweichungsliste, gezielte Tests, Pflichtchecks und Freigabeentscheidung **pro Seite**.

## Änderungsschutz
Nur Dokumentation im separaten Branch `referenz/binso-one-ux-a-z-2026`. Keine Veränderung von `main`, bestehenden Codex-Branches, produktiven Deployments, Azure, DNS oder Datenbanken. Kein Merge vor Abschluss der kollidierenden Arbeiten und bestandenen Pflichtchecks.
