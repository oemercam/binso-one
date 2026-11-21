# Codex-Übergabe: Binso One Apple iOS A–Z

**Branch nur Referenz:** `referenz/apple-ios-a-z-final-20261121`

**Dateien:** [index.html](./index.html), [DESIGNSTANDARD.md](./DESIGNSTANDARD.md).

## Auftrag
Die vom Eigentümer freigegebene Apple-inspirierte Binso-One-Zielgestaltung einschliesslich **bereinigter Inhaltsarchitektur** für alle bestehenden Seiten und Unteransichten implementieren, ohne Fachfunktionen oder Nutzerrechte zu verlieren. Der Prototyp ist ein Design- und Navigationsvertrag, **keine fertige Geschäftsanwendung**.

**Zwingend zuerst:** Aktuelle offenen PRs, Mergeability, erforderliche Checks und Codex-Arbeiten prüfen; im Zweifel keine produktiven Mutationen. `main`, fremde Arbeitsbranches und Azure unangetastet lassen. Eigener konfliktfreier Entwicklungsbranch erst nach belastbarer Klärung.

**Umsetzung:** Bestehendes zentrales Designsystem verwenden, mit exakt definierten Apple-Hell-/Dunkel-Farben und rahmenlosen transparenten Feldern, gruppierten Zeilen, semantischen SVG-Icons, korrekten Navigationsrückwegen und echten iPhone-Auswahlscreens. Einmalige Quellen für Firma, Bank, Dokumenttexte, persönliche Einstellungen, Sprache, Rolle und Benachrichtigungen. Global Search neu mit keyboard-aware Layout, echten berechtigten Ergebnissen. Firmen-/Team-Onboarding, Dokumentwizard, Support, Timer, Auth, Finanzen, Abonnement, Operator modular im tatsächlichen Code verknüpfen.

**Abnahme:** Jede aktuelle Route / fachliche Unteransicht mit Rolle, Light/Dark, Mobile/Desktop, Eingabe, Leer-/Fehler-/Read-only-Zustand, Navigation und realem API-/Security-Test. Screenshotnachweise; keine generelle 76/76-Erfolgsmeldung nur wegen Demo. Pflichtchecks vor Merge/Release. Dokumentierte Risiken nicht übergehen. Kein Azure/DNS/Produktivdeployment ohne erforderliche gesonderte Freigaben.

**Besonderheiten:** Schweiz/CHF/MWST/QR-Rechnung/PDF, unveränderliche ausgestellte Belege, Tenant-Isolation, keine fingierten Test-E-Mails oder Zahlungsbestätigungen, kein nachträglicher Default-Override.

## Qualitätsstand der Referenz
- 76 Routen im HTML-Inventar: ja, auf Basis älterer dokumentierter Routen.
- Interaktive Demo: ja, insbesondere Navigation, Listen, zentrale Daten, Auswahlfelder und Dokument-Wizard.
- JavaScript-Syntaxprüfung der GitHub-Datei: bestanden.
- Vollständige Browsertests oder iOS-Gerätetests: **nicht erfolgt**.
- Vollständige produktive Implementierung: **nicht erfolgt**.
