# PWA-Abnahme für Binso One

## Automatische Prüfungen

- `node scripts/pwa-worker-regression.mjs` prüft Cache-Verlust, HTTP-Fehler, Teilantworten, private Routen und die Bereinigung eigener Caches.
- `node scripts/pwa-worker-browser.mjs` startet einen lokalen HTTP-Fixture-Server und prüft die Aktivierung des echten Workers, den Start mit leerem Cache und den Wiederanlauf. `PWA_BROWSER` wählt Chromium, WebKit oder Firefox. CI installiert die zu seiner Playwright-Version passenden Browser.
- Releases verwenden den für den Ziel-Commit bestandenen CI-Lauf. Ein Browser-Fix erhält einen Regressionstest für den betroffenen Ablauf.

## Geräteabnahme vor Freigabe einer PWA-Änderung

| Plattform | Abnahme |
| --- | --- |
| iPhone und iPad, Safari | Home-Bildschirm-Installation, Logo und Safe Areas, Kaltstart, Flugmodus, Wiederanlauf und Update bei offener Eingabe. |
| Android-Mobilgerät und -Tablet, Chrome | Installation, Maskable-Icon, beide Ausrichtungen, Kaltstart, Flugmodus und Update bei offener Eingabe. |
| Windows, Edge und Chrome | Website sowie installierte PWA prüfen. Logo-Loader im normalen Desktop-Tab ausgeblendet. |
| macOS, Safari | Website sowie zum Dock hinzugefügte App prüfen, soweit die OS-Version die Installation anbietet. |
| Firefox | Website und Service Worker prüfen. Installationsangebot gemessen am jeweiligen Betriebssystem dokumentieren. |

Bei reduzierter Bewegung und mit Tastatur prüfen, ob der Inhalt ohne anhaltende Animation erreichbar ist. Einen nicht gecachten Pfad offline testen. Es muss eine lesbare Meldung erscheinen. Nach erneuter Verbindung muss die Seite laden. Während eines Updates müssen offene Eingaben und laufende Speichervorgänge erhalten bleiben.

Push auf einem installierten iPhone und Android-Gerät einmal zustellen und die Benachrichtigung öffnen. Im Login und im Dashboard prüfen.

Pro Lauf Commit, Zielumgebung, Datum, Gerätemodell, OS, Browserversion und Ergebnis festhalten. Ergebnisse als bestanden, fehlgeschlagen oder offen erfassen. Browseremulation als solche kennzeichnen. Einen fehlgeschlagenen Pflichtfall vor der Freigabe korrigieren und erneut prüfen.

## Sitzungs- und Netzwechsel

1. Konto A anmelden und eine geschützte Seite öffnen. Flugmodus einschalten und dieselbe Seite in einem neuen Fenster laden. Die Offline-Meldung darf keine Inhalte von Konto A enthalten.
2. Netz wieder einschalten und erneut versuchen. Eine noch gültige Sitzung darf fortgesetzt werden. Bei einer abgelaufenen Sitzung muss die Anwendung eine erneute Anmeldung verlangen.
3. Die Abmeldung ohne Netz versuchen. Eine serverseitige Abmeldung darf erst nach Bestätigung als erfolgreich angezeigt werden. Nach Wiederverbindung abmelden, Konto B anmelden und geschützte Seiten sowie einen zweiten Tab prüfen.
4. Eine installierte App nach längerer Pause und einem Release wieder öffnen. Die App soll den Worker ohne Update-Meldung aktivieren. Laufende Formulare bleiben bestehen. Beim nächsten vollständigen Seitenaufruf den neuen Stand prüfen.
5. Browser-Cache und Website-Daten in einem Testprofil löschen. Nach erneuter Installation den Cache-Speicher des Workers entfernen und offline laden. Der ersatzweise ausgelieferte Offline-Bildschirm muss lesbar bleiben und nach Wiederverbindung zum ursprünglichen Ziel führen.
