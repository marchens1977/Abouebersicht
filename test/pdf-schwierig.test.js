// Schwierigerer Test-Auszug: 3 Seiten, Text teils Buchstabe für Buchstabe, Valuta-Zeilen, lange Verwendungszwecke
const { chromium } = require('playwright');
const S = process.argv[2];
const einzeln = (t) => [...t].map((c) => `<span style="display:inline-block;white-space:pre">${c}</span>`).join('');
const posten = [
  ['01.11.2026', 'Lastschrift', 'Telekom Deutschland GmbH', 'Kd-Nr. 123456789 Rechnung 11/2026 Mandat TK-9988 Glaeubiger-ID DE00ZZZ00000012345', '-49,95'],
  ['02.11.2026', 'Lastschrift', 'Allianz Versicherungs-AG', 'Hausratversicherung Vertrag 4711 Mandat AZ-12', '-12,40'],
  ['03.11.2026', 'Lastschrift', 'NETFLIX INTERNATIONAL B.V.', 'Netflix Monatsabo', '-13,99'],
  ['04.11.2026', 'Dauerauftrag', 'Max Mustermann Vermietung', 'Miete November', '-750,00'],
  ['05.11.2026', 'Kartenzahlung', 'Spotify AB', 'Spotify Premium', '-12,99'],
  ['06.11.2026', 'Lastschrift', 'Stadtwerke Musterstadt', 'Abschlag Strom/Gas Mandat SW-1', '-85,00'],
  ['07.11.2026', 'Kartenzahlung', 'REWE Markt GmbH', 'REWE SAGT DANKE 12345', '-54,12'],
  ['10.11.2026', 'Lastschrift', 'ARD ZDF Deutschlandradio Beitragsservice', 'Rundfunkbeitrag 10.2026-12.2026', '-55,08'],
  ['12.11.2026', 'Lastschrift', 'PayPal Europe S.a.r.l. et Cie S.C.A', 'PP.4711.PP . Disney Plus, Ihr Einkauf bei Disney Plus', '-10,99'],
  ['15.11.2026', 'Lastschrift', 'HUK-COBURG', 'Kfz-Versicherung Mandat HUK-5', '-38,70'],
  ['20.11.2026', 'Lastschrift', 'Vodafone GmbH', 'Kabel Internet Mandat VF-77', '-39,99'],
  ['25.11.2026', 'Gutschrift', 'Arbeitgeber GmbH', 'Gehalt November', '2.500,00'],
  ['28.11.2026', 'Lastschrift', 'McFit GmbH', 'Mitgliedsbeitrag', '-24,90'],
];
(async () => {
  const b = await chromium.launch();
  const g = await b.newPage();
  let html = '';
  posten.forEach((p, i) => {
    const mitte = i % 2 === 0 ? einzeln : (t) => t;     // jeden 2. Posten Buchstabe für Buchstabe
    if (i === 5 || i === 10) html += '<div style="page-break-before:always"><b>Kontoauszug – Seite</b></div>';
    html += `<table style="width:100%;font:11px Arial;margin:6px 0"><tr>
      <td style="width:80px">${p[0]}</td><td>${mitte(p[1] + ' ' + p[2])}</td><td style="text-align:right;width:80px;padding-top:3px">${mitte(p[4])}</td></tr>
      <tr><td>${p[0]}</td><td>${mitte(p[3].slice(0, 45))}</td><td></td></tr>
      <tr><td></td><td>${mitte(p[3].slice(45))}</td><td></td></tr></table>`;
  });
  await g.setContent(`<h3>Girokonto – Kontoauszug 11/2026</h3><p>Alter Kontostand 1.234,56</p>${html}<p>Neuer Kontostand 3.000,00</p>`);
  await g.pdf({ path: S + '/auszug2.pdf' });
  const p = await b.newPage({ viewport: { width: 400, height: 860 } });
  const fehler = [], fremd = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  p.on('request', (r) => { if (!r.url().startsWith('http://localhost:8765')) fremd.push(r.url()); });
  await p.goto('http://localhost:8765/');
  await p.click('nav [data-view=finden]');
  await p.setInputFiles('#csv-datei', S + '/auszug2.pdf');
  await p.waitForTimeout(3000);
  const namen = await p.$$eval('#funde > .fund b', (e) => e.map((x) => x.innerText));
  const alle = await p.$$eval('#alle-umsaetze .fund', (e) => e.length);
  console.log(namen, 'Abbuchungen gelesen:', alle);
  await p.waitForTimeout(500); await p.screenshot({ path: S + '/pdf2.png', fullPage: true });
  const erwartet = ['Telekom', 'Vodafone', 'Allianz', 'HUK-COBURG', 'Disney+', 'Netflix', 'Stadtwerke', 'Rundfunkbeitrag'];
  const fehlt = erwartet.filter((n) => !namen.some((x) => x.startsWith(n)));
  const ok = fehlt.length === 0 && alle === 12 && fehler.length === 0 && fremd.length === 0;
  console.log(ok ? 'OK: PDF schwierig (3 Seiten, 12 Abbuchungen)' : 'FEHLER: PDF schwierig, fehlt: ' + fehlt.join(', ') + ' / gelesen: ' + alle, fehler, fremd);
  if (!ok) process.exitCode = 1;
  await b.close();
})();
