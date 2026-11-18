const { chromium } = require('playwright');
(async () => {
  const S = process.argv[2];
  const b = await chromium.launch();
  // 1) Test-Kontoauszug als PDF erzeugen
  const g = await b.newPage();
  const zeile = (d, art, betrag, ...folge) => `<tr><td>${d}</td><td>${d}</td><td>${art}</td><td style="text-align:right">${betrag}</td></tr>` + folge.map(f => `<tr><td></td><td></td><td>${f}</td><td></td></tr>`).join('');
  let rows = '';
  for (const m of ['09', '10', '11']) {
    rows += zeile(`03.${m}.`, 'Lastschrift', '-13,99', 'NETFLIX INTERNATIONAL B.V.', 'Netflix Monatsabo Ref. 88123');
    rows += zeile(`05.${m}.`, 'Kartenzahlung', '-12,99', 'Spotify AB Stockholm');
    rows += zeile(`12.${m}.`, 'Lastschrift', '-21,42', 'ANTHROPIC, PBC', 'CLAUDE.AI SUBSCRIPTION');
    rows += zeile(`01.${m}.`, 'Dauerauftrag', '-24,90', 'Turnverein Musterstadt e.V.', 'Mitgliedsbeitrag');
    rows += zeile(`15.${m}.`, 'Kartenzahlung', '-47,13', `REWE Markt ${m}`);
    rows += zeile(`28.${m}.`, 'Gutschrift', '2.500,00', 'Arbeitgeber GmbH', 'Gehalt');
  }
  await g.setContent(`<h2>Sparkasse Musterstadt – Kontoauszug 11/2026</h2><p>Kontostand am 01.09.2026  1.234,56</p>
    <table style="width:100%;font:12px Arial"><tr><th>Buchung</th><th>Valuta</th><th>Vorgang</th><th>Betrag EUR</th></tr>${rows}</table>
    <p>Neuer Kontostand 3.210,00</p>`);
  await g.pdf({ path: S + '/auszug.pdf' });
  // 2) App öffnen, Netzwerk beobachten
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const fehler = [], fremd = [];
  let namen = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  p.on('request', (r) => { if (!r.url().startsWith('http://localhost:8765')) fremd.push(r.url()); });
  await p.goto('http://localhost:8765/');
  await p.click('nav [data-view=finden]');
  await p.setInputFiles('#csv-datei', S + '/auszug.pdf');
  await p.waitForSelector('#funde-uebernehmen', { timeout: 20000 });
  namen = await p.$$eval('#funde > .fund b', (e) => e.map((x) => x.innerText));
  console.log(namen);
  await p.waitForTimeout(1500); await p.screenshot({ path: S + '/pdf-funde.png' });
  await p.click('#funde-verwerfen');
  console.log('nach Verwerfen:', await p.$$eval('.fund', (e) => e.length), 'Speicher:', await p.evaluate(() => localStorage.getItem('abo-uebersicht-v1')));
  await p.click('nav [data-view=start]');
  await p.screenshot({ path: S + '/start-leer.png' });
  const ok = ['Netflix', 'Claude Pro', 'Spotify Premium'].every((n) => namen.some((x) => x.startsWith(n))) && fehler.length === 0 && fremd.length === 0;
  console.log(ok ? 'OK: PDF einfach (und keine Verbindung nach außen)' : 'FEHLER: PDF einfach', fehler, fremd);
  if (!ok) process.exitCode = 1;
  await b.close();
})();
