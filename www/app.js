// Abo-Übersicht – die ganze App-Logik. Alle Daten bleiben auf dem Handy (localStorage).
'use strict';

const APP_VERSION = '__VERSION__';           // wird beim Bauen der APK ersetzt
const REPO = 'marchens1977/Abouebersicht';
const SPEICHER = 'abo-uebersicht-v1';

const FARBEN = ['#FF5910', '#002D72', '#4a7bd1', '#ff9a6b', '#0b6e99', '#c2410c', '#7aa2e3', '#1e3a8a', '#f59e0b', '#94a3b8'];
const STATUS = {
  aktiv:      { name: 'Bezahlt',    zahlt: true },
  kostenlos:  { name: 'Kostenlos',  zahlt: false },
  testphase:  { name: 'Testphase',  zahlt: false },
  pausiert:   { name: 'Pausiert',   zahlt: false },
  gekuendigt: { name: 'Gekündigt',  zahlt: false },
};
const ZEITRAUM = {
  tag:   { name: 'pro Tag',   faktor: 12 / 365 },
  woche: { name: 'pro Woche', faktor: 12 / 52 },
  monat: { name: 'pro Monat', faktor: 1 },
  jahr:  { name: 'pro Jahr',  faktor: 12 },
};

// ---------- Daten ----------
let daten = laden();
let ui = { zeitraum: 'monat', reiter: 'alle', suche: '', sort: 'preis', wennAus: new Set(), funde: [] };

function laden() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER));
    if (d && Array.isArray(d.abos)) return Object.assign({ einstellungen: {} }, d);
  } catch (e) { /* leer */ }
  return { abos: [], einstellungen: { erinnern: true, tageVorher: 1 } };
}
function speichern() {
  localStorage.setItem(SPEICHER, JSON.stringify(daten));
  planeErinnerungen();
}
const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Hilfen ----------
const euroFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const euro = (n) => euroFmt.format(n || 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel) => document.querySelector(sel);

function heute() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function zuDatum(s) { if (!s) return null; const [y, m, t] = s.split('-').map(Number); return new Date(y, m - 1, t); }
function zuText(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function datumDE(d) { return d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; }
function tageBis(d) { return Math.round((d - heute()) / 86400000); }
function monateDazu(d, n) {
  const tag = d.getDate();
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const letzter = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(tag, letzter));
  return r;
}
function zyklusDazu(d, zyklus) {
  switch (zyklus) {
    case 'woche': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    case 'quartal': return monateDazu(d, 3);
    case 'halbjahr': return monateDazu(d, 6);
    case 'jahr': return monateDazu(d, 12);
    default: return monateDazu(d, 1);
  }
}
function naechsteAbbuchung(abo) {
  let d = zuDatum(abo.naechste);
  if (!d) return null;
  const h = heute();
  let i = 0;
  while (d < h && i++ < 1000) d = zyklusDazu(d, abo.zyklus);
  return d;
}
const proMonat = (abo) => (abo.preis || 0) * (ZYKLEN[abo.zyklus] || ZYKLEN.monat).proMonat;
const zahlt = (abo) => STATUS[abo.status]?.zahlt;
const kat = (id) => KATEGORIEN.find((k) => k.id === id) || KATEGORIEN[KATEGORIEN.length - 1];
function farbeFuer(name) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FARBEN[h % FARBEN.length];
}
function kuerzel(name) {
  const w = String(name).replace(/[^\p{L}\p{N}+ ]/gu, '').trim().split(/\s+/);
  return ((w[0]?.[0] || '?') + (w[1]?.[0] || w[0]?.[1] || '')).toUpperCase();
}
function logo(name) { return `<div class="logo" style="background:${farbeFuer(name)}">${esc(kuerzel(name))}</div>`; }

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('zeigen');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('zeigen'), 2600);
}

function summeProMonat(liste, ohne) {
  return liste.filter((a) => zahlt(a) && !(ohne && ohne.has(a.id))).reduce((s, a) => s + proMonat(a), 0);
}

// ---------- Navigation ----------
function zeige(view) {
  document.querySelectorAll('.ansicht').forEach((v) => v.classList.toggle('aktiv', v.id === 'view-' + view));
  document.querySelectorAll('.unten button').forEach((b) => b.classList.toggle('aktiv', b.dataset.view === view));
  $('#fab').style.display = (view === 'start' || view === 'abos') ? '' : 'none';
  window.scrollTo(0, 0);
  render();
}
document.querySelectorAll('.unten button').forEach((b) => b.addEventListener('click', () => zeige(b.dataset.view)));
$('#fab').addEventListener('click', () => oeffneFormular());

function render() {
  const aktive = daten.abos.filter(zahlt);
  $('#kopf-sub').textContent = daten.abos.length
    ? `${aktive.length} bezahlte${aktive.length === 1 ? 's' : ''} Abo${aktive.length === 1 ? '' : 's'} · ${euro(summeProMonat(daten.abos))} im Monat`
    : 'Alle Abos im Blick';
  renderStart();
  renderAbos();
  renderFinden();
  renderMehr();
}

// ---------- Übersicht ----------
function renderStart() {
  const el = $('#view-start');
  if (!daten.abos.length) {
    el.innerHTML = `
      <div class="summe"><div class="summe-label">Deine Abo-Kosten</div><div class="summe-betrag">${euro(0)}</div>
        <div class="summe-label">Noch keine Abos eingetragen</div></div>
      <div class="karte leer"><img src="icons/icon-192.png" alt="" style="width:72px;border-radius:18px">
        <p><b>Los geht's!</b></p>
        <p>Trage dein erstes Abo ein – oder lass die App deine Abos <b>im Kontoauszug finden</b>.</p>
        <button class="knopf orange" data-aktion="finden">🔎 Abos automatisch finden</button>
        <button class="knopf hell" data-aktion="neu">+ Abo von Hand eintragen</button>
      </div>`;
    el.querySelector('[data-aktion=finden]').onclick = () => zeige('finden');
    el.querySelector('[data-aktion=neu]').onclick = () => oeffneFormular();
    return;
  }

  const monat = summeProMonat(daten.abos);
  const z = ZEITRAUM[ui.zeitraum];
  const andere = Object.entries(ZEITRAUM).filter(([k]) => k !== ui.zeitraum);

  // Kosten pro Kategorie
  const proKat = {};
  daten.abos.filter(zahlt).forEach((a) => { proKat[a.kat] = (proKat[a.kat] || 0) + proMonat(a); });
  const katListe = Object.entries(proKat).sort((a, b) => b[1] - a[1]);

  el.innerHTML = `
    <div class="summe">
      <div class="summe-label">Deine Abo-Kosten ${z.name}</div>
      <div class="summe-betrag">${euro(monat * z.faktor)}</div>
      <div class="summe-zeile">
        ${Object.entries(ZEITRAUM).map(([k, v]) => `<button class="chip-knopf ${k === ui.zeitraum ? 'aktiv' : ''}" data-zr="${k}">${v.name.replace('pro ', '')}</button>`).join('')}
      </div>
      <div class="summe-klein">
        ${andere.map(([, v]) => `<div><b>${euro(monat * v.faktor)}</b><span>${v.name}</span></div>`).join('')}
      </div>
    </div>
    ${hinweiseHTML(monat)}
    ${katListe.length ? `<div class="karte"><h2>Wofür geht das Geld weg?</h2>${diagrammHTML(katListe, monat)}</div>` : ''}
    ${termineHTML()}
    ${wennHTML()}
  `;
  el.querySelectorAll('[data-zr]').forEach((b) => b.onclick = () => { ui.zeitraum = b.dataset.zr; renderStart(); });
  el.querySelectorAll('[data-wenn]').forEach((b) => b.onchange = () => {
    b.checked ? ui.wennAus.delete(b.dataset.wenn) : ui.wennAus.add(b.dataset.wenn);
    renderStart();
  });
  el.querySelectorAll('[data-oeffne]').forEach((b) => b.onclick = () => oeffneFormular(b.dataset.oeffne));
  el.querySelectorAll('[data-kat]').forEach((b) => b.onclick = () => { ui.reiter = b.dataset.kat; zeige('abos'); });
}

function diagrammHTML(katListe, gesamt) {
  const r = 50, u = 2 * Math.PI * r;
  let pos = 0;
  const kreise = katListe.map(([id, wert], i) => {
    const anteil = gesamt ? wert / gesamt : 0;
    const s = `<circle r="${r}" cx="65" cy="65" fill="none" stroke="${FARBEN[i % FARBEN.length]}" stroke-width="22"
      stroke-dasharray="${anteil * u} ${u}" stroke-dashoffset="${-pos * u}" transform="rotate(-90 65 65)"/>`;
    pos += anteil;
    return s;
  }).join('');
  return `<div class="diagramm">
    <svg viewBox="0 0 130 130" width="130" height="130">${kreise}
      <text x="65" y="62" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">pro Monat</text>
      <text x="65" y="78" text-anchor="middle" font-size="14" font-weight="800" fill="currentColor">${esc(euro(gesamt))}</text>
    </svg>
    <div class="legende">${katListe.map(([id, wert], i) => `
      <div data-kat="${id}" style="cursor:pointer"><i style="background:${FARBEN[i % FARBEN.length]}"></i>${kat(id).icon} ${esc(kat(id).name)}
        <b>${euro(wert)}</b></div>`).join('')}
    </div></div>`;
}

function hinweiseHTML(monat) {
  const h = [];
  daten.abos.forEach((a) => {
    if (a.status === 'testphase' && a.testEnde) {
      const t = tageBis(zuDatum(a.testEnde));
      if (t >= 0 && t <= 14) h.push(`<div class="hinweis">⏰ <div><b>${esc(a.name)}</b>: Testphase endet ${t === 0 ? '<b>heute</b>' : t === 1 ? '<b>morgen</b>' : `in <b>${t} Tagen</b>`}. Danach ${euro(a.preis)} ${ZYKLEN[a.zyklus].name}. Jetzt kündigen oder behalten?</div></div>`);
      else if (t < 0) h.push(`<div class="hinweis">❓ <div><b>${esc(a.name)}</b>: Die Testphase ist abgelaufen. Hast du gekündigt? Sonst bitte auf „Bezahlt“ stellen.</div></div>`);
    }
  });
  daten.abos.filter(zahlt).forEach((a) => {
    const d = naechsteAbbuchung(a);
    if (d && tageBis(d) === 1) h.push(`<div class="hinweis blau">💳 <div>Morgen wird <b>${esc(a.name)}</b> abgebucht: ${euro(a.preis)}</div></div>`);
  });
  const bezahlt = daten.abos.filter(zahlt).sort((a, b) => proMonat(b) - proMonat(a));
  if (bezahlt.length >= 2 && monat > 0) {
    const top = bezahlt[0];
    h.push(`<div class="hinweis blau">🏆 <div>Teuerstes Abo: <b>${esc(top.name)}</b> – ${Math.round(proMonat(top) / monat * 100)} % deiner Abo-Kosten.</div></div>`);
  }
  const monatlichTeuer = bezahlt.filter((a) => a.zyklus === 'monat' && a.preis >= 8 && ['ki', 'streaming', 'musik', 'software', 'lesen'].includes(a.kat) && KATALOG.some((k) => k.name === a.name));
  if (monatlichTeuer.length) {
    const a = monatlichTeuer[0];
    h.push(`<div class="hinweis blau">💡 <div>Spar-Tipp: Viele Dienste wie <b>${esc(a.name)}</b> sind im Jahresabo günstiger (oft 2 Monate gratis ≈ ${euro(a.preis * 2)} gespart).</div></div>`);
  }
  return h.length ? `<div class="karte"><h2>Gut zu wissen</h2>${h.slice(0, 5).join('')}</div>` : '';
}

function termineHTML() {
  const liste = daten.abos
    .filter((a) => zahlt(a) || a.status === 'testphase')
    .map((a) => ({ a, d: a.status === 'testphase' && a.testEnde ? zuDatum(a.testEnde) : naechsteAbbuchung(a) }))
    .filter((x) => x.d && tageBis(x.d) >= 0 && tageBis(x.d) <= 31)
    .sort((x, y) => x.d - y.d);
  if (!liste.length) return '';
  const summe = liste.filter((x) => zahlt(x.a)).reduce((s, x) => s + x.a.preis, 0);
  return `<div class="karte"><h2>Die nächsten 30 Tage</h2>
    <p class="leise">Es werden voraussichtlich <b>${euro(summe)}</b> abgebucht.</p>
    ${liste.map(({ a, d }) => `<div class="termin" data-oeffne="${a.id}">
      <div class="termin-datum"><b>${d.getDate()}</b>${d.toLocaleDateString('de-DE', { month: 'short' })}</div>
      <div class="termin-name">${esc(a.name)}${a.status === 'testphase' ? ' <span class="status testphase">Test endet</span>' : ''}</div>
      <div class="termin-preis">${euro(a.preis)}</div></div>`).join('')}
  </div>`;
}

function wennHTML() {
  const bezahlt = daten.abos.filter(zahlt).sort((a, b) => proMonat(b) - proMonat(a));
  if (bezahlt.length < 2) return '';
  const spar = bezahlt.filter((a) => ui.wennAus.has(a.id)).reduce((s, a) => s + proMonat(a), 0);
  return `<div class="karte"><h2>Was wäre, wenn …?</h2>
    <p class="leise">Schalte Abos testweise aus und sieh, was du sparen würdest. (Ändert nichts an deinen Daten.)</p>
    ${bezahlt.map((a) => `<div class="wenn ${ui.wennAus.has(a.id) ? 'weg' : ''}">
      <span class="wenn-name">${esc(a.name)} <span class="leise">${euro(proMonat(a))}/Monat</span></span>
      <label class="schalter"><input type="checkbox" data-wenn="${a.id}" ${ui.wennAus.has(a.id) ? '' : 'checked'}><span></span></label>
    </div>`).join('')}
    ${spar > 0 ? `<p>Ersparnis: <span class="spar">${euro(spar * 12)}</span> pro Jahr (${euro(spar)} im Monat)</p>` : ''}
  </div>`;
}

// ---------- Abos mit Reitern ----------
$('#abo-suche').addEventListener('input', (e) => { ui.suche = e.target.value.toLowerCase(); renderAbos(); });
$('#abo-sort').addEventListener('change', (e) => { ui.sort = e.target.value; renderAbos(); });

function renderAbos() {
  const vorhanden = KATEGORIEN.filter((k) => daten.abos.some((a) => a.kat === k.id));
  if (ui.reiter !== 'alle' && !vorhanden.some((k) => k.id === ui.reiter)) ui.reiter = 'alle';
  const reiter = [{ id: 'alle', name: 'Alle', icon: '⭐' }, ...vorhanden];
  $('#reiter').innerHTML = reiter.map((k) => {
    const n = k.id === 'alle' ? daten.abos.length : daten.abos.filter((a) => a.kat === k.id).length;
    return `<button data-reiter="${k.id}" class="${ui.reiter === k.id ? 'aktiv' : ''}">${k.icon} ${esc(k.name)}<small>${n}</small></button>`;
  }).join('');
  $('#reiter').querySelectorAll('button').forEach((b) => b.onclick = () => { ui.reiter = b.dataset.reiter; renderAbos(); });

  let liste = daten.abos.filter((a) => ui.reiter === 'alle' || a.kat === ui.reiter);
  if (ui.suche) liste = liste.filter((a) => a.name.toLowerCase().includes(ui.suche) || (a.notiz || '').toLowerCase().includes(ui.suche));
  liste.sort((a, b) => {
    if (zahlt(a) !== zahlt(b)) return zahlt(a) ? -1 : 1;
    if (ui.sort === 'name') return a.name.localeCompare(b.name, 'de');
    if (ui.sort === 'datum') return (naechsteAbbuchung(a) || Infinity) - (naechsteAbbuchung(b) || Infinity);
    return proMonat(b) - proMonat(a);
  });

  const m = summeProMonat(liste);
  $('#abo-summe').innerHTML = daten.abos.length
    ? `${ui.reiter === 'alle' ? 'Alle Abos' : esc(kat(ui.reiter).name)}: <b>${euro(m)}</b> im Monat · <b>${euro(m * 12)}</b> im Jahr`
    : '';

  if (!daten.abos.length) {
    $('#abo-liste').innerHTML = `<div class="leer"><div class="gross">📋</div><p>Noch keine Abos. Tippe unten rechts auf <b>+</b>.</p></div>`;
    return;
  }
  $('#abo-liste').innerHTML = liste.map((a) => {
    const d = naechsteAbbuchung(a);
    const info = [kat(a.kat).icon + ' ' + kat(a.kat).name];
    if (zahlt(a) && d) info.push('nächste: ' + datumDE(d));
    if (a.status === 'testphase' && a.testEnde) info.push('Test bis ' + datumDE(zuDatum(a.testEnde)));
    return `<button class="abo ${zahlt(a) || a.status === 'testphase' || a.status === 'kostenlos' ? '' : 'aus'}" data-id="${a.id}">
      ${logo(a.name)}
      <div class="abo-mitte">
        <div class="abo-name">${esc(a.name)}</div>
        <div class="abo-info">${esc(info.join(' · '))}</div>
      </div>
      <div class="abo-rechts">
        <div class="abo-preis">${a.status === 'kostenlos' ? 'gratis' : euro(a.preis)}</div>
        <div class="abo-pm">${a.status === 'kostenlos' ? '' : esc(ZYKLEN[a.zyklus].name)}</div>
        ${a.status !== 'aktiv' ? `<span class="status ${a.status}">${STATUS[a.status].name}</span>` : ''}
      </div>
    </button>`;
  }).join('') || `<div class="leer">Nichts gefunden.</div>`;
  $('#abo-liste').querySelectorAll('.abo').forEach((b) => b.onclick = () => oeffneFormular(b.dataset.id));
}

// ---------- Formular ----------
function oeffneFormular(id, vorlage) {
  const alt = id ? daten.abos.find((a) => a.id === id) : null;
  const a = alt ? { ...alt } : Object.assign({
    name: '', kat: ui.reiter !== 'alle' ? ui.reiter : 'ki', preis: '', zyklus: 'monat', status: 'aktiv',
    naechste: '', testEnde: '', kuendigung: '', notiz: '',
  }, vorlage || {});
  let status = a.status;

  $('#blatt-inhalt').innerHTML = `
    <h2>${alt ? 'Abo bearbeiten' : 'Neues Abo'}</h2>
    <label class="feld">Name
      <input id="f-name" list="katalog-namen" value="${esc(a.name)}" placeholder="z. B. Netflix" autocomplete="off">
      <datalist id="katalog-namen">${KATALOG.map((k) => `<option value="${esc(k.name)}">`).join('')}</datalist>
    </label>
    <label class="feld">Kategorie
      <select id="f-kat">${KATEGORIEN.map((k) => `<option value="${k.id}" ${k.id === a.kat ? 'selected' : ''}>${k.icon} ${esc(k.name)}</option>`).join('')}</select>
    </label>
    <div class="feld" style="margin-bottom:12px"><span class="leise" style="font-weight:600">Status</span>
      <div class="status-wahl" id="f-status">${Object.entries(STATUS).map(([k, v]) => `<button type="button" data-s="${k}" class="${k === status ? 'aktiv' : ''}">${v.name}</button>`).join('')}</div>
    </div>
    <div class="zwei" id="f-preisblock">
      <label class="feld"><span id="f-preis-label">Preis in €</span>
        <input id="f-preis" type="number" inputmode="decimal" step="0.01" min="0" value="${a.preis === '' ? '' : esc(a.preis)}" placeholder="0,00">
      </label>
      <label class="feld">Wie oft?
        <select id="f-zyklus">${Object.entries(ZYKLEN).map(([k, v]) => `<option value="${k}" ${k === a.zyklus ? 'selected' : ''}>${v.name}</option>`).join('')}</select>
      </label>
    </div>
    <label class="feld" id="f-test-feld">Testphase endet am
      <input id="f-test" type="date" value="${esc(a.testEnde)}">
    </label>
    <label class="feld" id="f-naechste-feld">Nächste Abbuchung (für Erinnerungen)
      <input id="f-naechste" type="date" value="${esc(a.naechste)}">
    </label>
    <label class="feld">Kündigungsfrist (optional)
      <input id="f-kuendigung" value="${esc(a.kuendigung)}" placeholder="z. B. monatlich kündbar">
    </label>
    <label class="feld">Notiz (optional)
      <textarea id="f-notiz" rows="2" placeholder="z. B. über PayPal, Familien-Abo …">${esc(a.notiz)}</textarea>
    </label>
    ${alt && alt.verlauf?.length ? `<div class="feld"><span class="leise" style="font-weight:600">Verlauf</span>
      <ul class="verlauf">${alt.verlauf.slice().reverse().map((v) => `<li><span>${datumDE(zuDatum(v.datum))}</span>${esc(v.text)}</li>`).join('')}</ul></div>` : ''}
    <button class="knopf orange" id="f-speichern">💾 Speichern</button>
    ${alt ? `<button class="knopf rot" id="f-loeschen">🗑️ Löschen</button>` : ''}
    <button class="knopf hell" id="f-abbrechen">Abbrechen</button>
  `;

  const passeAn = () => {
    $('#f-test-feld').style.display = status === 'testphase' ? '' : 'none';
    $('#f-naechste-feld').style.display = status === 'aktiv' ? '' : 'none';
    $('#f-preisblock').style.display = status === 'kostenlos' ? 'none' : '';
    $('#f-preis-label').textContent = status === 'testphase' ? 'Preis danach in €' : 'Preis in €';
  };
  passeAn();
  document.querySelectorAll('#f-status button').forEach((b) => b.onclick = () => {
    status = b.dataset.s;
    document.querySelectorAll('#f-status button').forEach((x) => x.classList.toggle('aktiv', x === b));
    passeAn();
  });
  // Bekannten Dienst gewählt → Preis & Kategorie vorschlagen
  $('#f-name').addEventListener('change', () => {
    const k = KATALOG.find((x) => x.name.toLowerCase() === $('#f-name').value.trim().toLowerCase());
    if (k && !alt) {
      $('#f-kat').value = k.kat; $('#f-zyklus').value = k.zyklus;
      if (!$('#f-preis').value) $('#f-preis').value = k.preis;
      toast('Richtpreis eingesetzt – bitte prüfen');
    }
  });

  $('#f-speichern').onclick = () => {
    const name = $('#f-name').value.trim();
    if (!name) { toast('Bitte einen Namen eingeben'); $('#f-name').focus(); return; }
    const preis = status === 'kostenlos' ? 0 : Math.max(0, parseFloat(String($('#f-preis').value).replace(',', '.')) || 0);
    const neu = {
      id: alt ? alt.id : neueId(), name, kat: $('#f-kat').value, preis, zyklus: $('#f-zyklus').value, status,
      naechste: $('#f-naechste').value, testEnde: $('#f-test').value,
      kuendigung: $('#f-kuendigung').value.trim(), notiz: $('#f-notiz').value.trim(),
      verlauf: alt?.verlauf ? [...alt.verlauf] : [],
    };
    if (status === 'aktiv' && !neu.naechste) neu.naechste = '';
    const beschreibe = (x) => x.status === 'kostenlos' ? 'Kostenlos' : `${STATUS[x.status].name} (${euro(x.preis)} ${ZYKLEN[x.zyklus].name})`;
    if (!alt) neu.verlauf.push({ datum: zuText(heute()), text: 'Eingetragen: ' + beschreibe(neu) });
    else if (alt.status !== neu.status || alt.preis !== neu.preis || alt.zyklus !== neu.zyklus) {
      neu.verlauf.push({ datum: zuText(heute()), text: `${beschreibe(alt)} → ${beschreibe(neu)}` });
    }
    if (alt) Object.assign(alt, neu); else daten.abos.push(neu);
    speichern();
    schliesseBlatt();
    render();
    toast(alt ? 'Gespeichert ✔' : `${name} hinzugefügt ✔`);
  };
  if (alt) $('#f-loeschen').onclick = () => {
    if (!confirm(`„${alt.name}“ wirklich löschen?`)) return;
    daten.abos = daten.abos.filter((x) => x.id !== alt.id);
    speichern(); schliesseBlatt(); render(); toast('Gelöscht');
  };
  $('#f-abbrechen').onclick = schliesseBlatt;
  oeffneBlatt();
}

function oeffneBlatt() {
  $('#blatt').scrollTop = 0;
  $('#schleier').classList.add('offen');
  $('#blatt').classList.add('offen');
  history.pushState({ blatt: true }, '');
}
function schliesseBlatt(vonZurueck) {
  if (!$('#blatt').classList.contains('offen')) return;
  $('#schleier').classList.remove('offen');
  $('#blatt').classList.remove('offen');
  if (vonZurueck !== true && history.state?.blatt) history.back();
}
$('#schleier').addEventListener('click', schliesseBlatt);
window.addEventListener('popstate', () => schliesseBlatt(true));

// ---------- Finden: Katalog + Kontoauszug ----------
let katalogSuche = '';
function renderFinden() {
  const el = $('#view-finden');
  if (el.dataset.gebaut) { renderKatalog(); renderFunde(); return; }
  el.dataset.gebaut = '1';
  el.innerHTML = `
    <div class="karte">
      <h2>🏦 Abos im Kontoauszug finden</h2>
      <p>Die App liest deinen Kontoauszug und erkennt Abos <b>automatisch</b> – Netflix, Spotify, ChatGPT, Claude und viele mehr, dazu jede Zahlung, die regelmäßig wiederkommt.</p>
      <div class="hinweis blau">🔒 <div><b>Absolut privat:</b> Der Auszug wird nur hier auf dem Handy gelesen. Er wird <b>nicht gespeichert</b>
        und <b>nirgendwohin geschickt</b> – die App darf technisch gar keine Daten ins Internet senden. Gemerkt werden nur die Abos, die du übernimmst.</div></div>
      <ol class="schritte">
        <li>Lade in deiner Banking-App die <b>Kontoauszüge als PDF</b> herunter – am besten mehrere Monate (oder die Umsätze als CSV-Datei).</li>
        <li>Tippe hier auf „Kontoauszug wählen“ und nimm die Datei(en). Mehrere auf einmal gehen auch.</li>
        <li>Haken setzen, übernehmen – fertig. Danach kannst du die PDF-Datei in „Eigene Dateien → Downloads“ löschen.</li>
      </ol>
      <label class="knopf orange datei-knopf">📄 Kontoauszug wählen (PDF oder CSV)<input type="file" id="csv-datei" multiple accept=".pdf,.csv,.txt,application/pdf,text/csv,text/plain"></label>
      <div id="lese-status" class="leise" style="margin-top:8px"></div>
      <details style="margin-top:12px">
        <summary class="leise">Kein Export möglich? Text einfügen</summary>
        <p class="leise">Markiere in der Banking-App die Umsätze, kopiere sie und füge sie hier ein.</p>
        <textarea id="csv-text" rows="5" placeholder="z. B. 03.11.2026  NETFLIX.COM  -13,99"></textarea>
        <button class="knopf hell" id="csv-pruefen">Text durchsuchen</button>
      </details>
      <div id="funde"></div>
    </div>

    <div class="karte">
      <h2>📚 Aus Liste wählen</h2>
      <p class="leise">Über 70 bekannte Dienste mit Richtpreisen. Antippen zum Eintragen.</p>
      <input type="search" id="katalog-suche" placeholder="🔍 z. B. Netflix, Claude, Spotify …">
      <div class="katalog-liste" id="katalog-liste"></div>
    </div>

    <div class="karte">
      <h2>🧭 Wo verstecken sich weitere Abos?</h2>
      <p>Diese Listen zeigen dir, was gerade läuft:</p>
      <a class="knopf hell" href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener">▶️ Google-Play-Abos ansehen</a>
      <a class="knopf hell" href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener">🅿️ PayPal: Automatische Zahlungen</a>
      <a class="knopf hell" href="https://www.amazon.de/gp/your-account/order-history" target="_blank" rel="noopener">📦 Amazon: Abos & Mitgliedschaften</a>
      <p class="leise" style="margin-top:10px">Tipp: Such in deinem E-Mail-Postfach nach „Abonnement“, „Rechnung“, „Verlängerung“ oder „Receipt“.</p>
    </div>
  `;
  $('#katalog-suche').addEventListener('input', (e) => { katalogSuche = e.target.value.toLowerCase(); renderKatalog(); });
  $('#csv-datei').addEventListener('change', async (e) => {
    const dateien = [...e.target.files];
    e.target.value = '';
    if (!dateien.length) return;
    const status = $('#lese-status');
    let texte = [];
    try {
      for (const [i, datei] of dateien.entries()) {
        status.textContent = `⏳ Lese ${dateien.length > 1 ? `Datei ${i + 1} von ${dateien.length}` : 'Kontoauszug'} …`;
        const istPDF = datei.type === 'application/pdf' || /\.pdf$/i.test(datei.name);
        texte.push(istPDF ? await lesePDF(datei) : await leseDatei(datei));
      }
      status.textContent = '';
      // CSV-Dateien einzeln auswerten wäre genauer, aber alles zusammen findet wiederkehrende Zahlungen über Monate hinweg
      werteAus(texte.length === 1 ? texte[0] : texte.join('\n'));
    } catch (err) {
      status.textContent = '';
      toast(err.message === 'abgebrochen' ? 'Abgebrochen' : 'Die Datei konnte nicht gelesen werden');
      console.warn(err);
    } finally {
      texte = null;   // Inhalt sofort vergessen
    }
  });
  $('#csv-pruefen').onclick = () => { werteAus($('#csv-text').value); $('#csv-text').value = ''; };
  renderKatalog();
  renderFunde();
}

// PDF lesen – mit eingebautem pdf.js, komplett offline auf dem Handy
let pdfjs = null;
async function lesePDF(datei) {
  if (!pdfjs) {
    pdfjs = await import('./vendor/pdf.min.js');
    pdfjs.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
  }
  const aufgabe = pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()), isEvalSupported: false, disableFontFace: true, useSystemFonts: false });
  aufgabe.onPassword = (antwort, grund) => {
    const pw = prompt(grund === 2 ? 'Falsches Passwort. Bitte nochmal:' : 'Die PDF ist mit einem Passwort geschützt. Passwort:');
    if (pw === null) { aufgabe.destroy(); return; }
    antwort(pw);
  };
  let pdf;
  try { pdf = await aufgabe.promise; } catch (e) { if (aufgabe.destroyed) throw new Error('abgebrochen'); throw e; }
  const zeilen = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const seite = await pdf.getPage(n);
    const inhalt = await seite.getTextContent();
    // Textstücke nach Höhe (y) zu Zeilen zusammensetzen
    const proZeile = [];
    for (const t of inhalt.items) {
      if (!t.str || !t.str.trim()) continue;
      const y = t.transform[5], x = t.transform[4];
      let z = proZeile.find((r) => Math.abs(r.y - y) < 3);
      if (!z) proZeile.push(z = { y, teile: [] });
      z.teile.push({ x, s: t.str });
    }
    proZeile.sort((a, b) => b.y - a.y);
    for (const z of proZeile) zeilen.push(z.teile.sort((a, b) => a.x - b.x).map((t) => t.s).join('  '));
    seite.cleanup();
  }
  await aufgabe.destroy();   // PDF aus dem Speicher werfen
  return zeilen.join('\n');
}

async function leseDatei(datei) {
  const puffer = await datei.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(puffer);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(puffer); // ältere Bank-Exporte
  return text;
}

function istSchonDa(name) {
  const n = name.toLowerCase();
  return daten.abos.some((a) => a.name.toLowerCase() === n);
}

function renderKatalog() {
  const liste = $('#katalog-liste');
  if (!liste) return;
  const treffer = KATALOG.filter((k) => !katalogSuche || k.name.toLowerCase().includes(katalogSuche) || kat(k.kat).name.toLowerCase().includes(katalogSuche));
  liste.innerHTML = treffer.map((k) => `
    <button class="katalog-eintrag ${istSchonDa(k.name) ? 'drin' : ''}" data-name="${esc(k.name)}">
      ${logo(k.name)}<span class="k-name">${esc(k.name)}${istSchonDa(k.name) ? ' ✔' : ''}<br><span class="k-preis">${kat(k.kat).icon} ${esc(kat(k.kat).name)}</span></span>
      <span class="k-preis">ca. ${euro(k.preis)}<br>${esc(ZYKLEN[k.zyklus].name)}</span>
    </button>`).join('') || '<p class="leise">Nicht dabei? Trag es einfach mit + selbst ein.</p>';
  liste.querySelectorAll('button').forEach((b) => b.onclick = () => {
    const k = KATALOG.find((x) => x.name === b.dataset.name);
    oeffneFormular(null, { name: k.name, kat: k.kat, preis: k.preis, zyklus: k.zyklus });
  });
}

// --- Kontoauszug auswerten ---
function zerlegeCSV(text, trenner) {
  const zeilen = [];
  let zeile = [], feld = '', inZitat = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inZitat) {
      if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inZitat = false; }
      else feld += c;
    } else if (c === '"') inZitat = true;
    else if (c === trenner) { zeile.push(feld); feld = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      zeile.push(feld); zeilen.push(zeile); zeile = []; feld = '';
    } else feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  return zeilen.filter((z) => z.some((f) => f.trim()));
}

function leseBetrag(s) {
  if (s == null) return NaN;
  let t = String(s).replace(/[€\sEUR]/gi, '').replace(/−/g, '-');
  if (!t) return NaN;
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');   // 1.234,56
  else t = t.replace(/,/g, '');                                           // 1,234.56
  return parseFloat(t);
}
function leseDatum(s) {
  if (!s) return null;
  let m = String(s).match(/(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2}(?!\d))?/);
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) {
    if (m[3]) { let j = +m[3]; if (j < 100) j += 2000; return new Date(j, m[2] - 1, +m[1]); }
    // Ohne Jahr (z. B. „03.11.“): dieses Jahr, außer das Datum läge in der Zukunft
    const h = heute(); let d = new Date(h.getFullYear(), m[2] - 1, +m[1]);
    if (d - h > 3 * 86400000) d = new Date(h.getFullYear() - 1, m[2] - 1, +m[1]);
    return d;
  }
  m = String(s).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3]);
  m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], m[1] - 1, +m[2]);
  return null;
}

function leseUmsaetze(text) {
  const kopf = text.split(/\r?\n/).slice(0, 40).join('\n');
  const anzahl = (z) => (kopf.match(new RegExp(z === '\t' ? '\\t' : '\\' + z, 'g')) || []).length;
  const trenner = [';', ',', '\t'].sort((a, b) => anzahl(b) - anzahl(a))[0];
  const zeilen = anzahl(trenner) > 3 ? zerlegeCSV(text, trenner) : [];
  const umsaetze = [];

  const kopfIdx = zeilen.findIndex((z) => z.length > 2 && z.some((f) => /betrag|amount|umsatz|brutto/i.test(f)) && z.some((f) => /datum|date|buchung|valuta|tag/i.test(f)));
  if (kopfIdx >= 0) {
    const k = zeilen[kopfIdx].map((f) => f.trim().toLowerCase());
    const finde = (re) => k.findIndex((f) => re.test(f));
    let iBetrag = finde(/^betrag|betrag \(|^amount|^brutto|umsatz/);
    if (iBetrag < 0) iBetrag = finde(/betrag|amount|brutto/);
    let iDatum = finde(/buchungstag|buchungsdatum|^datum|^date|booking/);
    if (iDatum < 0) iDatum = finde(/datum|date|valuta/);
    const iName = finde(/empf|auftraggeber|zahlungspflichtige|^name|payee|partner|gegen|beguenstigt|begünstigt|merchant|händler/);
    const textSpalten = k.map((f, i) => i).filter((i) => /empf|auftrag|zweck|beschreib|name|payee|partner|zahlungs|text|details|merchant|gegen|begünstigt|beguenstigt|händler|titel|umsatzart/.test(k[i]) && i !== iBetrag && i !== iDatum);
    for (const z of zeilen.slice(kopfIdx + 1)) {
      const betrag = leseBetrag(z[iBetrag]);
      if (isNaN(betrag)) continue;
      umsaetze.push({
        datum: leseDatum(z[iDatum]),
        betrag,
        name: iName >= 0 ? (z[iName] || '').trim() : '',
        text: (textSpalten.length ? textSpalten.map((i) => z[i] || '') : z).join(' ').replace(/\s+/g, ' ').trim(),
      });
    }
  } else {
    umsaetze.push(...leseFreitext(text));
  }
  // Wenn es Minus-Beträge gibt, nur Ausgaben betrachten
  if (umsaetze.some((u) => u.betrag < 0)) return umsaetze.filter((u) => u.betrag < 0).map((u) => ({ ...u, betrag: -u.betrag }));
  return umsaetze.filter((u) => u.betrag > 0);
}

// Freier Text / PDF: Ein Umsatz beginnt mit einem Datum am Zeilenanfang.
// Folgezeilen ohne Datum (z. B. Empfänger, Verwendungszweck) gehören noch dazu.
const BETRAG_RE = /([-−+]\s?)?\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)(\s?[-−+](?![\d]))?|([-−+]\s?)?\d+\.\d{2}(?![\d.])/g;
const DATUM_ANFANG = /^\s*\d{1,2}\.\d{1,2}\.(?:\d{2,4})?(?!\d)/;
function leseFreitext(text) {
  const zeilen = text.split(/\r?\n/).map((z) => z.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const bloecke = [];
  let aktuell = null;
  for (const z of zeilen) {
    if (DATUM_ANFANG.test(z)) bloecke.push(aktuell = [z]);
    else if (aktuell && aktuell.length < 5) aktuell.push(z);
    else aktuell = null;
  }
  // Kein Datum am Zeilenanfang gefunden → jede Zeile einzeln
  if (!bloecke.length) zeilen.forEach((z) => bloecke.push([z]));
  const umsaetze = [];
  for (const b of bloecke) {
    if (/kontostand|saldo|übertrag|uebertrag|summe/i.test(b[0])) continue;
    let roh = null;
    for (const z of b) { const m = z.match(BETRAG_RE); if (m) { roh = m[m.length - 1]; break; } }
    if (!roh) continue;
    const minus = /[-−]/.test(roh);
    const betrag = Math.abs(leseBetrag(roh.replace(/[-−+\s]/g, ''))) * (minus ? -1 : 1);
    const datum = leseDatum(b[0]);
    const rest = b.join(' ').replace(roh, ' ').replace(/\d{1,2}\.\d{1,2}\.(\d{2,4})?|\d{4}-\d{2}-\d{2}/g, ' ').replace(BETRAG_RE, ' ').replace(/\s+/g, ' ').trim();
    if (!isNaN(betrag) && betrag !== 0 && rest) umsaetze.push({ datum, betrag, name: '', text: rest });
  }
  return umsaetze;
}

const FUELLWOERTER = new Set(('sepa lastschrift basislastschrift folgelastschrift erstlastschrift einzugsermächtigung kartenzahlung karte visa debit '
  + 'mastercard girocard ec gutschrift überweisung ueberweisung dauerauftrag einzug abbuchung mandat mandatsreferenz referenz gläubiger glaeubiger '
  + 'id end to end-to-end kundenreferenz ref datum uhr eur euro sagt danke vielen dank lastschr kauf zahlung payment online gmbh co kg ag se ltd inc '
  + 'sarl s.a.r.l. sa bv b.v. llc europe von für fuer the und und/oder nr').split(' '));

function schluessel(u) {
  const quelle = (u.name || u.text).toLowerCase().replace(/[^a-zäöüß ]/g, ' ');
  return quelle.split(/\s+/).filter((w) => w.length > 2 && !FUELLWOERTER.has(w)).slice(0, 2).join(' ');
}
function median(z) { const s = [...z].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; }
function rateZyklus(daten_) {
  const d = daten_.filter(Boolean).sort((a, b) => a - b);
  if (d.length < 2) return null;
  const abst = d.slice(1).map((x, i) => (x - d[i]) / 86400000);
  const m = median(abst);
  if (m <= 10) return 'woche';
  if (m <= 45) return 'monat';
  if (m <= 120) return 'quartal';
  if (m <= 220) return 'halbjahr';
  return 'jahr';
}

function werteAus(text) {
  if (!text || !text.trim()) { toast('Keine Daten gefunden'); return; }
  const umsaetze = leseUmsaetze(text);
  if (!umsaetze.length) { toast('Keine Umsätze erkannt – ist es die richtige Datei?'); return; }

  const gruppen = new Map();   // Katalog-Treffer
  const rest = [];
  for (const u of umsaetze) {
    const t = ' ' + u.text.toLowerCase() + ' ' + u.name.toLowerCase() + ' ';
    let bester = null, laenge = 0;
    for (const k of KATALOG) for (const w of k.such) if (t.includes(w) && w.length > laenge) { bester = k; laenge = w.length; }
    if (bester) {
      if (!gruppen.has(bester.name)) gruppen.set(bester.name, { k: bester, liste: [] });
      gruppen.get(bester.name).liste.push(u);
    } else rest.push(u);
  }

  const funde = [];
  for (const { k, liste } of gruppen.values()) {
    liste.sort((a, b) => (b.datum || 0) - (a.datum || 0));
    const letzter = liste[0];
    let zyklus = rateZyklus(liste.map((u) => u.datum)) || k.zyklus;
    const naechste = letzter.datum ? zuText(zyklusDazu(letzter.datum, zyklus)) : '';
    funde.push({ name: k.name, kat: k.kat, preis: Math.round(letzter.betrag * 100) / 100, zyklus, naechste,
      info: `${liste.length}× gefunden · zuletzt ${datumDE(letzter.datum)}`, an: !istSchonDa(k.name), bekannt: true });
  }

  // Unbekannte, aber regelmäßige Zahlungen
  const unbekannt = new Map();
  for (const u of rest) {
    const s = schluessel(u);
    if (!s) continue;
    if (!unbekannt.has(s)) unbekannt.set(s, []);
    unbekannt.get(s).push(u);
  }
  for (const [s, liste] of unbekannt) {
    if (liste.length < 2) continue;
    const mb = median(liste.map((u) => u.betrag));
    const gleich = liste.filter((u) => Math.abs(u.betrag - mb) <= Math.max(0.05, mb * 0.05));
    if (gleich.length < 2) continue;
    const zyklus = rateZyklus(gleich.map((u) => u.datum));
    if (!zyklus) continue;
    gleich.sort((a, b) => (b.datum || 0) - (a.datum || 0));
    const name = s.split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
    funde.push({ name, kat: 'sonstiges', preis: Math.round(gleich[0].betrag * 100) / 100, zyklus,
      naechste: gleich[0].datum ? zuText(zyklusDazu(gleich[0].datum, zyklus)) : '',
      info: `regelmäßig ${ZYKLEN[zyklus].name} · ${gleich.length}× · „${gleich[0].text.slice(0, 50)}“`, an: false, bekannt: false });
  }
  funde.sort((a, b) => (b.bekannt - a.bekannt) || (b.preis - a.preis));
  ui.funde = funde;
  renderFunde(umsaetze.length);
  window.scrollTo({ top: $('#funde').getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
}

function renderFunde(anzahlUmsaetze) {
  const el = $('#funde');
  if (!el) return;
  if (!ui.funde.length) {
    el.innerHTML = anzahlUmsaetze ? `<p class="hinweis blau">${anzahlUmsaetze} Umsätze gelesen, aber keine Abos erkannt. Probier mehrere Monate auf einmal.</p>` : '';
    return;
  }
  el.innerHTML = `<h2 style="margin-top:16px">Gefunden: ${ui.funde.length}</h2>
    <p class="leise">Haken setzen bei allem, was ein Abo ist. Danach kannst du jedes noch anpassen.</p>
    ${ui.funde.map((f, i) => `<label class="fund">
      <input type="checkbox" data-fund="${i}" ${f.an ? 'checked' : ''}>
      ${logo(f.name)}
      <span class="fund-text"><b>${esc(f.name)}${istSchonDa(f.name) ? ' <span class="status kostenlos">schon drin</span>' : ''}</b>
        <small>${euro(f.preis)} ${esc(ZYKLEN[f.zyklus].name)} · ${esc(kat(f.kat).name)}</small><br><small>${esc(f.info)}</small></span>
    </label>`).join('')}
    <button class="knopf orange" id="funde-uebernehmen">✔ Ausgewählte übernehmen</button>
    <button class="knopf hell" id="funde-verwerfen">🗑️ Ergebnisse verwerfen</button>`;
  $('#funde-verwerfen').onclick = () => { ui.funde = []; renderFunde(); toast('Alles verworfen – nichts gespeichert'); };
  el.querySelectorAll('[data-fund]').forEach((c) => c.onchange = () => { ui.funde[c.dataset.fund].an = c.checked; });
  $('#funde-uebernehmen').onclick = () => {
    const neu = ui.funde.filter((f) => f.an && !istSchonDa(f.name));
    neu.forEach((f) => daten.abos.push({
      id: neueId(), name: f.name, kat: f.kat, preis: f.preis, zyklus: f.zyklus, status: 'aktiv', naechste: f.naechste,
      testEnde: '', kuendigung: '', notiz: 'Aus Kontoauszug erkannt',
      verlauf: [{ datum: zuText(heute()), text: `Aus Kontoauszug übernommen (${euro(f.preis)} ${ZYKLEN[f.zyklus].name})` }],
    }));
    ui.funde = [];
    speichern();
    toast(neu.length ? `${neu.length} Abo${neu.length === 1 ? '' : 's'} übernommen ✔` : 'Nichts Neues ausgewählt');
    zeige(neu.length ? 'start' : 'finden');
  };
}

// ---------- Mehr ----------
function renderMehr() {
  const e = daten.einstellungen;
  const nativ = istNativ();
  $('#view-mehr').innerHTML = `
    <div class="karte">
      <h2>🔔 Erinnerungen</h2>
      ${nativ ? `
      <div class="schalter-zeile"><span>Vor Abbuchungen und vor Ende einer Testphase erinnern</span>
        <label class="schalter"><input type="checkbox" id="e-erinnern" ${e.erinnern !== false ? 'checked' : ''}><span></span></label></div>
      <label class="feld">Wie viele Tage vorher?
        <select id="e-tage">${[0, 1, 2, 3, 7].map((t) => `<option value="${t}" ${(e.tageVorher ?? 1) === t ? 'selected' : ''}>${t === 0 ? 'Am selben Tag' : t + ' Tag' + (t > 1 ? 'e' : '') + ' vorher'}</option>`).join('')}</select>
      </label>` : `<p class="leise">Benachrichtigungen gibt es in der Android-App (APK). In der Browser-Version siehst du Hinweise auf der Übersicht.</p>`}
    </div>
    <div class="karte">
      <h2>💾 Sicherung</h2>
      <p class="leise">Deine Daten liegen nur auf diesem Handy. Mach ab und zu eine Sicherung – z. B. bevor du das Handy wechselst.</p>
      <button class="knopf" id="m-export">⬆️ Sicherung erstellen</button>
      <label class="knopf hell datei-knopf">⬇️ Sicherung laden<input type="file" id="m-import" accept=".json,application/json"></label>
    </div>
    <div class="karte">
      <h2>📲 App</h2>
      <p>Version: <b>${APP_VERSION.startsWith('__') ? 'Entwicklung' : esc(APP_VERSION)}</b></p>
      <div id="update-info"></div>
      <a class="knopf hell" href="https://github.com/${REPO}/releases/latest/download/Abo-Uebersicht.apk" target="_blank" rel="noopener">⬇️ Neueste App herunterladen</a>
    </div>
    <div class="karte">
      <h2>⚠️ Zurücksetzen</h2>
      <button class="knopf rot" id="m-reset">Alle Abos löschen</button>
    </div>
    <p class="leise" style="text-align:center">🔒 Deine Daten bleiben auf diesem Handy.</p>
  `;
  if (nativ) {
    $('#e-erinnern').onchange = (ev) => { e.erinnern = ev.target.checked; speichern(); toast(e.erinnern ? 'Erinnerungen an' : 'Erinnerungen aus'); };
    $('#e-tage').onchange = (ev) => { e.tageVorher = +ev.target.value; speichern(); toast('Gespeichert ✔'); };
  }
  $('#m-export').onclick = exportiere;
  $('#m-import').onchange = async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await leseDatei(f));
      if (!Array.isArray(d.abos)) throw new Error();
      if (!confirm(`Sicherung mit ${d.abos.length} Abos laden? Die aktuellen Daten werden ersetzt.`)) return;
      daten = Object.assign({ einstellungen: {} }, d);
      speichern(); render(); toast('Sicherung geladen ✔');
    } catch { toast('Das ist keine gültige Sicherung'); }
    ev.target.value = '';
  };
  $('#m-reset').onclick = () => {
    if (!confirm('Wirklich ALLE Abos löschen? Das kann man nicht rückgängig machen.')) return;
    daten.abos = []; speichern(); render(); toast('Alles gelöscht');
  };
  pruefeUpdate();
}

async function exportiere() {
  const inhalt = JSON.stringify(daten, null, 2);
  const name = `abo-sicherung-${zuText(heute())}.json`;
  const P = window.Capacitor?.Plugins;
  if (istNativ() && P?.Filesystem && P?.Share) {
    try {
      const r = await P.Filesystem.writeFile({ path: name, data: inhalt, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: 'Abo-Sicherung', files: [r.uri], dialogTitle: 'Sicherung speichern oder senden' });
      return;
    } catch (err) { if (String(err).includes('cancel')) return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  a.download = name;
  a.click();
  toast('Sicherung gespeichert ✔');
}

let updateGeprueft = null;
async function pruefeUpdate() {
  if (APP_VERSION.startsWith('__') || !istNativ()) return;
  try {
    if (!updateGeprueft) {
      const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
      updateGeprueft = (await r.json()).tag_name || '';
    }
    const neu = updateGeprueft.replace(/^v/, '');
    const box = $('#update-info');
    if (box && neu && neu !== APP_VERSION) box.innerHTML = `<p class="hinweis">🆕 Version <b>${esc(neu)}</b> ist verfügbar! Lade sie unten herunter und installiere sie über die alte.</p>`;
  } catch { /* offline – egal */ }
}

// ---------- Benachrichtigungen (nur in der Android-App) ----------
function istNativ() { return !!window.Capacitor?.isNativePlatform?.(); }

async function planeErinnerungen() {
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (!istNativ() || !LN) return;
  try {
    const offen = await LN.getPending();
    if (offen.notifications.length) await LN.cancel({ notifications: offen.notifications.map((n) => ({ id: n.id })) });
    const e = daten.einstellungen;
    if (e.erinnern === false) return;
    const rechte = await LN.checkPermissions();
    if (rechte.display !== 'granted') {
      const r = await LN.requestPermissions();
      if (r.display !== 'granted') return;
    }
    const vorher = e.tageVorher ?? 1;
    const jetzt = new Date();
    const liste = [];
    let id = 1;
    for (const a of daten.abos) {
      if (zahlt(a)) {
        let d = naechsteAbbuchung(a);
        for (let i = 0; d && i < 3; i++, d = zyklusDazu(d, a.zyklus)) {
          const wann = new Date(d.getFullYear(), d.getMonth(), d.getDate() - vorher, 9, 0);
          if (wann > jetzt) liste.push({ id: id++, title: `💳 ${a.name}`, body: `${vorher === 0 ? 'Heute' : vorher === 1 ? 'Morgen' : `In ${vorher} Tagen`} werden ${euro(a.preis)} abgebucht.`, schedule: { at: wann, allowWhileIdle: true } });
        }
      }
      if (a.status === 'testphase' && a.testEnde) {
        const d = zuDatum(a.testEnde);
        const wann = new Date(d.getFullYear(), d.getMonth(), d.getDate() - Math.max(2, vorher), 9, 0);
        if (wann > jetzt) liste.push({ id: id++, title: `⏰ Testphase ${a.name} endet bald`, body: `Am ${datumDE(d)} endet die Testphase. Danach ${euro(a.preis)} ${ZYKLEN[a.zyklus].name}. Kündigen oder behalten?`, schedule: { at: wann, allowWhileIdle: true } });
      }
    }
    liste.sort((x, y) => x.schedule.at - y.schedule.at);
    if (liste.length) await LN.schedule({ notifications: liste.slice(0, 60) });
  } catch (err) { console.warn('Erinnerungen:', err); }
}

// ---------- Start ----------
if ('serviceWorker' in navigator && !istNativ() && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// Zurück-Taste von Android schließt zuerst das Formular
window.Capacitor?.Plugins?.App?.addListener?.('backButton', () => {
  if ($('#blatt').classList.contains('offen')) schliesseBlatt();
  else if (!$('#view-start').classList.contains('aktiv')) zeige('start');
  else window.Capacitor.Plugins.App.exitApp();
});
render();
planeErinnerungen();
