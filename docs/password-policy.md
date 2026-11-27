# BINSO One – Passwortrichtlinie

Für jedes neu gesetzte oder geänderte Passwort gelten dieselben Anforderungen:

- Mindestens 8 und höchstens 256 Zeichen.
- Mindestens ein Grossbuchstabe und ein Kleinbuchstabe.
- Mindestens eine Zahl und ein Sonderzeichen. Ein Leerzeichen zählt nicht als Sonderzeichen.

Die Regel gilt für Kundenregistrierung, neue Passwörter bei Teameinladungen, Passwortänderung, Passwort-Reset und die Einrichtung der internen Admin-Zugänge. Die Anwendung prüft neue Passwörter beim Absenden im Browser und verbindlich auf dem Server. Die Kommandozeile für die Passkey-Einrichtung prüft die gleiche Regel. Der gemeinsame Validator und die Grenzwerte stehen in `lib/password-policy.ts`.

Bereits gespeicherte Passwörter werden weiterhin beim Anmelden geprüft. Die Regel greift, wenn ein neues Passwort gesetzt wird. Der E-Mail-Code der Admin-Anmeldung ist unabhängig von der Passwortrichtlinie und bleibt bei dieser Anmeldeart erforderlich.
