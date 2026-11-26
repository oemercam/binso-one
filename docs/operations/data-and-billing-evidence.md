# Daten- und Abrechnungsnachweise

Der Workflow **Data and billing evidence** läuft bei Bedarf auf `main`. Er
speichert die getestete Commit-ID und das Ergebnis der einzelnen Prüfungen in
der GitHub-Zusammenfassung. Die kurzen Schema- und Tarifprüfungen laufen
zusätzlich bei Pull Requests.

| Ablauf | Soll-Ergebnis |
| --- | --- |
| Anmeldung und Einladung | Die Sitzung gehört zum aktiven Unternehmen. Abgelaufene oder bereits verwendete Anmeldedaten werden abgewiesen. Fehlgeschlagene Registrierung hinterlässt keine halben Daten. |
| Mandantentrennung | Ein fremdes Unternehmen kann Datensätze weder lesen noch ändern. Rollen und Modulrechte gelten auch bei direkten API-Aufrufen. |
| Rechnung und Zahlung | Betrag, Währung und Status sind beim Speichern und Wiederöffnen konsistent. Ausgestellte Rechnungsdaten bleiben erhalten. Wiederholte Anfragen erzeugen keine zweite Zahlung. |
| Stripe-Abo | Der veröffentlichte Tarif stimmt mit dem Betrag im Checkout überein. Ein gültiges, zum Mandanten passendes Stripe-Ereignis aktualisiert Abo und Benutzerlimit. Wiederholungen erzeugen keine Doppelbuchung. |
| Datenbankstruktur | Tabellen, Spalten, Datentypen, Pflichtfelder und Zeilenzugriffsregeln entsprechen dem versionierten Schema. Fehlende und zusätzliche Tabellen oder Spalten werden gemeldet. |

Ändert sich eine fachliche Regel, steht der erwartete neue Fall im Test.
Migration, API-Verhalten und betroffene Anzeige werden im selben Pull Request
geprüft. Für rechtliche, steuerliche oder buchhalterische Vorgaben bleibt die
fachliche Abnahme separat.

Die automatisierte Prüfung verwendet synthetische Datensätze, eine lokale
PGlite-Datenbank und simulierte Stripe-HTTP-Antworten. Für Aussagen zu
produktiver Datenbankstruktur, echter Stripe-Zustellung oder Backups sind
ein lesender Live-Schemaabgleich, ein Stripe-Sandbox-Test beziehungsweise
ein isolierter Wiederherstellungstest nötig. Die GitHub-Zusammenfassung
ersetzt diese Nachweise nicht.
