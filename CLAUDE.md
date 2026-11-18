# Projekt-Tagebuch: Abo-Übersicht

## 1. Worum geht es?

Android-App (APK) für das Samsung-Smartphone des Nutzers: Kosten aller Abos verwalten und im Blick behalten.

- Web-Technik in `www/` (HTML/CSS/JS ohne Framework), verpackt mit **Capacitor 8** als Android-App (`android/`).
- `www/katalog.js`: Kategorien (Reiter), Zahl-Rhythmen, Katalog bekannter Dienste mit Richtpreisen + Suchwörtern für den Kontoauszug.
- `www/app.js`: gesamte Logik. Daten nur lokal (`localStorage`, Schlüssel `abo-uebersicht-v1`).
- Funktionen: Übersicht (Kosten pro Tag/Woche/Monat/Jahr, Kreisdiagramm, Hinweise, nächste 30 Tage, „Was wäre, wenn“),
  Abos mit Reitern pro Kategorie, Status (Bezahlt/Kostenlos/Testphase/Pausiert/Gekündigt) mit automatischem **Verlauf**,
  Kontoauszug-Import (**PDF**, CSV oder eingefügter Text) erkennt bekannte Dienste + regelmäßige Zahlungen,
  Erinnerungen (Local Notifications, nur APK), Sicherung als JSON, Update-Hinweis über GitHub-Releases.
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

## 3. Verlauf

| Datum | Was |
|---|---|
| 2026-11-18 | Erste Version: Übersicht, Reiter, Katalog, Kontoauszug-Erkennung, Erinnerungen, Sicherung, APK-Workflow |
| 2026-11-18 | Neues Logo (ohne Baseball), PDF-Kontoauszug offline, Datenschutz-Sperre (CSP), Umzug auf `main`, Signatur-Passwort eingerichtet |
| 2026-11-18 | Repository umbenannt in `Abouebersicht`, Links angepasst |
| 2026-11-18 | Kontoauszug-Erkennung verbessert: Telekom/Vodafone usw. einzeln statt Sammel-„Handyvertrag“, Wertstellungs-Zeilen, Buchstabe-für-Buchstabe-PDFs, Versicherungen + Wohnen & Energie, einmalige Lastschriften, Liste aller gelesenen Abbuchungen |

## 4. Offene Ideen

- Eigene Kategorien anlegen
- Widget für den Startbildschirm
- Fremdwährungen (USD-Abos) mit Umrechnung

## 5. Zusammenarbeit

- Nutzer ist Programmier-Laie: einfaches Deutsch, kleine nummerierte Schritte, klar sagen, wer was tut.
- Claude übernimmt alles, was möglich ist. Vor dem Hochladen testen.
- Hardware: Samsung-Smartphone (Chrome) und Raspberry Pi 400.
- Alle Projekte gleich aufbauen: Hauptzweig `main`.
