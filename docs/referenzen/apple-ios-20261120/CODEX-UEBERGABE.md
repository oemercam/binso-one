# Codex-Übergabe – Binso One Apple-UX A–Z

**Referenzbranch:** `referenz/apple-ios-designsystem-20261120`  
**Referenzdateien:** [index.html](./index.html) und [DESIGNSTANDARD.md](./DESIGNSTANDARD.md).  
**Stand:** 20.11.2026. Dokumentationsstand, nicht produktiv implementiert.

## Sofortiger Einstieg
1. Die HTML-Datei in einem Browser als statische, vollständig lokale Referenz öffnen. GitHub zeigt im Browser zunächst den **Quellcode**; zur interaktiven Vorschau die Datei lokal/über einen isolierten Preview-Server öffnen. Die HTML-Demo führt keine Netzwerkzugriffe aus.
2. Gesamte Referenz in Light und Dark durchklicken, inklusive der links angebotenen Fachnavigation, mobiler „Mehr“-Navigation, Einstellungen → Allgemein → Informationen, Login, Zeiterfassung, Rechnungsassistent, Suche/Status/Sortierung, Chat und Fehlermodell.
3. Alle bestehenden tatsächlichen Routen über das aktuelle Repository und das ältere Inventar `docs/architecture/app-acceptance-routes.md` erheben. Keine Behauptung „alle existierenden Seiten geprüft“, wenn sie nicht einzeln verglichen wurden.
4. Aktuelle Codex-PRs und GitHub-Pflichtprüfungen behandeln: insbesondere #361, #354, #351 und die laufenden CI-/Dependabot-Arbeiten. Niemals diese Branches überschreiben. Solange Abschluss/Kompatibilität unklar: **nur Inventur, Entwurf und konfliktfreie Referenzarbeit**.
5. Bei später freigegebener Umsetzung die bestehenden Komponenten und CSS-Owner aus `app/design-system/manifest.json` nutzen. Keine zweite Designsystem-Bibliothek, keine Route-zu-Route-Kopien.
6. Jeden Bereich gegen die Referenz prüfen: Identische Viewportbreiten, eine klare Elternhierarchie, aktiver Fokus, Zustände, Licht/Dunkel, Schriftvergrösserung, Touch, Tastatur und tatsächliche Rücknavigation.
7. Bei nicht visualisierten Fachdetails das gleiche Designsystem anwenden, fachliche Verhaltensregeln aus dem produktiven Code übernehmen, neue Zielbilder **als abgeleitet** und zur Abnahme offen kennzeichnen.

## Abnahme-Matrix
| Bereich | Visualisierungen in der HTML-Demo | Notwendiger zusätzlicher Produktabgleich |
| --- | --- | --- |
| Shell / Navigation | Desktop links, Mobile unten, Mehr, Header, Zurück | echte Rollen/Pakete, Deep Links, History, iPhone-Swipe, Wiederöffnen |
| Auth | Login, Registrierung, OTP, Reset, Einladung | volle Verifikation, Kontosperren, MFA nur wo vorgesehen, Operator getrennt |
| Verkauf | Kunden, Angebote, Rechnungen, Produkte | Fachdetails, Kontakte, MWST, PDF, Gutschriften, historische Dokumente |
| Arbeit | Projekte, Zeit, Mitarbeiter, Abwesenheiten | Timer-Persistenz, Rollen, Freigaben, Projektzuordnung |
| Finanzen | Zahlungen, Spesen, Lieferanten, Verträge, Analyse/Berichte | Berechnungen, Exporte, Abgleich, Berechtigungen |
| Service | Support, Dokumente, Benachrichtigungen | echte Chat-/Anhangsflows, iPhone-Tastatur, Zustellpfade |
| Einstellungen | Mehrstufige Menüs, Konto, Sicherheit, Team, Firmenwerte, Light/Dark | Speicherung, Zustands-/Fehlerfälle, Rechte |
| Operator | Einstieg in Fachkategorien | sämtliche tatsächlichen Admin-Routen, Entra/Passkey, Audit |
| System | 403/404/500, Offline, Laden, Leer | Fehlergrenzen, Retry, Sessions, persistente Drafts |
| Öffentlich | Designvertrag dokumentiert | alle tatsächlichen öffentlichen Seiten, Rechtstexte, Preise, responsive Abnahme |

## Definition of Done
„Implementiert“ erst wenn sämtliche **vorhandenen, tatsächlich betroffenen** Routen mit positiver und negativer Zustandsprüfung abgedeckt sind. Die Demo allein ist **nicht** dieser Nachweis. Pro Bereich ein Vorher/Nachher-Screenshot im Browser (Desktop, iPhone; Light/Dark), ein gezielter Funktions-/Sicherheitstest und eindeutiger PR-/Commitstatus. Vor Merge/Release sämtliche verpflichtenden Quality-/Security-Gates. Keine produktiven Azure-/DNS-/DB-Änderungen ohne gesonderte erforderliche Freigaben.

## Hinweis zu neueren Entscheidungen
Die aktuelle Apple-inspirierte Zielgestaltung und das vom Nutzer bestätigte Icon-System sind neuer als der dokumentierte Microsoft-UX-Standard. Bestehende Rechte, Funktionen und Freigabeschranken gelten trotzdem. Besonders Bottom-Navigation und ehemals festgelegter Floating-Plus dürfen erst dann in der Produktimplementierung geändert werden, wenn der vollständige neue Flow nachgewiesen ist und keine Aktion verloren geht.

## Übergabeformulierung
„Verwende diese isolierte HTML-Referenz und die schriftliche Design- und Abnahmespezifikation als Ziel für eine durchgehende Apple-inspirierte Binso-One-UX-Migration. Bewahre sämtliche Geschäfts-, Sicherheits- und Dateninvarianten. Prüfe zuerst laufende PRs und Required Checks und beginne bei vorhandenen Blockern nicht mit produktiven Änderungen. Liefere erst einen aktuellen Routen-/Design-Diff, dann konfliktfreie, überprüfbare Umsetzungspakete. Behaupte keine vollständige A–Z-Abnahme ohne Browser- und Funktionsnachweise.“
