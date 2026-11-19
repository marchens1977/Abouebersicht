// Prüft die Update-Suche („Nach Updates suchen“ in ⚙️ Mehr) – ohne echtes Internet:
// Die Antwort von GitHub wird nachgespielt, die Android-App (Capacitor) wird im Browser vorgetäuscht.
// Aufruf über  bash test/alle-tests.sh  (Server auf Port 8765 muss laufen).
const { chromium } = require('playwright');

const API = 'https://api.github.com/repos/marchens1977/Abouebersicht/releases/latest';
const APK_URL = 'https://github.com/marchens1977/Abouebersicht/releases/download/v1.0.9/Abo-Uebersicht.apk';
const INSTALLIERT = '1.0.7';

let fehlerZahl = 0;
function pruefe(bedingung, text) {
  console.log((bedingung ? 'OK: ' : 'FEHLER: ') + text);
  if (!bedingung) fehlerZahl++;
}
const release = (tag, mitApk = true) => ({
  tag_name: tag,
  assets: mitApk ? [{ name: 'Abo-Uebersicht.apk', browser_download_url: APK_URL.replace('v1.0.9', tag) }] : [{ name: 'anderes.zip' }],
});

/** Neue „App“: eigener Speicher, Version 1.0.7, optional als Android-App, GitHub-Antwort nach Wunsch. */
async function starte(browser, { antwort, nativ = true }) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 1 });
  const zaehler = { api: 0 };
  const fehler = [];
  // Beim Bauen ersetzt GitHub "__VERSION__" – hier machen wir das nach.
  await ctx.route('http://localhost:8765/app.js', async (route) => {
    const r = await route.fetch();
    route.fulfill({ response: r, body: (await r.text()).replace("'__VERSION__'", `'${INSTALLIERT}'`) });
  });
  await ctx.route(API, (route) => {
    zaehler.api++;
    const a = typeof antwort === 'function' ? antwort() : antwort;
    if (a === 'offline') return route.abort('internetdisconnected');
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(a) });
  });
  if (nativ) await ctx.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true, Plugins: {} }; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(500);
  return { ctx, p, zaehler, fehler };
}
const blattOffen = (p) => p.evaluate(() => document.getElementById('blatt').classList.contains('offen'));
const toastText = (p) => p.textContent('#toast');

(async () => {
  const S = process.argv[2] || '.';
  const browser = await chromium.launch();

  // 1. Versionsnummern lesen (Release-Namen v1.0.N, auch app-v1.0.N)
  {
    const { ctx, p } = await starte(browser, { antwort: release('v1.0.7'), nativ: false });
    const n = await p.evaluate(() => [bauNummer('v1.0.7'), bauNummer('app-v1.0.8'), bauNummer('1.0.12'), bauNummer(''), bauNummer('v1.0.10') > bauNummer('v1.0.9')]);
    pruefe(JSON.stringify(n) === '[7,8,12,0,true]', 'Versionsnummer aus „v1.0.7“, „app-v1.0.8“, „1.0.12“ gelesen; 1.0.10 ist neuer als 1.0.9');
    await ctx.close();
  }

  // 2. Neuere Version → Fenster erscheint beim Start von selbst
  {
    const { ctx, p, zaehler, fehler } = await starte(browser, { antwort: release('v1.0.9') });
    pruefe(await blattOffen(p), 'Neuere Version 1.0.9: Fenster „Update verfügbar“ erscheint beim Start von selbst');
    const text = await p.textContent('#blatt-inhalt');
    pruefe(text.includes('Update verfügbar') && text.includes('1.0.9') && text.includes('du hast 1.0.7'), 'Fenster nennt neue (1.0.9) und eigene Version (1.0.7)');
    pruefe(await p.getAttribute('#u-laden', 'href') === APK_URL, '„Jetzt herunterladen“ zeigt auf die APK des Releases');
    await p.screenshot({ path: S + '/update-1-fenster.png' });
    await p.click('#u-spaeter');
    await p.waitForTimeout(400);
    pruefe(!(await blattOffen(p)), '„Später“ schließt das Fenster');
    await p.click('nav [data-view=mehr]');
    pruefe((await p.textContent('#update-info')).includes('1.0.9'), 'In „Mehr“ steht der Hinweis „Version 1.0.9 ist verfügbar“');
    await p.screenshot({ path: S + '/update-2-mehr.png', fullPage: true });
    // Herunterladen: öffnet den Download (im Test als neues Fenster), danach Anleitung
    const neuesFenster = ctx.waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await p.click('#m-update');
    await p.waitForTimeout(400);
    pruefe(await blattOffen(p), 'Knopf „Nach Updates suchen“ zeigt das Fenster wieder');
    await ctx.route(APK_URL, (r) => r.fulfill({ status: 200, body: 'apk' }));
    await p.click('#u-laden');
    const fenster = await neuesFenster;
    pruefe(fenster && fenster.url() === APK_URL, '„Jetzt herunterladen“ öffnet den APK-Download');
    await p.waitForTimeout(600);
    const anleitung = await p.textContent('#blatt-inhalt');
    pruefe(anleitung.includes('So geht es weiter') && anleitung.includes('Aktualisieren'), 'Danach erscheint die Anleitung „So geht es weiter“');
    await p.screenshot({ path: S + '/update-3-anleitung.png' });
    // Neu öffnen innerhalb einer Stunde: keine neue Anfrage von selbst
    const vorher = zaehler.api;
    await p.reload();
    await p.waitForTimeout(500);
    pruefe(zaehler.api === vorher, 'Von selbst höchstens 1x pro Stunde (kein erneutes Fragen beim nächsten Öffnen)');
    pruefe(fehler.length === 0, 'Keine Programmfehler' + (fehler.length ? ': ' + fehler.join(' | ') : ''));
    await ctx.close();
  }

  // 3. Gleiche Version → kein Fenster; Knopf meldet „neueste Version“
  {
    const { ctx, p } = await starte(browser, { antwort: release('v1.0.7') });
    pruefe(!(await blattOffen(p)), 'Gleiche Version: kein Fenster beim Start');
    await p.click('nav [data-view=mehr]');
    await p.click('#m-update');
    await p.waitForTimeout(500);
    const t = await toastText(p);
    pruefe(t.includes('neueste Version') && t.includes('1.0.7'), 'Knopf „Nach Updates suchen“ meldet „Du hast schon die neueste Version (1.0.7)“');
    await p.screenshot({ path: S + '/update-4-aktuell.png' });
    await ctx.close();
  }

  // 4. Älteres Release / Release ohne APK → kein Fenster
  for (const [antwort, name] of [[release('v1.0.5'), 'Älteres Release (1.0.5)'], [release('v1.0.9', false), 'Neueres Release ohne APK-Datei']]) {
    const { ctx, p } = await starte(browser, { antwort });
    await p.click('nav [data-view=mehr]');
    await p.click('#m-update');
    await p.waitForTimeout(500);
    pruefe(!(await blattOffen(p)) && (await toastText(p)).includes('neueste Version'), name + ': kein Update angeboten');
    await ctx.close();
  }

  // 5. Kein Internet → verständliche Meldung, kein Absturz
  {
    const { ctx, p, fehler } = await starte(browser, { antwort: 'offline' });
    pruefe(!(await blattOffen(p)), 'Kein Internet beim Start: still, kein Fenster');
    await p.click('nav [data-view=mehr]');
    await p.click('#m-update');
    await p.waitForTimeout(500);
    pruefe((await toastText(p)).includes('Bitte Internet prüfen'), 'Kein Internet: Knopf meldet „Update-Suche nicht möglich. Bitte Internet prüfen.“');
    pruefe(fehler.filter((f) => !f.includes('ERR_INTERNET_DISCONNECTED') && !f.includes('Failed to load resource')).length === 0, 'Kein Internet: keine Programmfehler');
    await ctx.close();
  }

  // 6. Browser-Version (keine Android-App): kein Knopf, keine Anfrage an GitHub
  {
    const { ctx, p, zaehler } = await starte(browser, { antwort: release('v1.0.9'), nativ: false });
    await p.click('nav [data-view=mehr]');
    pruefe(await p.$('#m-update') === null && zaehler.api === 0 && !(await blattOffen(p)), 'Browser-Version: kein Update-Knopf, keine Anfrage an GitHub');
    await ctx.close();
  }

  await browser.close();
  console.log(fehlerZahl ? `FEHLER: ${fehlerZahl} Update-Prüfung(en) fehlgeschlagen` : 'OK: Update-Suche komplett');
  if (fehlerZahl) process.exitCode = 1;
})();
