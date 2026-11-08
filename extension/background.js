// Service worker: tutta la rete passa da qui (quotazioni, candele, streaming live).
importScripts("calendar.js"); // calendario economico USA
const Y = "https://query1.finance.yahoo.com";
// Le risposte di Yahoo non devono mai arrivare dalla cache del browser
const getJSON = (url, opt = {}) => fetch(url, { cache: "no-store", ...opt });
const chartURL = (sym, q) => `${Y}/v8/finance/chart/${encodeURIComponent(sym)}?${q}`;

// ---------- Ultimo valore registrato per ogni simbolo ----------
// { price, change, ychange, base, time, tt, live, off }
//  change  quanto si è mosso OGGI (fuso della borsa), pre/after market compresi;
//          se oggi non ha ancora scambiato: variazione dell'ultima seduta. Crypto: 24 ore, come Yahoo
//  base    prezzo di riferimento di "change" (serve solo se un tick arriva senza variazione)
//  ychange variazione % dell'ultima seduta conclusa prima di oggi (chiusura su chiusura)
//  off     fuso orario della borsa (secondi): definisce "oggi" e "ieri"
// Condiviso da tutte le schede e salvato in storage.session: una pagina nuova
// mostra subito l'ultimo valore registrato.
const last = {};
let saveT = null;
const ready = chrome.storage.session.get("last4").then(
  (v) => Object.assign(last, v.last4 || {}),
  () => {}
);
function persist() {
  if (saveT) return;
  saveT = setTimeout(() => {
    saveT = null;
    chrome.storage.session.set({ last4: last }).catch(() => {});
  }, 1500);
}
const LIVE_MS = 30000; // un tick live è considerato attuale per 30 s
const baseOf = (price, change) => (price != null && change != null ? price / (1 + change / 100) : undefined);

function setLast(sym, q, isLive) {
  const o = last[sym] || {}, now = Date.now();
  let r;
  if (isLive) {
    r = { ...o, price: q.price, time: now, tt: q.tt, live: now, xs: q.xs || null };
    if (q.change != null) r.change = q.change;                       // variazione inviata da Yahoo
    else if (o.base) r.change = ((q.price - o.base) / o.base) * 100; // tick senza variazione
    r.base = baseOf(r.price, r.change);
  } else {
    // risposta HTTP di ore prima dell'ultimo scambio noto: tengo i miei valori
    const stale = o.tt && q.tt && q.tt < o.tt - 3 * 3600000;
    const streaming = o.live && now - o.live < LIVE_MS;
    r = { ...o };
    if (!stale && !streaming) Object.assign(r, { price: q.price, change: q.change, time: q.time, tt: q.tt, live: 0, base: baseOf(q.price, q.change), xs: q.xs || null, vol: q.vol ?? null });
    if (q.off != null) r.off = q.off;
    if (q.ms) { r.ms = q.ms; r.msAt = now; }
    if (q.dl != null) r.dl = q.dl;
    if (q.ex) r.ex = q.ex;
    if (q.qs) r.qs = q.qs;
    if (q.cur) r.cur = q.cur;
    if (!stale && q.rp != null) { r.rp = q.rp; r.rc = q.rc; } // ultima seduta regolare (anche durante lo streaming)
    if (q.qt) r.qt = q.qt; // tipo (INDEX, EQUITY, ETF…): gli indici non hanno valuta
  }
  last[sym] = r;
  persist();
  return r;
}

// ---------- "Oggi" via HTTP: API quotazioni di Yahoo (la stessa del sito) ----------
// Richiede il "crumb" di sessione di Yahoo; se non disponibile uso il grafico v8.
let crumb = null, crumbAt = 0;
async function getCrumb(force) {
  if (crumb && !force) return crumb;
  if (!force && Date.now() - crumbAt < 60000) return null; // fallito da poco: non insisto
  crumbAt = Date.now();
  const ask = async () => {
    const r = await getJSON(`${Y}/v1/test/getcrumb`, { credentials: "include" });
    const t = r.ok ? (await r.text()).trim() : "";
    return t && t.length < 40 && !/[<{\s]/.test(t) ? t : null;
  };
  try {
    crumb = await ask();
    if (!crumb) {
      await fetch("https://fc.yahoo.com/", { credentials: "include", cache: "no-store" }).catch(() => {}); // imposta il cookie
      crumb = await ask();
    }
  } catch (_) { crumb = null; }
  return crumb;
}
// "Oggi" = quanto si è mosso il titolo OGGI (giorno di calendario nel fuso della borsa),
// pre e after market compresi, come il "fulldayChangePercent" di Yahoo.
// Se oggi non ha ancora scambiato (es. un indice prima dell'apertura) mostro l'ultima seduta.
const dayOf = (t, off) => Math.floor((t + off) / 86400);
async function fetchV7(symbols) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const c = await getCrumb(attempt > 0);
    if (!c) return null;
    const r = await getJSON(`${Y}/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}&crumb=${encodeURIComponent(c)}`, { credentials: "include" });
    if (r.status === 401 || r.status === 403) { crumb = null; continue; }
    if (!r.ok) return null;
    const j = await r.json(), now = Date.now() / 1000, out = {};
    for (const x of (j.quoteResponse && j.quoteResponse.result) || []) {
      if (x.regularMarketPrice == null) continue;
      const off = (x.gmtOffSetMilliseconds || 0) / 1000, today = dayOf(now, off), st = x.marketState || "";
      let price = x.regularMarketPrice, t = x.regularMarketTime || Math.floor(now), xs = null;
      if (st.startsWith("PRE") && x.preMarketPrice != null && x.preMarketTime && dayOf(x.preMarketTime, off) === today) {
        price = x.preMarketPrice; t = x.preMarketTime; xs = "pre";
      } else if (!st.startsWith("REGULAR") && x.postMarketPrice != null && x.postMarketTime && x.postMarketTime >= (x.regularMarketTime || 0)) {
        // after market dell'ultima seduta: resta l'ultimo prezzo anche a mercato chiuso (sera, notte, fine settimana)
        // finché non arriva il pre market o la seduta successiva
        price = x.postMarketPrice; t = x.postMarketTime; xs = "post";
      }
      const traded = dayOf(t, off) === today, pc = x.regularMarketPreviousClose;
      // oggi non ha ancora scambiato: variazione dell'ultima seduta, after market compreso se c'è stato
      const change = traded ? (x.fulldayChangePercent ?? x.regularMarketChangePercent ?? null)
        : xs === "post" && pc > 0 ? ((price - pc) / pc) * 100 : (x.regularMarketChangePercent ?? null);
      // dl: minuti di ritardo con cui Yahoo riceve i dati di quella borsa (0 = tempo reale)
      out[x.symbol] = { price, change, time: t * 1000, tt: t * 1000, off, xs, ms: st || null, dl: x.exchangeDataDelayedBy ?? null, ex: x.fullExchangeName || x.exchange || null, qs: x.quoteSourceName || null, cur: x.currency || null, qt: x.quoteType || null, vol: x.regularMarketVolume ?? null,
        rp: x.regularMarketPrice ?? null, rc: x.regularMarketChangePercent ?? null }; // ultima seduta regolare: chiusura e variazione // ms: stato del mercato (REGULAR = seduta aperta)
    }
    return out;
  }
  return null;
}
// Riserva senza crumb: grafico v8 (variazione rispetto a chartPreviousClose, senza pre/after market)
async function fetchV8(sym) {
  const r = await getJSON(chartURL(sym, "interval=1d&range=1d"));
  if (!r.ok) throw new Error(r.status);
  const m = (await r.json()).chart.result[0].meta;
  if (m.regularMarketPrice == null) throw new Error("no price");
  const t = m.regularMarketTime || Math.floor(Date.now() / 1000), off = m.gmtoffset || 0;
  const pc = m.chartPreviousClose ?? m.previousClose;
  const change = pc ? ((m.regularMarketPrice - pc) / pc) * 100 : null; // seduta odierna o, se chiuso, l'ultima
  return { price: m.regularMarketPrice, change, time: t * 1000, tt: t * 1000, off, dl: m.exchangeDataDelayedBy ?? null, ex: m.fullExchangeName || m.exchangeName || null, cur: m.currency || null, vol: m.regularMarketVolume ?? null };
}

// ---------- "Ieri" dalle candele giornaliere ----------
// Variazione chiusura-su-chiusura dell'ultima seduta conclusa PRIMA di oggi
// (oggi = giorno di calendario nel fuso della borsa).
const daily = {}; // sym -> { at, ts, cl }
async function fetchDaily(sym, force) {
  const d = daily[sym];
  if (d && !force && Date.now() - d.at < 20 * 60000) return d;
  const r = await getJSON(chartURL(sym, "interval=1d&range=1mo"));
  if (!r.ok) throw new Error(r.status);
  const res = (await r.json()).chart.result[0];
  const q = ((res.indicators.quote || [])[0]) || {};
  const ts = [], cl = [];
  (res.timestamp || []).forEach((t, i) => { if (q.close && q.close[i] != null) { ts.push(t); cl.push(q.close[i]); } });
  return (daily[sym] = { at: Date.now(), ts, cl });
}
function yesterday(d, off) {
  if (!d || off == null) return null;
  const today = dayOf(Date.now() / 1000, off);
  // +3 ore: le candele datate a mezzanotte locale (forex) a volte risultano alle 23:00 del giorno prima
  let i = -1;
  for (let j = d.ts.length - 1; j >= 0; j--) if (dayOf(d.ts[j] + 3 * 3600, off) < today) { i = j; break; }
  if (i < 1) return null;
  return ((d.cl[i] - d.cl[i - 1]) / d.cl[i - 1]) * 100;
}
async function attachYesterday(sym, off) {
  try {
    const y = yesterday(await fetchDaily(sym), off);
    if (y != null && last[sym]) { last[sym].ychange = y; persist(); }
  } catch (_) {}
}

// ---------- Richieste delle schede ----------
const fetched = {};
let inflight = null;
async function quotes(symbols) {
  await ready;
  const need = symbols.filter((s) => !fetched[s] || Date.now() - fetched[s] > 4000);
  if (need.length) {
    const run = (async () => {
      need.forEach((s) => (fetched[s] = Date.now()));
      let got = await fetchV7(need).catch(() => null);
      got = got || {};
      await Promise.all(need.filter((s) => !got[s]).map((s) => fetchV8(s).then((q) => (got[s] = q), () => {})));
      for (const s of need) if (got[s]) setLast(s, got[s], false);
      await Promise.all(need.map((s) => attachYesterday(s, last[s] && last[s].off)));
    })();
    inflight = run;
    await run;
  } else if (inflight) await inflight;
  return Object.fromEntries(symbols.map((s) => [s, last[s] || null]));
}

async function searchSymbols(q) {
  const r = await getJSON(`${Y}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`);
  const j = await r.json();
  return (j.quotes || [])
    .filter((x) => x.symbol)
    .map((x) => ({
      symbol: x.symbol,
      name: x.shortname || x.longname || x.symbol,
      type: x.quoteType,
      exch: x.exchDisp || ""
    }));
}

// ---------- Candele per il grafico ----------
// intervallo scelto -> [intervallo Yahoo, secondi, giorni massimi disponibili (0 = nessun limite)]
const IV = {
  "1m": ["1m", 60, 7], "5m": ["5m", 300, 59], "15m": ["15m", 900, 59],
  "30m": ["30m", 1800, 59], "45m": ["15m", 2700, 59], "1h": ["60m", 3600, 729],
  "1d": ["1d", 86400, 0], "1wk": ["1wk", 604800, 0], "1mo": ["1mo", 2592000, 0]
};
const IV_NAME = { "1m": "1 minuto", "5m": "5 minuti", "15m": "15 minuti", "30m": "30 minuti", "45m": "45 minuti", "1h": "1 ora" };
const RANGE_DAYS = { "1d": 1, "5d": 5, "1mo": 31, "3mo": 92, "6mo": 183, "1y": 366, "2y": 731, "5y": 1827, "10y": 3653, max: Infinity };
// Scarico un periodo più lungo di quello scelto: il grafico mostra il periodo scelto,
// ma con le candele dei giorni prima (all'apertura della borsa non resta "vuoto").
const EXT_RANGE = { "1d": "5d", "5d": "1mo", "1mo": "3mo", "6mo": "1y", ytd: "2y", "1y": "2y", "5y": "10y", max: "max" };
// Andamento storico: molto più storico del periodo scelto, così ingrandendo o scorrendo il grafico continua
const HIST_RANGE = { "1d": "5d", "5d": "1mo", "1mo": "6mo", "6mo": "10y", ytd: "10y", "1y": "10y", "5y": "max", max: "max" };

// Le candele da 45 minuti non esistono su Yahoo: le costruisco da quelle da 15.
function aggregate(bars, sec, off) {
  const out = [];
  let dayKey = null, anchor = 0;
  for (const x of bars) {
    const d = Math.floor((x.t + off) / 86400);
    if (d !== dayKey) { dayKey = d; anchor = x.t; }
    const t = anchor + Math.floor((x.t - anchor) / sec) * sec;
    const o = out[out.length - 1];
    if (o && o.t === t) { o.h = Math.max(o.h, x.h); o.l = Math.min(o.l, x.l); o.c = x.c; o.v += x.v; }
    else out.push({ ...x, t });
  }
  return out;
}

// candele raggruppate per settimana (da lunedì) o per mese di calendario
function calAgg(bars, unit, off) {
  const out = [];
  let key = null;
  for (const x of bars) {
    const d = new Date((x.t + off) * 1000);
    const k = unit === "1mo" ? d.getUTCFullYear() * 12 + d.getUTCMonth() : Math.floor(((x.t + off) / 86400 + 3) / 7); // giorni dal 1970 (giovedì) + 3: le settimane partono di lunedì
    const o = out[out.length - 1];
    if (o && k === key) { o.h = Math.max(o.h, x.h); o.l = Math.min(o.l, x.l); o.c = x.c; o.v += x.v; }
    else { out.push({ ...x }); key = k; }
  }
  return out;
}
// le candele appena scaricate valgono 20 s: il grafico preparato al passaggio del mouse si apre subito,
// e due richieste uguali nello stesso momento ne fanno una sola
const cCache = new Map();
function candlesC(sym, range, iv, exact, fresh) {
  const k = `${sym}|${range}|${iv}|${exact || 0}`, c = cCache.get(k);
  if (c && (!fresh || c.pending) && Date.now() - c.at < 20000) return c.p;
  const e = { at: Date.now(), pending: true };
  e.p = candles(sym, range, iv, exact).finally(() => { e.pending = false; });
  e.p.catch(() => cCache.delete(k));
  cCache.delete(k); cCache.set(k, e);
  while (cCache.size > 30) cCache.delete(cCache.keys().next().value);
  return e.p;
}
async function candles(sym, range, iv, exact) {
  const [yi, sec, lim] = IV[iv] || IV["1d"];
  const ytdDays = (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 864e5 + 1;
  const wantDays = range === "ytd" ? ytdDays : RANGE_DAYS[range] || 1;
  const ext = exact === "h" ? HIST_RANGE[range] || range : exact ? range : EXT_RANGE[range] || range, extDays = RANGE_DAYS[ext] || wantDays;
  let q = `range=${ext}`, note = "";
  if (lim && extDays > lim) {
    const now = Math.floor(Date.now() / 1000);
    q = `period1=${now - lim * 86400}&period2=${now}`;
    if (wantDays > lim) note = `Con candele da ${IV_NAME[iv]} Yahoo fornisce solo gli ultimi ${lim + 1} giorni.`;
  }
  // andamento a 5 anni: un punto a settimana. Con range=max Yahoo passa da solo a un punto al mese,
  // quindi chiedo un intervallo di date preciso (10 anni, per poter scorrere indietro)
  if (exact === "h" && iv === "1wk") { const now = Math.floor(Date.now() / 1000); q = `period1=${now - 3653 * 86400}&period2=${now}`; }
  // candele settimanali o mensili su "tutto": con range=max Yahoo sceglie da solo la granularità (per i titoli
  // quotati da poco dà candele settimanali o giornaliere), quindi chiedo le date esatte
  else if ((yi === "1mo" || yi === "1wk") && ext === "max") q = `period1=0&period2=${Math.floor(Date.now() / 1000)}`;
  let r = await getJSON(`${Y}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${yi}&${q}&includePrePost=false`);
  let j = await r.json().catch(() => null);
  if (!(j && j.chart && j.chart.result && j.chart.result[0]) && q.startsWith("period1=0")) { // date rifiutate: ripiego su "tutto" (poi raggruppo io)
    r = await getJSON(`${Y}/v8/finance/chart/${encodeURIComponent(sym)}?interval=${yi}&range=max&includePrePost=false`);
    j = await r.json().catch(() => null);
  }
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) throw new Error((j && j.chart && j.chart.error && j.chart.error.description) || `HTTP ${r.status}`);
  const ts = res.timestamp || [], qd = ((res.indicators.quote || [])[0]) || {};
  let bars = [];
  for (let i = 0; i < ts.length; i++) {
    const o = qd.open && qd.open[i], h = qd.high && qd.high[i], l = qd.low && qd.low[i], c = qd.close && qd.close[i];
    if (o == null || h == null || l == null || c == null) continue;
    const b = { t: ts[i], o, h, l, c, v: (qd.volume && qd.volume[i]) || 0 };
    const p = bars[bars.length - 1];
    if (p && b.t <= p.t) { p.h = Math.max(p.h, h); p.l = Math.min(p.l, l); p.c = c; p.v += b.v; } // doppioni
    else bars.push(b);
  }
  if (iv === "45m") bars = aggregate(bars, sec, res.meta.gmtoffset || 0);
  // se comunque arrivano candele più fitte di quelle chieste, le raggruppo io: ogni punto è una settimana o un mese
  if ((yi === "1mo" || yi === "1wk") && (res.meta.dataGranularity !== yi || bars.some((b, i) => i && b.t - bars[i - 1].t < (yi === "1mo" ? 20 : 5) * 86400))) bars = calAgg(bars, yi, res.meta.gmtoffset || 0);
  // L'ultima candela intraday a volte ha l'orario dell'ultimo scambio: la riallineo alla griglia
  if (sec < 86400 && bars.length > 1) {
    const a = bars[bars.length - 2], b = bars[bars.length - 1];
    const t = a.t + Math.floor((b.t - a.t) / sec) * sec;
    if (t === a.t) { a.h = Math.max(a.h, b.h); a.l = Math.min(a.l, b.l); a.c = b.c; a.v += b.v; bars.pop(); }
    else if (t !== b.t) {
      // è solo una "fotografia" del prezzo attuale, non la candela vera del minuto: la sua
      // apertura non è nota, la stimo con la chiusura precedente (Yahoo la correggerà)
      b.t = t; b.o = a.c; b.h = Math.max(b.h, a.c); b.l = Math.min(b.l, a.c); b.e = 1;
    }
  }
  // volume scambiato finora oggi (seduta regolare): serve a stimare quello della candela in corso
  const dv = res.meta && res.meta.regularMarketVolume > 0 ? res.meta.regularMarketVolume : null;
  return { bars, sec, note, dv, dvt: (res.meta && res.meta.regularMarketTime) || null };
}

// ---------- Loghi dei titoli ----------
// Li scarico qui (le pagine possono bloccare le immagini esterne) e li passo come data URL.
// Cache: 7 giorni se trovato, 1 giorno se nessuna fonte lo ha (così non riprovo di continuo).
const LOGO_OK = 7 * 864e5, LOGO_NO = 864e5, LOGO_MAX = 700;
let logoMem = null;
const logoBusy = new Map();
async function logoStore() {
  if (!logoMem) logoMem = (await chrome.storage.local.get("logos")).logos || {};
  return logoMem;
}
function toDataURL(buf, type) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(s)}`;
}
async function fetchLogo(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { credentials: "omit", cache: "force-cache" });
      if (!r.ok) continue;
      const type = (r.headers.get("content-type") || "").split(";")[0].trim();
      if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(type)) continue;
      const buf = await r.arrayBuffer();
      if (buf.byteLength < 100 || buf.byteLength > 150000) continue; // vuoto o troppo grande
      let tile = null;
      try { tile = await tileLogo(buf, type); } catch (_) {}
      return tile || toDataURL(buf, type);
    } catch (_) {}
  }
  return null;
}
// Ogni logo diventa un riquadro quadrato, come le icone delle app (gli angoli arrotondati li fa la pagina):
// - logo di un colore solo: disegnato in bianco (in nero se il colore è chiaro) su un fondo di quel colore;
// - logo di più colori: com'è, su fondo bianco;
// - logo già pieno (riquadro o tondo, come le crypto): allargato a tutto il riquadro, fondo del suo colore;
// - bandiere e immagini piene fino al bordo: ritagliate al centro.
const LOGO_V = 2, TILE = 96;
async function tileLogo(buf, type) {
  if (typeof OffscreenCanvas !== "function" || typeof createImageBitmap !== "function" || !/^image\/(png|jpeg|webp|gif)$/.test(type)) return null;
  const bmp = await createImageBitmap(new Blob([buf], { type }));
  const k = Math.min(1, 256 / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const src = new OffscreenCanvas(w, h), sx = src.getContext("2d", { willReadFrequently: true });
  sx.drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  const im = sx.getImageData(0, 0, w, h), p = im.data;
  const white = (i) => p[i] > 234 && p[i + 1] > 234 && p[i + 2] > 234;
  let bt = 0, bw = 0, bn = 0;
  const edge = (x, y) => { const i = (y * w + x) * 4; bn++; if (p[i + 3] < 40) bt++; else if (white(i)) bw++; };
  for (let x = 0; x < w; x++) { edge(x, 0); if (h > 1) edge(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { edge(0, y); if (w > 1) edge(w - 1, y); }
  const out = new OffscreenCanvas(TILE, TILE), o = out.getContext("2d");
  const done = async () => toDataURL(await (await out.convertToBlob({ type: "image/png" })).arrayBuffer(), "image/png");
  if (bt / bn <= .5 && bw / bn <= .5) { // pieno fino al bordo (bandiera, logo già su un fondo): ritaglio al centro
    const s = Math.min(w, h);
    o.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, 0, 0, TILE, TILE);
    return done();
  }
  if (bw / bn > .5) { // fondo bianco: lo tolgo partendo dal bordo, così il bianco dentro al disegno resta
    const seen = new Uint8Array(w * h), q = [];
    const push = (x, y) => { const j = y * w + x; if (!seen[j] && white(j * 4)) { seen[j] = 1; q.push(j); } };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (q.length) {
      const j = q.pop(), x = j % w, y = (j - x) / w;
      p[j * 4 + 3] = 0;
      if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
    }
  }
  // il disegno: dove sta, quanto è pieno, di che colori è
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0, wn = 0, cn = 0;
  const hist = new Map();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, a = p[i + 3];
    if (a < 40) continue;
    n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    const r = p[i], g = p[i + 1], b = p[i + 2], mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    if (white(i)) { wn++; continue; }
    if (mn > 200 && mx - mn < 40) continue; // grigio chiarissimo dei bordi sfumati
    const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5), e = hist.get(key) || [0, 0, 0, 0], f = a / 255;
    e[0] += r * f; e[1] += g * f; e[2] += b * f; e[3] += f; hist.set(key, e); cn++;
  }
  sx.putImageData(im, 0, 0);
  if (n < 12) return null;
  const bwd = x1 - x0 + 1, bht = y1 - y0 + 1;
  let top = null;
  for (const e of hist.values()) if (!top || e[3] > top[3]) top = e;
  let dom = top ? [top[0] / top[3], top[1] / top[3], top[2] / top[3]] : [255, 255, 255];
  let same = 0, tot = 0;
  const acc = [0, 0, 0];
  for (const e of hist.values()) {
    tot += e[3];
    if (Math.hypot(e[0] / e[3] - dom[0], e[1] / e[3] - dom[1], e[2] / e[3] - dom[2]) < 60) { same += e[3]; acc[0] += e[0]; acc[1] += e[1]; acc[2] += e[2]; }
  }
  if (same) dom = acc.map((v) => v / same);
  const css = (c) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;
  const lum = (c) => { const l = c.map((v) => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * l[0] + .7152 * l[1] + .0722 * l[2]; };
  // disegno contenuto nel riquadro con un margine (le scritte larghe un po' più larghe)
  const place = () => {
    const ar = bwd / bht, bx = ar >= 1.8 ? .84 : .68, by = ar >= 1.8 ? .52 : .68;
    const s = Math.min((TILE * bx) / bwd, (TILE * by) / bht), dw = bwd * s, dh = bht * s;
    return [(TILE - dw) / 2, (TILE - dh) / 2, dw, dh];
  };
  if (bwd > .8 * w && bht > .8 * h && n / (bwd * bht) > .7 && cn) { // già pieno (riquadro o tondo)
    o.fillStyle = css(dom); o.fillRect(0, 0, TILE, TILE);
    const s = TILE / Math.max(bwd, bht);
    o.drawImage(src, x0, y0, bwd, bht, (TILE - bwd * s) / 2, (TILE - bht * s) / 2, bwd * s, bht * s);
    return done();
  }
  if (cn < n * .15) { // disegno bianco (pensato per fondi scuri)
    o.fillStyle = "#17181c"; o.fillRect(0, 0, TILE, TILE);
    o.drawImage(src, x0, y0, bwd, bht, ...place());
    return done();
  }
  if (tot && same / tot > .8 && wn < n * .2) { // un colore solo: in bianco (o nero) sul suo colore
    const ink = lum(dom) > .45 ? [18, 19, 22] : [255, 255, 255], md = Math.min(...dom);
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const f = Math.max(0, Math.min(1, (255 - Math.min(p[i], p[i + 1], p[i + 2])) / Math.max(40, 255 - md)));
      p[i + 3] = Math.round(p[i + 3] * (white(i) ? 0 : f)); p[i] = ink[0]; p[i + 1] = ink[1]; p[i + 2] = ink[2];
    }
    sx.putImageData(im, 0, 0);
    o.fillStyle = css(dom); o.fillRect(0, 0, TILE, TILE);
    o.drawImage(src, x0, y0, bwd, bht, ...place());
    return done();
  }
  // più colori: com'è, su bianco (su scuro se ha parti bianche)
  o.fillStyle = wn > n * .25 ? "#17181c" : "#fff"; o.fillRect(0, 0, TILE, TILE);
  o.drawImage(src, x0, y0, bwd, bht, ...place());
  return done();
}
async function logos(items) {
  const L = await logoStore(), now = Date.now(), out = {};
  let changed = false;
  await Promise.all(items.slice(0, 60).map(async ({ s, urls }) => {
    const e = L[s];
    if (e && e.v === LOGO_V && now - e.t < (e.d ? LOGO_OK : LOGO_NO)) { out[s] = e.d; return; }
    if (!Array.isArray(urls) || !urls.length) { out[s] = null; return; }
    if (!logoBusy.has(s)) logoBusy.set(s, fetchLogo(urls.slice(0, 3)).finally(() => logoBusy.delete(s)));
    const d = await logoBusy.get(s);
    L[s] = { d, t: Date.now(), v: LOGO_V }; out[s] = d; changed = true;
  }));
  if (changed) {
    const keys = Object.keys(L);
    if (keys.length > LOGO_MAX) keys.sort((a, b) => L[a].t - L[b].t).slice(0, keys.length - LOGO_MAX).forEach((k) => delete L[k]);
    chrome.storage.local.set({ logos: L });
  }
  return out;
}

// ---------- Notizie: solo quelle importanti ----------
// Tre fonti, tutte filtrate:
//  1. notizie della ricerca di Yahoo Finance (hanno l'editore): tengo solo agenzie e testate principali
//     e i comunicati ufficiali delle aziende (Business Wire, GlobeNewswire, PR Newswire…);
//  2. feed RSS di Yahoo Finance: solo gli articoli che portano a quei siti;
//  3. moduli 8-K depositati alla SEC (società USA): i fatti rilevanti che l'azienda deve comunicare.
// Scarto i titoli "acchiappa-clic" (classifiche, consigli d'acquisto, domande). Ogni notizia ha un tag
// (risultati, accordo, dirigenti…) e un grado da 1 a 3, ricavati dal titolo o dal tipo di 8-K.
// nsub  (scritto dal widget)       { simbolo: quando hai attivato gli avvisi (ms) }
// nseen (scritto solo da qui)      { simbolo: ultima notizia già vista o avvisata (ms) }
// nnew  (scritto solo da qui)      { simbolo: { n: notizie nuove, t, title, link } }
const NEWS = {}; // simbolo -> { at, items }
const NEWS_TTL = 60000;
const unxml = (x) => String(x || "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&").replace(/<[^>]*>/g, "").trim();
const okLink = (u) => /^https?:\/\//i.test(u || "") ? u : "";
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return ""; } };
// editori ammessi: agenzie e testate principali; comunicati stampa (wire) delle aziende
const NEWS_PUB = ["reuters", "associated press", "the associated press", "ap", "bloomberg", "the wall street journal", "wall street journal", "wsj", "dow jones",
  "cnbc", "barron's", "barrons.com", "marketwatch", "financial times", "the new york times", "new york times", "axios", "fortune", "yahoo finance", "nikkei asia", "bbc", "cnn business",
  "investor's business daily", "the economist", "the guardian", "politico", "techcrunch", "the information", "the verge"];
const WIRE_PUB = ["business wire", "businesswire", "globenewswire", "globe newswire", "pr newswire", "prnewswire", "accesswire", "access newswire", "newsfile", "canada newswire", "cnw group", "eqs newswire"];
const NEWS_HOST = { "reuters.com": 0, "apnews.com": 0, "bloomberg.com": 0, "wsj.com": 0, "cnbc.com": 0, "barrons.com": 0, "marketwatch.com": 0, "ft.com": 0, "nytimes.com": 0, "axios.com": 0, "fortune.com": 0,
  "investors.com": 0, "economist.com": 0, "theguardian.com": 0, "politico.com": 0, "techcrunch.com": 0, "theinformation.com": 0, "theverge.com": 0, "bbc.com": 0, "bbc.co.uk": 0, "cnn.com": 0, "asia.nikkei.com": 0,
  "businesswire.com": 1, "globenewswire.com": 1, "prnewswire.com": 1, "accessnewswire.com": 1, "accesswire.com": 1, "newsfilecorp.com": 1 };
const HOST_PUB = { "reuters.com": "Reuters", "apnews.com": "Associated Press", "bloomberg.com": "Bloomberg", "wsj.com": "The Wall Street Journal", "cnbc.com": "CNBC", "barrons.com": "Barron's",
  "marketwatch.com": "MarketWatch", "ft.com": "Financial Times", "nytimes.com": "The New York Times", "axios.com": "Axios", "fortune.com": "Fortune", "businesswire.com": "Business Wire",
  "investors.com": "Investor's Business Daily", "economist.com": "The Economist", "theguardian.com": "The Guardian", "politico.com": "Politico", "techcrunch.com": "TechCrunch",
  "theinformation.com": "The Information", "theverge.com": "The Verge", "bbc.com": "BBC", "bbc.co.uk": "BBC", "cnn.com": "CNN", "asia.nikkei.com": "Nikkei Asia",
  "globenewswire.com": "GlobeNewswire", "prnewswire.com": "PR Newswire", "accessnewswire.com": "ACCESS Newswire", "accesswire.com": "ACCESS Newswire", "newsfilecorp.com": "Newsfile" };
const pubKind = (p) => { const x = String(p || "").trim().toLowerCase(); return WIRE_PUB.includes(x) ? "pr" : NEWS_PUB.includes(x) ? "news" : null; };
// titoli da scartare: classifiche, consigli d'acquisto, previsioni a effetto, domande
const JUNK = /\b(stocks? to (?:watch|buy|own|consider|hold)|should you|is it (?:too late|time)|buy (?:now|the dip|before)|top \d+|\d+ (?:stocks?|reasons|things|ways)|best (?:\w+ )?stocks?|millionaire|retire(?:ment)?|could (?:soar|double|triple|skyrocket|make you)|prediction|forever|no-brainer|smartest|undervalued|bargain|here'?s why|what to know|things to know|vs\.? |wall street (?:thinks|says|expects)|(?:is|are) .* a buy|growth stocks?|dividend stocks?|ai stocks?)\b/i;
const junk = (t) => JUNK.test(t) || /\?\s*$/.test(t) || /^(why|how)\b/i.test(t) || /\b(stock market today|markets? (?:wrap|today)|morning (?:brief|report))\b/i.test(t);
// tag e grado (1-3) dal titolo; il primo che corrisponde vale
const NEWS_RULES = [
  ["bk", 3, /\b(bankruptcy|chapter 11|insolven)/i],
  ["cap", 2, /\b(dividend|buyback|repurchase|stock split|share split)/i],
  ["cal", 1, /\b((?:to|will) (?:report|announce|release|host)\b.*\b(?:results|earnings)|(?:date|conference call|webcast)\b.*\b(?:results|earnings)|earnings (?:call|conference|date))/i],
  ["res", 3, /\b(earnings|results|quarterly|revenue|profit|eps|beats? (?:estimates|expectations)|miss(?:es)? (?:estimates|expectations)|q[1-4] (?:20\d\d|fiscal|fy))/i],
  ["gui", 3, /\b(guidance|outlook|forecasts?|raises (?:its )?(?:full-year|annual|fy)|cuts (?:its )?(?:full-year|annual|fy))/i],
  ["ma", 3, /\b(acqui(?:re|res|red|sition)|merger|merge with|takeover|buyout|agrees? to buy|to buy .* for \$|spin-?off|divest)/i],
  ["exe", 3, /\b(ceo|cfo|coo|chief executive|chief financial|chairman|steps down|resigns?|appoints?|names .* (?:chief|president))\b/i],
  ["reg", 3, /\b(fda|approval|approves|approved|clearance|authori[sz]ation)\b/i],
  ["leg", 2, /\b(lawsuit|sues|sued|probe|investigation|antitrust|settle(?:s|ment)?|fined?|subpoena|indict)/i],
  ["fin", 2, /\b(offering|notes due|senior notes|convertible|private placement|credit facility|ipo)\b/i],
  ["deal", 2, /\b(contract|partnership|partners with|agreement|collaboration|orders?|awarded|deal|supply)\b/i],
  ["ana", 1, /\b(upgrades?|downgrades?|price target|initiates? coverage|outperform|underperform|overweight|underweight)\b/i]
];
function classify(title, pr) {
  for (const [tag, lvl, re] of NEWS_RULES) if (re.test(title)) return { tag, lvl };
  return pr ? { tag: "pr", lvl: 2 } : { tag: "gen", lvl: 1 };
}
const goodNews = (title, link, src, t, k) => {
  if (!title || !link || junk(title)) return null;
  return { k, t, title, link, src, ...classify(title, k === "pr") };
};
async function newsRss(sym) {
  const r = await fetch(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`, { cache: "no-store", credentials: "omit" });
  if (!r.ok) throw new Error("rss " + r.status);
  const x = await r.text(), out = [];
  for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = (n) => { const t = m[1].match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)); return t ? unxml(t[1]) : ""; };
    const link = okLink(tag("link")), h = hostOf(link), kind = NEWS_HOST[h];
    if (kind === undefined) continue; // articoli ospitati su Yahoo: l'RSS non dice chi li ha scritti
    const n = goodNews(tag("title"), link, HOST_PUB[h] || h, Date.parse(tag("pubDate")) || 0, kind ? "pr" : "news");
    if (n) out.push(n);
  }
  return out;
}
async function newsSearch(sym) {
  const r = await getJSON(`${Y}/v1/finance/search?q=${encodeURIComponent(sym)}&quotesCount=0&newsCount=25`);
  const j = await r.json(), out = [];
  for (const x of j.news || []) {
    if (x.type && x.type !== "STORY") continue; // niente video
    if (Array.isArray(x.relatedTickers) && x.relatedTickers.length && !x.relatedTickers.includes(sym)) continue;
    const kind = pubKind(x.publisher);
    if (!kind) continue;
    const n = goodNews(String(x.title || ""), okLink(x.link), String(x.publisher), (x.providerPublishTime || 0) * 1000, kind);
    if (n) out.push(n);
  }
  return out;
}
// Google News (RSS di ricerca): dice da quale testata viene ogni articolo, anche quelli che Yahoo ripubblica
// sul suo sito senza firma (per esempio Reuters o AP). Cerco il nome della società negli ultimi 7 giorni e tengo
// solo le testate della lista e i titoli che nominano la società.
const coName = (n) => String(n || "").replace(/,?\s+(inc\.?|incorporated|corp\.?|corporation|co\.?|company|holdings?|group|ltd\.?|limited|plc|n\.?v\.?|s\.?a\.?|ag|se|class [a-c])$/i, "").replace(/,?\s+(inc\.?|corp\.?|corporation|holdings?|ltd\.?|plc)$/i, "").trim();
async function newsGoogle(sym, name) {
  const nm = coName(name);
  if (!nm || nm.length < 2 || !/^[A-Z]{1,5}(?:-[A-Z])?$/.test(sym)) return [];
  const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(`"${nm}" when:7d`)}&hl=en-US&gl=US&ceid=US:en`, { cache: "no-store", credentials: "omit" });
  if (!r.ok) throw new Error("gnews " + r.status);
  const x = await r.text(), out = [], want = new RegExp(`\\b(${nm.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${sym})\\b`, "i");
  for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = (n) => { const t = m[1].match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)); return t ? unxml(t[1]) : ""; };
    const su = (m[1].match(/<source[^>]*url="([^"]+)"/) || [])[1], h = hostOf(su), kind = NEWS_HOST[h];
    if (kind === undefined) continue;
    const src = tag("source"), title = tag("title").replace(new RegExp(`\\s+-\\s+${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`), "");
    if (!want.test(title)) continue;
    const n = goodNews(title, okLink(tag("link")), HOST_PUB[h] || src || h, Date.parse(tag("pubDate")) || 0, kind ? "pr" : "news");
    if (n) out.push(n);
  }
  return out.slice(0, 25);
}
// Moduli 8-K della SEC: codice dell'item -> [tag, grado, descrizione IT, descrizione EN]
const SEC_ITEMS = {
  "1.01": ["deal", 3, "accordo rilevante", "material agreement"], "1.02": ["deal", 2, "fine di un accordo rilevante", "end of a material agreement"],
  "1.03": ["bk", 3, "fallimento o amministrazione controllata", "bankruptcy or receivership"],
  "2.01": ["ma", 3, "acquisizione o cessione completata", "completed acquisition or disposition"], "2.02": ["res", 3, "risultati", "results of operations"],
  "2.03": ["fin", 2, "nuovo debito", "new financial obligation"], "2.04": ["fin", 2, "debito da rimborsare in anticipo", "triggered financial obligation"],
  "2.05": ["rst", 3, "ristrutturazione o tagli", "restructuring or exit costs"], "2.06": ["acc", 3, "svalutazione rilevante", "material impairment"],
  "3.01": ["lst", 3, "rischio di esclusione dalla borsa", "delisting notice"], "3.02": ["cap", 2, "vendita di azioni non registrate", "unregistered sale of shares"],
  "3.03": ["cap", 2, "modifica dei diritti degli azionisti", "change to shareholder rights"], "4.01": ["acc", 3, "cambio del revisore", "change of auditor"],
  "4.02": ["acc", 3, "bilanci da correggere", "non-reliance on financial statements"], "5.01": ["ma", 3, "cambio di controllo", "change in control"],
  "5.02": ["exe", 3, "cambi nei dirigenti o nel consiglio", "executive or board changes"], "5.03": ["cap", 1, "modifica dello statuto", "bylaws amendment"],
  "5.07": ["vote", 1, "voto degli azionisti", "shareholder vote"], "7.01": ["pr", 2, "comunicazione al mercato", "market disclosure"], "8.01": ["pr", 2, "altri eventi", "other events"]
};
let SECMAP = null;
async function secCik(sym) {
  if (!/^[A-Z]{1,5}(?:-[A-Z])?$/.test(sym)) return null; // solo titoli USA (niente suffissi di borsa, indici, cambi, crypto)
  if (!SECMAP) { const o = await chrome.storage.local.get("secmap"); if (o.secmap && Date.now() - o.secmap.at < 7 * 864e5) SECMAP = o.secmap.m; }
  if (!SECMAP) {
    const r = await fetch("https://www.sec.gov/files/company_tickers.json", { cache: "no-store", credentials: "omit" });
    if (!r.ok) throw new Error("sec " + r.status);
    const j = await r.json(), m = {};
    for (const k in j) if (j[k] && j[k].ticker) m[String(j[k].ticker).toUpperCase()] = j[k].cik_str;
    SECMAP = m; chrome.storage.local.set({ secmap: { at: Date.now(), m } }).catch(() => {});
  }
  return SECMAP[sym] || SECMAP[sym.replace("-", ".")] || null;
}
async function newsSec(sym) {
  const cik = await secCik(sym);
  if (!cik) return [];
  const r = await fetch(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`, { cache: "no-store", credentials: "omit" });
  if (!r.ok) throw new Error("sec " + r.status);
  const R = ((await r.json()).filings || {}).recent || {}, out = [], from = Date.now() - 45 * 864e5;
  for (let i = 0; i < (R.form || []).length && out.length < 12; i++) {
    if (!/^8-K(\/A)?$/.test(R.form[i])) continue;
    const t = Date.parse(R.acceptanceDateTime && R.acceptanceDateTime[i]) || Date.parse(R.filingDate[i]) || 0;
    if (t < from) continue;
    const its = String((R.items && R.items[i]) || "").split(",").map((x) => x.trim()).filter((x) => SEC_ITEMS[x]);
    if (!its.length) continue; // solo allegati (9.01)
    its.sort((a, b) => SEC_ITEMS[b][1] - SEC_ITEMS[a][1]);
    const acc = String(R.accessionNumber[i] || ""), dir = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}/`;
    const doc = R.primaryDocument && R.primaryDocument[i];
    const fa = R.form[i] === "8-K/A";
    out.push({
      k: "sec", t, link: doc ? dir + doc : `${dir}${acc}-index.htm`, src: "SEC", tag: SEC_ITEMS[its[0]][0], lvl: SEC_ITEMS[its[0]][1],
      titleIt: `${fa ? "Modulo 8-K corretto" : "Modulo 8-K"}: ${its.map((x) => SEC_ITEMS[x][2]).join(", ")}`,
      title: `${fa ? "Amended Form 8-K" : "Form 8-K"}: ${its.map((x) => SEC_ITEMS[x][3]).join(", ")}`
    });
  }
  return out;
}
const SEC_TTL = 4 * 60000, SECC = {};
async function newsFor(sym, fresh, name) {
  const c = NEWS[sym];
  if (c && !fresh && Date.now() - c.at < NEWS_TTL) return c.items;
  const sc = SECC[sym];
  const [a, b, d, g] = await Promise.all([
    newsSearch(sym).catch(() => null),
    newsRss(sym).catch(() => null),
    sc && Date.now() - sc.at < SEC_TTL ? sc.items : newsSec(sym).then((x) => ((SECC[sym] = { at: Date.now(), items: x }), x), () => (sc ? sc.items : null)),
    newsGoogle(sym, name).catch(() => null)
  ]);
  if (!a && !b && !d && !g) return c ? c.items : null; // nessuna fonte raggiungibile
  const seen = new Set(), key = (n) => n.link + "|" + n.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 60);
  const items = [...(d || []), ...(a || []), ...(b || []), ...(g || [])]
    .filter((n) => { const k1 = n.link, k2 = key(n).split("|")[1]; if (seen.has(k1) || seen.has(k2)) return false; seen.add(k1); seen.add(k2); return true; })
    .sort((x, y) => y.t - x.t).slice(0, 25);
  NEWS[sym] = { at: Date.now(), items };
  return items;
}
// notizie lette: il pallino sparisce e le prossime partono da adesso
async function newsRead(sym) {
  const o = await chrome.storage.local.get(["nseen", "nnew"]), seen = o.nseen || {}, nw = o.nnew || {};
  seen[sym] = Date.now(); delete nw[sym];
  await chrome.storage.local.set({ nseen: seen, nnew: nw });
}
// controllo periodico dei titoli con gli avvisi attivi
let newsBusy = false;
async function newsCheck() {
  if (newsBusy) return; newsBusy = true;
  try {
    const o = await chrome.storage.local.get(["nsub", "nseen", "nnew", "lang", "lists", "pf"]);
    const sub = o.nsub || {}, seen = o.nseen || {}, nw = o.nnew || {}, it = navigator.language.startsWith("it") ? o.lang !== "en" : o.lang === "it";
    const names = {};
    for (const l of o.lists || []) for (const x of l.items || []) names[x.s] = x.t || x.n;
    for (const x of o.pf || []) names[x.s] = names[x.s] || x.t || x.n;
    for (const k of Object.keys(nw)) if (!sub[k]) delete nw[k];
    for (const sym of Object.keys(sub)) {
      const from = Math.max(seen[sym] || 0, sub[sym] || 0);
      const items = ((await newsFor(sym, true, names[sym])) || []).filter((n) => n.t > from);
      if (!items.length) continue;
      const top = items[0], prev = nw[sym];
      nw[sym] = { n: items.length, t: top.t, title: top.title, link: top.link };
      if (prev && prev.t >= top.t) continue; // già avvisato
      const nm = names[sym] || sym;
      try {
        chrome.notifications.create(`nw|${sym}|${top.t}`, {
          type: "basic", iconUrl: "icons/128.png", priority: 0,
          title: items.length > 1 ? (it ? `${nm}: ${items.length} nuove notizie` : `${nm}: ${items.length} new stories`) : (it ? `${nm}: nuova notizia` : `${nm}: new story`),
          message: (it && top.titleIt) || top.title, contextMessage: top.k === "sec" ? (it ? "SEC, modulo 8-K" : "SEC, Form 8-K") : top.src || "Yahoo Finance"
        });
      } catch (_) {}
    }
    await chrome.storage.local.set({ nnew: nw });
  } finally { newsBusy = false; }
}
const NEWS_EVERY = 2; // minuti tra un controllo e l'altro (il feed RSS non avvisa da solo: va richiesto)
chrome.alarms.get("news").then((a) => { if (!a || a.periodInMinutes !== NEWS_EVERY) chrome.alarms.create("news", { periodInMinutes: NEWS_EVERY, delayInMinutes: 1 }); }, () => {});
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "news") newsCheck().catch(() => {}); });
// clic sull'avviso: apre l'articolo e segna come lette le notizie di quel titolo
chrome.notifications.onClicked.addListener(async (id) => {
  const [p, sym] = id.split("|");
  if (p !== "nw" || !sym) return;
  const o = await chrome.storage.local.get("nnew"), n = (o.nnew || {})[sym];
  if (n && okLink(n.link)) chrome.tabs.create({ url: n.link });
  chrome.notifications.clear(id);
  newsRead(sym).catch(() => {});
});

// ---------- Messaggi dalle schede ----------
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg.type === "peek") {
    ready.then(() => send(Object.fromEntries(msg.symbols.map((s) => [s, last[s] || null]))));
    return true;
  }
  if (msg.type === "quotes") {
    quotes(msg.symbols).then(send, () => send({}));
    return true;
  }
  if (msg.type === "logos") {
    logos(msg.items || []).then(send, () => send({}));
    return true;
  }
  if (msg.type === "search") {
    searchSymbols(msg.q).then(send, () => send([]));
    return true;
  }
  if (msg.type === "spark") { spark(String(msg.s || "")).then(send, () => send(null)); return true; }
  if (msg.type === "actual") {
    actual(msg.k, msg.t, msg.prev).then(send, () => send({ fresh: false, vals: {} }));
    return true;
  }
  if (msg.type === "forecasts") {
    forecasts(!!msg.force).then(send, () => send({ at: 0, items: [], fail: true }));
    return true;
  }
  if (msg.type === "earnings") {
    earnings(String(msg.mon || ""), !!msg.force).then(send, (e) => send({ mon: msg.mon, fail: "rete", days: {} }));
    return true;
  }
  if (msg.type === "calendar") {
    calendar(!!msg.force).then(send, () => send({ at: 0, ev: [], fail: ["rete"] }));
    return true;
  }
  if (msg.type === "candles") {
    candlesC(msg.sym, msg.range, msg.iv, msg.exact, msg.fresh).then(send, (e) => send({ error: String(e.message || e) }));
    return true;
  }
  if (msg.type === "news") {
    newsFor(String(msg.s || ""), !!msg.fresh, String(msg.n || "").slice(0, 80)).then(async (items) => { if (msg.read) await newsRead(msg.s).catch(() => {}); send(items); }, () => send(null));
    return true;
  }
  if (msg.type === "newsread") { newsRead(String(msg.s || "")).then(() => send(true), () => send(false)); return true; }
  if (msg.type === "newscheck") { newsCheck().then(() => send(true), () => send(false)); return true; }
  if (msg.type === "lib") {
    if (!sender.tab) { send(!!globalThis.LightweightCharts); return; } // pannello laterale: la libreria è già nella pagina
    // La libreria del grafico viene caricata solo quando apri un grafico
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id, frameIds: [sender.frameId || 0] },
      files: ["lib/lightweight-charts.js"]
    }).then(() => send(true), () => send(false));
    return true;
  }
});

// ---------- Streaming live (WebSocket di Yahoo Finance) ----------
const ports = new Map(); // porta di una scheda -> simboli richiesti
let ws = null, hb = null;

const zz = (n) => (n % 2 ? -(n + 1) / 2 : n / 2); // decodifica sint64

// Decoder del messaggio protobuf "PricingData" di Yahoo
function decode(b64) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dv = new DataView(u.buffer), out = {};
  let p = 0;
  const varint = () => {
    let r = 0, s = 0, b;
    do { b = u[p++]; r += (b & 127) * 2 ** s; s += 7; } while (b & 128 && p < u.length);
    return r;
  };
  while (p < u.length) {
    const tag = varint(), f = tag >> 3, w = tag & 7;
    if (w === 0) {
      const v = varint();
      if (f === 3) out.time = zz(v);          // orario dello scambio
      else if (f === 6) out.qt = v;           // tipo (8 azione, 20 ETF, ...)
      else if (f === 7) out.mh = v;           // 0 pre, 1 regolare, 2 post, 3 esteso
      else if (f === 9) out.vol = zz(v);      // volume del giorno
    } else if (w === 5) {
      const v = dv.getFloat32(p, true);
      if (f === 2) out.price = v;
      else if (f === 8) out.cp = v;           // variazione %
      else if (f === 12) out.change = v;      // variazione assoluta
      p += 4;
    } else if (w === 1) p += 8;
    else if (w === 2) {
      const n = varint();
      if (f === 1) out.id = new TextDecoder().decode(u.subarray(p, p + n));
      p += n;
    } else break;
  }
  return out;
}

const allSyms = () => [...new Set([...ports.values()].flat())];
function subscribe() {
  if (ws && ws.readyState === 1 && ports.size) ws.send(JSON.stringify({ subscribe: allSyms() }));
}

function onPricing(b64) {
  const d = decode(b64);
  if (!d.id || !(d.price > 0)) return;
  const eq = d.qt === 8 || d.qt === 20; // azioni ed ETF
  // Variazione % inviata da Yahoo (la stessa del sito). Protobuf omette i valori 0:
  // se manca ma c'è la variazione assoluta la ricavo, altrimenti uso la base salvata.
  const change = d.cp != null ? d.cp
    : d.change != null && d.price !== d.change ? (d.change / (d.price - d.change)) * 100 : undefined;
  const now = Date.now(), o = last[d.id];
  const rt = d.time ? (d.time < 1e11 ? d.time * 1000 : d.time) : 0;
  // Prezzo ripetuto dal flusso (succede a mercato chiuso, a ogni nuova iscrizione): se è più vecchio
  // dell'ultimo valore che conosco lo ignoro. Prima diventava "adesso" e copriva l'after market
  // (variazione tornata a 0,00%), bloccando anche gli aggiornamenti successivi.
  if (rt && (now - rt > 45 * 60000 || (o && o.price > 0 && rt < (o.tt || 0) - 1000))) return;
  // mercato chiuso: per le azioni la seduta regolare è finita, resta l'ultimo prezzo dell'after market
  if (eq && d.mh === 1 && o && o.rp > 0 && o.ms && o.ms !== "REGULAR" && o.msAt && now - o.msAt < 120000) return;
  let tt = rt || now;
  if (tt > now) tt = now; // tengo il ritardo delle borse con dati differiti (15 min)
  // after market: non cambia prezzo e "Oggi" della quotazione principale (come su Yahoo)
  if (eq && (d.mh === 2 || d.mh === 3)) return;
  const q = setLast(d.id, { price: d.price, change, tt, xs: eq && d.mh === 0 ? "pre" : null }, true);
  const msg = { sym: d.id, ...q, vol: d.vol };
  for (const [port, syms] of ports) {
    if (syms.includes(d.id)) { try { port.postMessage(msg); } catch (_) {} }
  }
}

function openWS() {
  if (ws) return;
  const sock = (ws = new WebSocket("wss://streamer.finance.yahoo.com/?version=2"));
  sock.onopen = subscribe;
  sock.onmessage = (e) => {
    try {
      const m = JSON.parse(e.data);
      if (m.type === "pricing") onPricing(m.message);
    } catch (_) {}
  };
  sock.onerror = () => sock.close();
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    clearInterval(hb);
    if (ports.size) setTimeout(openWS, 3000); // riconnessione automatica
  };
  hb = setInterval(subscribe, 20000); // tiene viva la sottoscrizione e il service worker
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "live") return;
  ports.set(port, []);
  port.onMessage.addListener((m) => {
    if (m.sub) { ports.set(port, m.sub); openWS(); subscribe(); }
  });
  port.onDisconnect.addListener(() => {
    ports.delete(port);
    if (!ports.size && ws) ws.close();
  });
});

// ---------- Dove compare il widget: su ogni pagina o solo col clic ----------
// Owlook chiede l'accesso a tutti i siti solo se l'utente lo sceglie (pagina di benvenuto o impostazioni).
// Con l'accesso: il widget è registrato su tutte le pagine http/https. Senza: compare solo nella scheda
// in cui clicchi l'icona o usi la scorciatoia (activeTab), finché non cambi pagina.
// where (storage.local): "all" | "click" | assente (non ancora scelto) · every: vero se il widget è su ogni pagina
const ALL = ["http://*/*", "https://*/*"];
const WJS = ["indicators.js", "i18n.js", "content.js"];
const CSID = "owlook";
const hasAll = () => chrome.permissions.contains({ origins: ALL }).catch(() => false);
let syncing = Promise.resolve();
function syncEvery(injectOpen) {
  syncing = syncing.then(async () => {
    const granted = await hasAll();
    const { where } = await chrome.storage.local.get("where");
    const on = granted && where !== "click";
    let reg = [];
    try { reg = await chrome.scripting.getRegisteredContentScripts({ ids: [CSID] }); } catch (_) {}
    try {
      if (on && !reg.length) await chrome.scripting.registerContentScripts([{ id: CSID, matches: ALL, js: WJS, runAt: "document_idle", persistAcrossSessions: true }]);
      if (!on && reg.length) await chrome.scripting.unregisterContentScripts({ ids: [CSID] });
    } catch (_) {}
    await chrome.storage.local.set({ every: on });
    // appena attivato: compare subito anche nelle schede già aperte, senza ricaricarle
    if (on && injectOpen) {
      const tabs = await chrome.tabs.query({ url: ALL }).catch(() => []);
      for (const t of tabs) if (canEmbed(t) && !(await isExcluded(t))) addWidget(t.id).catch(() => {});
    }
    return on;
  }).catch(() => false);
  return syncing;
}
// inserisce il widget in una scheda, se non c'è già. "new" se l'ho appena inserito
async function addWidget(tabId) {
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: () => !!document.getElementById("mt-host") });
  if (r && r.result) return true;
  await chrome.scripting.executeScript({ target: { tabId }, files: WJS });
  return "new";
}
const welcome = (ask) => chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html" + (ask ? "#ask" : "")) });
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await syncEvery(false);
  const { where } = await chrome.storage.local.get("where");
  // prima installazione, o aggiornamento da una versione che non chiedeva ancora: la guida, una volta sola
  if (reason === "install" || (reason === "update" && !where && !(await hasAll()))) welcome(false);
});
chrome.runtime.onStartup.addListener(() => syncEvery(false));
chrome.permissions.onAdded.addListener(async (p) => {
  if (!(await hasAll())) return;
  await chrome.storage.local.set({ where: "all" }); // l'accesso dato (dalla guida o da Chrome) vale come scelta
  syncEvery(true);
});
chrome.permissions.onRemoved.addListener(() => syncEvery(false));
syncEvery(false);
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  // impostazioni: "Su ogni pagina". Se l'accesso c'è già basta la scelta; se no lo chiede la guida
  // (Chrome mostra la richiesta solo da una pagina di Owlook, dopo un clic)
  if (msg.type === "everyon") {
    hasAll().then(async (g) => {
      if (g) { await chrome.storage.local.set({ where: "all" }); await syncEvery(true); send("on"); }
      else { welcome(true); send("ask"); }
    });
    return true;
  }
  // "Solo col clic": tolgo il widget dalle pagine nuove (l'accesso resta, non usato, per riattivarlo con un clic)
  if (msg.type === "everyoff") {
    chrome.storage.local.set({ where: "click" }).then(() => syncEvery(false)).then(() => send(true));
    return true;
  }
});

// ---------- Clic sull'icona e scorciatoia di Chrome ----------
// Inserisce il widget nella scheda se non c'è (modalità "solo col clic", o scheda aperta prima dell'installazione).
// Vero se il widget c'è; "new" se l'ho appena inserito.
async function ensureWidget(tab) {
  try {
    return await addWidget(tab.id);
  } catch (_) {
    // Pagine speciali (chrome://, Web Store, pagina di errore…): Chrome non lo permette → pannello laterale
    openSide(tab);
    return false;
  }
}
// Sito escluso: icona e scorciatoia non fanno nulla (si riattiva solo togliendolo dai siti esclusi)
async function isExcluded(tab) {
  let host = "";
  try { host = new URL(tab.url).hostname.toLowerCase().replace(/^www\./, ""); } catch (_) { return false; }
  const { excl = [] } = await chrome.storage.local.get("excl");
  return excl.some((d) => host === d || host.endsWith("." + d));
}
// ---------- Pannello laterale del browser ----------
// Dove il widget non può comparire (nessuna connessione, nuova scheda, pagine del browser, Web Store…)
// l'icona e la scorciatoia aprono Owlook nel pannello laterale. Va aperto subito, nel clic: per
// questo decido prima di qualsiasi attesa.
const canEmbed = (tab) => !!tab && /^https?:\/\//i.test(tab.url || "") && navigator.onLine !== false && !/^https:\/\/(chrome|chromewebstore)\.google\.com\/webstore|^https:\/\/microsoftedge\.microsoft\.com\/addons/i.test(tab.url || "");
function openSide(tab) {
  const win = () => chrome.windows.create({ url: chrome.runtime.getURL("panel.html"), type: "popup", width: 400, height: 760 }).catch(() => {});
  try {
    if (chrome.sidePanel && chrome.sidePanel.open) return chrome.sidePanel.open(tab && tab.windowId != null ? { windowId: tab.windowId } : { tabId: tab.id }).catch(win);
  } catch (_) {}
  return win(); // browser senza pannello laterale: una finestrella stretta
}
try { if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {}); } catch (_) {}
chrome.action.onClicked.addListener(async (tab) => {
  if (!canEmbed(tab)) return openSide(tab);
  if (await isExcluded(tab)) return;
  const w = await ensureWidget(tab);
  if (!w) return;
  const { hidden, open } = await chrome.storage.local.get(["hidden", "open"]);
  // appena comparso col clic: aperto; già presente: apro o chiudo il pannello
  chrome.storage.local.set(hidden || w === "new" ? { hidden: false, open: true } : { open: !open });
});
// Scorciatoia di Chrome (predefinita Alt+Shift+M): mostra il widget o lo nasconde
chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd !== "toggle-widget") return;
  if (tab && !canEmbed(tab)) return openSide(tab);
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && !canEmbed(tab)) return openSide(tab);
  if (!tab || (await isExcluded(tab))) return;
  const w = await ensureWidget(tab);
  if (!w) return;
  const { hidden, open } = await chrome.storage.local.get(["hidden", "open"]);
  // nascosto o appena comparso: lo apro col pannello; visibile (anche solo la barra, col pannello chiuso): lo nascondo subito
  chrome.storage.local.set(hidden || w === "new" ? { hidden: false, open: true } : { hidden: true });
});
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg.type === "cmdkey") {
    chrome.commands.getAll().then((c) => send((c.find((x) => x.name === "toggle-widget") || {}).shortcut || ""), () => send(""));
    return true;
  }
  if (msg.type === "shortcuts") chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
