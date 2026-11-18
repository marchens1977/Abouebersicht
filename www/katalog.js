// Kategorien (Reiter) und Katalog bekannter Dienste.
// Preise sind Richtwerte (Deutschland, Stand Ende 2026) – in der App immer änderbar.

const KATEGORIEN = [
  { id: 'ki',        name: 'KI',                  icon: '🤖' },
  { id: 'streaming', name: 'Streaming',           icon: '🎬' },
  { id: 'musik',     name: 'Musik & Hörbücher',   icon: '🎧' },
  { id: 'software',  name: 'Software & Cloud',    icon: '☁️' },
  { id: 'gaming',    name: 'Gaming',              icon: '🎮' },
  { id: 'lesen',     name: 'Nachrichten & Lesen', icon: '📰' },
  { id: 'fitness',   name: 'Fitness & Gesundheit',icon: '💪' },
  { id: 'vertraege', name: 'Handy, Internet & Co.', icon: '📶' },
  { id: 'mobil',     name: 'Mobilität',           icon: '🚆' },
  { id: 'sonstiges', name: 'Sonstiges',           icon: '📦' },
];

const ZYKLEN = {
  woche:    { name: 'pro Woche',      kurz: 'Woche',   proMonat: 52 / 12, tage: 7 },
  monat:    { name: 'pro Monat',      kurz: 'Monat',   proMonat: 1,       tage: 30 },
  quartal:  { name: 'pro Quartal',    kurz: 'Quartal', proMonat: 1 / 3,   tage: 91 },
  halbjahr: { name: 'pro Halbjahr',   kurz: 'Halbjahr',proMonat: 1 / 6,   tage: 182 },
  jahr:     { name: 'pro Jahr',       kurz: 'Jahr',    proMonat: 1 / 12,  tage: 365 },
};

// such: Stichwörter, an denen der Dienst im Kontoauszug erkannt wird (klein geschrieben)
const KATALOG = [
  // KI
  { name: 'ChatGPT Plus', kat: 'ki', preis: 23.00, zyklus: 'monat', such: ['openai', 'chatgpt'] },
  { name: 'ChatGPT Pro', kat: 'ki', preis: 229.00, zyklus: 'monat', such: [] },
  { name: 'Claude Pro', kat: 'ki', preis: 21.42, zyklus: 'monat', such: ['anthropic', 'claude.ai', 'claude'] },
  { name: 'Claude Max', kat: 'ki', preis: 107.10, zyklus: 'monat', such: [] },
  { name: 'Google AI Pro (Gemini)', kat: 'ki', preis: 21.99, zyklus: 'monat', such: ['gemini', 'google one ai'] },
  { name: 'Perplexity Pro', kat: 'ki', preis: 22.00, zyklus: 'monat', such: ['perplexity'] },
  { name: 'Microsoft Copilot Pro', kat: 'ki', preis: 22.00, zyklus: 'monat', such: ['copilot pro'] },
  { name: 'GitHub Copilot', kat: 'ki', preis: 10.00, zyklus: 'monat', such: ['github'] },
  { name: 'Midjourney', kat: 'ki', preis: 10.00, zyklus: 'monat', such: ['midjourney'] },
  { name: 'Le Chat Pro (Mistral)', kat: 'ki', preis: 14.99, zyklus: 'monat', such: ['mistral'] },
  { name: 'ElevenLabs', kat: 'ki', preis: 5.00, zyklus: 'monat', such: ['elevenlabs', 'eleven labs'] },
  { name: 'Cursor Pro', kat: 'ki', preis: 20.00, zyklus: 'monat', such: ['cursor', 'anysphere'] },
  { name: 'SuperGrok', kat: 'ki', preis: 30.00, zyklus: 'monat', such: ['grok', 'x.ai'] },
  { name: 'DeepL Pro', kat: 'ki', preis: 8.99, zyklus: 'monat', such: ['deepl'] },

  // Streaming
  { name: 'Netflix', kat: 'streaming', preis: 13.99, zyklus: 'monat', such: ['netflix'] },
  { name: 'Disney+', kat: 'streaming', preis: 10.99, zyklus: 'monat', such: ['disney'] },
  { name: 'Amazon Prime', kat: 'streaming', preis: 8.99, zyklus: 'monat', such: ['prime video', 'amazon prime', 'amzn prime', 'primevideo'] },
  { name: 'Apple TV+', kat: 'streaming', preis: 9.99, zyklus: 'monat', such: ['apple tv'] },
  { name: 'YouTube Premium', kat: 'streaming', preis: 12.99, zyklus: 'monat', such: ['youtube premium', 'youtubepremium'] },
  { name: 'WOW', kat: 'streaming', preis: 9.99, zyklus: 'monat', such: ['wow tv', 'sky deutschland', 'wowtv'] },
  { name: 'Sky', kat: 'streaming', preis: 25.00, zyklus: 'monat', such: ['sky '] },
  { name: 'DAZN', kat: 'streaming', preis: 34.99, zyklus: 'monat', such: ['dazn'] },
  { name: 'Paramount+', kat: 'streaming', preis: 7.99, zyklus: 'monat', such: ['paramount'] },
  { name: 'RTL+', kat: 'streaming', preis: 6.99, zyklus: 'monat', such: ['rtl+', 'rtl plus', 'rtl interactive'] },
  { name: 'Joyn PLUS+', kat: 'streaming', preis: 6.99, zyklus: 'monat', such: ['joyn'] },
  { name: 'MagentaTV', kat: 'streaming', preis: 10.00, zyklus: 'monat', such: ['magentatv', 'magenta tv'] },
  { name: 'Crunchyroll', kat: 'streaming', preis: 6.99, zyklus: 'monat', such: ['crunchyroll'] },
  { name: 'MLB.TV', kat: 'streaming', preis: 149.99, zyklus: 'jahr', such: ['mlb'] },
  { name: 'Twitch', kat: 'streaming', preis: 4.99, zyklus: 'monat', such: ['twitch'] },

  // Musik & Hörbücher
  { name: 'Spotify Premium', kat: 'musik', preis: 12.99, zyklus: 'monat', such: ['spotify'] },
  { name: 'Apple Music', kat: 'musik', preis: 10.99, zyklus: 'monat', such: ['apple music'] },
  { name: 'Amazon Music Unlimited', kat: 'musik', preis: 10.99, zyklus: 'monat', such: ['amazon music', 'amzn music'] },
  { name: 'YouTube Music', kat: 'musik', preis: 10.99, zyklus: 'monat', such: ['youtube music'] },
  { name: 'Deezer', kat: 'musik', preis: 11.99, zyklus: 'monat', such: ['deezer'] },
  { name: 'Tidal', kat: 'musik', preis: 10.99, zyklus: 'monat', such: ['tidal'] },
  { name: 'Audible', kat: 'musik', preis: 9.95, zyklus: 'monat', such: ['audible'] },
  { name: 'BookBeat', kat: 'musik', preis: 14.99, zyklus: 'monat', such: ['bookbeat'] },

  // Software & Cloud
  { name: 'Google One', kat: 'software', preis: 1.99, zyklus: 'monat', such: ['google one', 'google storage'] },
  { name: 'Microsoft 365 Single', kat: 'software', preis: 99.00, zyklus: 'jahr', such: ['microsoft 365', 'microsoft*365', 'office 365'] },
  { name: 'Microsoft 365 Family', kat: 'software', preis: 129.00, zyklus: 'jahr', such: [] },
  { name: 'iCloud+', kat: 'software', preis: 0.99, zyklus: 'monat', such: ['icloud'] },
  { name: 'Dropbox Plus', kat: 'software', preis: 11.99, zyklus: 'monat', such: ['dropbox'] },
  { name: 'Adobe Creative Cloud', kat: 'software', preis: 66.45, zyklus: 'monat', such: ['adobe'] },
  { name: 'Canva Pro', kat: 'software', preis: 12.00, zyklus: 'monat', such: ['canva'] },
  { name: 'NordVPN', kat: 'software', preis: 59.88, zyklus: 'jahr', such: ['nordvpn', 'nord vpn'] },
  { name: '1Password', kat: 'software', preis: 2.99, zyklus: 'monat', such: ['1password'] },
  { name: 'Proton', kat: 'software', preis: 4.99, zyklus: 'monat', such: ['proton'] },
  { name: 'Notion', kat: 'software', preis: 10.00, zyklus: 'monat', such: ['notion'] },

  // Gaming
  { name: 'PlayStation Plus', kat: 'gaming', preis: 71.99, zyklus: 'jahr', such: ['playstation', 'sony interactive', 'psn'] },
  { name: 'Xbox Game Pass', kat: 'gaming', preis: 26.99, zyklus: 'monat', such: ['xbox', 'game pass'] },
  { name: 'Nintendo Switch Online', kat: 'gaming', preis: 19.99, zyklus: 'jahr', such: ['nintendo'] },
  { name: 'EA Play', kat: 'gaming', preis: 5.99, zyklus: 'monat', such: ['ea play', 'electronic arts'] },
  { name: 'Ubisoft+', kat: 'gaming', preis: 7.99, zyklus: 'monat', such: ['ubisoft'] },

  // Nachrichten & Lesen
  { name: 'Kindle Unlimited', kat: 'lesen', preis: 11.99, zyklus: 'monat', such: ['kindle'] },
  { name: 'Readly', kat: 'lesen', preis: 12.99, zyklus: 'monat', such: ['readly'] },
  { name: 'SPIEGEL+', kat: 'lesen', preis: 19.99, zyklus: 'monat', such: ['spiegel'] },
  { name: 'ZEIT Digital', kat: 'lesen', preis: 19.99, zyklus: 'monat', such: ['zeit verlag', 'zeit online', 'zeit digital'] },
  { name: 'BILDplus', kat: 'lesen', preis: 7.99, zyklus: 'monat', such: ['bildplus', 'bild plus'] },
  { name: 'Tageszeitung (digital)', kat: 'lesen', preis: 25.00, zyklus: 'monat', such: [] },

  // Fitness & Gesundheit
  { name: 'Fitnessstudio', kat: 'fitness', preis: 29.99, zyklus: 'monat', such: ['mcfit', 'fitx', 'clever fit', 'john reed', 'fitness first', 'easyfitness'] },
  { name: 'Urban Sports Club', kat: 'fitness', preis: 39.00, zyklus: 'monat', such: ['urban sports'] },
  { name: 'Strava', kat: 'fitness', preis: 59.99, zyklus: 'jahr', such: ['strava'] },
  { name: 'Freeletics', kat: 'fitness', preis: 79.99, zyklus: 'jahr', such: ['freeletics'] },

  // Handy, Internet & Co.
  { name: 'Handyvertrag', kat: 'vertraege', preis: 20.00, zyklus: 'monat', such: ['telekom', 'vodafone', 'o2 ', 'telefonica', 'congstar', '1&1', 'freenet', 'aldi talk', 'fraenk'] },
  { name: 'Internet / DSL', kat: 'vertraege', preis: 40.00, zyklus: 'monat', such: [] },
  { name: 'Rundfunkbeitrag', kat: 'vertraege', preis: 55.08, zyklus: 'quartal', such: ['rundfunk', 'beitragsservice'] },
  { name: 'Strom', kat: 'vertraege', preis: 60.00, zyklus: 'monat', such: [] },

  // Mobilität
  { name: 'Deutschlandticket', kat: 'mobil', preis: 63.00, zyklus: 'monat', such: ['deutschlandticket', 'd-ticket', 'deutschland-ticket'] },
  { name: 'BahnCard 25', kat: 'mobil', preis: 62.90, zyklus: 'jahr', such: ['bahncard'] },
  { name: 'ADAC', kat: 'mobil', preis: 94.00, zyklus: 'jahr', such: ['adac'] },
  { name: 'Carsharing', kat: 'mobil', preis: 9.00, zyklus: 'monat', such: ['share now', 'miles mobility', 'cambio'] },

  // Sonstiges
  { name: 'Patreon', kat: 'sonstiges', preis: 5.00, zyklus: 'monat', such: ['patreon'] },
  { name: 'Hello Fresh', kat: 'sonstiges', preis: 60.00, zyklus: 'woche', such: ['hellofresh', 'hello fresh'] },
  { name: 'Lotto-Abo', kat: 'sonstiges', preis: 10.00, zyklus: 'woche', such: ['lotto'] },
];
