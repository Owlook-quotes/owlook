// Calendario economico USA (service worker).
// Date ufficiali, scaricate dai siti delle agenzie e aggiornate ogni 6 ore:
//   BLS (lavoro, CPI, PPI…) → calendario iCalendar · BEA (PIL, PCE, bilancia) → JSON ·
//   Census (vendite al dettaglio, beni durevoli, edilizia) → pagine del calendario ·
//   Federal Reserve (FOMC, verbali, Beige Book) → date pubblicate dalla Fed.
// Se un sito non risponde uso le date già pubblicate (calendario ufficiale dei principali
// indicatori federali). ADP, ISM, sussidi di disoccupazione e Conference Board seguono il loro
// calendario abituale: sono segnati come "data calcolata" (≈).

const CAL_TTL = 6 * 3600000;
const FED = "https://www.federalreserve.gov";
const BLS = "https://www.bls.gov";
const pad = (n) => String(n).padStart(2, "0");

// ---------- Tipi di evento: nome, fonte, importanza (3 alta · 2 media · 1 bassa), orario ET, link ----------
const blsRel = (code) => (d, latest) => (latest ? `${BLS}/news.release/${code}.nr0.htm` : `${BLS}/news.release/archives/${code}_${pad(d.m)}${pad(d.d)}${d.y}.htm`);
const EVT = {
  nfp: { n: "Rapporto sul lavoro (Non-Farm Payrolls, disoccupazione)", src: "BLS", imp: 3, at: "08:30", page: `${BLS}/schedule/news_release/empsit.htm`, rel: blsRel("empsit") },
  cpi: { n: "Inflazione CPI (prezzi al consumo)", src: "BLS", imp: 3, at: "08:30", page: `${BLS}/schedule/news_release/cpi.htm`, rel: blsRel("cpi") },
  ppi: { n: "Inflazione PPI (prezzi alla produzione)", src: "BLS", imp: 3, at: "08:30", page: `${BLS}/schedule/news_release/ppi.htm`, rel: blsRel("ppi") },
  jolts: { n: "JOLTS – posti di lavoro vacanti", src: "BLS", imp: 2, at: "10:00", page: `${BLS}/schedule/news_release/jolts.htm`, rel: blsRel("jolts") },
  eci: { n: "Costo del lavoro (Employment Cost Index)", src: "BLS", imp: 2, at: "08:30", page: `${BLS}/schedule/news_release/eci.htm`, rel: blsRel("eci") },
  prod: { n: "Produttività e costo unitario del lavoro", src: "BLS", imp: 1, at: "08:30", page: `${BLS}/schedule/news_release/prod2.htm`, rel: blsRel("prod2") },
  xmpi: { n: "Prezzi all'importazione e all'esportazione", src: "BLS", imp: 1, at: "08:30", page: `${BLS}/schedule/news_release/ximpim.htm`, rel: blsRel("ximpim") },
  gdp: { n: "PIL (GDP)", src: "BEA", imp: 3, at: "08:30", page: "https://www.bea.gov/news/schedule", rel: () => "https://www.bea.gov/data/gdp/gross-domestic-product" },
  pce: { n: "Reddito e spesa personale – inflazione PCE", src: "BEA", imp: 3, at: "08:30", page: "https://www.bea.gov/news/schedule", rel: () => "https://www.bea.gov/data/personal-consumption-expenditures-price-index" },
  trade: { n: "Bilancia commerciale (beni e servizi)", src: "BEA", imp: 2, at: "08:30", page: "https://www.bea.gov/news/schedule", rel: () => "https://www.bea.gov/data/intl-trade-investment/international-trade-goods-and-services" },
  retail: { n: "Vendite al dettaglio", src: "Census", imp: 3, at: "08:30", page: "https://www.census.gov/retail/release_schedule.html", rel: () => "https://www.census.gov/retail/sales.html" },
  durable: { n: "Ordini di beni durevoli", src: "Census", imp: 2, at: "08:30", page: "https://www.census.gov/manufacturing/m3/release_schedule.html", rel: () => "https://www.census.gov/manufacturing/m3/index.html" },
  starts: { n: "Nuovi cantieri e permessi edilizi", src: "Census", imp: 2, at: "08:30", page: "https://www.census.gov/construction/nrc/schedule.html", rel: () => "https://www.census.gov/construction/nrc/current/index.html" },
  nhs: { n: "Vendite di nuove abitazioni", src: "Census", imp: 2, at: "10:00", page: "https://www.census.gov/construction/nrs/schedule.html", rel: () => "https://www.census.gov/construction/nrs/current/index.html" },
  ip: { n: "Produzione industriale", src: "Fed", imp: 2, at: "09:15", page: `${FED}/releases/g17/default.htm`, rel: () => `${FED}/releases/g17/current/default.htm` },
  fomc: { n: "Decisione della Fed sui tassi (FOMC)", src: "Fed", imp: 3, at: "14:00", page: `${FED}/monetarypolicy/fomccalendars.htm`, rel: (d) => `${FED}/newsevents/pressreleases/monetary${d.y}${pad(d.m)}${pad(d.d)}a.htm` },
  presser: { n: "Conferenza stampa del presidente della Fed", src: "Fed", imp: 3, at: "14:30", page: `${FED}/monetarypolicy/fomccalendars.htm`, rel: (d) => `${FED}/monetarypolicy/fomcpresconf${d.y}${pad(d.m)}${pad(d.d)}.htm` },
  minutes: { n: "Verbali della riunione FOMC (minutes)", src: "Fed", imp: 2, at: "14:00", page: `${FED}/monetarypolicy/fomccalendars.htm`, rel: (d, _l, e) => `${FED}/monetarypolicy/fomcminutes${e.meet}.htm` },
  beige: { n: "Beige Book della Fed", src: "Fed", imp: 2, at: "14:00", page: `${FED}/monetarypolicy/publications/beige-book-default.htm`, rel: (d) => `${FED}/monetarypolicy/beigebook${d.y}${pad(d.m)}.htm` },
  adp: { n: "ADP – occupazione nel settore privato", src: "ADP", imp: 2, at: "08:15", page: "https://adpemploymentreport.com/", rel: () => "https://adpemploymentreport.com/" },
  ismm: { n: "ISM manifatturiero (PMI)", src: "ISM", imp: 2, at: "10:00", page: "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/", rel: () => "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/" },
  isms: { n: "ISM servizi (PMI)", src: "ISM", imp: 2, at: "10:00", page: "https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/", rel: () => "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/" },
  claims: { n: "Richieste di sussidi di disoccupazione (settimanali)", src: "DOL", imp: 2, at: "08:30", page: "https://oui.doleta.gov/unemploy/claims.asp", rel: () => "https://www.dol.gov/ui/data.pdf" },
  cb: { n: "Fiducia dei consumatori (Conference Board)", src: "Conference Board", imp: 2, at: "10:00", page: "https://www.conference-board.org/topics/consumer-confidence", rel: () => "https://www.conference-board.org/topics/consumer-confidence" }
};

// ---------- Date già pubblicate (riserva se un sito non risponde) ----------
// Fonti: Federal Reserve (riunioni FOMC 2026–2027, * = proiezioni economiche), calendario OMB dei
// principali indicatori federali per il 2027, calendari Census e BEA (novembre–dicembre 2026).
const FOMC = [
  ["2026-01-27", "2026-01-28", 0], ["2026-03-17", "2026-03-18", 1], ["2026-04-28", "2026-04-29", 0], ["2026-06-16", "2026-06-17", 1],
  ["2026-07-28", "2026-07-29", 0], ["2026-09-15", "2026-09-16", 1], ["2026-10-27", "2026-10-28", 0], ["2026-12-08", "2026-12-09", 1],
  ["2027-01-26", "2027-01-27", 0], ["2027-03-16", "2027-03-17", 1], ["2027-04-27", "2027-04-28", 0], ["2027-06-08", "2027-06-09", 1],
  ["2027-07-27", "2027-07-28", 0], ["2027-09-14", "2027-09-15", 1], ["2027-10-26", "2027-10-27", 0], ["2027-12-07", "2027-12-08", 1]
];
const M27 = (s) => s.split(" ").map((x) => { const [m, d] = x.split("/"); return `2027-${pad(m)}-${pad(d)}`; });
const STATIC = {
  nfp: M27("1/8 2/5 3/5 4/2 5/7 6/4 7/2 8/6 9/3 10/8 11/5 12/3"),
  cpi: M27("1/13 2/11 3/10 4/13 5/12 6/10 7/14 8/11 9/14 10/14 11/10 12/10"),
  ppi: M27("1/14 2/12 3/12 4/14 5/13 6/11 7/15 8/10 9/10 10/15 11/12 12/15"),
  eci: M27("1/29 4/30 7/30 10/29"),
  prod: M27("2/4 3/4 5/6 6/3 8/5 9/2 11/4 12/7"),
  xmpi: M27("1/15 2/17 3/17 4/16 5/14 6/16 7/16 8/13 9/17 10/19 11/16 12/16"),
  gdp: ["2026-11-25", "2026-12-23", ...M27("1/28 2/25 3/31 4/29 5/27 6/25 7/29 8/25 9/30 10/28 11/24 12/22")],
  pce: ["2026-11-25", "2026-12-23", ...M27("1/28 2/25 3/31 4/29 5/27 6/25 7/29 8/25 9/30 10/28 11/24 12/22")],
  trade: ["2026-11-04", "2026-12-08", ...M27("1/7 2/4 3/9 4/6 5/5 6/9 7/7 8/5 9/8 10/6 11/4 12/7")],
  retail: ["2026-11-17", "2026-12-16", ...M27("1/15 2/17 3/16 4/16 5/14 6/16 7/16 8/16 9/16 10/15 11/16 12/15")],
  durable: ["2026-11-25", "2026-12-23", ...M27("1/27 2/25 3/25 4/27 5/27 6/25 7/28 8/25 9/27 10/27 11/24 12/22")],
  starts: M27("1/20 2/18 3/17 4/20 5/18 6/17 7/20 8/17 9/21 10/19 11/17 12/16"),
  nhs: M27("1/27 2/24 3/23 4/23 5/25 6/24 7/26 8/24 9/24 10/26 11/24 12/22"),
  ip: M27("1/15 2/17 3/15 4/15 5/17 6/16 7/16 8/17 9/16 10/18 11/17 12/16")
};

// ---------- Ore di New York → istante UTC (con l'ora legale americana) ----------
const NYF = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
function nyParts(ms) { const p = Object.fromEntries(NYF.formatToParts(new Date(ms)).map((x) => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute }; }
function etToUTC(y, m, d, h, mi) {
  let t = Date.UTC(y, m - 1, d, h + 5, mi); // prima ipotesi: ora solare (UTC−5)
  for (let i = 0; i < 2; i++) {
    const p = nyParts(t), diff = (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Date.UTC(y, m - 1, d, h, mi)) / 60000;
    if (!diff) break;
    t -= diff * 60000;
  }
  return t;
}
const ymd = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const at = (k, day, time) => { const { y, m, d } = ymd(day), [h, mi] = (time || EVT[k].at).split(":").map(Number); return etToUTC(y, m, d, h, mi); };

// ---------- Festività federali (per giorni lavorativi, sussidi, ISM) ----------
const hol = {};
function holidays(y) {
  if (hol[y]) return hol[y];
  const s = new Set(), wd = (yy, m, d) => new Date(Date.UTC(yy, m - 1, d)).getUTCDay();
  const fixed = (m, d) => { const w = wd(y, m, d); const dt = new Date(Date.UTC(y, m - 1, d + (w === 6 ? -1 : w === 0 ? 1 : 0))); s.add(dt.toISOString().slice(0, 10)); };
  const nth = (m, w, n) => { let d = 1 + ((w - wd(y, m, 1) + 7) % 7) + (n - 1) * 7; s.add(iso(y, m, d)); };
  const last = (m, w) => { const L = new Date(Date.UTC(y, m, 0)).getUTCDate(); let d = L - ((wd(y, m, L) - w + 7) % 7); s.add(iso(y, m, d)); };
  fixed(1, 1); nth(1, 1, 3); nth(2, 1, 3); last(5, 1); fixed(6, 19); fixed(7, 4); nth(9, 1, 1); nth(10, 1, 2); fixed(11, 11); nth(11, 4, 4); fixed(12, 25);
  return (hol[y] = s);
}
const dayStr = (t) => new Date(t).toISOString().slice(0, 10);
const addDays = (s, n) => { const { y, m, d } = ymd(s); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const weekday = (s) => { const { y, m, d } = ymd(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const isBiz = (s) => { const w = weekday(s); return w !== 0 && w !== 6 && !holidays(+s.slice(0, 4)).has(s); };
function nthBiz(y, m, n) { let s = iso(y, m, 1), c = 0; for (;;) { if (isBiz(s)) { c++; if (c === n) return s; } s = addDays(s, 1); } }

// ---------- Lettura delle fonti ----------
const fetchText = async (url, ms = 15000) => {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { cache: "no-store", signal: ac.signal }); if (!r.ok) throw new Error(r.status); return await r.text(); }
  finally { clearTimeout(to); }
};
// BLS: iCalendar con l'orario di ogni comunicato
const BLS_MAP = [[/^Employment Situation\b/i, "nfp"], [/^Consumer Price Index\b/i, "cpi"], [/^Producer Price Index/i, "ppi"], [/^Job Openings and Labor Turnover/i, "jolts"], [/^Employment Cost Index/i, "eci"], [/^Productivity and Costs/i, "prod"], [/Import and Export Price/i, "xmpi"]];
function parseBLS(ics) {
  const lines = ics.replace(/\r\n[ \t]/g, "").split(/\r?\n/), out = [];
  let ev = null;
  for (const l of lines) {
    if (l === "BEGIN:VEVENT") ev = {};
    else if (l === "END:VEVENT") { if (ev && ev.s && ev.t) { const k = (BLS_MAP.find(([re]) => re.test(ev.s)) || [])[1]; if (k) out.push({ k, t: ev.t }); } ev = null; }
    else if (ev) {
      if (l.startsWith("SUMMARY")) ev.s = l.slice(l.indexOf(":") + 1).replace(/\\,/g, ",").trim();
      else if (l.startsWith("DTSTART")) {
        const m = /:(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)\d\d(Z)?)?/.exec(l);
        if (m) ev.t = m[6] ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : etToUTC(+m[1], +m[2], +m[3], +(m[4] || 8), +(m[5] || 30));
      }
    }
  }
  return out;
}
// BEA: JSON con le date (UTC) per ogni pubblicazione
const BEA_MAP = { "Gross Domestic Product": "gdp", "Personal Income and Outlays": "pce", "U.S. International Trade in Goods and Services": "trade" };
function parseBEA(j) {
  const out = [];
  for (const [name, k] of Object.entries(BEA_MAP)) for (const s of (j[name] && j[name].release_dates) || []) { const t = Date.parse(s); if (t) out.push({ k, t }); }
  return out;
}
// Census: tabelle "mese dei dati | data di pubblicazione" (prendo la prima data di ogni riga della prima tabella)
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function cellDate(t) {
  let m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i.exec(t);
  if (m) return iso(+m[3], MONTHS.findIndex((x) => x.startsWith(m[1].toLowerCase().slice(0, 3))) + 1, +m[2]);
  m = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(t);
  return m ? iso(+m[3], +m[1], +m[2]) : null;
}
function parseCensus(html) {
  const i = html.search(/<table/i);
  if (i < 0) return [];
  const j = html.indexOf("</table", i), tbl = html.slice(i, j < 0 ? undefined : j), out = [];
  for (const row of tbl.split(/<tr[\s>]/i).slice(1)) {
    const cells = row.split(/<t[dh][\s>]/i).slice(1).map((c) => c.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim());
    for (const c of cells) { const d = cellDate(c); if (d) { out.push(d); break; } }
  }
  return out;
}
const CENSUS = { retail: "https://www.census.gov/retail/release_schedule.html", durable: "https://www.census.gov/manufacturing/m3/release_schedule.html", starts: "https://www.census.gov/construction/nrc/schedule.html", nhs: "https://www.census.gov/construction/nrs/schedule.html" };

// ---------- Costruzione del calendario ----------
async function buildCalendar() {
  const ev = [], fail = [], from = Date.now() - 45 * 86400000, to = Date.now() + 400 * 86400000;
  const live = {};
  const add = (k, t, extra = {}) => { if (t >= from && t <= to) ev.push({ k, t, ...extra }); };
  const [bls, bea, ...cen] = await Promise.allSettled([
    fetchText(`${BLS}/schedule/news_release/bls.ics`).then(parseBLS),
    fetchText("https://apps.bea.gov/API/signup/release_dates.json").then((t) => parseBEA(JSON.parse(t))),
    ...Object.entries(CENSUS).map(([k, u]) => fetchText(u).then((h) => ({ k, days: parseCensus(h) })))
  ]);
  const take = (list, label) => {
    if (list.status !== "fulfilled" || !list.value.length) { fail.push(label); return; }
    for (const x of list.value) { (live[x.k] = live[x.k] || []).push(x.t); }
  };
  take(bls, "BLS"); take(bea, "BEA");
  for (const c of cen) {
    if (c.status === "fulfilled" && c.value.days.length >= 3) live[c.value.k] = c.value.days.map((d) => at(c.value.k, d));
    else fail.push("Census");
  }
  // per ogni tipo: date dal sito se ci sono, altrimenti quelle già pubblicate
  for (const k of Object.keys(EVT)) {
    if (live[k] && live[k].length) { for (const t of new Set(live[k])) add(k, t); continue; }
    for (const d of STATIC[k] || []) add(k, at(k, d), { fb: 1 });
  }
  // Fed: decisione, conferenza stampa, proiezioni, verbali (+3 settimane), Beige Book (−2 settimane)
  for (const [, d2, sep] of FOMC) {
    const meet = d2.replace(/-/g, "");
    add("fomc", at("fomc", d2), { sep });
    add("presser", at("presser", d2));
    add("minutes", at("minutes", addDays(d2, 21)), { meet });
    add("beige", at("beige", addDays(d2, -14)));
  }
  // ADP: il mercoledì prima del rapporto sul lavoro del BLS
  for (const e of ev.filter((x) => x.k === "nfp")) {
    let s = addDays(dayStr(e.t - 5 * 3600000), -1);
    while (weekday(s) !== 3) s = addDays(s, -1);
    add("adp", at("adp", s), { est: 1 });
  }
  // ISM (1° e 3° giorno lavorativo), Conference Board (ultimo martedì), sussidi (ogni giovedì)
  const now = new Date();
  for (let i = -2; i <= 13; i++) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1;
    add("ismm", at("ismm", nthBiz(y, m, 1)), { est: 1 });
    add("isms", at("isms", nthBiz(y, m, 3)), { est: 1 });
    const L = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let d = iso(y, m, L); while (weekday(d) !== 2) d = addDays(d, -1);
    add("cb", at("cb", d), { est: 1 });
  }
  let th = dayStr(from); while (weekday(th) !== 4) th = addDays(th, 1);
  for (; Date.parse(th) < to; th = addDays(th, 7)) {
    let d = th; while (!isBiz(d)) d = addDays(d, -1); // giovedì festivo: esce il giorno lavorativo prima
    add("claims", at("claims", d));
  }
  ev.sort((a, b) => a.t - b.t || EVT[b.k].imp - EVT[a.k].imp);
  return { at: Date.now(), ev, fail: [...new Set(fail)] };
}

// Evento pronto per il pannello: nome, fonte, importanza e link (comunicato appena pubblicato)
function calView(cal) {
  const now = Date.now(), latest = {};
  for (const e of cal.ev) if (e.t <= now) latest[e.k] = e.t; // ultima uscita già pubblicata per ogni tipo
  return {
    at: cal.at, fail: cal.fail,
    ev: cal.ev.map((e) => {
      // rel: link al comunicato, valido dall'ora di pubblicazione (prima di allora il pannello mostra "page")
      const d = EVT[e.k], p = nyParts(e.t), rel = d.rel(p, e.t > now || latest[e.k] === e.t, e);
      return { k: e.k, t: e.t, n: d.n + (e.sep ? " · con proiezioni (dot plot)" : ""), src: d.src, imp: d.imp, est: !!e.est, page: d.page, rel };
    })
  };
}
let calJob = null;
async function calendar(force) {
  const { cal } = await chrome.storage.local.get("cal").catch(() => ({}));
  if (!force && cal && cal.v === 1 && Date.now() - cal.at < CAL_TTL) return calView(cal);
  if (!calJob) calJob = buildCalendar().then(async (c) => { c.v = 1; await chrome.storage.local.set({ cal: c }).catch(() => {}); return c; }).finally(() => { calJob = null; });
  try { return calView(await calJob); }
  catch (_) { return cal ? calView(cal) : { at: 0, ev: [], fail: ["rete"] }; }
}

// ---------- Previsioni del consenso (settimana in corso) ----------
// Le agenzie non pubblicano previsioni: uso il calendario pubblico di Forex Factory, che per la
// settimana in corso riporta valore atteso e precedente. Aggiornato al massimo una volta all'ora.
const FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const FF_TTL = 3600000;
let ffJob = null;
async function forecasts(force) {
  const { ff } = await chrome.storage.local.get("ff").catch(() => ({}));
  if (ff && Date.now() - ff.at < (force ? 5 * 60000 : FF_TTL)) return ff; // anche "Aggiorna" non lo chiede più di ogni 5 minuti
  if (!ffJob) ffJob = (async () => {
    let out;
    try {
      const j = JSON.parse(await fetchText(FF_URL));
      const items = (Array.isArray(j) ? j : []).filter((x) => x && x.country === "USD")
        .map((x) => ({ title: String(x.title || "").slice(0, 80), t: Date.parse(x.date), f: String(x.forecast || "").slice(0, 20), p: String(x.previous || "").slice(0, 20) }))
        .filter((x) => x.t && x.title);
      // tengo le attese delle settimane scorse (il file copre solo quella in corso): servono per le uscite passate
      const t0 = Math.min(...items.map((x) => x.t), Infinity), keep = ((ff && ff.items) || []).filter((x) => x.t < t0 && x.t > Date.now() - 21 * 864e5);
      out = { at: Date.now(), items: [...keep, ...items] };
    } catch (_) { out = { at: Date.now(), items: (ff && ff.items) || [], fail: true }; }
    await chrome.storage.local.set({ ff: out }).catch(() => {});
    return out;
  })().finally(() => { ffJob = null; });
  return ffJob;
}

// ---------- Valori pubblicati (dopo l'uscita) ----------
// Calcolati dai dati ufficiali, appena disponibili:
//   BLS API (CPI, PPI, occupazione) · file dati Census (vendite al dettaglio) ·
//   comunicato della Fed (tassi) · FRED, St. Louis Fed (PIL e PCE del BEA, senza chiave).
const BLS_API = "https://api.bls.gov/publicAPI/v1/timeseries/data/";
const BLS_SER = {
  cpi: { cpi_mm: ["mm", "CUSR0000SA0"], ccpi_mm: ["mm", "CUSR0000SA0L1E"], cpi_yy: ["yy", "CUUR0000SA0"], ccpi_yy: ["yy", "CUUR0000SA0L1E"] },
  ppi: { ppi_mm: ["mm", "WPSFD4"], cppi_mm: ["mm", "WPSFD49104"], ppi_yy: ["yy", "WPUFD4"], cppi_yy: ["yy", "WPUFD49104"] },
  nfp: { nfp: ["dk", "CES0000000001"], ur: ["lv", "LNS14000000"], ahe_mm: ["mm", "CES0500000003"], ahe_yy: ["yy", "CES0500000003"] }
};
const FRED_SER = {
  pce: { pce_mm: ["mm", "PCEPI"], pce_yy: ["yy", "PCEPI"], cpce_mm: ["mm", "PCEPILFE"], cpce_yy: ["yy", "PCEPILFE"], spend_mm: ["mm", "PCE"], inc_mm: ["mm", "PI"] },
  gdp: { gdp: ["lvq", "A191RL1Q225SBEA"], gdpdef: ["lvq", "A191RI1Q225SBEA"] }
};
const r1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
// serie ordinata [{ y, m, v }] → valore come lo scrive il calendario (es. "0.3%", "150K")
function metric(kind, s) {
  const L = s[s.length - 1];
  if (!L) return null;
  const at = (y, m) => s.find((x) => x.y === y && x.m === m);
  const pm = L.m === 1 ? at(L.y - 1, 12) : at(L.y, L.m - 1), py = at(L.y - 1, L.m);
  if (kind === "mm") return pm ? r1((L.v / pm.v - 1) * 100) + "%" : null;
  if (kind === "yy") return py ? r1((L.v / py.v - 1) * 100) + "%" : null;
  if (kind === "dk") return pm ? Math.round(L.v - pm.v) + "K" : null;
  if (kind === "lv" || kind === "lvq") return r1(L.v) + "%";
  return null;
}
// mese (o trimestre) dei dati che l'uscita deve contenere: il mese prima / il trimestre prima
function expected(k, t) {
  const p = nyParts(t);
  if (k === "gdp") { const q = Math.floor((p.m - 1) / 3), y = q === 0 ? p.y - 1 : p.y, qq = q === 0 ? 4 : q; return { y, m: (qq - 1) * 3 + 1 }; }
  return p.m === 1 ? { y: p.y - 1, m: 12 } : { y: p.y, m: p.m - 1 };
}
const same = (a, b) => a && b && a.y === b.y && a.m === b.m;
// richieste all'API BLS (senza registrazione: 25 al giorno): le conto per dosarle nei minuti dopo un'uscita
let blsUse = null;
async function blsCount(add) {
  const d = nyToday();
  if (!blsUse || blsUse.d !== d) blsUse = ((await chrome.storage.local.get("blsn").catch(() => ({}))).blsn) || { d, n: 0 };
  if (blsUse.d !== d) blsUse = { d, n: 0 };
  if (add) { blsUse.n++; chrome.storage.local.set({ blsn: blsUse }).catch(() => {}); }
  return blsUse.n;
}
async function blsSeries(ids, y) {
  await blsCount(true);
  const r = await fetch(BLS_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seriesid: ids, startyear: String(y - 1), endyear: String(y) }), cache: "no-store" });
  const j = await r.json();
  if (j.status !== "REQUEST_SUCCEEDED") throw new Error((j.message || []).join(" ") || j.status);
  const out = {};
  for (const se of j.Results.series || []) {
    out[se.seriesID] = (se.data || []).filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period) && d.value !== "-")
      .map((d) => ({ y: +d.year, m: +d.period.slice(1), v: +d.value })).sort((a, b) => a.y - b.y || a.m - b.m);
  }
  return out;
}
async function fredSeries(id, y) {
  const t = await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${y - 2}-01-01`);
  return t.trim().split(/\r?\n/).slice(1).map((l) => l.split(",")).filter((c) => c[1] && c[1] !== ".")
    .map((c) => ({ y: +c[0].slice(0, 4), m: +c[0].slice(5, 7), v: +c[1] }));
}
// file Census: prima tabella (vendite destagionalizzate, milioni di dollari) anno | gen … dic
function censusTxt(t) {
  const out = [];
  let on = false;
  for (const l of t.split(/\r?\n/)) {
    if (/^\s*YEAR\s+JAN/i.test(l)) { if (out.length) break; on = true; continue; }
    const m = on && /^\s*(\d{4})\s+(.+)$/.exec(l);
    if (m) m[2].trim().split(/\s+/).forEach((v, i) => { if (/^-?\d+(\.\d+)?$/.test(v)) out.push({ y: +m[1], m: i + 1, v: +v }); });
    else if (on && out.length && l.trim() === "") break;
  }
  return out;
}
// comunicato della Fed: "target range for the federal funds rate at 3-3/4 to 4 percent" → "4.00%"
function fedRate(html) {
  // "…maintain the target range … at 3-3/4 to 4 percent" oppure "…lower the target range … by 1/4 percentage point to 3-1/2 to 3-3/4 percent"
  const m = /target range for the federal funds rate[^.]*?(?:at|to) (\d+(?:-\d\/\d)?) to (\d+(?:-\d\/\d)?) percent/i.exec(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
  if (!m) return null;
  const num = (s) => { const [a, f] = s.trim().split("-"); let v = +a; if (f) { const [n, d] = f.split("/"); v += +n / +d; } return v; };
  return num(m[2]).toFixed(2) + "%";
}
// ---------- Comunicato BLS appena uscito (CPI, PPI, rapporto sul lavoro) ----------
// La pagina del comunicato è online alle 8:30 in punto, l'API BLS si aggiorna qualche minuto dopo:
// leggo i valori dal comunicato e uso l'API solo se la pagina non si lascia leggere.
const REL_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const MON_AB = ["Jan", "Feb", "Mar", "Apr", "May", "June?", "July?", "Aug", "Sept?", "Oct", "Nov", "Dec"];
const REL_CODE = { cpi: "cpi", ppi: "ppi", nfp: "empsit" };
const REL_TITLE = { cpi: /CONSUMER PRICE INDEX\s*[-–—]+\s*([A-Z]+)\s+(\d{4})/i, ppi: /PRODUCER PRICE INDEXES\s*[-–—]+\s*([A-Z]+)\s+(\d{4})/i, nfp: /THE EMPLOYMENT SITUATION\s*[-–—]+\s*([A-Z]+)\s+(\d{4})/i };
const REL_NEED = { cpi: ["cpi_mm", "ccpi_mm"], ppi: ["ppi_mm", "cppi_mm"], nfp: ["nfp", "ur"] };
function relText(html) {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;/g, "–").replace(/&#8212;|&mdash;/g, "—").replace(/&#8722;|&minus;/g, "-").replace(/&#\d+;|&\w+;/g, " ")
    .replace(/[−]/g, "-").replace(/\s+/g, " ");
}
const pc = (v) => (v == null || isNaN(v) ? null : r1(v) + "%");
// "increased 0.4 percent", "moved up 0.5 percent", "declined 0.2 percent", "was unchanged": variazione col segno giusto
function relChg(txt, subject) {
  const i = txt.search(subject);
  if (i < 0) return null;
  const seg = txt.slice(i, i + 260).split(/\.\s/)[0];
  const m = /\b(unchanged|(?:[a-z]+\s){0,3}?)(?:by\s)?(-?\d+(?:\.\d+)?) percent/i.exec(seg);
  if (/\bwas unchanged|\bunchanged\b/i.test(seg) && (!m || seg.search(/unchanged/i) < seg.indexOf(m[0]))) return 0;
  if (!m) return null;
  const v = +m[2];
  return /(declin|decreas|fell|fall|down|lower|dropp|slipp)/i.test(m[1]) ? -Math.abs(v) : v;
}
// riga di una tabella: l'etichetta seguita da n numeri (o "-" se il dato manca)
// (cerco solo nella tabella A; "last": l'ultima riga con quell'etichetta, es. il mese di quest'anno dopo quello dell'anno scorso)
function relRow(txt, label, n, last) {
  const a = txt.search(/Table A\b/), b = a < 0 ? -1 : txt.slice(a + 8).search(/Table B\b|Technical Note/);
  const tab = a < 0 ? "" : txt.slice(a, b < 0 ? a + 6000 : a + 8 + b);
  const re = new RegExp(label + "(?:\\s*\\(\\w+\\))?\\s+((?:(?:-?\\d+\\.\\d|-)\\s+){" + (n - 1) + "}(?:-?\\d+\\.\\d|-))(?=\\s|$)", "g");
  let m, out = null;
  while ((m = re.exec(tab))) { out = m[1].trim().split(/\s+/).map((x) => (x === "-" ? null : +x)); if (!last) break; }
  return out;
}
function parseRelease(k, html, exp) {
  let txt = relText(html);
  const tm = REL_TITLE[k].exec(txt);
  // il comunicato deve essere quello del mese atteso (prima delle 8:30 la pagina mostra ancora il mese prima)
  if (!tm || REL_MONTHS.indexOf(tm[1].toUpperCase()) + 1 !== exp.m || +tm[2] !== exp.y) return null;
  txt = txt.slice(tm.index); // solo il comunicato, senza i menu del sito
  const vals = {}, prevs = {};
  if (k === "cpi") {
    // tabella A: 7 mesi destagionalizzati + variazione su 12 mesi (non destagionalizzata, "-" se non pubblicata)
    const a = relRow(txt, "All items", 8), c = relRow(txt, "All items less food and energy", 8);
    if (a) { vals.cpi_mm = pc(a[6]); prevs.cpi_mm = pc(a[5]); vals.cpi_yy = pc(a[7]); }
    if (c) { vals.ccpi_mm = pc(c[6]); prevs.ccpi_mm = pc(c[5]); vals.ccpi_yy = pc(c[7]); }
    vals.cpi_mm = vals.cpi_mm || pc(relChg(txt, /Consumer Price Index for All Urban Consumers \(CPI-U\)/i));
    vals.ccpi_mm = vals.ccpi_mm || pc(relChg(txt, /index for all items less food and energy/i));
  } else if (k === "ppi") {
    // tabella A: una riga per mese; colonne: totale, senza alimentari/energia/commercio, … , 12 mesi totale, 12 mesi core
    const lab = (m) => "\\b" + MON_AB[m - 1] + "\\.?", pm = exp.m === 1 ? 12 : exp.m - 1;
    const r = relRow(txt, lab(exp.m), 12, true), q = relRow(txt, lab(pm), 12, true);
    if (r) { vals.ppi_mm = pc(r[0]); vals.cppi_mm = pc(r[1]); vals.ppi_yy = pc(r[10]); vals.cppi_yy = pc(r[11]); }
    if (q) { prevs.ppi_mm = pc(q[0]); prevs.cppi_mm = pc(q[1]); }
    vals.ppi_mm = vals.ppi_mm || pc(relChg(txt, /Producer Price Index for final demand/i));
    vals.cppi_mm = vals.cppi_mm || pc(relChg(txt, /final demand less foods, energy, and trade services/i));
    vals.ppi_yy = vals.ppi_yy || pc(relChg(txt, /index for final demand \w+(?: \w+)? -?\d+\.\d percent for the 12 months/i));
  } else if (k === "nfp") {
    const p = /Total nonfarm payroll employment ([^.]*?)(?:by ([\d,]+)|\(([+\-]?[\d,]+)\))/i.exec(txt);
    if (p) {
      let v = +(p[2] || p[3]).replace(/[,+]/g, "");
      if (p[2] && /(declin|decreas|fell|down|lost)/i.test(p[1])) v = -v;
      vals.nfp = Math.round(v / 1000) + "K";
    }
    const u = /unemployment rate[^.]*?(\d+\.\d) percent/i.exec(txt);
    if (u) vals.ur = u[1] + "%";
    // "average hourly earnings … rose by 14 cents, or 0.2 percent, to $36.67" (a volte senza la percentuale)
    const h = /average hourly earnings for all employees on private nonfarm payrolls ([^$]{0,80}?\$\d+\.\d\d)/i.exec(txt);
    if (h) {
      const pct = /(-?\d+\.\d) percent/.exec(h[1]), ce = /(\d+) cents?/.exec(h[1]), lv = /\$(\d+\.\d\d)/.exec(h[1]);
      const neg = /(declin|decreas|fell|down)/i.test(h[1]);
      if (pct) vals.ahe_mm = pc(neg ? -pct[1] : +pct[1]);
      else if (ce && lv) { const d = (neg ? -1 : 1) * ce[1] / 100; vals.ahe_mm = pc((d / (lv[1] - d)) * 100); }
      else if (/unchanged/i.test(h[1])) vals.ahe_mm = "0.0%";
    }
    const hy = /Over the (?:past|last) 12 months, average hourly earnings have ([a-z ]*?)by (\d+\.\d) percent/i.exec(txt);
    if (hy) vals.ahe_yy = pc(/(declin|decreas|fell|down)/i.test(hy[1]) ? -hy[2] : +hy[2]);
  }
  for (const x of Object.keys(vals)) if (!vals[x]) delete vals[x];
  return REL_NEED[k].every((x) => vals[x]) ? { vals, prevs } : null;
}
async function blsRelease(k, t) {
  const html = await fetchText(`${BLS}/news.release/${REL_CODE[k]}.nr0.htm?t=${Math.floor(Date.now() / 2000)}`, 8000);
  return parseRelease(k, html, expected(k, t));
}
async function computeActual(k, t, prev) {
  const y = nyParts(t).y, exp = expected(k, t), vals = {}, prevs = {};
  const both = (key, kind, ser) => { vals[key] = metric(kind, ser); prevs[key] = metric(kind, ser.slice(0, -1)); };
  let fresh = false;
  if (BLS_SER[k]) {
    // prima il comunicato (subito alle 8:30); l'API solo se non riesco a leggerlo, dopo qualche minuto
    const rel = await blsRelease(k, t).catch(() => null);
    if (rel) return { vals: rel.vals, prevs: rel.prevs, fresh: true, src: "rel" };
    if (Date.now() - t < 4 * 60000) return { vals: {}, prevs: {}, fresh: false };
    const defs = BLS_SER[k], ser = await blsSeries([...new Set(Object.values(defs).map((d) => d[1]))], y);
    const last = (id) => (ser[id] || [])[(ser[id] || []).length - 1];
    fresh = Object.values(defs).every(([, id]) => same(last(id), exp));
    if (fresh) for (const [key, [kind, id]] of Object.entries(defs)) both(key, kind, ser[id] || []);
  } else if (k === "retail") {
    const [a, b] = await Promise.all(["44X72", "44Y72"].map((c) => fetchText(`https://www.census.gov/retail/marts/www/adv${c}.txt`).then(censusTxt)));
    fresh = same(a[a.length - 1], exp) && same(b[b.length - 1], exp);
    if (fresh) { both("ret_mm", "mm", a); both("cret_mm", "mm", b); }
  } else if (FRED_SER[k]) {
    const defs = FRED_SER[k], ids = [...new Set(Object.values(defs).map((d) => d[1]))];
    const ser = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await fredSeries(id, y)])));
    const last = (id) => ser[id][ser[id].length - 1];
    fresh = ids.every((id) => same(last(id), exp));
    if (fresh) for (const [key, [kind, id]] of Object.entries(defs)) both(key, kind, ser[id]);
    // PIL: seconda e terza stima rivedono lo stesso trimestre. Lo considero aggiornato se il valore
    // è cambiato rispetto alla stima precedente, oppure passati 90 minuti dall'uscita.
    if (fresh && k === "gdp" && prev && prev.gdp && Date.now() - t < 90 * 60000 && parseFloat(prev.gdp) === parseFloat(vals.gdp)) fresh = false;
  } else if (k === "fomc") {
    const d = nyParts(t), url = `${FED}/newsevents/pressreleases/monetary${d.y}${pad(d.m)}${pad(d.d)}a.htm`;
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) { const v = fedRate(await r.text()); if (v) { vals.ffr = v; fresh = true; } }
  }
  return { vals: fresh ? vals : {}, prevs: fresh ? prevs : {}, fresh };
}
const ACT_WAIT = { cpi: 120000, ppi: 120000, nfp: 120000 }; // BLS: senza registrazione 25 richieste al giorno
const actJob = {};
async function actual(k, t, prev) {
  const key = `${k}:${t}`, { act = {} } = await chrome.storage.local.get("act").catch(() => ({}));
  const c = act[key];
  if (c && c.fresh) return c;
  if (Date.now() < t) return { fresh: false, vals: {} };
  // nei 10 minuti dopo l'uscita chiedo il dato ogni pochi secondi (BLS: finché resta margine sul limite giornaliero)
  const since = Date.now() - t, n = BLS_SER[k] ? await blsCount(false) : 0;
  // BLS: il comunicato si legge ogni 2,5 s nei primi 4 minuti; dopo entra in gioco anche l'API, da dosare
  const wait = since > 6 * 3600000 ? 30 * 60000 : since < 4 * 60000 ? 2500 : since < 10 * 60000 ? (BLS_SER[k] ? (n < 16 ? 4000 : n < 22 ? 20000 : 120000) : 2500) : ACT_WAIT[k] || 60000;
  if (c && Date.now() - c.at < wait) return c;
  if (!actJob[key]) actJob[key] = (async () => {
    let out;
    try { out = { at: Date.now(), ...(await computeActual(k, t, prev)) }; }
    catch (e) { out = { at: Date.now(), fresh: false, vals: {}, err: String(e.message || e).slice(0, 120) }; }
    const { act: a2 = {} } = await chrome.storage.local.get("act").catch(() => ({}));
    a2[key] = out;
    for (const x of Object.keys(a2)) if (+x.split(":")[1] < Date.now() - 30 * 86400000) delete a2[x]; // tengo un mese
    await chrome.storage.local.set({ act: a2 }).catch(() => {});
    return out;
  })().finally(() => { delete actJob[key]; });
  return actJob[key];
}

// ---------- Calendario degli utili (earnings) delle società USA ----------
// Fonte: calendario utili di Nasdaq (tutte le società quotate negli USA, giorno per giorno: orario,
// stima del consenso, EPS di un anno fa e, dopo la pubblicazione, EPS effettivo e sorpresa).
// Se Nasdaq non risponde: calendario utili di Yahoo Finance (stesse date, meno dettagli).
// Ogni giorno è salvato a parte con l'ora del download e si riscarica solo quando serve:
//   oggi       ogni 10 minuti nelle finestre dei report (6:00–10:00 e 16:00–19:30 ET), altrimenti ogni ora
//   giorni futuri ogni 6 ore (cambiano solo date e stime)
//   giorni passati mai, una volta scaricati dopo la fine dei report (dati definitivi)
// Riga salvata: [simbolo, nome, capitalizzazione, sessione "b"|"a"|"n", stima, effettivo, sorpresa %, EPS un anno fa, n. stime]
const EARN_KEEP = 35 * 864e5;
let earnMem = null, earnSave = null;
const earnJob = {}, earnFail = {};
async function earnStore() {
  if (!earnMem) earnMem = ((await chrome.storage.local.get("earn").catch(() => ({}))).earn) || {};
  return earnMem;
}
function earnPersist() {
  clearTimeout(earnSave);
  earnSave = setTimeout(() => {
    const lim = Date.now() - EARN_KEEP, hi = Date.now() + EARN_KEEP;
    for (const d of Object.keys(earnMem)) { const { y, m, d: g } = ymd(d), t = Date.UTC(y, m - 1, g); if (t < lim || t > hi) delete earnMem[d]; }
    chrome.storage.local.set({ earn: earnMem }).catch(() => {});
  }, 400);
}
const nyToday = () => { const p = nyParts(Date.now()); return iso(p.y, p.m, p.d); };
function earnStale(day, e, force) {
  if (!e || e.v !== 4) return true; // v3: stime, EPS e sorpresa allineati a Yahoo Finance; orario del report conservato
  const now = Date.now(), today = nyToday(), age = now - e.at;
  const { y, m, d } = ymd(day);
  if (day < today) return e.at < etToUTC(y, m, d, 23, 59) + 10 * 3600000 && age > (force ? 0 : 3600000); // passato: definitivo dopo le 10 ET del giorno dopo
  if (day > today) return age > (force ? 60000 : 6 * 3600000);
  const p = nyParts(now), mn = p.h * 60 + p.mi, win = (mn >= 360 && mn <= 600) || (mn >= 960 && mn <= 1170);
  return age > (force ? 60000 : win ? 10 * 60000 : 3600000);
}
// "$1.23" · "($0.45)" · "-$0.45" · "N/A" → numero o null
function money(v) {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s || /^n\/?a$|^--?$/i.test(s)) return null;
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s);
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isFinite(n) ? (neg ? -n : n) : null;
}
const ySym = (s) => String(s || "").trim().toUpperCase().replace(/[./]/g, "-");
// Yahoo: "BMO"/"AMC", oppure "TAS" con l'ora esatta (dopo il report spesso resta solo quella)
function ySess(type, t) {
  const k = sess(type);
  if (k !== "n" || !/TAS/i.test(type || "") || !isFinite(t)) return k;
  const p = nyParts(t), mn = p.h * 60 + p.mi;
  return mn > 0 && mn < 570 ? "b" : mn >= 960 ? "a" : "n";
}
const sess = (t) => (/pre|bmo/i.test(t || "") ? "b" : /after|amc/i.test(t || "") ? "a" : "n");
async function nasdaqDay(day) {
  const r = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${day}`, { cache: "no-store", credentials: "omit", headers: { Accept: "application/json, text/plain, */*" } });
  if (!r.ok) throw new Error(`Nasdaq ${r.status}`);
  const j = await r.json();
  if (!j || (j.status && j.status.rCode && j.status.rCode !== 200)) throw new Error("Nasdaq: risposta non valida");
  const rows = (j.data && j.data.rows) || [];
  return rows.filter((x) => x && x.symbol).map((x) => {
    const est = money(x.epsForecast), act = money(x.eps);
    let sur = money(x.surprise);
    if (sur == null && act != null && est) sur = ((act - est) / Math.abs(est)) * 100;
    return [ySym(x.symbol), String(x.name || "").trim(), money(x.marketCap) || 0, sess(x.time), est, act, sur == null ? null : Math.round(sur * 100) / 100, money(x.lastYearEPS), parseInt(x.noOfEsts, 10) || 0];
  });
}
// Ripiego: calendario utili di Yahoo (una richiesta per tutta la settimana, ordinato per capitalizzazione)
async function yahooWeek(days, maxRows = 1000) {
  const c = await getCrumb();
  if (!c) throw new Error("Yahoo: sessione non disponibile");
  const to = ymd(days[days.length - 1]), end = new Date(Date.UTC(to.y, to.m - 1, to.d + 1)).toISOString().slice(0, 10);
  const out = Object.fromEntries(days.map((d) => [d, []]));
  // Yahoo restituisce al massimo 100 righe per richiesta (con di più la richiesta viene rifiutata): vado a pagine
  const PAGE = 100;
  for (let off = 0; off < maxRows; off += PAGE) {
    const body = {
      sortType: "DESC", entityIdType: "sp_earnings", sortField: "intradaymarketcap", offset: off, size: PAGE,
      includeFields: ["ticker", "companyshortname", "intradaymarketcap", "startdatetime", "startdatetimetype", "epsestimate", "epsactual", "epssurprisepct"],
      query: { operator: "and", operands: [{ operator: "gte", operands: ["startdatetime", days[0]] }, { operator: "lt", operands: ["startdatetime", end] }, { operator: "eq", operands: ["region", "us"] }] },
    };
    const r = await fetch(`${Y}/v1/finance/visualization?lang=en-US&region=US&crumb=${encodeURIComponent(c)}`, {
      method: "POST", cache: "no-store", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Yahoo ${r.status}`);
    const jj = await r.json(), fe = jj && jj.finance && jj.finance.error;
    if (fe) throw new Error(`Yahoo: ${fe.description || fe.code || "errore"}`);
    const doc = ((jj.finance || {}).result || [])[0];
    const dd = doc && doc.documents && doc.documents[0];
    if (!dd || !dd.rows) break;
    const col = Object.fromEntries((dd.columns || []).map((x, i) => [x.id, i]));
    for (const row of dd.rows) {
      const v = (k) => (col[k] == null ? null : row[col[k]]);
      const t = typeof v("startdatetime") === "number" ? v("startdatetime") : Date.parse(v("startdatetime"));
      if (!isFinite(t)) continue;
      const u = new Date(t), p = nyParts(t), day = u.getUTCHours() === 0 && u.getUTCMinutes() === 0 ? u.toISOString().slice(0, 10) : iso(p.y, p.m, p.d); // senza orario Yahoo mette la mezzanotte UTC (in America è ancora il giorno prima)
      if (!out[day]) continue;
      const est = money(v("epsestimate")), act = money(v("epsactual")), sur = money(v("epssurprisepct"));
      out[day].push([ySym(v("ticker")), String(v("companyshortname") || "").trim(), money(v("intradaymarketcap")) || 0, ySess(v("startdatetimetype"), t), est, act, sur == null ? null : Math.round(sur * 100) / 100, null, 0, /^(BMO|AMC|TNS)$/i.test(v("startdatetimetype") || "") || !isFinite(t) ? null : t]);
    }
    if (dd.rows.length < PAGE) break;
  }
  return out;
}
// EPS effettivo dal riepilogo utili del singolo titolo su Yahoo (lo stesso della pagina del titolo):
// l'ultimo trimestre chiuso, solo se è proprio quello appena pubblicato (fine trimestre entro 80 giorni dal report)
async function yahooActual(sym, dayMs) {
  for (let a = 0; a < 2; a++) {
    const c = await getCrumb(a > 0);
    if (!c) throw new Error("sessione Yahoo non disponibile");
    const r = await fetch(`${Y}/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=earningsHistory&crumb=${encodeURIComponent(c)}`, { cache: "no-store", credentials: "include" });
    if (r.status === 401 || r.status === 403) continue;
    if (!r.ok) throw new Error(`riepilogo utili ${r.status}`);
    const j = await r.json();
    const res = ((j && j.quoteSummary && j.quoteSummary.result) || [])[0];
    const h = ((res && res.earningsHistory && res.earningsHistory.history) || []).filter((x) => x && x.quarter && x.quarter.raw).sort((x, y) => y.quarter.raw - x.quarter.raw);
    const it = h[0];
    if (!it) return null;
    const gap = dayMs - it.quarter.raw * 1000;
    if (!(gap > 0 && gap < 80 * 864e5)) return null; // è ancora il trimestre prima: Yahoo non l'ha aggiornato
    const v = it.epsActual && it.epsActual.raw, e = it.epsEstimate && it.epsEstimate.raw, sp = it.surprisePercent && it.surprisePercent.raw;
    if (!(typeof v === "number" && isFinite(v))) return null;
    return { act: v, est: typeof e === "number" && isFinite(e) ? e : null, sur: typeof sp === "number" && isFinite(sp) ? Math.round(sp * 10000) / 100 : null };
  }
  throw new Error("riepilogo utili: accesso negato");
}
let earnYErr = null; // ultimo problema con Yahoo per gli EPS di oggi (compare nella nota in fondo)
async function mineSyms() {
  try { const v = await chrome.storage.local.get(["lists", "pf"]); return new Set([...(v.lists || []).flatMap((l) => (l.items || []).map((x) => x.s)), ...(v.pf || []).map((x) => x.s)]); }
  catch (_) { return new Set(); }
}
// Nasdaq, per i giorni passati, non dice più se il report era prima o dopo la seduta: tengo quello già saputo
function keepSess(old, rows) {
  const by = new Map(((old && old.rows) || []).map((r) => [r[0], r]));
  for (const r of rows) { const o = by.get(r[0]); if (!o) continue; if (r[3] === "n" && o[3] && o[3] !== "n") r[3] = o[3]; if (!r[9] && o[9]) r[9] = o[9]; }
  return rows;
}
// Mini grafico nelle righe degli utili di oggi: andamento della seduta (candele da 5 minuti) e chiusura precedente
const spMem = new Map();
async function spark(sym) {
  const today = nyToday(), k = `${sym}|${today}`, c = spMem.get(k);
  if (c && Date.now() - c.at < 50000) return c.v;
  const { y, m, d } = ymd(today), open = etToUTC(y, m, d, 9, 30) / 1000;
  const r = await getJSON(`${Y}/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d&includePrePost=false`);
  const j = await r.json().catch(() => null), res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) throw new Error(`HTTP ${r.status}`);
  const ts = res.timestamp || [], cl = (((res.indicators || {}).quote || [])[0] || {}).close || [], meta = res.meta || {};
  const p = [];
  for (let i = 0; i < ts.length; i++) if (cl[i] != null && ts[i] >= open && ts[i] < open + 23400) p.push([Math.round((ts[i] - open) / 300), +cl[i].toPrecision(6)]); // solo la seduta di oggi
  const pc = meta.chartPreviousClose || meta.previousClose || null;
  const v = { pc: pc ? +(+pc).toPrecision(6) : null, p };
  spMem.set(k, { at: Date.now(), v });
  while (spMem.size > 300) spMem.delete(spMem.keys().next().value);
  return v;
}
// settimana che comincia il lunedì `mon` (data di New York, AAAA-MM-GG)
async function earnings(mon, force) {
  const S = await earnStore(), { y, m, d } = ymd(mon);
  const days = [0, 1, 2, 3, 4].map((i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
  const stale = days.filter((x) => earnStale(x, S[x], force));
  let fail = earnFail[mon] && Date.now() - earnFail[mon].at < 5 * 60000 && !force ? earnFail[mon].f : ""; // fonti giù da poco: non insisto
  if (stale.length && !fail) {
    const key = mon + (force ? "!" : "");
    if (!earnJob[key]) earnJob[key] = (async () => {
      const miss = [];
      await Promise.all(stale.map(async (x) => {
        try { S[x] = { v: 4, at: Date.now(), src: "n", rows: keepSess(S[x], await nasdaqDay(x)) }; } catch (e) { miss.push(x); }
      }));
      // il calendario di Nasdaq aggiunge l'EPS effettivo solo dal giorno dopo: per oggi e ieri lo prendo da
      // Yahoo appena esce, insieme all'orario annunciato dall'azienda quando c'è
      const today = nyToday(), { y: ty, m: tm, d: td } = ymd(today), yday = iso(...(() => { const t = new Date(Date.UTC(ty, tm - 1, td - 1)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; })());
      // Stima, EPS effettivo e sorpresa: quelli di Yahoo Finance quando ci sono. Nasdaq usa un altro consenso
      // degli analisti (Zacks) e un EPS arrotondato, quindi la sorpresa veniva diversa da quella che vedi su Yahoo.
      const fill = stale.filter((x) => (x === today || x === yday) && S[x] && S[x].src === "n");
      const ysrc = stale.filter((x) => S[x] && S[x].src === "n");
      if (ysrc.length) {
        try {
          const w = await yahooWeek(ysrc, 500);
          for (const x of ysrc) {
            const by = new Map([...Object.values(w).flat(), ...(w[x] || [])].map((r) => [r[0], r])); // il giorno giusto per ultimo: vince lui
            for (const r of S[x].rows) {
              const y = by.get(r[0]);
              if (!y) continue;
              if (y[4] != null) r[4] = y[4];
              if (y[5] != null) { r[5] = y[5]; r[6] = y[6] != null ? y[6] : r[4] ? Math.round(((y[5] - r[4]) / Math.abs(r[4])) * 10000) / 100 : null; }
              else if (r[5] != null && r[4]) r[6] = Math.round(((r[5] - r[4]) / Math.abs(r[4])) * 10000) / 100; // stima di Yahoo, EPS ancora solo da Nasdaq
              if (y[9]) r[9] = y[9];
              if (r[3] === "n" && y[3] !== "n") r[3] = y[3]; // Nasdaq toglie l'orario (prima/dopo la seduta) dai giorni passati
            }
          }
          earnYErr = null;
        } catch (e) { if (fill.length) earnYErr = { at: Date.now(), msg: (e && e.message) || "errore" }; }
        // chi manca ancora (il calendario di Yahoo a volte si aggiorna tardi): riepilogo utili del titolo, per i
        // tuoi titoli e per le società più grandi, solo dopo l'orario del report
        try {
          const mine = await mineSyms(), now = Date.now(), ask = [];
          for (const x of fill) {
            const { y: yy, m: mm, d: dd } = ymd(x);
            const due = (r) => now >= (r[9] || (r[3] === "b" ? etToUTC(yy, mm, dd, 7, 0) : r[3] === "a" ? etToUTC(yy, mm, dd, 16, 5) : etToUTC(yy, mm, dd, 8, 0)));
            const todo = S[x].rows.filter((r) => r[5] == null && due(r)).sort((a, b) => (b[2] || 0) - (a[2] || 0));
            todo.forEach((r, i) => { if (mine.has(r[0]) || i < 12) ask.push([x, r]); });
          }
          let errs = 0, oks = 0, last = "";
          for (let i = 0; i < Math.min(ask.length, 30); i += 6) {
            await Promise.all(ask.slice(i, i + 6).map(async ([x, r]) => {
              const { y: yy, m: mm, d: dd } = ymd(x);
              try {
                const v = await yahooActual(r[0], etToUTC(yy, mm, dd, 12, 0));
                oks++;
                if (v != null) { if (v.est != null) r[4] = v.est; r[5] = v.act; r[6] = v.sur != null ? v.sur : r[4] ? Math.round(((v.act - r[4]) / Math.abs(r[4])) * 10000) / 100 : null; }
              } catch (e) { errs++; last = (e && e.message) || "errore"; }
            }));
          }
          if (oks) earnYErr = null; // la seconda strada funziona: niente avviso
          else if (errs && !earnYErr) earnYErr = { at: Date.now(), msg: last };
        } catch (_) {}
      }
      if (miss.length) {
        try {
          const w = await yahooWeek(days);
          for (const x of miss) S[x] = { v: 4, at: Date.now(), src: "y", rows: keepSess(S[x], w[x] || []) };
          return "nasdaq";
        } catch (e) { return S[miss[0]] ? "nasdaq+yahoo-old" : "nasdaq+yahoo"; }
      }
      return "";
    })().finally(() => { delete earnJob[key]; earnPersist(); });
    fail = await earnJob[key];
    if (fail) earnFail[mon] = { at: Date.now(), f: fail }; else delete earnFail[mon];
  }
  const yerr = earnYErr && Date.now() - earnYErr.at < 30 * 60000 ? earnYErr.msg : "";
  return { mon, today: nyToday(), fail, yerr, days: Object.fromEntries(days.map((x) => [x, S[x] || null])) };
}
