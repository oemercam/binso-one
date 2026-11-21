# Binso One – Interner Zugriff mit Microsoft Entra ID

## Wechsel zu E-Mail, Passwort und Passkey

Der neue Admin-Zugang erfordert E-Mail, Passwort und anschliessend einen
Passkey mit lokaler Nutzerverifikation. Die Admin-Rollen und der Kunden-Login
sind getrennt. Für die Einführung zuerst die Passkey-Migration anwenden und
einen bestehenden aktiven Operator mit `scripts/provision-operator-passkey.mjs`
vorbereiten. Das Passwort wird über stdin übergeben. Der einmalige
Einrichtungscode gilt 30 Minuten und wird über einen geschützten Kanal
übergeben. Mit `BINSO_OPERATOR_PASSKEY_LOGIN=true` wechseln Login, Sessionprüfung
und Abmeldung auf den neuen Weg. Azure muss die Anmeldeseite und deren API ohne
Microsoft-Anmeldung am Infrastruktur-Eingang erreichen lassen. Nach
erfolgreicher Einrichtung mit einem zweiten Login den produktiven Einstieg
verifizieren.

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
