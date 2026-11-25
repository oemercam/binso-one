# Binso One – Interner Zugriff mit Microsoft Entra ID

## Wechsel zu E-Mail, Passwort und Passkey

Der neue Admin-Zugang erfordert E-Mail, Passwort und einen Passkey mit
lokaler Nutzerverifikation. Kundenanmeldung und Firmenrollen folgen ihrem
bestehenden Ablauf.

1. Die Migration über die Produktionspipeline anwenden. Die Anmeldeseite und
   `/api/operator/login` müssen ohne vorgeschaltete Microsoft-Anmeldung erreichbar
   sein. Den Microsoft-Login für den Rollback betriebsbereit halten.
2. Auf dem privaten Datenbankrunner für die aktiven Entra-Administratoren
   `scripts/provision-operator-passkey.mjs` ausführen. Passwort auf stdin
   eingeben und den einmaligen Einrichtungscode über einen geschützten Kanal
   übergeben. Der Code gilt 30 Minuten.
3. `BINSO_OPERATOR_PASSKEY_SETUP=true` setzen. Unter
   `/operator/login?passkey=einrichten` Passkey einrichten und anschliessend
   erneut bestätigen. Diese Prüfung erstellt keine Admin-Sitzung. Der
   reguläre Login läuft währenddessen weiter über Entra.
4. Sobald die vorgesehenen Operatoren geprüft sind,
   `BINSO_OPERATOR_PASSKEY_LOGIN=true` setzen und die Einrichtungsvorschau
   deaktivieren. Einen neuen Admin-Login auf der Produktionsdomain prüfen.
   Zum Rückwechsel `BINSO_OPERATOR_PASSKEY_LOGIN=false` setzen. Beide Modi
   akzeptieren nur Sitzungen aus demselben Anmeldeverfahren.

Stand: 5. Oktober 2026

Interne Binso-Mitarbeitende authentifizieren sich für One Admin über Microsoft Entra ID. Die Kunden-Authentifizierung bleibt davon vollständig getrennt.

## App-Rollen
Auf der für Azure App Service Authentication verwendeten Entra-Anwendung sind diese App-Rollen zu konfigurieren:

- `Binso.Platform.Owner` → vollständige Plattformverantwortung
- `Binso.Platform.Admin` → Plattformadministration
- `Binso.Platform.Support` → Support und Kundensicht
- `Binso.Platform.Billing` → Abonnemente und Billing
- `Binso.Platform.Auditor` → Lese- und Audit-Zugriff

Benutzer oder Entra-Gruppen werden diesen App-Rollen zugewiesen. Binso One ordnet die von Easy Auth validierten Rollen-Claims dem internen `platform_*`-Berechtigungsmodell zu.

## MFA
Microsoft Entra steuert MFA. Microsoft Authenticator kann über Conditional Access bzw. Authentication Strength verpflichtend gemacht werden. Binso One speichert für interne Mitarbeitende kein zweites lokales Produktivpasswort.

## Vertrauensgrenze
Produktiver Operator-API-Zugriff benötigt gleichzeitig:
1. eine gültige Binso-Operator-Session und
2. einen aktuellen Azure-App-Service-Easy-Auth-Principal, dessen Tenant-/Object-Identität und App-Rolle weiterhin zur Session passen.

Die standardmässig erlaubte E-Mail-Domain ist `binso.ch`. `OPERATOR_ENTRA_TENANT_ID` bindet den Zugriff zusätzlich an den erwarteten Entra-Tenant.

## Azure App Service
Öffentliche und Kunden-Routen bleiben bewusst von App Service Authentication ausgenommen. Der interne Login wird explizit über folgenden Pfad gestartet:
`/.auth/login/aad`

Nach erfolgreicher Microsoft-Authentifizierung setzt Azure den validierten Header `X-MS-CLIENT-PRINCIPAL`. Die Anwendung vertraut weder einer vom Browser gelieferten E-Mail-Adresse noch einer vom Browser gelieferten Rolle.

Der Architecture-Audit gibt nur nicht geheime Easy-Auth-Einstellungen aus, damit die Produktionskonfiguration ohne Offenlegung von Zugangsdaten geprüft werden kann.
