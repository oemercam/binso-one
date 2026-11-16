# Binso One – Incident Response und Aufbewahrung

Stand: 5. Oktober 2026

## Security Incident Ablauf
1. Vorfall erfassen und Zeitpunkt/Quelle dokumentieren.
2. Betroffene Systeme, Organisationen und Datenkategorien eingrenzen.
3. Zugriff oder Ursache eindämmen; kompromittierte Sessions/Secrets widerrufen.
4. Integrität und Verfügbarkeit prüfen.
5. Risiko für betroffene Personen bewerten.
6. Geschäftsführung und technische Verantwortliche informieren.
7. Vertragliche Kundeninformation ohne unangemessene Verzögerung vorbereiten.
8. Gesetzliche Meldepflicht gegenüber EDÖB und allfällige Information betroffener Personen beurteilen.
9. Beweise/Auditdaten sichern, ohne unnötig weitere Personendaten zu vervielfältigen.
10. Ursache beheben, Recovery durchführen und Post-Incident-Review dokumentieren.

## Datenaufbewahrung – Grundsätze
- Personendaten nur so lange wie für Zweck, Vertrag, Sicherheit oder gesetzliche Pflicht notwendig.
- Geschäftsbücher und relevante Belege der Binso GmbH: gesetzliche Aufbewahrung nach Schweizer Recht, regelmässig zehn Jahre.
- Kundengeschäftsdaten: während aktivem Vertragsverhältnis; nach Ende Export-/Löschprozess gemäss Vertrag und DPA.
- Authentifizierungs-/Security-Daten: nur für Sicherheits-/Nachweiszweck erforderliche Dauer.
- Inaktive/verbrauchte OTPs und Sessions regelmässig bereinigen.
- Backups: nach dokumentierter Rotation; keine dauerhafte Schattenaufbewahrung.
- Support-/Auditdaten: nach Support-, Sicherheits- und Beweiszweck; periodische Review.

## Technisch verbindliche Auth-/Session-Retention
- Verbrauchte oder abgelaufene E-Mail-Codes: automatische Löschung nach 7 Tagen.
- Verbrauchte oder abgelaufene Token für Passwort-Reset und E-Mail-Bestätigung: automatische Löschung nach 7 Tagen.
- Abgelaufene Kunden- und Operator-Sessions: automatische Löschung nach 30 Tagen.
- Abgelaufene, noch nicht abgeschlossene MFA-Enrollment-Secrets: werden entfernt, sobald die hinterlegte Ablaufzeit überschritten ist.
- Die Azure Logic App `logic-binso-one-retention-prod` ruft die Bereinigung täglich um 03:17 Uhr Schweizer Zeit auf. Ihre Managed Identity besitzt die Entra-Anwendungsrolle `Retention.Run`. Die App greift über ihr privates Netzwerk mit der vorhandenen Laufzeitrolle auf PostgreSQL zu.
- Pro Lauf verarbeitet die App bis zu 1'000 Einträge je Kategorie und schreibt Zeitpunkt und Mengen atomar als `auth.retention.completed` ins Plattform-Audit. Bei einem Fehler zählt der Lauf erst nach erfolgreicher Wiederholung als abgeschlossen.
- `logic-binso-one-retention-watch-prod` prüft alle sechs Stunden, ob ein erfolgreicher Lauf jünger als 36 Stunden ist. Beide Workflows melden Fehlläufe über Azure Monitor an `systems@binso.ch`. GitHub Operations Watch prüft den öffentlichen Status stündlich.
- Bei einem Alarm zuerst den Azure-Laufverlauf sowie den HTTP-Status und die App-Logs prüfen. Nach der Korrektur den Zeitplan der Logic App manuell auslösen und auf `Succeeded` sowie HTTP 200 bei `/api/health/retention` prüfen. Produktive Deployments führen höchstens eine Vorschau aus.

## Vor Go-live weiterhin operativ zu bestätigen
- konkrete Azure PostgreSQL Backup-Retention und Restore Point Objective,
- Log-Retention je Azure-/Application-Insights-Quelle,
- Kundenexport- und endgültiger Löschprozess nach Vertragsende als echter E2E-Test,
- verantwortliche Person für Incident-Koordination.
