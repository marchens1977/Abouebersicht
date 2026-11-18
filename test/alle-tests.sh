#!/bin/bash
# Startet die App lokal im Browser (Playwright) und führt alle Prüfungen aus.
# Aufruf aus dem Projektordner:  bash test/alle-tests.sh
cd "$(dirname "$0")/.."
AUSGABE=$(mktemp -d)                      # Bildschirmfotos + Test-PDFs landen hier
python3 -m http.server 8765 --directory www >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
FEHLER=0
for t in test/*.test.js; do
  echo "== $t"
  node "$t" "$AUSGABE" | grep -E "^(OK|FEHLER)" || FEHLER=1
  [ "${PIPESTATUS[0]}" = "0" ] || FEHLER=1
done
echo "Bildschirmfotos: $AUSGABE"
[ $FEHLER = 0 ] && echo "ALLE PRÜFUNGEN OK" || { echo "MINDESTENS EINE PRÜFUNG FEHLGESCHLAGEN"; exit 1; }
