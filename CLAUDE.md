# Projekt-Tagebuch: Abo-Übersicht

## 1. Worum geht es?

Android-App (APK) für das Samsung-Smartphone des Nutzers: Kosten aller Abos verwalten und im Blick behalten.

- Web-Technik in `www/` (HTML/CSS/JS ohne Framework), verpackt mit **Capacitor 8** als Android-App (`android/`).
- `www/katalog.js`: Kategorien (Reiter), Zahl-Rhythmen, Katalog bekannter Dienste mit Richtpreisen + Suchwörtern für den Kontoauszug.
- `www/app.js`: gesamte Logik. Daten nur lokal (`localStorage`, Schlüssel `abo-uebersicht-v1`).
- Funktionen: Übersicht (Kosten pro Tag/Woche/Monat/Jahr, Kreisdiagramm, Hinweise, nächste 30 Tage, „Was wäre, wenn“),
  Abos mit Reitern pro Kategorie, Status (Bezahlt/Kostenlos/Testphase/Pausiert/Gekündigt) mit automatischem **Verlauf**,
  Kontoauszug-Import (**PDF**, CSV oder eingefügter Text) erkennt bekannte Dienste + regelmäßige Zahlungen,
  Erinnerungen (Local Notifications, nur APK), Sicherung als JSON, **Update-Suche** (siehe 2b).
- Design: New-York-Mets-Farben Blau `#002D72` / Orange `#FF5910` (gilt für alle Apps des Nutzers).
  **Kein Baseball-Motiv** – nur die Farben. Logo: zwei kreisende Pfeile (Verlängerung) um ein €-Zeichen (`www/icons/icon.svg`).

## 1a. Datenschutz (dem Nutzer sehr wichtig)

- Kontoauszüge werden nur im Arbeitsspeicher gelesen, nie gespeichert, nie hochgeladen. Nach dem Lesen sofort verworfen.
- PDF-Lesen mit **pdf.js lokal eingebaut** (`www/vendor/`, aus `pdfjs-dist`), kein Nachladen aus dem Internet.
- Content-Security-Policy in `index.html`: Verbindungen nur zu sich selbst und `api.github.com` (Update-Prüfung, sendet keine Daten).
- Knopf „Ergebnisse verwerfen“; gespeichert werden nur übernommene Abos (`localStorage`).
- Test prüft: keine fremden Netzwerkanfragen beim PDF-Lesen.

## 1b. Kontoauszug-Erkennung (Lehren)

- Sammel-Einträge im Katalog (Name enthält „(andere…)“) haben Vorrang NACH bestimmten Anbietern und werden je Empfänger getrennt.
- PDF-Zeilen: Textstücke nach Abstand verbinden (manche Banken speichern einzelne Buchstaben).
- Zeile mit Datum ohne Betrag direkt unter einer Buchung = Wertstellung → gehört zur Buchung.
- Nutzer hat oft nur EINEN Monats-PDF → einmalige Lastschriften/Daueraufträge werden (ohne Haken) vorgeschlagen.
- Test-Auszüge werden mit Playwright als PDF nachgebaut (echte Auszüge des Nutzers nie anfordern/speichern).

## 2. Bauen & Veröffentlichen

- Repository heißt `marchens1977/Abouebersicht` (GitHub erlaubt kein „Ü“; früher `Abo--bersicht`).
- Hauptzweig ist `main` (wie in allen Projekten des Nutzers). Workflow baut nur bei Push auf `main`.
- GitHub Actions `.github/workflows/android.yml` baut bei jedem Push die APK und legt ein Release `v1.0.<Laufnummer>` an.
- Download-Link (immer neueste): https://github.com/marchens1977/Abouebersicht/releases/latest/download/Abo-Uebersicht.apk
- Signatur: Geheimnis `KEYSTORE_PASSWORD` (vom Nutzer in GitHub angelegt). Beim ersten Lauf erzeugt der Workflow den
  Schlüssel und legt ihn verschlüsselt als `android/app/release.keystore.enc` ab (Commit durch den Bot → vor eigenem Push `git pull`).
  Ohne Geheimnis: Wegwerf-Schlüssel, Update nur nach Deinstallation.
- Lokal gibt es kein Android-SDK (dl.google.com gesperrt) → nur Browser-Test mit Playwright (`www/` per `python3 -m http.server`).
- Icons: Vorlagen in `assets/`, erzeugt mit `npx @capacitor/assets generate --android`.

## 2b. Update-Suche (übernommen aus dem Fisch-Fang-Tracker)

- Nur in der Android-App (APK). Code in `www/app.js`, Abschnitt „Update-Suche“ (`sucheUpdate`, `autoUpdateSuche`, `bauNummer`).
- Fragt `api.github.com/repos/marchens1977/Abouebersicht/releases/latest` ab (sendet keine Daten, erlaubt in der CSP).
- **Versionsnummern (einheitlich, bitte so lassen):** Release-Name `v1.0.N`, App-Version `1.0.N` (der Workflow ersetzt
  `__VERSION__` in `app.js` und setzt `versionName`), N = Laufnummer des Workflows = `versionCode`.
  Verglichen wird nur die letzte Zahl N (`bauNummer`, versteht auch `app-v1.0.N`), damit 1.0.10 neuer als 1.0.9 ist.
- **Von selbst:** beim Öffnen und beim Zurückkehren in die App, höchstens 1x pro Stunde (Zeitpunkt in `localStorage`,
  Schlüssel `abo-uebersicht-update`, getrennt von den Abos/Sicherungen). Ist das Release neuer und hat die Datei
  `Abo-Uebersicht.apk` → Fenster „Update verfügbar“ → „Jetzt herunterladen“ öffnet den APK-Download im Browser →
  Anleitung „So geht es weiter“. Ohne Internet: still.
- **Von Hand:** ⚙️ Mehr → Karte „App“ → Knopf **„Nach Updates suchen“**. Meldet „Du hast schon die neueste Version (1.0.N)“
  oder „Update-Suche nicht möglich. Bitte Internet prüfen.“ Der Link „Neueste App herunterladen“ bleibt zusätzlich.
- **Entscheidung:** keine Selbst-Installation (Erlaubnis `REQUEST_INSTALL_PACKAGES`) – beim Fisch-Fang-Tracker hat
  Google Play Protect die App deshalb als „schädlich“ blockiert. Installiert wird über die heruntergeladene Datei.
- Die Seite „⚙️ Mehr“ gilt als Einstellungen der App.

- **Play Protect (Lehre 2026-11-19):** 1.0.8 wurde beim Installieren blockiert („kennt von diesem Entwickler noch keine
  anderen Apps“). Ursache NICHT die Update-Suche: 1.0.7 und 1.0.8 haben dieselben Erlaubnisse und dieselbe Signatur
  (mit `androguard` verglichen). Lösung für den Nutzer: im Fenster „Weitere Details“ → „Trotzdem installieren“.
  Falls es mal nicht angeboten wird: Play Store → Profilbild → Play Protect → ⚙️ → „Apps mit Play Protect scannen“
  kurz aus, installieren, sofort wieder an. Idee falls es stört: Erlaubnisse `SCHEDULE_EXACT_ALARM` und
  `RECEIVE_BOOT_COMPLETED` (vom Erinnerungs-Baustein) entfernen – nur nach Rückfrage, Wirkung nicht garantiert.

## 2a. Tests & Hilfsprogramme

**Regel (vom Nutzer für alle Projekte):**
1. Automatische Prüfungen (Tests) und Hilfsprogramme, die über eine einzelne Aufgabe hinaus nützlich sind, werden im Projekt
   gespeichert (Ordner `test/`) – nicht nur im Arbeitsbereich der Sitzung, der beim Archivieren verloren geht.
2. Hier im Tagebuch steht, wie man sie startet und was sie prüfen.
3. Nach jeder Code-Änderung die vorhandenen Prüfungen laufen lassen; bei neuen Funktionen passende Prüfpunkte ergänzen.
4. Gibt es noch keine automatische Prüfung, bei der nächsten Code-Änderung eine einfache anlegen.
5. Was Claude nicht selbst testen kann, hier als Test für den Nutzer vermerken.

**Starten:** `bash test/alle-tests.sh` (aus dem Projektordner; braucht Node + Playwright/Chromium, startet `www/` auf Port 8765).
Ausgabe je Test `OK: …` oder `FEHLER: …`, am Ende `ALLE PRÜFUNGEN OK`.

| Datei | Prüft |
|---|---|
| `test/bedienung.test.js` | CSV-Auszug (`test/beispiel-auszug.csv`) einlesen, Abos übernehmen, Testphase anlegen, Downgrade → Verlauf, Reiter, Summen (83,31 €/Monat), keine JS-Fehler |
| `test/pdf-einfach.test.js` | Baut einen einfachen PDF-Auszug (Datum ohne Jahr, Empfänger in Folgezeile), erkennt Netflix/Claude/Spotify, „Verwerfen“ speichert nichts, **keine Verbindung nach außen** |
| `test/pdf-schwierig.test.js` | 3-seitiges PDF, teils Buchstabe für Buchstabe, Wertstellungs-Zeilen: alle 12 Abbuchungen gelesen; Telekom, Vodafone, Allianz, HUK, Disney+ (PayPal), Stadtwerke, Rundfunk einzeln erkannt |
| `test/update.test.js` | Update-Suche ohne echtes Internet (GitHub-Antwort nachgespielt, Android-App vorgetäuscht, installiert = 1.0.7): Versionsnummern lesen (`v1.0.N`, `app-v1.0.N`, 1.0.10 > 1.0.9); neuere Version → Fenster beim Start, Link zur APK, „Später“, Hinweis in „Mehr“, Download + Anleitung; nur 1x pro Stunde von selbst; gleiche/ältere Version und Release ohne APK → kein Angebot; kein Internet → Meldung; Browser-Version → kein Knopf, keine Anfrage |

Änderungen nur in `test/` lösen keinen neuen App-Bau aus.

**Tests für den Nutzer (kann Claude nicht selbst):**
- Installation/Update der APK auf dem echten Samsung-Handy (Update muss ohne Deinstallieren gehen).
- Erinnerungen (Benachrichtigungen) kommen am Handy an; Erlaubnis-Abfrage erscheint.
- Echter Kontoauszug der eigenen Bank als PDF: werden alle Abos gefunden? (Bank-Name nennen, dann Aufbau nachbauen.)
- Sicherung erstellen/laden über das Teilen-Menü des Handys.

**Abhak-Liste Update-Suche (am Handy):**
- [x] Version mit Update-Suche (1.0.8 oder neuer) einmalig von Hand installieren (Link unten in diesem Tagebuch) – die alte 1.0.7 kennt den Knopf noch nicht.
- [x] ⚙️ Mehr → Karte „App“: Version 1.0.N steht da, Knopf „🔄 Nach Updates suchen“ → Meldung „Du hast schon die neueste Version (1.0.N)“.
- [x] Flugmodus an → Knopf → Meldung „Update-Suche nicht möglich. Bitte Internet prüfen.“
- [ ] Beim nächsten neuen Release: App öffnen → Fenster „Update verfügbar“ (neue + eigene Version) → „Jetzt herunterladen“ öffnet den Download im Browser → Anleitung erscheint.
- [ ] Auf die heruntergeladene Datei tippen → „Aktualisieren“ → App startet mit neuer Version, alle Abos sind noch da.
- [ ] Play Protect: Bei 1.0.8 kam „App wurde zum Schutz deines Geräts blockiert“ → „Weitere Details“ → „Trotzdem installieren“ hat geklappt. Beim nächsten Update beobachten, ob das wieder kommt.

(Stand 2026-11-19: Nutzer hat 1.0.8 installiert, Knopf + Meldungen funktionieren. Offen ist nur der Ablauf beim nächsten echten Release.)

## 3. Verlauf

| Datum | Was |
|---|---|
| 2026-11-18 | Erste Version: Übersicht, Reiter, Katalog, Kontoauszug-Erkennung, Erinnerungen, Sicherung, APK-Workflow |
| 2026-11-18 | Neues Logo (ohne Baseball), PDF-Kontoauszug offline, Datenschutz-Sperre (CSP), Umzug auf `main`, Signatur-Passwort eingerichtet |
| 2026-11-18 | Repository umbenannt in `Abouebersicht`, Links angepasst |
| 2026-11-18 | Kontoauszug-Erkennung verbessert: Telekom/Vodafone usw. einzeln statt Sammel-„Handyvertrag“, Wertstellungs-Zeilen, Buchstabe-für-Buchstabe-PDFs, Versicherungen + Wohnen & Energie, einmalige Lastschriften, Liste aller gelesenen Abbuchungen |
| 2026-11-18 | Regel „Tests ins Projekt“; vorhandene Prüfungen nach `test/` übernommen (`bash test/alle-tests.sh`) |
| 2026-11-19 | Nutzer hat 1.0.8 installiert (Play Protect: „Trotzdem installieren“), Update-Knopf und Meldungen am Handy bestätigt |
| 2026-11-19 | Update-Suche wie im Fisch-Fang-Tracker: von selbst beim Öffnen (1x/Stunde) + Knopf „Nach Updates suchen“ in ⚙️ Mehr, Fenster „Update verfügbar“ mit Download und Anleitung; Test `test/update.test.js` |

## 4. Offene Ideen

- Eigene Kategorien anlegen
- Widget für den Startbildschirm
- Fremdwährungen (USD-Abos) mit Umrechnung
- Update-Suche: beim nächsten echten Release prüfen, ob das Fenster „Update verfügbar“ kommt und „Jetzt herunterladen“ in der App den Browser öffnet (Abhak-Liste in 2a)

## 5. Zusammenarbeit

- Nutzer ist Programmier-Laie: einfaches Deutsch, kleine nummerierte Schritte, klar sagen, wer was tut.
- Claude übernimmt alles, was möglich ist. Vor dem Hochladen testen.
- Hardware: Samsung-Smartphone (Chrome) und Raspberry Pi 400.
- Alle Projekte gleich aufbauen: Hauptzweig `main`.
