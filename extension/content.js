(() => {
  if (window.top !== window || document.getElementById("mt-host")) return;
  // nel pannello laterale del browser (panel.html): sempre aperto, largo quanto il pannello
  const PANEL = !!globalThis.__twPanel;

  // ---------- Grafici nitidi anche ingranditi col pizzico (touchpad o schermo touch) ----------
  // I grafici sono disegnati su canvas alla risoluzione dello schermo. Lo zoom del browser (Ctrl +) li ridisegna,
  // ma l'ingrandimento col pizzico allarga solo l'immagine già disegnata, che sgrana. La libreria misura la
  // risoluzione con ResizeObserver (devicePixelContentBoxSize): qui moltiplico quella misura per l'ingrandimento
  // del pizzico (fino a 3×) e, quando cambia, faccio ridisegnare i grafici alla nuova risoluzione.
  (() => {
    const RO = window.ResizeObserver, vv = window.visualViewport;
    if (!RO || !vv) return;
    const live = new Set();
    const zoom = () => Math.min(3, Math.max(1, Math.round((vv.scale || 1) * 4) / 4));
    const scaled = (e, f) => {
      const d = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0];
      if (f === 1 || !d) return e;
      return { target: e.target, contentRect: e.contentRect, contentBoxSize: e.contentBoxSize, borderBoxSize: e.borderBoxSize,
        devicePixelContentBoxSize: [{ inlineSize: Math.round(d.inlineSize * f), blockSize: Math.round(d.blockSize * f) }] };
    };
    class SharpRO {
      constructor(cb) {
        this.cb = cb; this.last = new Map();
        this.ro = new RO((es) => {
          for (const e of es) if (e.devicePixelContentBoxSize) { this.last.set(e.target, e); live.add(this); }
          const f = zoom();
          cb(f === 1 ? es : es.map((e) => scaled(e, f)), this);
        });
      }
      observe(t, o) { this.ro.observe(t, o); }
      unobserve(t) { this.last.delete(t); this.ro.unobserve(t); }
      disconnect() { this.last.clear(); this.ro.disconnect(); live.delete(this); }
      takeRecords() { return this.ro.takeRecords(); }
    }
    window.ResizeObserver = SharpRO;
    let curF = 1, tmr = 0;
    vv.addEventListener("resize", () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => { // quando il pizzico si ferma: un solo ridisegno
        const f = zoom();
        if (f === curF) return;
        curF = f;
        for (const o of live) {
          const es = [...o.last.values()].filter((e) => e.target.isConnected);
          if (es.length) try { o.cb(es.map((e) => scaled(e, f)), o); } catch (_) {}
        }
      }, 160);
    });
  })();

  // ---------- Costanti ----------
  const MAX = 100; // ticker massimi per lista
  const DEFAULTS = [
    { s: "FTSEMIB.MI", n: "FTSE MIB" },
    { s: "^GSPC", n: "S&P 500" },
    { s: "^IXIC", n: "NASDAQ" },
    { s: "BTC-USD", n: "BTC" },
    { s: "ETH-USD", n: "ETH" },
    { s: "EURUSD=X", n: "EUR/USD" }
  ];
  // ordinamento dalle intestazioni: 1° clic dal maggiore al minore (Z–A), 2° inverte, 3° ordine originale
  const COLS = [["n", "Ticker", "az", "za"], ["r", "Trend", "pd", "pa"], ["y", "% Ult. chius.", "yd", "ya"], ["p", "% Oggi", "pd", "pa"]];
  const SORTS = ["none", ...COLS.flatMap((c) => [c[2], c[3]])];
  // portafoglio: Titolo A–Z poi Z–A; Oggi, Valore e Totale dal maggiore al minore, poi al contrario; 3° clic: ordine tuo
  // portafoglio: Rendimento (guadagno o perdita e %), Valore (prezzo e % di oggi), Totale (valore della posizione)
  const PCOLS = [["n", "Titolo", "az", "za"], ["g", "Rendimento", "gd", "ga"], ["r", "Prezzo", "rd", "ra"], ["v", "Valore", "vd", "va"], ["q", "Q.tà × PMC", "qd", "qa"], ["d", "Oggi", "dd", "da"]];
  const PSORTS = ["none", ...PCOLS.flatMap((c) => [c[2], c[3]])];
  const MAX_PF = 100;
  const PFCURS = [["EUR", "Euro €", "Euro €"], ["USD", "Dollaro $", "US dollar $"], ["GBP", "Sterlina £", "Pound £"], ["CHF", "Franco svizzero", "Swiss franc"]];
  const SEARCH = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  const LISTTAB = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
  const PFTAB = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 7V5.5a1.5 1.5 0 0 0-1.9-1.45L5.2 6.9A2.5 2.5 0 0 0 3.5 9.3"/><rect x="3.5" y="7" width="17" height="13" rx="2.6"/><path d="M20.5 11.5h-3.6a2 2 0 0 0 0 4h3.6"/><circle cx="17" cy="13.5" r=".6" fill="currentColor"/></svg>';
  const THEMES = [["auto", "Auto"], ["light", "Chiaro"], ["dark", "Scuro"]];
  const RANGES = [["1d", "1G"], ["5d", "5G"], ["1mo", "1M"], ["6mo", "6M"], ["ytd", "YTD"], ["1y", "1A"], ["5y", "5A"], ["max", "Tutto"]];
  const IVS = [["1m", "1m"], ["5m", "5m"], ["15m", "15m"], ["30m", "30m"], ["45m", "45m"], ["1h", "1h"], ["1d", "1D"], ["1wk", "1W"], ["1mo", "1M"]];
  // grafico a candele: quanto storico scaricare per ogni intervallo
  const IV_RANGE = { "1m": "1d", "5m": "5d", "15m": "5d", "30m": "5d", "45m": "5d", "1h": "6mo", "1d": "1y", "1wk": "5y", "1mo": "max" };
    const CT = [["candles", "Candele"], ["hollow", "Candele vuote"], ["bars", "Barre"], ["line", "Linea"], ["area", "Area"]];
  const svg = (d) => `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const CT_ICON = {
    candles: svg('<path d="M5 2v12M11 3v10"/><rect x="3.5" y="5" width="3" height="6" fill="currentColor"/><rect x="9.5" y="6" width="3" height="4" fill="currentColor"/>'),
    hollow: svg('<path d="M5 2v12M11 3v10"/><rect x="3.5" y="5" width="3" height="6"/><rect x="9.5" y="6" width="3" height="4" fill="currentColor"/>'),
    bars: svg('<path d="M5 2v12M3 5h2M5 11h2M11 3v10M9 6h2M11 10h2"/>'),
    line: svg('<path d="M1.5 12l4-5 3 3 6-7"/>'),
    area: svg('<path d="M1.5 12l4-5 3 3 6-7v11h-13z" fill="currentColor" fill-opacity=".3"/>')
  };
  const flatColor = (k) => k === "up" || k === "dn" || k === "lc" || k === "acc" || k === "cup" || k === "cdn" || k === "cln"; // colori salvati come stringa semplice
  // fuso orario dell'orologio e dell'asse dei tempi del grafico (principali borse europee e americane)
  const TZS = [
    ["America/New_York", "New York (NYSE, Nasdaq)", "NY"], ["America/Chicago", "Chicago (CME)", "CHI"], ["America/Toronto", "Toronto (TSX)", "TOR"],
    ["America/Mexico_City", "Città del Messico (BMV)", "MEX"], ["America/Sao_Paulo", "San Paolo (B3)", "SP"],
    ["Europe/London", "Londra (LSE)", "LON"], ["Europe/Rome", "Milano (Borsa Italiana)", "MIL"], ["Europe/Berlin", "Francoforte (Xetra)", "FRA"],
    ["Europe/Paris", "Parigi (Euronext)", "PAR"], ["Europe/Amsterdam", "Amsterdam (Euronext)", "AMS"], ["Europe/Madrid", "Madrid (BME)", "MAD"], ["Europe/Zurich", "Zurigo (SIX)", "ZUR"]
  ];
  const tzOf = () => TZS.find((x) => x[0] === st.tz) || TZS[0];
  let NY = null;
  const clockFmt = () => (NY = new Intl.DateTimeFormat(LOC, { timeZone: tzOf()[0], hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  const DEF_IV = { "1d": "5m", "5d": "15m", "1mo": "1h", "6mo": "1d", ytd: "1d", "1y": "1d", "5y": "1wk", max: "1mo" };
  const IND0 = {
    up: "#2bd97c", dn: "#ff6b3d", vol: true, // verde e arancio del tema
    ct: "candles", lc: "#2bd97c", lw: 2, acc: "#2bd97c", // lw: spessore della linea; acc: colore del tema            // tipo di grafico (candele, vuote, barre, linea, area) e colore linea
    // indicatori aggiunti dal pulsante ƒx (formule in indicators.js): { id, t: tipo, p: parametri, c: colori, w: spessori }
    fx: [
      { id: "e1", t: "ema", p: { len: 9 }, c: ["#f59e0b"], w: [2] },
      { id: "e2", t: "ema", p: { len: 21 }, c: ["#a855f7"], w: [2] },
      { id: "rsi", t: "rsi", p: { len: 14 }, c: ["#3b82f6"], w: [2] }
    ]
  };
  const MAX_FX = 30;
  const isHex = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
  const PAL = {
    // sfondo trasparente: dietro il grafico c'è il vetro del pannello
    light: { bg: "rgba(0,0,0,0)", tx: "#6c6f78", grid: "rgba(10,12,20,.05)", line: "rgba(10,12,20,.08)" },
    dark: { bg: "rgba(0,0,0,0)", tx: "#8e9099", grid: "rgba(255,255,255,.045)", line: "rgba(255,255,255,.08)" }
  };
  const LIVE_MS = 30000;
  const SWATCHES = [
    "#f23645", "#ff9800", "#ffeb3b", "#4caf50", "#089981", "#00bcd4", "#2962ff", "#673ab7", "#9c27b0", "#e91e63",
    "#f7525f", "#ffb74d", "#fff176", "#81c784", "#42bda8", "#4dd0e1", "#5b9cf6", "#9575cd", "#ba68c8", "#f06292",
    "#b22833", "#e65100", "#f9a825", "#2e7d32", "#056656", "#00838f", "#1848cc", "#4527a0", "#6a1b9a", "#ad1457",
    "#ffffff", "#d1d4dc", "#b2b5be", "#9598a1", "#787b86", "#5d606b", "#434651", "#2a2e39", "#131722", "#000000"
  ];
  const BARUP = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4" width="17" height="7" rx="2"/><path d="M8 20l4-4 4 4"/></svg>';
  const BARDN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4" width="17" height="7" rx="2"/><path d="M8 16l4 4 4-4"/></svg>';
  const CALICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/></svg>';
  const RELOAD = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/></svg>';
  // icone disegnate (non caratteri di testo): stanno centrate nei tasti con qualsiasi font
  const XICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  // provetta: prende un colore da qualsiasi punto dello schermo
  const DROPICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4.5l5 5M17 2.5a2.1 2.1 0 0 1 3 3l-2.2 2.2-3-3z"/><path d="M14.8 7.2L5.5 16.5 4 20l3.5-1.5 9.3-9.3"/></svg>';
  const XSM = '<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
  const ARROW = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v11M3.5 9l4.5 4.5L12.5 9"/></svg>';
  const CHEVL = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5"/></svg>';
  const CHEVR = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"/></svg>';
  const CHEV = '<svg class="chev" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
  const GEAR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  // ---------- Stato ----------
  let st = {
    lists: [{ id: "l1", name: "La mia lista", items: DEFAULTS }], cl: "l1",
    theme: "dark", hidden: false, open: false,
    bar: DEFAULTS.slice(0, 3), sort: "az", cr: "1d", ci: "5m", lr: "1y", ind: IND0,
    pf: [], tab: "list", psort: "none", pfcur: "EUR", fxr: null, fxh: {}, // pfcur: valuta del patrimonio; fxr: cambi del giorno; fxh: cambi storici (giorni degli acquisti)
    lang: null, // portafoglio: [{ s, n, t, q: quantità, p: prezzo di acquisto, c: valuta }]
    key: { code: "KeyM", key: "M", alt: true, shift: true, ctrl: false, meta: false }
  };
  const KEY0 = st.key;
  st.excl = []; // siti in cui il widget non compare
  st.nsub = {}; // notizie: titoli con gli avvisi attivi { simbolo: da quando (ms) }
  // il widget è su ogni pagina (accesso a tutti i siti dato e scelto) o compare solo col clic: lo decide il service worker
  let EVERY = false, evAsk = false;
  const KEYS = ["lists", "cl", "theme", "hidden", "open", "bar", "sort", "cr", "ci", "lr", "ind", "key", "excl", "fut", "lay", "tz", "view", "pf", "tab", "psort", "pfcur", "fxr", "fxh", "lang", "nm", "rowc", "slotsOpen", "pfb", "glass", "calv", "ecap", "esess", "emine", "barOff", "tpl", "eview", "rcol", "nsub", "barRow", "zen", "nf"];
  let rec = false; // registrazione della scorciatoia in corso
  let delArm = false, findQ = "", impData = null;
  // Siti esclusi: un dominio vale anche per i suoi sottodomini (es. "example.com" → "news.example.com")
  const normSite = (s) => String(s || "").trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#:]/)[0].replace(/^www\./, "");
  const HOST = normSite(location.hostname);
  const excludedHere = () => !!HOST && (st.excl || []).some((d) => HOST === d || HOST.endsWith("." + d));
  // larghezza utile della finestra: senza la barra di scorrimento della pagina (è la misura su cui si
  // appoggiano gli elementi "fixed"; innerWidth la comprende e spostava il pannello di quei pixel)
  const VW = () => document.documentElement.clientWidth || innerWidth;
  const isHidden = () => !PANEL && (st.hidden || excludedHere());
  const isOpen = () => PANEL || st.open;
  const setOpen = (v) => { st.open = v; };
  const viewHidden = () => document.hidden;
  let quotes = {}, results = [], resQ = "";
  let timer, searchTimer, port, lastTick = 0, lastSubs = "", painting = 0, loopGen = 0, fullAt = 0;
  let listOrder = null; // ordine della lista: si ricalcola solo col pulsante "Riordina"
  let cp = null;        // selettore colore aperto: { key, h, s, v }
  let axDrag = null;    // trascinamento dell'asse dei prezzi
  let edit = null;      // modifica liste: { mode: "new" | "rename" }
  let slot = null;      // posizione della barra in modifica (0, 1, 2)
  let slotRes = [], slotTimer;
  // grafico
  let mode = "c", clockT = null, hasVol = false; // "c" candele, "l" andamento di lungo termine
  let liveBar = null, estTries = 0, lag = null, hov = null, cur = null, chart = null, S = {}, bars = [], IND = {}, idx = new Map(), ivSec = 0, req = 0, dayVol = null, pendVol = null, ctimer, rsiTimer;

  const mergeInd = (v) => {
    v = { ...(v || {}) };
    // chi non aveva mai cambiato i colori delle candele passa ai nuovi predefiniti
    if (v.up === "#22c55e" && v.dn === "#ef4444") { delete v.up; delete v.dn; }
    // ripristino una tantum dei colori di TradingView per le candele (versione 1.6.8)
    if (!v.tv1) { delete v.up; delete v.dn; v.tv1 = true; }
    let fx;
    if (Array.isArray(v.fx)) {
      fx = v.fx.filter((x) => x && typeof x.t === "string" && typeof x.id === "string").slice(0, MAX_FX).map((x) => ({
        id: x.id.slice(0, 24), t: x.t.slice(0, 16),
        p: Object.fromEntries(Object.entries(x.p && typeof x.p === "object" ? x.p : {}).filter(([, n]) => typeof n === "number" && isFinite(n)).slice(0, 8)),
        c: Array.isArray(x.c) ? x.c.slice(0, 8).map((c) => (isHex(c) ? c : null)) : [],
        w: Array.isArray(x.w) ? x.w.slice(0, 8).map((n) => (n >= 1 && n <= 4 ? Math.round(n) : null)) : []
      }));
    } else {
      // versioni precedenti: EMA 9, EMA 21, RSI e VWAP con interruttore → diventano indicatori normali
      const old = { e1: { on: true, p: 9, c: "#f59e0b", w: 2 }, e2: { on: true, p: 21, c: "#a855f7", w: 2 }, rsi: { on: true, p: 14, c: "#3b82f6", w: 2 }, vw: { on: false, c: "#f472b6", w: 2 } };
      fx = [];
      for (const [k, t] of [["e1", "ema"], ["e2", "ema"], ["rsi", "rsi"], ["vw", "vwap"]]) {
        const o = { ...old[k], ...(v[k] || {}) };
        if (o.on) fx.push({ id: k, t, p: t === "vwap" ? {} : { len: o.p }, c: [isHex(o.c) ? o.c : old[k].c], w: [o.w || 2] });
      }
    }
    const out = { ...IND0, ...v, fx };
    for (const k of ["e1", "e2", "rsi", "vw"]) delete out[k];
    return out;
  };
  const curList = () => st.lists.find((l) => l.id === st.cl) || st.lists[0];
  const items = () => curList().items;
  const setItems = (a) => { curList().items = a; st.lists = [...st.lists]; };

  // ---------- Lingua (italiano / inglese) ----------
  // Il codice scrive in italiano. In inglese un traduttore sul DOM del widget sostituisce testi e attributi
  // (dizionario e frasi con numeri in i18n.js); le frasi composte usano L(italiano, inglese). Numeri e date
  // seguono la lingua (en-GB: 1,234.56 e orari a 24 ore).
  let fitAll = false; // dopo il doppio clic sull'asse dei prezzi: tutto ciò che è visibile, anche scorrendo
  let LOC = "it-IT", NLOC = "it-IT"; // LOC: date e testi nella lingua scelta; NLOC: formato dei numeri (si può scegliere a parte)
  const L = (it, en) => (st.lang === "en" ? en : it), L_ = L;
  const I18N = globalThis.OwlookI18n || { dict: {}, rules: [] };
  const T = (s) => (st.lang === "en" && I18N.dict[s]) || s;

  // ---------- Formattazione ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dec = (p) => (p < 10 ? 4 : 2);
  // separatore delle migliaia anche sui numeri di 4 cifre (in italiano di norma 5946,42 → 5.946,42)
  const fmt = (p) => p.toLocaleString(NLOC, { minimumFractionDigits: dec(p), maximumFractionDigits: dec(p), useGrouping: "always" });
  const val = (q) => (q ? fmt(q.price) : q === null ? "n/d" : "…");
  // percentuali con i decimali della lingua: 1,25% in italiano, 1.25% in inglese
  const num2 = (v) => v.toLocaleString(NLOC, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
  const pctTxt = (c) => `${c >= 0 ? "▲" : "▼"}${num2(Math.abs(c))}%`;
  const PCT0 = () => `${num2(0)}%`;
  // Borsa del titolo chiusa (dopo la chiusura, di notte, prima dell'apertura, nel fine settimana):
  // "Ult. chius." è la variazione dell'ultima seduta conclusa e "Trend" il prezzo di adesso (after o
  // pre market, se c'è) rispetto a quella chiusura, cioè la variazione che avrà la prossima seduta.
  // A seduta aperta: "Trend" è la variazione di oggi e "Ult. chius." quella della seduta prima.
  // Solo con Wall Street chiusa (quando c'è la colonna "Ult. chius."): durante la seduta USA ogni titolo mostra la variazione di oggi.
  let yOn = true;
  // prezzo fuori seduta (pre/after market) di un titolo con orari di borsa: l'andamento storico e le candele
  // giornaliere restano sulla chiusura regolare dell'ultima seduta, fissa fino alla prossima apertura
  const extH = (q) => !!(q && q.rp > 0 && q.ms && q.ms !== "REGULAR" && !/^(CRYPTOCURRENCY|CURRENCY|FUTURE)$/.test(q.qt || ""));
  const xClosed = (q) => !!(yOn && q && q.rp > 0 && q.rc != null && q.ms && q.ms !== "REGULAR" && q.price > 0 && !/^(CRYPTOCURRENCY|CURRENCY|FUTURE)$/.test(q.qt || ""));
  const trendV = (q) => (!q ? null : xClosed(q) ? ((q.price - q.rp) / q.rp) * 100 : q.change);
  const yV = (q) => (!q ? null : xClosed(q) ? q.rc : q.ychange);
  const pct = (q) => { const v = trendV(q); return v == null ? ["", ""] : Math.abs(v) < 0.005 ? ["", PCT0()] : [v >= 0 ? "up" : "dn", pctTxt(v)]; };
  // prezzo di chiusura dell'ultima seduta (sopra la sua variazione nella colonna "Ult. chius.")
  const ycl = (q) => { const v = q ? (xClosed(q) ? q.rp : q.base) : null; return v > 0 ? fmt(v) : ""; };
  const ypct = (q) => { const v = yV(q); return v == null ? ["", "–"] : [v >= 0 ? "yu" : "yd", pctTxt(v)]; };
  let compact = new Intl.NumberFormat("it-IT", { notation: "compact", maximumFractionDigits: 2 });
  const EXN = {}; // nomi delle società aperte dal calendario degli utili
  const item = (s) => items().find((x) => x.s === s) || st.bar.find((x) => x && x.s === s) || (st.pf || []).find((x) => x.s === s) || (EXN[s] ? { s, n: s, t: EXN[s] } : { s, n: niceName(s) });
  // valute: quella di Yahoo, altrimenti dal suffisso (borse europee in euro, USA in dollari)
  const EUR_SFX = /\.(MI|DE|F|PA|AS|BR|LS|MC|VI|HE|IR|AT)$/;
  const curGuess = (s) => (EUR_SFX.test(s) ? "EUR" : /\.I?L$/.test(s) ? "GBp" : /\.SW$/.test(s) ? "CHF" : /\.(TO|V)$/.test(s) ? "CAD" : /\.[A-Z]{1,3}$/.test(s) ? "" : "USD");
  const CSYM = { EUR: "€", USD: "$", GBP: "£", GBp: "p", CHF: "CHF", CAD: "C$", JPY: "¥", HKD: "HK$", SEK: "kr", NOK: "kr", DKK: "kr" };
  const curSym = (c) => CSYM[c] || c || "";
  // indici e futures sugli indici sono punti, non hanno valuta
  const IDX = /^\^|=F$|^FTSEMIB\.MI$|^IT40\.MI$/;
  const pxCur = (s) => (IDX.test(s) || (quotes[s] && quotes[s].qt === "INDEX") ? "" : curSym((quotes[s] && quotes[s].cur) || curGuess(s)));
  const curTag = (s) => { const c = pxCur(s); return c ? `<i class="cu" data-cu="${esc(s)}">${esc(c)}</i>` : ""; };
  const fmt2 = (v) => v.toLocaleString(NLOC, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
  const money = (v, c) => `${fmt2(v)} ${curSym(c)}`.trim();
  const smoney = (v, c) => `${v >= 0 ? "+" : "−"}${money(Math.abs(v), c)}`;
  const fqty = (q) => q.toLocaleString(NLOC, { maximumFractionDigits: 6, useGrouping: "always" });

  // ---------- Futures a mercato chiuso ----------
  // Fuori dalla seduta di Wall Street (9:30–16:00 New York) al posto degli indici mostro i futures.
  const FUT = { "^GSPC": ["ES=F", "E-mini S&P 500"], "^DJI": ["YM=F", "E-mini Dow"], "^IXIC": ["NQ=F", "E-mini NASDAQ 100"], "^NDX": ["NQ=F", "E-mini NASDAQ 100"] };
  let mktOpen = true;
  const NYX = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  // calendario NYSE: festività e chiusure anticipate alle 13:00 (riserva se Yahoo non dice lo stato)
  function nyseOpen(d) {
    const p = Object.fromEntries(NYX.formatToParts(d).map((x) => [x.type, x.value])), y = +p.year, m = +p.month, day = +p.day;
    if (p.weekday === "Sat" || p.weekday === "Sun") return false;
    const key = m * 100 + day, wd = (mm, dd) => new Date(Date.UTC(y, mm - 1, dd)).getUTCDay();
    const nth = (mm, w, n) => 1 + ((w - wd(mm, 1) + 7) % 7) + (n - 1) * 7;
    const last = (mm, w) => { const L = new Date(Date.UTC(y, mm, 0)).getUTCDate(); return L - ((wd(mm, L) - w + 7) % 7); };
    const obs = (mm, dd) => { const w = wd(mm, dd); return w === 6 ? (mm === 1 && dd === 1 ? 0 : mm * 100 + dd - 1) : w === 0 ? mm * 100 + dd + 1 : mm * 100 + dd; };
    // Pasqua (calcolo gregoriano) per il Venerdì Santo
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
    const e = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - dd - (c % 4)) % 7, f = Math.floor((a + 11 * dd + 22 * e) / 451);
    const em = Math.floor((dd + e - 7 * f + 114) / 31), ed = ((dd + e - 7 * f + 114) % 31) + 1, gf = new Date(Date.UTC(y, em - 1, ed - 2));
    const hol = [obs(1, 1), 100 + nth(1, 1, 3), 200 + nth(2, 1, 3), (gf.getUTCMonth() + 1) * 100 + gf.getUTCDate(), 500 + last(5, 1), obs(6, 19), obs(7, 4), 900 + nth(9, 1, 1), 1100 + nth(11, 4, 4), obs(12, 25)];
    if (hol.includes(key)) return false;
    const early = key === 1100 + nth(11, 4, 4) + 1 || key === 1224 || (key === 703 && wd(7, 4) !== 6 && wd(7, 4) !== 0);
    const mins = (+p.hour % 24) * 60 + +p.minute;
    return mins >= 570 && mins < (early ? 780 : 960);
  }
  function usSessionOpen() {
    // stato inviato da Yahoo con le quotazioni degli indici: tiene conto di festività e chiusure anticipate
    for (const s of Object.keys(FUT)) { const q = quotes[s]; if (q && q.ms && Date.now() - (q.msAt || 0) < 10 * 60000) return q.ms === "REGULAR"; }
    return nyseOpen(new Date());
  }
  const futOn = () => st.fut !== false;
  const dsym = (s) => (futOn() && FUT[s] && !mktOpen ? FUT[s][0] : s); // simbolo da mostrare
  function syncMkt() {
    const o = usSessionOpen();
    if (o === mktOpen) return;
    mktOpen = o;
    draw(); paint(); pushSubs(); // cambio indici ↔ futures
  }
  const shortName = (sym) => sym.replace(/^\^/, "");
  // Nomi leggibili: indici noti, cambi (EUR/USD), crypto (BTC); le azioni restano col ticker
  const KNOWN = {
    "^GSPC": "S&P 500", "^IXIC": "NASDAQ", "^NDX": "NASDAQ 100", "^DJI": "Dow Jones", "^RUT": "Russell 2000",
    "^VIX": "VIX", "FTSEMIB.MI": "FTSE MIB", "^GDAXI": "DAX", "^FCHI": "CAC 40", "^FTSE": "FTSE 100",
    "^STOXX50E": "Euro Stoxx 50", "^STOXX": "STOXX 600", "^IBEX": "IBEX 35", "^N225": "Nikkei 225", "^HSI": "Hang Seng",
    // future
    "ES=F": "S&P 500 Fut.", "YM=F": "Dow Jones Fut.", "NQ=F": "NASDAQ 100 Fut.", "RTY=F": "Russell 2000 Fut.",
    "MES=F": "Micro S&P 500 Fut.", "MNQ=F": "Micro NASDAQ Fut.", "MYM=F": "Micro Dow Fut.",
    "CL=F": "Petrolio WTI", "BZ=F": "Petrolio Brent", "NG=F": "Gas naturale", "GC=F": "Oro", "SI=F": "Argento",
    "HG=F": "Rame", "PL=F": "Platino", "ZN=F": "T-Note 10 anni", "ZB=F": "T-Bond 30 anni", "ZF=F": "T-Note 5 anni",
    "ZC=F": "Mais", "ZW=F": "Grano", "ZS=F": "Soia", "KC=F": "Caffè", "6E=F": "EUR/USD Fut.", "BTC=F": "Bitcoin Fut."
  };
  function niceName(s, name, type) {
    let m;
    if (KNOWN[s]) return KNOWN[s];
    if ((m = /^([A-Z]{3})([A-Z]{3})=X$/.exec(s))) return `${m[1]}/${m[2]}`;
    if ((m = /^([A-Z0-9]+)-USD$/.exec(s))) return m[1];
    if (s.startsWith("^") || type === "INDEX" || s.endsWith("=F") || type === "FUTURE") return (name || shortName(s)).slice(0, 24);
    return s;
  }
  // nomi creati in automatico dalle versioni precedenti (es. "GSPC") → nome leggibile
  const fixName = (it) => (it && it.n === shortName(it.s) ? { ...it, n: niceName(it.s, it.t) } : it);

  // ---------- Interfaccia (Shadow DOM: gli stili della pagina non interferiscono) ----------
  const host = document.createElement("div");
  host.id = "mt-host";
  host.style.cssText = "all:initial;position:fixed;top:0;left:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "closed" });
  const $ = (s) => root.querySelector(s);

  const BARROWICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="5" width="3.6" height="6" rx="1"/><rect x="6.2" y="5" width="3.6" height="6" rx="1"/><rect x="10.9" y="5" width="3.6" height="6" rx="1"/></svg>';
  const BARCOLICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="1.5" width="10" height="3.4" rx="1"/><rect x="3" y="6.3" width="10" height="3.4" rx="1"/><rect x="3" y="11.1" width="10" height="3.4" rx="1"/></svg>';
  const NEWSICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3.5h9v9h-8a1 1 0 0 1-1-1z"/><path d="M11.5 6h2v5.5a1 1 0 0 1-2 0"/><path d="M4.5 6h5M4.5 8.2h5M4.5 10.4h3"/></svg>';
  const BELLICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11.5V7a4 4 0 0 1 8 0v4.5l1 1.2H3z"/><path d="M6.6 14a1.5 1.5 0 0 0 2.8 0"/></svg>';
  const MAXICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>';
  const MINICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"/></svg>';
  let maxed = false; // grafico a tutto schermo (dentro la finestra)
  root.innerHTML = `
<style>
*{box-sizing:border-box;margin:0}
[hidden]{display:none!important}
/* colori: vetro sopra la pagina; --gp è l'opacità scelta nelle Impostazioni (Trasparenza del vetro) */
:host{--solid:#fafafc;--bsolid:#fafafc;--bg:color-mix(in srgb,var(--solid) var(--gp,78%),transparent);--fg:#0b0c0f;--mut:#6c6f78;--line:rgba(10,12,20,.08);--row:rgba(10,12,20,.04);--row2:rgba(10,12,20,.07);--sb:rgba(10,12,20,.18);
  --acc:#6236ff;--accbg:rgba(98,54,255,.12);--up:#16c467;--dn:#f2541b;--onacc:#fff;
  --gbd:rgba(255,255,255,.75);--ghi:rgba(255,255,255,.95);--gsh:0 24px 64px rgba(20,24,40,.22),0 2px 8px rgba(20,24,40,.08);--seg:rgba(118,118,128,.14);--thumb:#fff;
  --bbg:color-mix(in srgb,var(--bsolid) var(--gp,78%),transparent);--bfg:#0b0c0f;--bnm:#0b0c0f;--bhv:rgba(10,12,20,.05);--bsep:rgba(10,12,20,.08);--bbd:rgba(255,255,255,.75);--bsh:0 14px 40px rgba(20,24,40,.18)}
:host([data-theme=dark]){--solid:#141519;--bsolid:#101114;--fg:#f5f5f7;--mut:#8e9099;--line:rgba(255,255,255,.08);--row:rgba(255,255,255,.045);--row2:rgba(255,255,255,.08);--sb:rgba(255,255,255,.18);
  --acc:#7352ff;--accbg:rgba(115,82,255,.2);--up:#22e07a;--dn:#ff6b3d;--onacc:#fff;
  --gbd:rgba(255,255,255,.13);--ghi:rgba(255,255,255,.16);--gsh:0 28px 70px rgba(0,0,0,.5),0 2px 10px rgba(0,0,0,.3);--seg:rgba(118,118,128,.24);--thumb:rgba(255,255,255,.17);
  --bfg:#fff;--bnm:#f5f5f7;--bhv:rgba(255,255,255,.07);--bsep:rgba(255,255,255,.1);--bbd:rgba(255,255,255,.13);--bsh:0 18px 48px rgba(0,0,0,.45)}
button,select{cursor:pointer;border:0;background:none;color:inherit;font:inherit}
button:focus-visible,input:focus-visible,select:focus-visible,.row:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.up{color:var(--up)}.dn{color:var(--dn)}
.yu{color:var(--up)}
.yd{color:var(--dn)}

.bar{position:fixed;top:12px;right:16px;display:grid;grid-template-rows:auto 1fr auto;width:340px;max-width:calc(100vw - 32px);background:var(--bbg);color:var(--bfg);border:1px solid var(--bbd);white-space:nowrap}
.items{grid-area:1/1/4/2;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:1px;min-width:0}
.items .sep{display:none}
.bi{display:grid;grid-template-columns:minmax(0,1fr) auto 58px;gap:0 8px;align-items:center;padding:3px 6px;text-align:left;line-height:14px}
.bi [data-f=p]{font-variant-numeric:tabular-nums}
.bi [data-f=c]{text-align:right;font-variant-numeric:tabular-nums}
.bi:hover,.bi.sel{background:var(--bhv)}
.bi b{color:var(--bnm);overflow:hidden;text-overflow:ellipsis}
.bar .up{color:var(--up)}.bar .dn{color:var(--dn)}
.sep{width:1px;height:14px;background:var(--bsep);flex:none}
.go{display:grid;place-items:center;padding:0;color:var(--bnm)}
.go.open{transform:rotate(180deg)}

.panel{position:fixed;right:16px;display:flex;gap:16px;width:340px;top:var(--pt,62px);max-height:calc(100vh - var(--pt,62px) - 16px);background:var(--bg);color:var(--fg);border:1px solid var(--line);box-shadow:0 14px 44px rgba(0,0,0,.28);font-size:11px}
.panel.anim{box-shadow:none;border-color:transparent}
.panel.anim .rz{display:none}
.pshade{position:fixed;border:1px solid var(--line);box-shadow:0 14px 44px rgba(0,0,0,.28);pointer-events:none}
.panel.wide{width:min(850px,calc(100vw - 32px))}
/* bordi per ridimensionare e intestazione per spostare il pannello */
.rz{position:absolute;z-index:9}
.rz-l,.rz-r{top:14px;bottom:14px;width:9px;cursor:ew-resize}
.rz-l{left:-5px}.rz-r{right:-5px}
.rz-b{left:14px;right:14px;bottom:-5px;height:9px;cursor:ns-resize}
.rz-t{left:14px;right:14px;top:-5px;height:9px;cursor:ns-resize}
/* barra fra grafico e lista (compare passandoci sopra) */
.rz-s{top:14px;bottom:14px;width:9px;right:calc(var(--sw,314px) + 15.5px);cursor:col-resize;display:none}
.panel.wide .rz-s{display:block}
.rz-s::after{inset:0 3px}
.panel.maxed .rz-l,.panel.maxed .rz-r,.panel.maxed .rz-b,.panel.maxed .rz-t{display:none}
.panel.maxed{border-radius:12px}
.panel.moved .rz-t{display:block}
.rz::after{content:"";position:absolute;inset:3px;border-radius:3px;background:var(--acc);opacity:0;transition:opacity .15s}
.rz:hover::after,.rz.on::after{opacity:.55}
.panel.moving{transition:none;user-select:none}
.chart>.ctop,.cal>.ctop{cursor:default}
.chart>.ctop :is(button,select,input,a),.cal>.ctop :is(button,a){cursor:pointer}
.dly{display:inline-flex;flex:none;font-style:normal;align-items:center;margin-left:5px;color:var(--mut,#9aa4b2);vertical-align:-1px;cursor:help}
.dly[hidden]{display:none}
.bar .dly{color:var(--mut)}
.ctitle .dly{margin:0 2px 0 0}
.nm .dly{margin:0}
.htip{position:fixed;z-index:30;max-width:260px;padding:6px 9px;color:var(--fg);font-size:11px;line-height:1.4;pointer-events:none;white-space:normal}
:host([data-theme=dark]) .htip{background:#22252b;border-color:#363a43;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.htip[hidden]{display:none}
.slotw{position:relative;min-width:0;display:flex}
.slotw .slot{flex:1}
.sx{position:absolute;top:-7px;right:-7px;z-index:1;width:18px;height:18px;display:grid;place-items:center;padding:0;border-radius:50%;color:var(--mut);background:var(--bg);border:1px solid var(--line);box-shadow:0 1px 4px rgba(0,0,0,.18);opacity:0;transform:scale(.6);transition:opacity .12s,transform .12s,background .12s,color .12s;pointer-events:none}
.slotw:hover .sx,.slotw:focus-within .sx{opacity:1;transform:none;pointer-events:auto}
.sx:hover{color:var(--fg);background:var(--row2);border-color:var(--line)}
.slot.add{align-items:stretch;justify-content:stretch;padding:5px}
.slot.add .plus{flex:1;display:grid;place-items:center;min-height:28px;border:1.5px dashed color-mix(in srgb,var(--mut) 60%,transparent);font-style:normal;color:var(--mut);transition:border-color .12s,color .12s}
.slot.add .plus::before{content:"+";font-size:16px;font-weight:400;line-height:1}
.slot.add:hover .plus,.slot.add.on .plus{border-color:var(--acc);color:var(--acc)}
.side>.hd,.chart .cid,.cal .cid{cursor:default}
.side>.hd button,.chart .cid *{cursor:auto}
.side>.hd .brand,.side>.hd .brand *{cursor:pointer}
.bar,.side>.hd{user-select:none;-webkit-user-select:none}
#layreset[hidden]{display:none}
/* barre di scorrimento scure e sottili */
*{scrollbar-width:thin;scrollbar-color:var(--sb) transparent}
/* colonna della lista: l'intestazione resta ferma in alto, sotto scorre il resto (nessuno sfondo dietro all'intestazione) */
.side{width:var(--sw,314px);flex:none;display:flex;flex-direction:column;overflow:visible;min-height:0;padding-right:0} /* visibile: il gufo che si inclina non viene tagliato */
.side>.hd{flex:none;margin-bottom:0;padding-bottom:10px}
.sbody{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable}
/* barra di scorrimento un po' staccata dai tasti a destra (l'intestazione segue, per restare allineata) */
.sbody{padding-right:4px}
.side>.hd{padding-right:calc(var(--gut,0px) + 6px)}
.panel:not(.wide) .side{width:calc(100% + 8px)}
.side{margin-right:-8px}.panel.wide .side{width:calc(var(--sw,314px) + 8px)}
.hd,.sub{display:flex;align-items:center;justify-content:space-between;gap:6px}
.hd{margin-bottom:10px;font-weight:700;letter-spacing:.05em;font-size:11px}
.hd>span:last-child{display:flex;gap:6px}
/* barra "Cerca…": filtra la lista e propone ticker da aggiungere */
.sub.first>span:last-child{flex:1;justify-content:flex-end;min-width:0}
.find{flex:1;max-width:none;min-width:60px;display:flex;align-items:center;gap:5px;color:var(--mut);cursor:text}
.find:hover{border-color:var(--mut)}
.find:focus-within{border-color:var(--acc);color:var(--acc)}
.find svg{flex:none}
.find input{flex:1;min-width:0;height:100%;padding:0;border:0;background:none;letter-spacing:0;color:var(--fg)}
.find input::placeholder{color:var(--mut)}
.find input:focus-visible{outline:none}
.find button{display:none;place-items:center;width:16px;height:16px;color:var(--mut);padding:0}
.find.has button{display:grid}
.find button:hover{color:var(--fg)}
.fres:empty{display:none}
.fres{margin:8px 0 2px;padding-top:8px;border-top:1px dashed var(--line)}
.fres .fhd{padding:0 8px 4px;font-size:11px;color:var(--mut);letter-spacing:.04em}
.fres .res{grid-template-columns:auto minmax(0,1fr) 22px 22px auto auto;cursor:pointer}
.fres .res .lc{display:grid}
.fres .fhd{display:flex;align-items:center;justify-content:space-between;gap:8px}
.fres .fhd .fx{display:grid;place-items:center;width:22px;height:22px;padding:0;border-radius:50%;color:var(--mut)}
.fres .fhd .fx:hover{color:var(--fg);background:var(--row)}
.radd{flex:none;height:22px;padding:0 9px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap;color:var(--acc);background:var(--accbg);border:1px solid color-mix(in srgb,var(--acc) 35%,transparent)}
.radd:hover:not([disabled]){background:var(--acc);color:#fff}
.radd[disabled]{opacity:.45;cursor:default}
.pill{white-space:nowrap}
.pill.pri{border-color:var(--acc)}
.pill.warn{color:var(--dn)}
.icon{display:grid;place-items:center;width:26px;height:24px;padding:0;border:1px solid var(--line);border-radius:6px;color:var(--mut)}
.icon svg,.rnd svg,.lc svg,.close svg,.go svg,.x svg,.sx svg,.find button svg{display:block}
.icon:hover,.pill:hover{color:var(--fg)}
.sub{margin:14px 0 6px;font-size:11px;color:var(--mut);letter-spacing:.04em}
.tabs{display:inline-flex;flex:none;gap:2px;padding:2px;border:1px solid var(--line);border-radius:7px}
.tab{padding:2px 7px;border-radius:5px;font-size:11px;font-weight:600;letter-spacing:.05em;line-height:14px;color:var(--mut);text-transform:uppercase}
.tab:hover{color:var(--fg)}
.tab.on{background:var(--accbg);color:var(--acc)}
/* portafoglio */
.pfhd{display:flex;align-items:center;gap:8px;overflow:hidden}
.pfsum{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.pfs,.pfs2{display:flex;align-items:baseline;gap:8px;min-width:0;font-size:11px;line-height:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfs b{font-size:11px;line-height:13px;font-weight:700;color:var(--fg);font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis}
.pfs span{overflow:hidden;text-overflow:ellipsis}
.pfs i,.pfs2 i{font-style:normal;font-variant-numeric:tabular-nums;color:var(--fg)}
.pfs i.up,.pfs2 i.up{color:var(--up)}.pfs i.dn,.pfs2 i.dn{color:var(--dn)}
.pfs3{display:flex;align-items:center;gap:8px;min-width:0}
.pfs3 b{flex:none;line-height:15px;color:var(--fg);font-variant-numeric:tabular-nums}
.pfsd{display:grid;grid-template-columns:auto auto auto;column-gap:6px;row-gap:2px;align-items:center;justify-content:start;min-width:0;font-size:11px;line-height:13px;color:var(--mut);white-space:nowrap}
.pfsd i{font-style:normal;font-variant-numeric:tabular-nums;color:var(--fg);overflow:hidden;text-overflow:ellipsis}
.pfsd i.pfp{justify-self:start;padding:0 5px;border-radius:5px;font-weight:600;color:var(--mut);background:color-mix(in srgb,var(--mut) 16%,var(--solid))}
.pfsd i.pfp.up{color:var(--upt);background:color-mix(in srgb,var(--up) 17%,var(--solid))}.pfsd i.pfp.dn{color:var(--dnt);background:color-mix(in srgb,var(--dn) 17%,var(--solid))}
.pfsd i.pfa{color:var(--mut)}
.pfsd i.pft{font-weight:700;padding:0 1px}.pfsd i.pft.up{color:var(--upt)}.pfsd i.pft.dn{color:var(--dnt)}
.pfcurl{flex:1;min-width:0;display:flex;align-items:center;gap:6px;font-size:11px;color:var(--mut)}
.pfcurl select{max-width:150px;color:var(--fg);background:var(--row)}
.pfcurl em{font-style:normal;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfempty{font-size:11px;color:var(--mut)}
.pfbt{display:flex;gap:6px;flex:none}
.rnd{display:grid;place-items:center;width:24px;height:24px;padding:0;border:1px solid var(--line);border-radius:50%;color:var(--mut);font-size:13px;line-height:1}
.rnd svg{display:block}
.rnd:hover{color:var(--fg);border-color:var(--mut)}
.rnd.on{background:var(--accbg);border-color:var(--acc);color:var(--acc)}
/* colonne larghe quanto il testo più lungo (misurato), uguali in tutte le righe */
.thead.pthead>.th{white-space:nowrap;min-width:0}
.thead.pthead,.row.prow{gap:3px;grid-template-columns:var(--pgrid,minmax(0,1fr) 56px 50px 64px 54px)}
/* in modifica: maniglia e ×, senza le righe piccole dei numeri */
.row.prow.ed .pc small{display:none}
.thead{user-select:none;-webkit-user-select:none}
.row.prow .pc{font-size:11px}
.pn{display:flex;flex-direction:column;gap:1px;min-width:0}
.pc{display:flex;flex-direction:column;align-items:flex-end;gap:1px;min-width:0;font-variant-numeric:tabular-nums;white-space:nowrap}
.pc b{font-weight:600}
.pc .yc{font-weight:400}
.pc small.up{color:var(--up)}.pc small.dn{color:var(--dn)}
.pc .pr{font-weight:400}
.ppl{display:flex;align-items:center;gap:4px;justify-content:flex-end}
.ppl .dly svg{width:10px;height:10px}

.ppl .dly{margin:0}
.prow small.yu{color:color-mix(in srgb,var(--up) 72%,var(--mut))}.prow small.yd{color:color-mix(in srgb,var(--dn) 72%,var(--mut))}
.prow small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:400;color:var(--mut)}
.prow small.up{color:color-mix(in srgb,var(--up) 75%,var(--mut))}.prow small.dn{color:color-mix(in srgb,var(--dn) 75%,var(--mut))}
.ph{display:grid;place-items:center;height:100%;color:var(--mut);cursor:grab;touch-action:none;user-select:none}
.ph:active{cursor:grabbing}
.row.shift{transition:transform .15s ease}
.row.drag{position:relative;z-index:2;border-color:var(--acc);box-shadow:0 8px 22px rgba(0,0,0,.3);cursor:grabbing}
.row.drag:not(.shift){transition:none}
.row.ed:not(.prow){cursor:default}
.prow.ed .x{opacity:1}
.x.arm{width:auto;height:auto;padding:1px 5px;border-radius:4px;font-size:11px;font-weight:600;color:#fff;background:var(--dn)}
.row.prow.ed:has(.x.arm){grid-template-columns:var(--pgrid-arm)}
.pform{margin:8px 0 6px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--row);display:flex;flex-direction:column;gap:8px}
.pfh{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--mut);text-transform:uppercase}
.pfh .pill{text-transform:none;letter-spacing:0;font-weight:400}
.pform input{width:100%;padding:6px 8px;background:var(--bg);font-variant-numeric:tabular-nums}
.pform input:focus{outline:none;border-color:var(--acc)}
.pft{display:flex;gap:6px;min-width:0}
.pft b{font-size:11px;white-space:nowrap}
.pft span{flex:1;min-width:0;color:var(--mut);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pfr{display:grid;grid-template-columns:1fr 1.25fr;gap:8px}
.pfr .pfl{display:flex;flex-direction:column;gap:3px;min-width:0;font-size:11px;color:var(--mut)}
.pfin{position:relative;display:block}
.pfin input{padding-right:34px}
.pfin em{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-style:normal;font-size:11px;color:var(--mut)}
.pfpl{display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--mut)}
.pform input[type=date]{padding:5px 8px;font-size:11px}
.dpk{position:relative;display:block}
.dpk input{padding-right:30px}
.dpb{position:absolute;right:3px;top:50%;transform:translateY(-50%);width:24px;height:24px;display:grid;place-items:center;padding:0;border-radius:6px;color:var(--mut)}
.dpb:hover{color:var(--fg);background:var(--row)}
.dpop{padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
.dph{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.dph b{font-size:12px;font-weight:600;text-transform:capitalize}
.dph button{width:26px;height:24px;padding:0;border-radius:6px;font-size:16px;line-height:1;color:var(--fg)}
.dph button:hover:not([disabled]){background:var(--row)}
.dph button[disabled]{opacity:.3;cursor:default}
.dpg{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.dpg i{font-style:normal;font-size:11px;color:var(--mut);padding:2px 0}
.dpg button{height:26px;padding:0;border-radius:7px;font-size:12px;color:var(--fg);font-variant-numeric:tabular-nums}
.dpg button:hover:not([disabled]){background:var(--row)}
.dpg button.td{box-shadow:inset 0 0 0 1px var(--acc)}
.dpg button.on{background:var(--acc);color:#fff}
.dpg button[disabled]{opacity:.3;cursor:default}
.pfnote{margin:0;font-size:11px;line-height:1.4;color:var(--mut)}
.pfnote:empty{display:none}
.pfnote.err{color:var(--dn)}
.pfbtn{display:flex;justify-content:flex-end;gap:6px}
#pfres:empty{display:none}
#pfres{max-height:180px;overflow:auto}
select.pill{padding:3px 6px}
.txtsel{flex:1;min-width:0;max-width:210px;color:var(--fg);background:var(--row)}
:host([data-theme=dark]){color-scheme:dark} /* menu a tendina e controlli nativi scuri */

/* liste */
.lists{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.lchip{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lchip.on{border-color:var(--acc)}
.lhd{display:flex;align-items:flex-start;gap:8px}
.lhd>.lists{flex:1;min-width:0}
.lhd>.pfbt{padding-top:1px}
.lchip.led{display:inline-flex;align-items:center;gap:5px;border-style:dashed}
.lchip.led .pen{flex:none;opacity:.75}
.ledit{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.ledit input{flex:1;min-width:120px;padding:6px 8px}
.ledit input:focus-visible{outline:none;border-color:var(--acc)} /* il contorno non finisce sotto l'intestazione */


.subt{width:100%;display:flex;align-items:center;justify-content:space-between;padding:4px 2px;border-radius:5px}
.subt:hover{color:var(--fg);background:var(--row)}
.subt .chev{flex:none;transition:transform .15s;transform:rotate(-90deg)}
.subt.open .chev{transform:none}
/* portafoglio: a sinistra titolo e rendimento, a destra il riquadro che cambia */
.prow .nmb>.prd{display:flex;flex-direction:column;align-items:flex-start;font-variant-numeric:tabular-nums}
.prow .nmb>.prd>b{font-weight:600;line-height:15px;white-space:nowrap}
.prow .nmb>.prd>small{line-height:12px}
.pbx{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;cursor:pointer}
.bm{display:flex;flex-direction:column;align-items:flex-end}
#list:not([data-pfb=q]) .bm-q,#list:not([data-pfb=v]) .bm-v,#list:not([data-pfb=d]) .bm-d,#list[data-pfb=q] .bm-p,#list[data-pfb=v] .bm-p,#list[data-pfb=d] .bm-p{display:none}
.pbx .pbl{display:flex;align-items:baseline;gap:3px;line-height:15px}
.pbx .pbl b{font-weight:600}
.pbx small{line-height:12px}
.pbx .ppl{display:flex;align-items:center;gap:4px}
.cu{font-style:normal;color:var(--mut);font-variant-numeric:normal}
.lpr{display:flex;align-items:baseline;gap:3px}
.thead.pthead>.pth1{display:flex;align-items:center;justify-content:flex-start;min-width:0}
.thead.pthead>.pthb,.thead.pthead>.th-b{justify-self:end}
.row.prow.ed .pbx small{display:revert}
/* tabella */
.thead,.row{display:grid;grid-template-columns:var(--lgrid,minmax(0,1fr) auto 54px 60px 14px);gap:6px;align-items:center}
.thead>*:not(:first-child){text-align:right;justify-content:flex-end}
.th{display:flex;align-items:center;gap:3px;white-space:nowrap;font-size:inherit;letter-spacing:inherit;color:inherit;padding:0}
.th:hover{color:var(--fg)}
.thead.ed>.th-n{justify-content:flex-start;text-align:left}
.thead.ed>.th:hover{color:inherit}
.th i{font-style:normal;font-size:11px;opacity:.45}
.th.on{font-weight:600}
.th.on i{opacity:1}
.row{margin-bottom:3px;cursor:pointer}
.row:hover{border-color:var(--line)}
.row.sel{border-color:var(--acc)}
.nm{display:flex;align-items:center;min-width:0;font-weight:600}
.nm>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* logo (riquadro arrotondato, come le icone delle app), ticker, nome dell'azienda (si accorcia per primo) */
.nm>.lg{flex:none;display:grid;place-items:center;border-radius:27%;overflow:hidden;outline:.5px solid color-mix(in srgb,var(--fg) 10%,transparent);outline-offset:-.5px;background:hsl(var(--lgh) 45% 42%);color:#fff;font-weight:700;line-height:1}
.nm>.lg img{width:100%;height:100%;object-fit:cover;background:#17181c}
.nm>.lg i{font-style:normal}
/* ticker sopra, nome dell'azienda sotto (in portafoglio anche quantità e PMC) */
.nmb{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.nml{display:flex;align-items:center;gap:4px;min-width:0}
.nml>.tk{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:18px}
.nmb>.cn,.nmb>.qt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:400;font-size:11px;color:var(--mut)}
/* quantità e PMC: riga sotto al nome, larga quanto la riga */
/* portafoglio: tre righe strette (ticker, nome, quantità × PMC); logo e numeri centrati nella riga */
.thead.pthead{padding-left:6px;padding-right:6px} /* etichette allineate ai numeri (riga: 5px + bordo) */
.prow .nm{gap:5px}
.prow .nm>.lg{font-size:11px}
.prow .nmb{gap:0}
.prow .pc{gap:0}
.prow .pc>b,.prow .pc>.pr{line-height:15px}
.prow .pc small,.prow .ppl small{line-height:12px}
.row:not(.prow){padding:6px 8px}
.nmset{display:flex;flex-direction:column;gap:8px}
.nmpv{padding:7px 8px;font-size:11px}
.nmpv .nm{display:flex}
.nmgrid{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center}
.nmgrid>span{font-size:11px;color:var(--mut)}
.card .nmgrid .seg{justify-self:start}
.card #rowcseg button{width:auto}
.card .nmgrid .seg button{width:62px;padding:5px 0}
/* riga sotto vuota: righe compatte (logo grande come nelle righe normali; nel portafoglio quantità e PMC sotto al nome) */
.side.nmc .nml{height:auto}
/* lista compatta: prezzo sopra e % sotto con un po' d'aria fra i due (righe alte 36px) */
.side.nmc .row:not(.prow){padding-top:3px;padding-bottom:3px}
.side.nmc .row:not(.prow) .lp{gap:2px}
.side.nmc .row:not(.prow) .lp>.pr{line-height:14px}
.side.nmc .row:not(.prow) .lp>small{line-height:12px}
.lp{display:flex;flex-direction:column;align-items:flex-end;min-width:0}
.nm .dly{flex:none}
.lc{flex:none;display:none;place-items:center;width:20px;height:20px;padding:0;border-radius:4px}
.row:hover .lc,.row:focus-within .lc,.lc.on{display:grid}
.lc{color:color-mix(in srgb,var(--acc) 72%,var(--fg));background:color-mix(in srgb,var(--acc) 14%,transparent);opacity:1}
.lc:hover,.lc.on{opacity:1;color:#fff;background:var(--acct,var(--acc))}
.fut{flex:none;margin-left:5px;padding:0 4px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:.05em;line-height:14px;color:#f59e0b;background:color-mix(in srgb,#f59e0b 18%,transparent);vertical-align:1px}
.pr,.ch,.yc{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.ch{font-size:11px}
.ycw{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:1px;min-width:0}
.ycp{font-size:11px;color:var(--fg);font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.2}
.x{display:grid;place-items:center;width:14px;height:14px;padding:0;color:var(--mut)}
.empty{padding:14px;text-align:center;color:var(--mut)}

/* barra in alto: posizioni */
.slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:7px 7px 0 0;margin-top:-7px}
.slot{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:6px 8px;text-align:left;min-width:0}
.slot b{font-size:11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slot span{font-size:11px;color:var(--mut);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.slot.on{border-color:var(--acc);background:var(--accbg)}
.slotsearch{margin-top:6px}

input{padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--row);color:var(--fg);font-size:11px}
#q2{width:100%}
#res2{max-height:170px;overflow:auto;margin-top:4px}
.res{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;width:100%;padding:7px 8px;border-radius:6px;text-align:left}
.res:hover{background:var(--row)}
.res span{color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.res em{font-style:normal;color:var(--mut);font-size:11px}
.note{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);color:var(--mut);font-size:10px;line-height:1.4}
.note,.note *{font-size:10px!important}
.dot{display:inline-block;width:7px;height:7px;margin-left:6px;border-radius:50%;background:#6b7280;vertical-align:middle}
.dot.on{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25)}
.bar>.dot{grid-area:1/2;justify-self:center;margin:5px 0 0}
.bar>.sep{grid-area:1/2/4/3;justify-self:start;align-self:stretch;height:auto;margin:2px 0}
.bar>.go{grid-area:3/2}
/* da 4 a 6 titoli: due colonne; 4 titoli occupano la stessa altezza di 3 */
.bar.two>.items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(var(--brows,2),auto);grid-auto-flow:column;align-content:center;gap:0 2px}
.bar.two .bi{grid-template-columns:minmax(0,1fr) auto;gap:0 5px}
.bar.two .bi b{grid-area:1/1;white-space:nowrap}
.bar.two .bi .bt{grid-area:2/1;display:flex;align-items:center;gap:3px;min-width:0}
.bar.two .bi .bt .fut,.bar.two .bi .bt .dly{margin-left:0}
.bar.two .bi .bpx{grid-area:1/2;justify-self:end}
.bar.two .bi [data-f=c]{grid-area:2/2;justify-self:end}
.pr,.bar [data-f=p],.cprice{border-radius:3px}
.row>.pr{justify-self:end} /* lo sfondo del lampeggio resta stretto attorno al numero */

/* impostazioni */
.modal{position:absolute;inset:0;z-index:10;display:flex;align-items:flex-start;justify-content:flex-end;padding:44px 12px 12px;overflow-y:auto;overscroll-behavior:contain}
/* con le impostazioni aperte il pannello si allunga quanto serve, ma resta dentro lo schermo */
.panel:has(> .modal:not([hidden])){min-height:min(640px,calc(100vh - var(--pt,62px) - 16px))}
.card{flex:none;margin-bottom:auto}
.field{display:flex;flex-direction:column;gap:6px}
.card .seg{display:inline-flex;align-self:flex-start}
.card .seg button{text-align:center}
.card #langseg button{width:auto;padding:5px 11px;display:inline-flex;align-items:baseline;gap:6px}
.card #langseg button span{font-size:11px;opacity:.7;font-variant-numeric:tabular-nums}
#tzsel{align-self:stretch;max-width:none}
.exl{display:flex;flex-wrap:wrap;gap:6px}
#impmsg:empty{display:none}
#impmsg{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:11px;color:var(--fg)}
#impmsg .err{color:var(--dn)}
.exl span{display:flex;align-items:center;gap:4px;padding:3px 4px 3px 9px;border:1px solid var(--line);border-radius:999px;font-size:11px;color:var(--fg)}
.exl button{color:var(--mut);font-size:11px;line-height:1;padding:0 3px}
.exrow{display:flex;gap:6px}
.exrow input{flex:1;min-width:0;padding:5px 8px;font-size:11px}
.keyrow{display:flex;gap:6px;align-items:center}
.kbd{min-width:120px;padding:6px 10px;border-bottom-width:2px;font-size:11px;font-weight:600;text-align:center}
.kbd.rec{border-color:var(--acc);color:var(--acc);background:var(--accbg)}
.hint{line-height:1.45;color:var(--mut)}
.hint b{color:var(--fg);font-weight:600}
.link{color:var(--acc);text-decoration:underline;font-size:inherit}

/* grafico */
.chart{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.ctop{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px}
.clock{margin-left:auto;color:var(--mut);white-space:nowrap}
.clock b{font-size:11px;color:var(--fg);font-variant-numeric:tabular-nums;font-weight:600;margin-left:3px}
.ccol{display:flex;align-items:center;gap:6px;margin-top:6px;padding:8px 8px 2px;border-top:1px solid var(--line);font-size:11px;color:var(--mut)}
.ccol span{margin-left:4px}
.cper{font-size:11px;margin-left:8px;font-weight:500}
/* andamento storico: la variazione di oggi sopra quella del periodo, accanto al prezzo */
.cquote.hl{display:flex;align-items:flex-end}
.cquote.hl .cpc{display:flex;flex-direction:column;align-items:flex-start;margin-left:8px;line-height:1.2}
.cquote.hl .cpc>*{margin-left:0}
.cpc .cper{font-size:12px;font-weight:600}
.cquote.hl #c-chg{font-size:11px}
.tbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tb{display:flex;align-items:center;gap:4px;font-weight:600;color:var(--fg)}
.tb:hover{border-color:var(--mut)}
.tb i{font-style:normal;color:var(--mut);font-size:11px}
.menu{position:absolute;z-index:20;padding:8px;background:var(--bg);border:1px solid var(--line);border-radius:9px;box-shadow:0 12px 32px rgba(0,0,0,.3);font-size:11px}
.ivgrid{display:grid;grid-template-columns:repeat(3,44px);gap:4px}
.ivgrid button{padding:5px 0;border:1px solid var(--line);border-radius:5px;font-size:11px;font-weight:600;color:var(--mut)}
.ivgrid button.on{background:var(--accbg);border-color:var(--acc);color:var(--acc)}
.fxl{display:flex;flex-direction:column;gap:2px;min-width:180px}
.fxl button{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;text-align:left}
.fxl button:hover{background:var(--row)}
.fxl button[disabled]{opacity:.45;cursor:default}
.fxl .ck{width:14px;color:var(--acc);font-weight:700}
.fxl em{margin-left:auto;font-style:normal;font-size:11px;color:var(--mut)}
.fxl .dotc{width:10px;height:10px;border-radius:50%;flex:none}
/* menu ƒx: ricerca + catalogo per categorie */
.fxm{width:320px}
.fxm .fxl em{flex:none;white-space:nowrap;padding-left:8px}
.fxs{display:flex;align-items:center;gap:6px;height:28px;padding:0 8px;margin-bottom:4px;border:1px solid var(--line);border-radius:6px;color:var(--mut)}
.fxs:focus-within{border-color:var(--acc);color:var(--acc)}
.fxs input{flex:1;min-width:0;height:100%;padding:0;border:0;background:none;font-size:11px;color:var(--fg)}
.fxs input:focus-visible{outline:none}
#fxlist{max-height:360px;overflow-y:auto;overscroll-behavior:contain;min-width:0}
.fxh{padding:9px 8px 3px;font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--mut)}
.fxa{display:flex;align-items:center;gap:8px;padding:3px 2px 3px 8px;border-radius:6px}
.fxa:hover{background:var(--row)}
.fxa span:nth-child(2){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fxl .fxa button{padding:2px 6px;color:var(--mut);font-size:12px;line-height:1}
.fxl .fxa button:hover{color:var(--fg);background:none}
.fxl .empty{padding:12px 8px}
.irow em,.pleg em{font-style:normal;font-size:11px;color:var(--mut)}
.iv+.iv{margin-left:5px}
.ictl input[type=number],.pctl input[type=number]{width:46px}
.cid{min-width:0}
.ctitle{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ctitle span{color:var(--mut);margin-left:6px}
.cquote{font-variant-numeric:tabular-nums;white-space:nowrap}
.cquote .ch{margin-left:8px}
.close{align-self:center;display:grid;place-items:center;width:22px;height:22px;padding:0;border-radius:5px;color:var(--mut)}
.close:hover{color:var(--fg);background:var(--row)}
.seg{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}
.seg button{padding:4px 9px;font-size:11px;color:var(--mut)}
.seg button:last-child{border-right:0}
.seg button.on{background:var(--accbg);color:var(--acc);font-weight:600}
.ic{display:flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid var(--line);border-radius:7px;font-size:11px;color:var(--mut)}
button.ic:hover{color:var(--fg)}
.ic input[type=checkbox]{margin:0;accent-color:var(--acc)}
input[type=number]{width:44px;padding:2px 4px;font-size:11px}
.sw{width:18px;height:18px;padding:0;border:1px solid var(--line);border-radius:4px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
.sub>span:last-child{display:flex;gap:6px;align-items:center} /* refresh: largo il doppio */
.cpop{position:absolute;z-index:22;overflow-y:auto;overscroll-behavior:contain;width:236px;padding:10px;background:var(--bg);border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.3)}
.tvrow{display:flex;align-items:center;gap:6px;margin-bottom:8px;font-size:11px;color:var(--mut)}
.tvrow span{flex:1}
.tvrow button{width:22px;height:22px;border-radius:4px;border:1px solid rgba(128,128,128,.25)}
.tvrow button.rst{width:auto;height:22px;padding:0 9px;border:0;border-radius:999px;font-size:11px;font-weight:600;background:var(--row2);color:var(--fg)}
.tvrow button.on{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--acc)}
.grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px}
.grid button{aspect-ratio:1;border-radius:4px;border:1px solid rgba(128,128,128,.25)}
.grid button.on{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--acc)}
.cfoot2{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.lw{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--mut)}
.lw button{display:grid;place-items:center;width:34px;height:24px;border:1px solid var(--line);border-radius:6px}
.lw button.on{border-color:var(--acc);background:var(--accbg)}
.lw i{display:block;width:20px;border-radius:2px;background:currentColor}
.cprev{width:28px;height:20px;border-radius:4px;border:1px solid var(--line)}
.cdrop{width:26px;height:26px}
.hsv{margin-top:10px;display:flex;flex-direction:column;gap:8px}
.sv{position:relative;height:130px;border-radius:6px;cursor:crosshair;touch-action:none}
.hue{position:relative;height:12px;border-radius:6px;cursor:pointer;touch-action:none;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
.sv i,.hue i{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.4);pointer-events:none}
.hue i{top:50%}
.cwrap{position:relative;flex:1;min-height:300px;overflow:hidden}
#cbox{position:absolute;inset:0}
.legend{position:absolute;top:6px;left:8px;z-index:3;pointer-events:none;font-size:11px;line-height:1.6;font-variant-numeric:tabular-nums;color:var(--mut)}
.irow{display:flex;align-items:center;gap:0;width:max-content;padding:0 6px 0 0;margin-left:-4px;border-radius:6px;pointer-events:none}
/* i comandi dell'indicatore si aprono solo passando sul nome (non sui valori che compaiono indicando il grafico) */
.irow .fxn,.irow .ictl,.pleg .fxn,.pleg .pctl{pointer-events:auto}
.irow .ictl,.pleg .pctl{padding-left:8px}
.irow .rl,.pleg .rl{padding-right:0!important}
.irow:hover .iv,.pleg:hover .iv{display:none}
.rl .iv:not(:empty){margin-left:5px}
.irow .rl{padding:1px 4px;cursor:default}
.irow .ictl{display:none;align-items:center;gap:5px}
.irow:hover,.irow:focus-within{background:color-mix(in srgb,var(--bg) 88%,transparent);box-shadow:0 0 0 1px var(--line)}
.irow:hover .ictl,.irow:focus-within .ictl{display:flex}
.ictl button{color:var(--mut);font-size:12px;line-height:1;padding:0 2px}
.ictl button.sw{padding:0}
#voltag{position:absolute;z-index:3;padding:2px 4px;font-size:11px;font-weight:600;color:#fff;text-align:center;font-variant-numeric:tabular-nums;pointer-events:none}
.legend i{font-style:normal;margin-right:8px}
.legend b{font-weight:500;color:var(--fg)}
#plegs{position:absolute;left:0;top:0;width:0;height:0;z-index:3}
.pleg{position:absolute;left:8px;white-space:nowrap;display:flex;align-items:center;gap:0;pointer-events:none;padding:2px 6px 2px 2px;border-radius:6px;font-size:11px;color:var(--mut);font-variant-numeric:tabular-nums}
.pleg .rl{padding:2px 4px;border-radius:4px;cursor:default}
.pleg b{font-weight:500}
.pctl{display:none;align-items:center;gap:5px}
.pleg:hover,.pleg:focus-within{background:color-mix(in srgb,var(--bg) 88%,transparent);box-shadow:0 0 0 1px var(--line)}
.pleg:hover .pctl,.pleg:focus-within .pctl{display:flex}
.pctl button{color:var(--mut);font-size:12px;line-height:1;padding:0 2px}
.pctl button:hover{color:var(--fg)}
.cmsg{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;color:var(--mut);background:var(--bg)}
.cfoot{display:flex;justify-content:space-between;gap:8px;color:var(--mut);font-size:11px}
/* calendario economico */
.cal{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.cev{cursor:default}
.ctip{position:absolute;z-index:6;width:min(420px,calc(100% - 24px));padding:10px 12px;font-size:11px;pointer-events:none}
.ctip h5{margin:0 0 7px;font-size:11px}
.ctip h5 span{font-weight:400;color:var(--mut);margin-left:6px}
.ctip table{width:100%;border-collapse:collapse}
.ctip td{padding:4px 0;border-top:1px solid color-mix(in srgb,var(--line) 60%,transparent);white-space:nowrap}
.ctip td:first-child{white-space:normal;padding-right:8px}
.ctip td.v{text-align:right;font-variant-numeric:tabular-nums;padding-left:10px}
.ctip td.v b{font-size:11px}
.ctip td.v span{color:var(--mut)}
.ctip .ar{display:inline-block;width:16px;text-align:center;font-style:normal;font-size:11px;font-weight:700;color:var(--mut)}
#cal{--cgood:#16c467;--cbad:#f2541b}
:host([data-theme=dark]) #cal{--cgood:#22e07a;--cbad:#ff6b3d}
.ctip .ar.good{color:var(--cgood)}.ctip .ar.bad{color:var(--cbad)}
.ctip .ar.eq{width:auto;padding:1px 6px;border:1px solid var(--line);border-radius:5px;font-size:11px;font-weight:600;color:var(--fg)}
.ctip p{margin:7px 0 0;font-size:11px;color:var(--mut);line-height:1.45}
.ctip .none{margin:0;font-size:11px;color:var(--fg)}
.cal .ctop{flex-wrap:nowrap}
.cal .cid{flex:1}
.calbody{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.cday{top:0;z-index:1}
.cev{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:8px;align-items:center}
.cev.past{opacity:.55}.cev.past:hover,.cev.past:focus-within{opacity:1}
.ctip.cvp{width:auto;padding:10px 14px;background:color-mix(in srgb,var(--bsolid) 94%,transparent)}.ctip.cvp>.cvals{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,minmax(64px,auto));column-gap:12px;row-gap:3px;align-items:baseline;font-size:11px}
.cev.next{opacity:1}
.cev.tpub{opacity:1;border-radius:6px;box-shadow:inset 3px 0 0 var(--acc);background:color-mix(in srgb,var(--accbg) 45%,transparent)}
.ctime b{display:block;font-variant-numeric:tabular-nums}
.ctime span{font-size:11px;color:var(--mut);white-space:nowrap}
.cname{min-width:0}
.cname b{font-weight:600}
.cname span{display:block;margin-top:1px;font-size:11px;color:var(--mut)}
.cname em{font-style:normal;color:var(--acc);font-weight:600}
.clink{white-space:nowrap;text-decoration:none}
.clink:hover{color:var(--fg);border-color:var(--mut)}
.clink.rel{border-color:var(--acc);color:#6236ff;font-weight:600}
:host([data-theme=dark]) .clink.rel{color:#9d86ff}
/* valori della pubblicazione nella riga: Precedente · Atteso · Pubblicato */
.cev .cvals{grid-column:2 / -1;display:grid;grid-template-columns:minmax(0,1fr) repeat(3,minmax(64px,auto));column-gap:12px;row-gap:3px;align-items:baseline;font-size:11px;margin-top:4px}
.cvals>span{white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}
.cvals>.cvn{text-align:left;overflow:hidden;text-overflow:ellipsis;color:var(--mut)}
.cvals>.cvh{color:var(--mut)}.cvals>.cvh.pub{color:var(--acc);font-weight:600}
.cvals b{font-weight:700;color:var(--fg)}
.cvals .ar{font-style:normal;margin-left:3px}.cvals .ar.good{color:var(--cgood)}.cvals .ar.bad{color:var(--cbad)}.cvals .ar.eq{color:var(--fg)}
.calmore{display:block;margin:12px auto 2px}
#calnote .err{color:var(--dn)}
.cal>.cfoot{display:block;line-height:1.45}
#calnote{display:inline}
#calnote .cln{display:block;font-size:9.5px}#calnote .enote{font-size:10px}#calnote .cln .ar{color:var(--fg)}
.ctsub{margin-top:2px;font-size:10px;line-height:1.35;color:var(--mut)}.ctsub .err{color:var(--dn)}
/* barre di scorrimento del calendario e del pannello: sottili, arrotondate, dentro il riquadro (niente frecce) */
.calbody,.sbody,.nvl{scrollbar-width:auto;scrollbar-color:auto}
.calbody::-webkit-scrollbar,.sbody::-webkit-scrollbar,.nvl::-webkit-scrollbar{width:10px}
.calbody::-webkit-scrollbar-button,.sbody::-webkit-scrollbar-button,.nvl::-webkit-scrollbar-button{display:none;width:0;height:0}
.calbody::-webkit-scrollbar-track,.sbody::-webkit-scrollbar-track,.nvl::-webkit-scrollbar-track{background:transparent}
.calbody::-webkit-scrollbar-track{margin:16px 0}
.calbody::-webkit-scrollbar-thumb,.sbody::-webkit-scrollbar-thumb,.nvl::-webkit-scrollbar-thumb{background:var(--sb);border-radius:10px;border:3px solid transparent;background-clip:padding-box;min-height:28px}
.calbody::-webkit-scrollbar-thumb:hover,.sbody::-webkit-scrollbar-thumb:hover,.nvl::-webkit-scrollbar-thumb:hover{background-color:color-mix(in srgb,var(--fg) 35%,transparent)}
.calbody::-webkit-scrollbar-corner,.sbody::-webkit-scrollbar-corner,.nvl::-webkit-scrollbar-corner{background:transparent}
.icon.calb{position:relative}
.icon.calb.on,.icon.sett.on{border-color:var(--acc);color:var(--acc)}
@media (max-width:760px){.panel.wide{flex-direction:column;overflow:auto;height:calc(100vh - var(--pt,62px) - 16px)}.panel.wide .side{width:100%}.cwrap{min-height:340px;flex:none}}
@media (prefers-reduced-motion:reduce){.panel{transition:none}}
*{font-family:-apple-system,"SF Pro Text","Segoe UI Variable Text","Segoe UI",Inter,Roboto,sans-serif}

/* superfici di vetro: sfocano e saturano la pagina dietro, bordo chiaro e riflesso in alto */
.bar,.panel{background:var(--bg);-webkit-backdrop-filter:blur(var(--gb,32px)) saturate(1.9);backdrop-filter:blur(var(--gb,32px)) saturate(1.9);border:1px solid var(--gbd);box-shadow:inset 0 1px 0 var(--ghi),var(--gsh)}
.bar{border-radius:18px;padding:7px 4px 7px 6px;box-shadow:inset 0 1px 0 var(--ghi),var(--bsh)}
.panel{border-radius:24px;padding:14px}
.panel::before,.bar::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,0) 34%)}
:host(:not([data-theme=dark])) .panel::before,:host(:not([data-theme=dark])) .bar::before{background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0) 30%)}
.bar::before{background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.05) 100%)}
:host(:not([data-theme=dark])) .bar::before{background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.3) 100%)}
/* intestazione fissa: sfoca solo le righe che le scorrono sotto */
.side>.hd{background:none}

/* marchio e tasti tondi */
.brand{font-size:12px;font-weight:700;letter-spacing:-.01em}
/* loghi: forma "squircle" ritagliata con una maschera vettoriale (bordo netto, niente bordino) */
:host{--lgmask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Cpath%20d%3D%22M100.0%2050.0%20100.0%2065.4%2099.9%2070.3%2099.8%2073.8%2099.6%2076.7%2099.3%2079.1%2099.0%2081.3%2098.6%2083.2%2098.2%2084.9%2097.7%2086.5%2097.2%2087.9%2096.6%2089.2%2095.9%2090.4%2095.2%2091.5%2094.4%2092.6%2093.5%2093.5%2092.6%2094.4%2091.5%2095.2%2090.4%2095.9%2089.2%2096.6%2087.9%2097.2%2086.5%2097.7%2084.9%2098.2%2083.2%2098.6%2081.3%2099.0%2079.1%2099.3%2076.7%2099.6%2073.8%2099.8%2070.3%2099.9%2065.4%20100.0%2050.0%20100.0%2034.6%20100.0%2029.7%2099.9%2026.2%2099.8%2023.3%2099.6%2020.9%2099.3%2018.7%2099.0%2016.8%2098.6%2015.1%2098.2%2013.5%2097.7%2012.1%2097.2%2010.8%2096.6%209.6%2095.9%208.5%2095.2%207.4%2094.4%206.5%2093.5%205.6%2092.6%204.8%2091.5%204.1%2090.4%203.4%2089.2%202.8%2087.9%202.3%2086.5%201.8%2084.9%201.4%2083.2%201.0%2081.3%200.7%2079.1%200.4%2076.7%200.2%2073.8%200.1%2070.3%200.0%2065.4%200.0%2050.0%200.0%2034.6%200.1%2029.7%200.2%2026.2%200.4%2023.3%200.7%2020.9%201.0%2018.7%201.4%2016.8%201.8%2015.1%202.3%2013.5%202.8%2012.1%203.4%2010.8%204.1%209.6%204.8%208.5%205.6%207.4%206.5%206.5%207.4%205.6%208.5%204.8%209.6%204.1%2010.8%203.4%2012.1%202.8%2013.5%202.3%2015.1%201.8%2016.8%201.4%2018.7%201.0%2020.9%200.7%2023.3%200.4%2026.2%200.2%2029.7%200.1%2034.6%200.0%2050.0%200.0%2065.4%200.0%2070.3%200.1%2073.8%200.2%2076.7%200.4%2079.1%200.7%2081.3%201.0%2083.2%201.4%2084.9%201.8%2086.5%202.3%2087.9%202.8%2089.2%203.4%2090.4%204.1%2091.5%204.8%2092.6%205.6%2093.5%206.5%2094.4%207.4%2095.2%208.5%2095.9%209.6%2096.6%2010.8%2097.2%2012.1%2097.7%2013.5%2098.2%2015.1%2098.6%2016.8%2099.0%2018.7%2099.3%2020.9%2099.6%2023.3%2099.8%2026.2%2099.9%2029.7%20100.0%2034.6Z%22/%3E%3C/svg%3E")}
.lg{outline:none!important;border-radius:0!important;-webkit-mask:var(--lgmask) center/100% 100% no-repeat;mask:var(--lgmask) center/100% 100% no-repeat}
.lg img{background:#17181c!important}
/* icona di Brandfetch: sopra l'iniziale, compare quando è arrivata */
.lg{position:relative}.lg>img[data-bf]{position:absolute;inset:0;opacity:0;transition:opacity .2s}.lg>img[data-bf].ok{opacity:1}
.lg>img[data-bf="1"]{object-fit:contain;padding:18%;box-sizing:border-box}
/* viola tonale: fondo trasparente e testo viola per le selezioni (i pulsanti principali restano pieni) */
:host{--acct:color-mix(in srgb,var(--acc) 74%,#fff)}:host([data-theme=dark]){--acct:color-mix(in srgb,var(--acc) 64%,#141519)}
.lchip.on,.rnd.on,.icon.calb.on,.icon.sett.on,#ranges button.on,.ecv .tab.on{background:var(--acct)!important;color:#fff!important}
#lchips>.sth,#ranges>.sth,.ecv>.sth{background:var(--acct)!important}
/* marchio Owlook: il barbagianni (contorno e tratti nel viola del tema, volto vuoto) e la scritta */
.brand{display:inline-flex;align-items:center;gap:7px;position:relative;z-index:1;color:var(--fg);padding:2px 6px 2px 2px;margin:-2px -6px -2px -2px;border:0;border-radius:10px;background:none;font:inherit;-webkit-tap-highlight-color:transparent}
.brand:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
.brand .owl{display:block;flex:none;width:28px;height:28px}
.brand .of{display:none}.brand .oi{fill:var(--acc)} /* solo i tratti viola: l'interno del volto lascia vedere lo sfondo */
.brand .bwm{font-size:18px;font-weight:750;letter-spacing:-.03em;line-height:1}
.icon,.rnd,.close{width:30px;height:30px;border:0;border-radius:50%;background:var(--row2);color:var(--fg)}
.icon:hover,.rnd:hover,.close:hover{background:color-mix(in srgb,var(--fg) 14%,transparent)}
.icon.sm{width:30px;height:30px}.icon.rw{width:30px}
.rnd.on,.icon.calb.on,.icon.sett.on{background:var(--acc);color:var(--onacc)}
.pill{height:30px;padding:0 14px;border:0;border-radius:999px;background:var(--row2);color:var(--fg);font-size:11px;font-weight:600}
.pill.pri{background:var(--acc);color:var(--onacc)}
.pill:hover{background:color-mix(in srgb,var(--fg) 14%,transparent)}.pill.pri:hover{filter:brightness(1.08);background:var(--acc)}

/* liste come capsule; quella scelta piena di verde */
.lchip{padding:6px 13px;border:0;border-radius:999px;background:var(--row2);color:var(--fg);font-size:11px;font-weight:500}
.lchip.on{background:var(--acc);color:var(--onacc);font-weight:650}
.lchip.led{border:1px dashed var(--sb);background:transparent}

/* controllo a segmenti come iOS: binario grigio, cursore chiaro in rilievo */
.tabs,.seg{display:inline-flex;gap:0;padding:2px;border:0;border-radius:10px;background:var(--seg);overflow:visible}
.tab,.seg button{border:0;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:500;letter-spacing:0;text-transform:none;line-height:16px;color:var(--fg);background:transparent}
.seg button{border-right:0}
.tab.on,.seg button.on{background:var(--thumb);color:var(--fg);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 0 .5px rgba(0,0,0,.04)}
.card .seg button{width:auto;min-width:64px;padding:5px 12px}

/* ricerca */
.find{height:30px;border:0;border-radius:10px;background:var(--seg);padding:0 6px 0 10px}
.find:hover,.find:focus-within{border:0;box-shadow:0 0 0 2px var(--accbg)}
.find input{font-size:11px}

/* righe senza riquadri: separatori sottili, al passaggio un velo arrotondato */
.thead{padding:0 10px 6px;font-size:11px;letter-spacing:0;color:var(--mut)}
.th.on{color:var(--fg)}.th.on i{color:var(--acc)}
.row{margin:0;border:0;border-radius:14px;background:transparent;padding:9px 10px;position:relative}
.row+.row::before{content:"";position:absolute;top:0;left:10px;right:10px;height:1px;background:var(--line)}
.row:hover{background:var(--row)}.row:hover::before,.row:hover+.row::before{opacity:0}
.row.sel{background:var(--row2);border:0}.row.sel::before,.row.sel+.row::before{opacity:0}
.nml>.tk{font-size:12px;font-weight:650;letter-spacing:-.01em}
.nmb>.cn{font-size:11px}
.nm>.lg{width:30px;height:30px;font-size:11px}.nm{gap:10px}
.nml{height:18px}
.yc{font-size:11px}

/* il prezzo e, sotto, la variazione di oggi in una capsula piena di colore */
.lp{gap:3px}
.lpr .pr{font-size:12px;font-weight:600;letter-spacing:-.01em}
.lp>small.ch{display:inline-block;min-width:46px;padding:2px 5px;border-radius:7px;font-size:11px;font-weight:500;line-height:14px;text-align:right;color:#fff;background:var(--mut)}
.lp>small.ch.up{background:var(--up)}.lp>small.ch.dn{background:var(--dn)}
.cu{font-size:11px}

/* barra dei titoli in evidenza */
.bi{border-radius:10px}
.bi b{font-weight:650;letter-spacing:-.005em} /* 2 righe da 34 = 3 righe da 22 + 2 spazi: 3 e 4 titoli alti uguali */
.bar>.sep{background:var(--bsep)}
.go{width:24px;height:24px;border-radius:50%}

/* portafoglio */
.pfs3 b{font-size:15px;font-weight:700;letter-spacing:-.02em}
.prow .nm>.lg{width:30px;height:30px}
.prow .nmb>.prd>b{font-size:11px}
.pbx .pbl{font-size:11px;font-weight:600}
.subt{font-size:11px;letter-spacing:0;color:var(--fg);font-weight:600}
.subt span{text-transform:lowercase}.subt span::first-letter{text-transform:uppercase}
.slot{border:0;border-radius:14px;background:var(--row)}
.slot.add .plus{border-radius:10px}

/* grafico: prezzo grande, niente bordi, capsule per periodo e strumenti */
.cwrap{border:0;border-radius:16px;background:transparent}
.ctitle b{font-size:13px;font-weight:700}
.ctitle span{font-size:11px}
.cquote{font-size:28px;font-weight:700;letter-spacing:-.025em;margin-top:2px}
.cquote .ch{font-size:12px;font-weight:600}
.tb{height:28px;padding:0 10px;border:0;border-radius:999px;background:var(--row2);font-size:11px}
.tb:hover{background:color-mix(in srgb,var(--fg) 14%,transparent)}
#ranges{background:transparent;padding:0;gap:4px}
#ranges button{border-radius:999px;padding:4px 8px;min-width:0;font-size:11px;font-weight:600;color:var(--mut)}
#ranges button.on{background:var(--acc);color:var(--onacc);box-shadow:none}
.clock{font-size:11px}
.menu,.cpop{background:var(--bg);-webkit-backdrop-filter:blur(30px) saturate(1.8);backdrop-filter:blur(30px) saturate(1.8);border:1px solid var(--gbd);border-radius:16px;box-shadow:inset 0 1px 0 var(--ghi),var(--gsh)}

/* calendario: elenco raggruppato come nelle Impostazioni di iPhone */
.calbody{border:0;border-radius:18px;background:var(--row);padding:0 12px 10px}
.cday{position:static;background:transparent;border-bottom:0;padding:14px 2px 6px;font-size:11px;font-weight:650;letter-spacing:0;text-transform:none;color:var(--fg)}
.cday::first-letter{text-transform:uppercase}
.cday.today{color:var(--acc)}
.cev{border-bottom:1px solid var(--line);padding:10px 12px}
.cev.next{background:var(--accbg);border-radius:12px;border-bottom-color:transparent}
.ctime b{font-size:12px;font-weight:650}
.cname b{font-size:11px}
.clink{border:0;border-radius:999px;background:var(--row2);padding:5px 11px;font-size:11px;color:var(--fg)}
.ctip{border-radius:16px;background:var(--bg);-webkit-backdrop-filter:blur(30px) saturate(1.8);backdrop-filter:blur(30px) saturate(1.8);border:1px solid var(--gbd);box-shadow:inset 0 1px 0 var(--ghi),var(--gsh)}

/* impostazioni: un foglio di vetro con gruppi arrotondati */
.modal{background:rgba(0,0,0,.18);border-radius:24px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.card{width:300px;border-radius:22px;padding:16px;background:color-mix(in srgb,var(--solid) max(var(--gp,78%),88%),transparent);-webkit-backdrop-filter:blur(34px) saturate(1.9);backdrop-filter:blur(34px) saturate(1.9);border:1px solid var(--gbd);box-shadow:inset 0 1px 0 var(--ghi),var(--gsh)}
.card .hd{font-size:15px;font-weight:700;letter-spacing:-.01em;margin-bottom:12px}
.field{padding:12px;border-radius:16px;background:var(--row)}
.field+.field{margin-top:10px}
.field>span{font-size:11px;color:var(--fg);font-weight:600}
.hint{font-size:11px}
.nmpv{border:0;border-radius:12px;background:var(--row2)}
.kbd{border:0;border-radius:10px;background:var(--row2)}
select.pill,.txtsel{border:0;border-radius:10px;background:var(--seg)}

/* tooltip */
.htip{border-radius:12px;background:var(--bg);-webkit-backdrop-filter:blur(26px) saturate(1.8);backdrop-filter:blur(26px) saturate(1.8);border:1px solid var(--gbd);box-shadow:inset 0 1px 0 var(--ghi),var(--gsh)}

.chart>.ctop .icon,.chart>.ctop .close,.cal>.ctop .icon,.cal>.ctop .close{width:28px;height:28px}
.chart>.ctop{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto auto;grid-template-areas:"cid tbar clock max close";gap:6px 10px}
.chart>.ctop>.cid{grid-area:cid;min-width:0}.chart>.ctop>.tbar{grid-area:tbar}.chart>.ctop>.clock{grid-area:clock}.chart>.ctop>.maxb{grid-area:max}.chart>.ctop>.close{grid-area:close}
/* andamento storico: i periodi su una riga a sé, sotto al prezzo */
.chart>.ctop:has(#ranges){grid-template-columns:minmax(0,1fr) auto auto auto;grid-template-areas:"cid clock max close" "tbar tbar tbar tbar"}
/* titolo e prezzo sempre nella stessa posizione (candele e andamento storico); selettori, orario e tasti in alto, allineati fra loro */
.chart>.ctop{align-items:start}
.chart>.ctop>.clock{align-self:start;margin-top:7px}
.chart>.ctop>.tbar,.chart>.ctop>.maxb,.chart>.ctop>.close{align-self:start}
.prow .nml{height:18px}.prow .nmb>.cn{line-height:14px}.prow .nmb>.prd{margin-top:2px}
.card #rowcseg button{white-space:nowrap;padding:5px 10px}

.pshade{border-radius:24px;border-color:var(--gbd)}
.tvl{color:inherit;text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 40%,transparent);text-underline-offset:2px}
/* impostazioni: trasparenza del vetro */
.glr{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--mut)}
/* cursore a capsula come su iPhone; i tre punti (inizio, metà, fine) sono disegnati sul binario */
.glr input{--tw:30px;--tc:calc(var(--tw) / 2);flex:1;min-width:0;height:28px;margin:0;padding:0;border:0;border-radius:0;box-shadow:none;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer}
.glr input::-webkit-slider-runnable-track{height:5px;border-radius:3px;
  background:radial-gradient(circle,var(--tick) 0 2px,transparent 2.5px) calc(var(--tc) - 4px) 50%/8px 8px no-repeat,
    radial-gradient(circle,var(--tick) 0 2px,transparent 2.5px) calc(50% - 4px + 0px) 50%/8px 8px no-repeat,
    radial-gradient(circle,var(--tick) 0 2px,transparent 2.5px) calc(100% - var(--tc) + 4px) 50%/8px 8px no-repeat,
    linear-gradient(to right,var(--acc) 0 calc(var(--tc) + (100% - var(--tw)) * var(--gf,.4)),var(--seg) 0 100%)}
.glr input::-webkit-slider-thumb{-webkit-appearance:none;width:var(--tw);height:19px;margin-top:-7px;border-radius:10px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25),0 0 0 .5px rgba(0,0,0,.06);transition:transform .12s}
.glr input:active::-webkit-slider-thumb{transform:scale(1.06)}
.glr input:focus-visible{outline:none}.glr input:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px var(--accbg),0 2px 6px rgba(0,0,0,.25)}
.glr .gi{flex:none;color:var(--mut)}
.glr{--tick:color-mix(in srgb,var(--fg) 35%,transparent)}


/* calendario degli utili: settimana a griglia di loghi, giorno aperto con l'elenco */
.ecv .tab,.efil .tab{padding:5px 10px;font-size:11px;display:inline-flex;align-items:center;gap:4px}
.ewk{display:flex;align-items:center}
.ewk .icon{line-height:1}
#ewt{text-align:center;white-space:nowrap}
.efil{display:flex;gap:6px}
.efil .tab{padding:5px 8px;font-size:11px}
.efil .ecaps{margin-right:auto}
.emine{display:inline-flex;align-items:center;gap:4px;font-weight:600}
.emine svg{color:#f5b301}
.emine.on{background:color-mix(in srgb,#f5b301 22%,transparent)}
.ewkb{padding:6px;display:flex;flex-direction:column;gap:6px}
.ewd{display:grid;grid-template-columns:76px minmax(0,1fr);column-gap:6px;border-radius:14px;background:var(--row)}
.ewd.past{opacity:.72}
.ewd.today{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--acc) 60%,transparent);background:var(--accbg);opacity:1}
.edl{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:4px;border:0;border-radius:10px;background:none;box-shadow:none;height:auto;text-align:left;color:var(--fg);cursor:pointer}
.edl:hover{background:var(--row2)}
.edl b{font-size:11px;font-weight:600;color:var(--mut)}.edl b span{font-size:17px;font-weight:700;color:var(--fg)}
.ewd.today .edl b,.ewd.today .edl b span{color:var(--acc)}
.edl small{font-size:11px;color:var(--mut)}
.emac{font-style:normal;padding:2px 6px;border-radius:6px;background:color-mix(in srgb,var(--dn) 18%,transparent);color:var(--dn);font-size:11px;font-weight:700;white-space:nowrap}
.echev{margin-top:auto;font-style:normal;font-size:11px;font-weight:600;color:var(--acc)}
.ewd.open .echev{color:var(--mut)}
.egs{display:flex;flex-direction:column;justify-content:center;min-width:0}
.eg{display:grid;align-items:start}
.es{display:grid;place-items:center;color:var(--mut)}
.et{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:0;border:0;background:none;box-shadow:none;height:auto;min-width:0;cursor:pointer;color:var(--fg)}
.et>.lg{place-items:center;overflow:hidden;background:linear-gradient(160deg,hsl(var(--lgh) 32% 48%),hsl(var(--lgh) 30% 38%));color:#fff;font-size:13px;font-weight:800;line-height:1;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.18)}
.et>.lg i{font-style:normal}
.et>.lg img{background:#fff}
.et>b{max-width:100%;font-weight:650;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.et.mine>.lg{box-shadow:none}
.et>.lg{position:relative;z-index:1}
.et.mine::before{content:"";position:absolute;top:-2px;left:50%;width:30px;height:30px;transform:translateX(-50%);background:#f5b301;-webkit-mask:var(--lgmask) center/100% 100% no-repeat;mask:var(--lgmask) center/100% 100% no-repeat}
.et.mine>b{color:#f5b301}
.ems{position:absolute;top:-4px;right:-4px;display:grid;place-items:center;width:14px;height:14px;border-radius:50%;background:#f5b301;color:#fff;box-shadow:0 0 0 1.5px var(--bsolid)}
.et:hover>.lg{filter:brightness(1.1)}
.et.more>.lg{background:var(--row2);color:var(--fg);font-size:11px;box-shadow:none}
.et.more>b{color:var(--mut);font-weight:500}
.enone{font-size:11px;color:var(--mut);padding:4px 2px}
.erw{display:grid;grid-template-columns:26px minmax(0,1fr) 70px 92px 76px;gap:10px;align-items:center}
.erw{padding:6px 4px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:8px}
.erw:hover{background:var(--row2)}
.erw>.lg{display:grid;place-items:center;width:26px;height:26px;border-radius:27%;outline:.5px solid color-mix(in srgb,var(--fg) 10%,transparent);outline-offset:-.5px;overflow:hidden;background:hsl(var(--lgh) 45% 42%);color:#fff;font-size:11px;font-weight:700}
.erw>.lg i{font-style:normal}.erw>.lg img{width:100%;height:100%;object-fit:cover;background:#fff}
.enm{min-width:0}.enm b{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:650}
.enm>span{display:block;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.estar{display:inline-grid;color:#f5b301;font-style:normal}
.ecap{text-align:right;font-size:11px;color:var(--mut);font-variant-numeric:tabular-nums;white-space:nowrap}
.eeps{text-align:right;font-variant-numeric:tabular-nums;min-width:0}.eeps b{display:block;font-size:11px;font-weight:650;white-space:nowrap}.eeps span{display:block;font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.esur{justify-self:end;padding:2px 7px;border-radius:7px;font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap}
.esur.up{background:var(--up)}.esur.dn{background:var(--dn)}
.esur.wait{background:var(--row2);color:var(--mut);font-weight:600}
.eall{display:block;margin:10px auto 0}

/* selettori a segmenti: la selezione è un cursore che scorre fino al pulsante scelto */
.tabs,.seg{position:relative;isolation:isolate}
.sth{position:absolute;left:0;top:0;z-index:0;border-radius:8px;background:var(--thumb);box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 0 .5px rgba(0,0,0,.04);pointer-events:none;
  transition:transform .3s cubic-bezier(.3,.8,.25,1),width .3s cubic-bezier(.3,.8,.25,1),height .3s cubic-bezier(.3,.8,.25,1),opacity .15s}
.hasth>button{position:relative;z-index:1}
.hasth>button.on{background:transparent;box-shadow:none}
#ranges.hasth>button.on{background:transparent}
#ranges>.sth{background:var(--acc);box-shadow:none;border-radius:999px}
.tab,.seg button{transition:color .2s}
@media (prefers-reduced-motion:reduce){.sth{transition:none}}

/* titoli in evidenza nascosti col tasto: la barra svanisce verso l'alto e il pannello sale a riempire lo spazio */
.bar{transition:opacity .3s ease,transform .35s cubic-bezier(.3,.8,.25,1)}
.bar.off{opacity:0;transform:translateY(-16px) scale(.97);pointer-events:none}
.panel.barmv{transition:top .38s cubic-bezier(.3,.8,.25,1),height .38s cubic-bezier(.3,.8,.25,1),max-height .38s cubic-bezier(.3,.8,.25,1),width .38s cubic-bezier(.3,.8,.25,1),right .38s cubic-bezier(.3,.8,.25,1),border-radius .38s}
@media (prefers-reduced-motion:reduce){.bar{transition:none}}

/* colori principali scelti nelle impostazioni */
.colrow{display:flex;align-items:center;gap:9px}
.colit{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--fg);white-space:nowrap}
.colit .sw{width:20px;height:20px;border-radius:6px;border:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 1px 3px rgba(0,0,0,.2);cursor:pointer}
.colrow .rst{margin-left:auto;height:24px;padding:0 10px;font-size:11px}
.field>.hint{display:block;margin-top:6px;font-size:11px;color:var(--mut)}
.lp>small.ch.up{color:var(--onup)}.lp>small.ch.dn{color:var(--ondn)}
.esur.up{color:var(--onup)}.esur.dn{color:var(--ondn)}

/* asse delle date: più in alto nell'andamento storico, un po' più in basso nel grafico a candele */
.chart .cwrap{margin-bottom:-4px}
.chart.lmode .cwrap{margin-bottom:4px}
.tb.lcb{display:inline-flex;align-items:center;gap:4px}

/* barra: caratteri un po' più grandi; due colonne con nome e valori vicini */
.bar{font-size:11px}
.bi [data-f=c]{font-size:11px}
.bar.two .bi{justify-content:start;column-gap:14px}
/* freccia: il cerchio compare solo passandoci sopra e non tocca la linea a sinistra */
.bar{grid-template-columns:minmax(0,1fr) 30px}
.go{background:transparent;transition:transform .2s,background .15s}
.go:hover{background:var(--bhv)}
.bar>.go{justify-self:end;margin-right:1px}

/* etichette dell'ultimo valore sull'asse dei prezzi, con gli angoli arrotondati */
#ptags{position:absolute;inset:0;z-index:3;pointer-events:none}
.ptag.ind{height:15px!important;line-height:15px!important;border-radius:999px!important;font-weight:600}
.fxn{cursor:pointer}.fxn.off{opacity:.5;text-decoration:line-through}
.ptag{position:absolute;right:2px;height:18px;line-height:18px;padding:0 3px;border-radius:999px;transform:translateY(-50%);font-size:11px;font-weight:600;text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.25)}
#voltag{border-radius:999px;right:2px}
/* valori del mirino sugli assi (prezzo a destra, data in basso): capsule come le altre etichette */
#xtags{position:absolute;inset:0;z-index:4;pointer-events:none}
.xtag{position:absolute;height:18px;line-height:18px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;color:#fff;background:#4a4d57;box-shadow:0 1px 3px rgba(0,0,0,.25)}
:host([data-theme=dark]) .xtag{background:#585c68}
.xtag.p{right:2px;transform:translateY(-50%);text-align:center;padding:0 3px}
.xtag.t{transform:translate(-50%,-50%)}

/* aggiunta al portafoglio: controvalore risultante */
.pfcv{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:2px 10px;margin-top:8px;padding:9px 12px;border-radius:12px;background:var(--accbg)}
.pfcv span{font-size:11px;color:var(--mut)}
.pfcv b{justify-self:end;font-size:13px;font-weight:650;font-variant-numeric:tabular-nums}
.pfcv em{grid-column:1 / -1;justify-self:end;font-style:normal;font-size:11px;color:var(--mut);font-variant-numeric:tabular-nums}

/* transizioni: riquadri e menu compaiono con una breve dissolvenza, i contenuti cambiano senza scatti */
@keyframes twIn{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
@keyframes twFade{from{opacity:0}to{opacity:1}}
@keyframes twDrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.menu:not([hidden]),.cpop:not([hidden]){animation:twIn .18s cubic-bezier(.3,.8,.25,1)}
.modal:not([hidden]){animation:twFade .2s ease}
.modal:not([hidden])>*{animation:twIn .26s cubic-bezier(.3,.8,.25,1)}
.panel:not([hidden]){animation:twDrop .28s cubic-bezier(.3,.8,.25,1)}
.fadein{animation:twFade .25s ease}
.ctip:not([hidden]){animation:twFade .15s ease}
@media (prefers-reduced-motion:reduce){.menu,.cpop,.modal,.modal>*,.panel,.fadein,.ctip{animation:none!important}}

/* impostazioni salvate del grafico */
.tplm{width:250px;display:flex;flex-direction:column;gap:4px}
.tplh{padding:2px 4px 4px;font-size:11px;font-weight:650;color:var(--mut)}
.tplr{display:flex;align-items:center;gap:4px;border-radius:10px}
.tplr:hover{background:var(--row2)}
.tpln{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;padding:6px 8px;text-align:left}
.tpln b{max-width:100%;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tpln small{font-size:11px;color:var(--mut)}
.tplr .x{display:grid;place-items:center;width:22px;height:22px;margin-right:4px;border-radius:50%;color:var(--mut)}
.tplr .x:hover{background:var(--row2);color:var(--fg)}
.tpls{display:flex;gap:6px;margin-top:6px}
.tpls input{flex:1;min-width:0;height:30px;padding:0 10px;border-radius:999px}
.tple{margin:2px 4px;font-size:11px;line-height:1.4;color:var(--mut)}

/* andamento storico: valori della giornata in pila */
.lgst{display:grid;grid-template-columns:auto auto;column-gap:10px;row-gap:0;justify-content:start}
.lgst .lgd{grid-column:1 / -1;margin-bottom:2px}
.lgst .lgd i{margin:0}
.lgr{display:contents}
.lgr i{margin:0}
.lgr b{text-align:right}

/* portafoglio: titolo · rendimento · prezzo e variazione come nella lista (riga compatta) */
.thead.pthead,.row.prow{column-gap:12px}.thead.pthead:not(.ed),.row.prow:not(.ed){column-gap:7px}
.row.prow{padding:7px 8px}
.prow>.prd{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;min-width:0;font-variant-numeric:tabular-nums;white-space:nowrap}
.prow>.prd>b{font-size:11px;font-weight:600;line-height:15px}
.prow>.prd>small{line-height:13px}
.pbx{align-self:center;min-height:0;box-shadow:none}
.pbx .lp{align-items:flex-end}
.thead.pthead>.pthr,.thead.pthead>.th-r{justify-self:end}
.thead.pthead>.pth1{gap:0}

.bar .bi [data-f=c]{justify-self:end;text-align:right;color:#fff;background:var(--mut)}
.bar .bi [data-f=c].up{background:var(--up);color:var(--onup)}.bar .bi [data-f=c].dn{background:var(--dn);color:var(--ondn)}

.lchip.led.on{color:var(--acc);border-color:var(--acc);background:var(--accbg)}

.panel select{-webkit-appearance:none;appearance:none;height:30px;padding:0 28px 0 11px;border:0;border-radius:10px;background:var(--row2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 10px center;color:var(--fg);font-size:11px;font-weight:600;color-scheme:light}
:host([data-theme=dark]) .panel select{color-scheme:dark}
.panel select:focus-visible{outline:none;box-shadow:0 0 0 2px var(--accbg)}
.panel select option{background:var(--solid);color:var(--fg);font-weight:500}

.pft{align-items:center}
.pft .pfchg{flex:none;margin-left:auto}

/* spigoli del pannello: larghezza e altezza insieme */
.rz-c{width:26px;height:26px;z-index:10}
.rz-tl{left:-5px;top:-5px;cursor:nwse-resize}.rz-br{right:-5px;bottom:-5px;cursor:nwse-resize}
.rz-tr{right:-5px;top:-5px;cursor:nesw-resize}.rz-bl{left:-5px;bottom:-5px;cursor:nesw-resize}
/* spigoli: si illumina l'arco dell'angolo, come i bordi */
.rz-c::after{inset:auto;width:22px;height:22px;background:none;border:0 solid var(--acc);border-radius:0}
.rz-tl::after{left:4px;top:4px;border-top-width:3px;border-left-width:3px;border-top-left-radius:22px}
.rz-tr::after{right:4px;top:4px;border-top-width:3px;border-right-width:3px;border-top-right-radius:22px}
.rz-bl::after{left:4px;bottom:4px;border-bottom-width:3px;border-left-width:3px;border-bottom-left-radius:22px}
.rz-br::after{right:4px;bottom:4px;border-bottom-width:3px;border-right-width:3px;border-bottom-right-radius:22px}
.panel.maxed .rz-c{display:none}
/* titoli in evidenza: variazione con lo stesso carattere delle liste */
.bar .bi [data-f=c]{font-size:11px;font-weight:500;line-height:14px;padding:0 5px;min-width:46px;border-radius:7px}
.bar.two .bi [data-f=c]{line-height:13px;min-width:44px}
/* portafoglio: prezzo e variazione in un riquadro leggero, per far capire che si può cliccare */
.pbx{padding:4px 6px;background:var(--row);border-radius:10px}
.pbx:hover{background:var(--row2)}
.pbx:hover .bm{opacity:1}
/* led verde: pulsa mentre arrivano i prezzi in tempo reale */
.dot{position:relative}
.dot.on::after{content:"";position:absolute;inset:0;border-radius:50%;background:#22c55e;animation:dotPulse 2s ease-out infinite;pointer-events:none}
@keyframes dotPulse{0%{transform:scale(1);opacity:.55}80%,100%{transform:scale(2.6);opacity:0}}
@media (prefers-reduced-motion:reduce){.dot.on::after{animation:none}}
/* titoli in evidenza: prezzi in grassetto come nelle liste */
.bi [data-f=p]{color:var(--bnm)}
.bpx{display:flex;align-items:baseline;justify-content:flex-end;gap:2px;font-variant-numeric:tabular-nums}
.bpx .cu{font-size:11px}

/* utili: riquadri dei loghi di misura fissa, anche a tutto schermo */
.eg{justify-content:start}
.et>.lg{display:flex;align-items:center;justify-content:center}
.et>.lg img{display:block;width:100%;height:100%;object-fit:cover}
/* settimana: un unico selettore a capsula */
.ewk{gap:0;padding:2px;border-radius:999px;background:var(--seg)}
.ewk .icon{background:transparent;font-size:15px;color:var(--mut)}
.ewk .icon:hover{background:var(--row2);color:var(--fg)}
#ewt{font-size:11px;font-weight:650;letter-spacing:-.01em}
/* led "in uscita adesso" */
.elive{display:inline-block;position:relative;width:7px;height:7px;border-radius:50%;background:#22c55e;flex:none}
.elive::after{content:"";position:absolute;inset:0;border-radius:50%;background:#22c55e;animation:dotPulse 1.6s ease-out infinite}
.et>.elive{position:absolute;width:9px;height:9px}
.enm b .elive{margin-left:2px}
@media (prefers-reduced-motion:reduce){.elive::after{animation:none}}
/* stime e risultati */
.ersum{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:4px 2px 8px;padding:9px 12px;border-radius:12px;background:var(--row);font-size:11px;color:var(--mut)}
.ersum b{font-size:12px;color:var(--fg);font-variant-numeric:tabular-nums}
.ersum .up b{color:var(--up)}.ersum .dn b{color:var(--dn)}
.erlive{display:inline-flex;align-items:center;gap:6px;color:var(--fg);font-weight:600}
.ersec{margin-bottom:6px;padding:0 10px 6px;border-radius:14px;background:var(--row)}
.erh,.erx{display:grid;grid-template-columns:26px minmax(0,1fr) 64px 66px 62px 66px;gap:8px;align-items:center}
.espk{display:block;width:64px;height:26px}.espk svg{display:block;overflow:visible}
.ersec.nosp .erh,.ersec.nosp .erx{grid-template-columns:26px minmax(0,1fr) 66px 62px 66px}.ersec.nosp .erx>.espk,.ersec.nosp .erh>span:nth-child(3){display:none} /* il mini grafico c'è solo oggi */
@container (max-width:452px){.erh,.erx,.ersec.nosp .erh,.ersec.nosp .erx{grid-template-columns:26px minmax(0,1fr) 62px 60px 62px}.erx>.espk,.erh>span:nth-child(3){display:none}}
.erh{padding:2px 4px 2px;font-size:11px;color:var(--mut)}.erh span:nth-child(n+3){text-align:right}
.erx .eact{text-align:right;font-size:11px;font-weight:650;font-variant-numeric:tabular-nums}
.erst{display:inline-flex;align-items:center;justify-content:flex-end;gap:5px;font-size:11px;color:var(--mut);white-space:nowrap}
.erst.live{color:var(--fg);font-weight:600}
.ess{display:inline-grid;color:var(--mut);font-style:normal}
.ess svg{width:11px;height:11px}
.efil .evw .tab{padding:5px 10px}

.bar.two>.items{column-gap:16px}

/* logo con il led "in uscita adesso" sull'angolo */
.elw{position:relative;display:block;width:26px;height:26px}
.elw>.lg{display:grid;place-items:center;width:26px;height:26px;border-radius:27%;outline:.5px solid color-mix(in srgb,var(--fg) 10%,transparent);outline-offset:-.5px;overflow:hidden;background:hsl(var(--lgh) 45% 42%);color:#fff;font-size:11px;font-weight:700}
.elw>.lg i{font-style:normal}.elw>.lg img{width:100%;height:100%;object-fit:cover;background:#fff}
.elw>.elive{position:absolute;top:-2px;right:-2px;width:9px;height:9px}
/* led del tasto calendario: verde = utili in uscita di titoli che segui o possiedi, rosso = dato macro in arrivo */
.ecv .tab{position:relative}.ecv .tab.elv::after{content:"";position:absolute;top:3px;right:5px;width:7px;height:7px;border-radius:50%;background:#22c55e}

/* sorpresa degli utili: capsule tutte della stessa larghezza (una o due cifre prima della virgola) */
.esur.up,.esur.dn{box-sizing:border-box;min-width:58px;text-align:right}

/* pannello laterale del browser: barra e pannello occupano tutta la larghezza */
:host([data-panel]) .bar{left:8px;right:8px;width:auto;max-width:none}
:host([data-panel]) .panel{left:8px;right:8px;width:auto!important;max-width:none}
:host([data-panel]) .panel.wide{width:auto!important}
:host([data-panel]) .rz,:host([data-panel]) #layreset,:host([data-panel]) #go{display:none!important}

/* impostazioni divise in sezioni */
/* Generali e Aspetto accanto al titolo delle impostazioni */
.card>.hd>.sects{margin:0 10px 0 auto;flex:none}
.card>.hd>.sects .tab{padding:5px 11px;font-size:11px;font-weight:500;letter-spacing:0}
.card>.hd>.sects .tab.on{font-weight:600}
.sectp{display:block}

/* campi: stesso carattere del resto del widget; data scrivibile o dal calendario */
input,textarea{font-family:inherit}
input[type=date]{color-scheme:light;cursor:text}
:host([data-theme=dark]) input[type=date]{color-scheme:dark}
input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.7}

/* menu a tendina del widget */
.cshid{display:none!important}
.csel{display:inline-flex;align-items:center;justify-content:space-between;gap:8px;height:30px;min-width:0;max-width:100%;padding:0 10px 0 12px;border:0;border-radius:10px;background:var(--row2);color:var(--fg);font-size:11px;font-weight:600;text-align:left}
.csel>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.csel>svg{flex:none;color:var(--fg);opacity:.75}
.csel:hover{background:color-mix(in srgb,var(--fg) 13%,transparent)}
.csel:hover>svg{opacity:1}
.csel:disabled{opacity:.5;cursor:default}
.field>.csel{width:100%}
.keyrow .csel{flex:1}
.pfcurl .csel{max-width:150px}
.csl{display:flex;flex-direction:column;gap:1px;overflow-y:auto;overscroll-behavior:contain}
.csl button{display:flex;align-items:center;gap:6px;padding:6px 10px 6px 6px;border-radius:8px;font-size:11px;text-align:left;white-space:nowrap;color:var(--fg)}
.csl button:hover{background:var(--row2)}
.csl button.on{font-weight:650}
.csl .ck{width:12px;color:var(--acc);font-size:11px}

/* liste: una riga sola (le altre scorrono sotto ai tasti); in modifica tutte, da trascinare per riordinarle */
.lhd>.lists{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 22px),transparent);padding:1px 0}
.lhd>.lists::-webkit-scrollbar{display:none}
.lhd>.lists>.lchip{flex:none}
.lhd.led>.lists{flex-wrap:wrap;overflow:visible;-webkit-mask-image:none;mask-image:none}
.lchip.led{cursor:grab;touch-action:none;user-select:none}
.lchip.led.drag{position:relative;z-index:3;cursor:grabbing;pointer-events:none;border-style:solid;border-color:var(--acc);background:color-mix(in srgb,var(--acc) 16%,var(--solid));outline:0;box-shadow:0 8px 22px rgba(0,0,0,.3)}

.row.prow.ed>.prd,.thead.pthead.ed>.th-r{display:none}

/* portafoglio: il riquadro ha sempre la stessa altezza, qualunque cosa mostri; capsule come nella lista */
.pbx .bm{min-height:38px;justify-content:center}
.pbx .bm-d .pbl b{font-size:11px;font-weight:650}
.prow .lp>small.ch{display:inline-block;max-width:none;line-height:14px;font-size:11px;font-weight:500}
/* portafoglio: rendimento e guadagno di oggi in grassetto come il prezzo, % del rendimento in capsula come nella lista */
.prow>.prd{gap:3px}
.prow>.prd>b,.pbx .bm-d .lpr>b{font-size:12px;font-weight:600;line-height:15px;letter-spacing:-.01em}
.prow>.prd>small.ch{display:inline-block;min-width:46px;padding:2px 5px;border-radius:7px;font-size:11px;font-weight:500;line-height:14px;text-align:right;color:#fff;background:var(--mut)}
.prow>.prd>small.ch.up{background:var(--up);color:var(--onup)}.prow>.prd>small.ch.dn{background:var(--dn);color:var(--ondn)}
.prow>.prd>small.ch:empty{display:none}
/* logo di TradingView sui grafici: discreto, si accende passandoci sopra */
#cbox #tv-attr-logo,#cbox a[href*="tradingview"]{--stroke:transparent!important;--fill:var(--mut)!important;opacity:.4;transition:opacity .2s}
#cbox #tv-attr-logo:hover,#cbox a[href*="tradingview"]:hover{opacity:.9}

/* liste: la selezione scorre da un nome all'altro */
#lchips{position:relative}
.lhd .lchip{font-size:11px;font-weight:500;height:26px;line-height:14px}
.lhd .lchip.on{font-weight:600}
#lchips>.sth{background:var(--acc);border-radius:999px;box-shadow:none}
.lhd.led #lchips>.sth{display:none}
#lchips.hasth>.lchip.on:not(.led){background:transparent;transition:color .2s}

/* titoli in evidenza: nome, prezzo e capsula grandi come nelle liste; tasto dell'andamento storico */
.bi{cursor:pointer;height:26px}
.bi .bnm{display:flex;align-items:center;gap:4px;min-width:0}
.bi .bnm>b{min-width:0;font-size:12px;font-weight:650;letter-spacing:-.01em}
.bi [data-f=p]{font-size:12px;font-weight:600;letter-spacing:-.01em}
.bar .bi [data-f=c],.bar.two .bi [data-f=c]{font-size:11px;font-weight:500;line-height:14px;padding:2px 5px;min-width:46px;border-radius:7px}
.bi .blc{display:grid;visibility:hidden;width:20px;height:20px}
.bi:hover .blc,.bi:focus-within .blc,.bi .blc.on{visibility:visible}
.bi:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}
.bar.two .bi{grid-template-rows:20px 18px;row-gap:2px;height:44px;padding:2px 5px}
.bar.two .bi>b{font-size:12px;font-weight:650;letter-spacing:-.01em}
.bar.two .bi .bt{height:18px}
.bar.two .bi .blc{width:18px;height:18px}

/* colori recenti accanto ad "Altri colori…": una riga sola, quelli che non entrano restano nascosti */
.crec{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;height:18px;overflow:hidden}
.crec>button{flex:none;width:18px;height:18px;padding:0;border-radius:4px;border:1px solid rgba(128,128,128,.25)}
.crec>button:hover{transform:scale(1.08)}
.cfoot2{gap:6px}
.cfoot2>.pill{flex:none;padding-left:10px;padding-right:10px}
.cfoot2 .cprev{width:22px;height:18px}

/* andamento storico: valori in un riquadro grigio trasparente accanto al mouse */
.htt{position:absolute;left:0;top:0;z-index:6;pointer-events:none;padding:8px 10px;border-radius:12px;font-size:11px;line-height:14px;color:var(--fg);background:rgba(236,237,241,.62);-webkit-backdrop-filter:blur(8px) saturate(1.4);backdrop-filter:blur(8px) saturate(1.4);box-shadow:0 4px 16px rgba(0,0,0,.14),inset 0 0 0 .5px rgba(0,0,0,.08);white-space:nowrap;box-sizing:border-box;width:132px;height:114px;overflow:hidden;}
:host([data-theme=dark]) .htt{background:rgba(62,64,72,.55);box-shadow:0 4px 18px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.1)}
.htt .lgst{column-gap:8px;grid-template-columns:auto minmax(0,1fr);justify-content:stretch}
.htt .lgd{overflow:hidden;text-overflow:ellipsis}
.htt .lgp{grid-column:1 / -1;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis}.htt .lgp i{font-style:normal;color:var(--mut)}
.htt .lgr i{color:var(--mut);font-style:normal}
.htt .lgr b{font-weight:600;font-variant-numeric:tabular-nums}
.htt .lgd{font-weight:600}
.htt .lgd i{font-style:normal;font-weight:400;color:var(--mut)}

/* impostazione "Solo testo colorato": niente capsule, la variazione resta colorata (in tutto il widget) */

/* grafico stretto (pannello laterale, app desktop): prezzo e tasti sopra, strumenti sotto, senza sovrapporsi */
.chart{container-type:inline-size}
@container (max-width:560px){
  .chart>.ctop{grid-template-columns:minmax(0,1fr) auto auto auto;grid-template-areas:"cid clock max close" "tbar tbar tbar tbar"}
  .chart>.ctop>.tbar{justify-self:start}
}
/* intestazione dei grafici: logo, nome e prezzo a sinistra; a destra orologio, tutto schermo e × e sotto di loro
   intervallo, indicatori, tipo e impostazioni (o i periodi dello storico), allineati a destra */
.chart>.ctop,.chart>.ctop:has(#ranges){grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"cid act" "cid tbar";gap:6px 10px}
.chart>.ctop>.cact{grid-area:act;display:flex;align-items:center;justify-content:flex-end;gap:10px}
.chart>.ctop>.cact>.clock{margin:0}
.rgdd{display:none!important}
/* andamento storico in un grafico stretto: i periodi non stanno accanto al prezzo, vanno sulla riga sotto (sempre a destra) */
/* andamento storico nel widget: periodi sulla stessa riga del prezzo, tutto un po' più compatto per farli stare */
@container (max-width:720px){
  .chart>.ctop:has(#ranges){column-gap:8px}
  .chart>.ctop>.cid{gap:8px}
  .chart>.ctop .clg>.lg{width:36px;height:36px;font-size:15px}
  .chart>.ctop .cquote .cprice{font-size:25px}
  .chart>.ctop:not(:has(#ranges)){row-gap:4px}
  .chart>.ctop .cquote.hl .cpc{margin-left:6px}
  .chart #ranges{gap:0!important}
  .chart #ranges>button{padding:0 8.5px!important;height:26px}
}
/* grafico molto stretto (pannello laterale): i periodi vanno sotto, sempre a destra */
@container (max-width:470px){.chart>.ctop:has(#ranges){grid-template-areas:"cid act" "tbar tbar"}}
.chart>.ctop>.tbar{justify-self:end;align-self:end;flex-wrap:nowrap}
.chart>.ctop>.cid{display:flex;align-items:center;gap:10px;align-self:center}
.cidt{min-width:0;flex:1;overflow:hidden} /* testi lunghi (es. "nel periodo visibile") si tagliano invece di finire sotto ai periodi */
.cidt .cpc{min-width:0;overflow:hidden}
.cidt .cpc>*{overflow:hidden;text-overflow:ellipsis;max-width:100%}
.clg:empty{display:none}
.clg>.lg{flex:none;display:grid;place-items:center;width:44px;height:44px;overflow:hidden;background:hsl(var(--lgh) 45% 42%);color:#fff;font-size:17px;font-weight:700;line-height:1}
.clg>.lg img{width:100%;height:100%;object-fit:cover}
.clg>.lg i{font-style:normal}
.chart #ranges button{padding-left:7px;padding-right:7px}
/* riga in alto del pannello: Lista/Portafoglio, ricerca, +, modifica, aggiorna; sotto le liste (o il patrimonio) */
#lists{margin:10px 0 10px}
.sub.first{margin-top:2px}
.tabs.ticons .tab.ti{display:grid;place-items:center;padding:0 12px;height:30px}
.tabs.ticons .tab.ti svg{display:block}
#tbt{display:flex;gap:6px;flex:none}

/* calendario: Macro o Utili in verde, per capire in che sezione sei */
.ecv>.sth{background:var(--acc);box-shadow:none}
.ecv .tab.on{background:var(--acc);color:var(--onacc);box-shadow:none}
.ecv.hasth>.tab.on{background:transparent;transition:color .2s}
/* utili: in alto vista e sessione (a destra), sotto capitalizzazione e "I miei" */
.efil{flex-direction:column;align-items:stretch;flex-wrap:nowrap}
.efr{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.efr .ecaps{margin-right:auto}
.efr .tabs{max-width:100%;overflow-x:auto;scrollbar-width:none}
.efr .tabs::-webkit-scrollbar{display:none}
/* settimana: capsula più corta */
.ewk .icon{width:22px;height:24px}
#ewt{min-width:0;padding:0 3px}
/* tutta la riga del giorno apre "Stime e risultati" */
.ewd.ego{cursor:pointer;transition:background-color .15s}
.ewd.ego:hover{background:var(--row2)}
.ewd.today.ego:hover{background:color-mix(in srgb,var(--acc) 20%,var(--row))}
.ewd.ego .edl:hover{background:none}
/* stime e risultati: oggi illuminato come nel calendario, con un verde più leggero */
.ersec.today{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--acc) 60%,transparent);background:color-mix(in srgb,var(--acc) 6%,var(--row))}
.erh .ersort{justify-self:end;justify-content:flex-end;font-size:11px;font-weight:inherit;color:inherit;background:none;border:0;cursor:pointer}
.erh .ersort.on{color:var(--fg);font-weight:600}
/* pannelli stretti: niente si deforma o esce dal suo riquadro */
.cal,.chart{min-width:0}
.cal{container-type:inline-size}
.cal>.ctop{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto auto auto;grid-template-areas:"cid cid ewk ecv ref max close" "evw fil fil fil fil fil fil";align-items:center;gap:8px 6px}
.cal>.ctop>.cid{grid-area:cid;min-width:0}.cal>.ctop>.evwb{grid-area:evw}.cal>.ctop>.ewk{grid-area:ewk}.cal>.ctop>.ecv{grid-area:ecv}
.cal>.ctop{align-items:start}.cal>.ctop .ctitle{display:flex;align-items:center;min-height:30px}.cal>.ctop>.cid .ctsub{margin-top:-4px}.cal>.ctop>[data-a=calrefresh],.cal>.ctop>.maxb,.cal>.ctop>.close{margin-top:2px;align-self:start}.cal>.ctop>.evwb{align-self:center}
.cal>.ctop>[data-a=calrefresh]{grid-area:ref}.cal>.ctop>.maxb{grid-area:max}.cal>.ctop>.close{grid-area:close}
.cal>.ctop>.efil{grid-area:fil;min-width:0;flex-direction:row}
.cal>.ctop>.efil>.efr{flex:1;min-width:0}
.cal .ctitle{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cal .ctitle b{font-size:13px}
.evwb{display:flex;min-width:0}
/* tasti compatti: titolo, settimana, Macro/Utili e tre tasti in una riga; vista, capitalizzazione, sessione e "I miei" nell'altra */
.cal>.ctop .tab{padding:5px 8px}
.cal>.ctop .ecaps .tab{padding:5px 7px}
.cal>.ctop .icon,.cal>.ctop .close{width:26px;height:26px}
.cal .ewk .icon,.ewk .icon{width:24px;height:24px;border-radius:50%;padding:0}
.cal #ewt{padding:0 2px;flex:none;min-width:0!important;text-align:center}
/* Macro e Utili larghi uguali */
.ecv{display:inline-grid;grid-template-columns:1fr 1fr}
.ecv .tab{justify-content:center;min-width:50px}
/* calendario strettissimo: Macro/Utili e i tasti accanto al titolo; sotto vista e settimana; poi i filtri */
@container (max-width:452px){
  .cal>.ctop{display:flex;flex-wrap:wrap;align-items:center}
  .cal>.ctop>.cid{flex:1 1 0;order:0}
  .cal>.ctop>.ecv,.cal>.ctop>[data-a=calrefresh],.cal>.ctop>.maxb,.cal>.ctop>.close{order:1;flex:none}
  .cal>.ctop::after{content:"";order:2;flex-basis:100%;height:0}
  .cal>.ctop>.evwb{order:3;margin-right:auto}
  .cal>.ctop>.ewk{order:4;flex:none}
  .cal>.ctop>.efil{order:5;flex-basis:100%}
}
/* utili: riga 1 vista · sessione e "I miei" a destra; riga 2 capitalizzazione */
.efs{display:flex;align-items:center;gap:6px;margin-left:auto}
.efr .esv{margin-left:0}
/* loghi del calendario utili un po' più piccoli: righe dei giorni più compatte */
.eg{grid-template-columns:14px repeat(var(--en,11),38px);gap:4px}
.et{width:38px}
.et>.lg{width:26px;height:26px;border-radius:27%;outline:.5px solid color-mix(in srgb,var(--fg) 10%,transparent);outline-offset:-.5px}
/* bollino verde a sinistra e stella a destra, sopra al logo */
.et>.elive{left:3px;right:auto;top:-3px;z-index:2}.et>.ems{right:2px;left:auto;z-index:2}
.et>b{font-size:11px}
.es{height:26px}
.egs{gap:4px}
.ewd{padding:6px 7px}
.edl{min-height:0}

/* led del calendario: affiancati in alto a destra, un po' fuori dal tasto (verde = utili in diretta, rosso = dato in uscita) */
.calb .leds{position:absolute;top:-3px;right:-3px;z-index:3;display:flex;gap:2px;pointer-events:none}
.calb .led{display:none;width:8px;height:8px;border-radius:50%;box-shadow:0 0 0 1.5px var(--solid)}
.calb .led.g{background:#22c55e}.calb .led.r{background:var(--dn)}
.calb.elv .led.g,.calb.alert .led.r{display:block}
/* vetro trasparente su una pagina chiara (tema scuro) o scura (tema chiaro): testi grigi più decisi, con un leggero alone */
:host([data-theme=dark][data-bk=light]){--mut:#d0d2d8}
:host([data-theme=dark][data-bk=light]) :is(.panel,.bar){text-shadow:0 0 1px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.35)}
:host([data-theme=light][data-bk=dark]){--mut:#2f3138}
:host([data-theme=light][data-bk=dark]) :is(.panel,.bar){text-shadow:0 0 1px rgba(255,255,255,.6),0 1px 3px rgba(255,255,255,.45)}
/* notizie del titolo: tasto accanto all'orologio, elenco al posto del grafico */
.chart.nmode>.cwrap,.chart.nmode>.cfoot{display:none!important}
.chart.nmode>.ctop>.tbar{display:none}
.nbellbox{grid-area:tbar;justify-self:end;align-self:center;display:flex;margin:-2px 0} /* la testata delle notizie resta alta come quella del grafico (vedi setNews) */
.nbellbox[hidden]{display:none}
.nview{flex:1 1 auto;min-height:0;display:flex;flex-direction:column}
.nview[hidden]{display:none}
.nvh{display:flex;align-items:center;gap:10px;margin:0 2px 6px}
.nvh>b{flex:1;font-size:13px;font-weight:650;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nback{flex:none;font-size:12px;font-weight:600;color:var(--acct,var(--acc));text-decoration:none}
.nbell{display:inline-flex;align-items:center;gap:6px;flex:none;height:28px;padding:0 12px;font-size:11px;font-weight:600}
.nbell.on{background:var(--acct)!important;color:#fff!important}
.nvl{flex:1 1 auto;min-height:0;overflow-y:auto;margin:0 -4px;padding:0 4px}
.ni{display:grid;grid-template-columns:minmax(0,1fr) 76px 104px;align-items:center;column-gap:8px;padding:8px 10px;border-radius:12px;color:var(--fg);text-decoration:none}
.nx{min-width:0}
.nvc{display:grid;grid-template-columns:minmax(0,1fr) 76px 104px;column-gap:8px;padding:0 10px 4px;font-size:11px;color:var(--mut);text-align:center}
.nlv{display:flex;justify-content:center;gap:4px}
.nlv i{width:7px;height:7px;border-radius:50%;background:#ff9f0a}
.nlv i.o{background:color-mix(in srgb,#ff9f0a 22%,transparent)}
.ntag{justify-self:center;display:inline-flex;align-items:center;height:22px;padding:0 10px;border-radius:999px;background:color-mix(in srgb,var(--acc) 14%,transparent);color:color-mix(in srgb,var(--acc) 72%,var(--fg));font-size:11px;font-weight:600;white-space:nowrap;max-width:104px;overflow:hidden;text-overflow:ellipsis}
.nvd{flex:none;margin:8px 4px 0;font-size:10px;line-height:1.4;color:var(--mut)}
.ni:hover,.ni:focus-visible{background:var(--row2)}
.ni:focus-visible{outline:2px solid var(--acc);outline-offset:-2px}
.nt{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.38;font-weight:500}
.nm2{display:block;margin-top:3px;font-size:11px;color:var(--mut)}
.nvmsg{padding:14px 10px;color:var(--mut);font-size:12px}
/* righe della lista: due colonne fisse con andamento storico (o candele) e notizie; pallino viola = notizie nuove */
.row>.lc{display:grid;visibility:hidden;width:22px;height:22px;border-radius:7px;justify-self:center}
.row:hover>.lc,.row:focus-within>.lc,.row>.lc.on,.row>.lc.nwn{visibility:visible}
.row>.lc.nwc{position:relative}
.prow>.pic{display:flex;flex-direction:column;gap:4px;align-items:center}
.prow>.pic>.lc{display:grid;visibility:hidden;width:20px;height:20px;border-radius:6px}
.prow:hover>.pic>.lc,.prow:focus-within>.pic>.lc,.prow>.pic>.lc.on,.prow>.pic>.lc.nwn{visibility:visible}
.prow>.pic>.lc.nwc{position:relative}.prow>.pic>.lc.nwc>.nwd{position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 2px var(--solid)}
.row>.lc.nwc>.nwd{position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 2px var(--solid)}
.row>.ycw,.thead>.th-y{margin-right:-4px}
/* titoli in evidenza: stesso stile del pannello; tre righe visibili, le altre scorrendo; oppure tutti in una riga */
.bar{background:var(--bg);color:var(--fg);border:1px solid var(--gbd);box-shadow:inset 0 1px 0 var(--ghi),var(--gsh);border-radius:20px;padding:6px 4px 6px 6px}
.bar .bi:hover,.bar .bi.sel{background:var(--row2)}
.bar .bi b{color:var(--fg)}
.bar>.sep{background:var(--line)}
.bar .bi{height:24px;flex:none}
.bar>.items{justify-content:flex-start;max-height:74px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none}
.bar>.items::-webkit-scrollbar{display:none}
.bar.bmore>.items{-webkit-mask:linear-gradient(#000 calc(100% - 14px),transparent);mask:linear-gradient(#000 calc(100% - 14px),transparent)}
.bar.bless>.items{-webkit-mask:linear-gradient(transparent,#000 14px);mask:linear-gradient(transparent,#000 14px)}
.bar.bmore.bless>.items{-webkit-mask:linear-gradient(transparent,#000 14px,#000 calc(100% - 14px),transparent);mask:linear-gradient(transparent,#000 14px,#000 calc(100% - 14px),transparent)}
.bar{grid-template-rows:auto 1fr auto auto}
.bar>.items{grid-area:1/1/5/2}
.bar>.sep{grid-area:1/2/5/3}
.bar>.go{grid-area:4/2}
.bar>.go.brow{grid-area:3/2;justify-self:end;margin-right:1px;width:24px;height:24px;border-radius:50%}
.bar>.go.brow[hidden]{display:none}
/* tutti su una riga: la barra si allarga verso sinistra quanto serve, il pannello sale */
.bar.row1{display:flex;align-items:center;gap:4px;width:auto;padding:4px 4px 4px 6px}
.bar.row1>.items{flex:0 1 auto;flex-direction:row;align-items:center;gap:4px;max-height:none;overflow-x:auto;overflow-y:hidden}
.bar.bmore.row1>.items{-webkit-mask:linear-gradient(90deg,#000 calc(100% - 16px),transparent);mask:linear-gradient(90deg,#000 calc(100% - 16px),transparent)}
.bar.bless.row1>.items{-webkit-mask:linear-gradient(90deg,transparent,#000 16px);mask:linear-gradient(90deg,transparent,#000 16px)}
.bar.bmore.bless.row1>.items{-webkit-mask:linear-gradient(90deg,transparent,#000 16px,#000 calc(100% - 16px),transparent);mask:linear-gradient(90deg,transparent,#000 16px,#000 calc(100% - 16px),transparent)}
.bar.row1 .bi{grid-template-columns:auto auto auto;column-gap:8px}
.bar.row1 .bi .blc{display:none}
.bar.row1>.items>.sep{display:block;flex:none;height:16px;align-self:center}
.bar.row1>.sep{order:2;height:18px;align-self:center;margin:0 2px}
.bar.row1>.dot{order:3;margin:0 4px}
.bar.row1>.go.brow{order:4;margin:0}
.bar.row1>.go{order:5;margin:0}
/* intestazione del pannello: "Nascondi" più corto, così col tasto di ripristino della posizione ci sta tutto */
.panel.pmove{transition:top .38s cubic-bezier(.2,.8,.2,1),height .38s cubic-bezier(.2,.8,.2,1),max-height .38s cubic-bezier(.2,.8,.2,1)}
.side>.hd .pill[data-a=hide]{padding:0 7px}
.side>.hd>span:last-child{flex:none;gap:5px}
/* variazioni in capsule morbide: fondo tenue (pieno, non trasparente: uguale nella lista e nel riquadro dei titoli in evidenza) e testo colorato */
:host{--upt:color-mix(in srgb,var(--up) 70%,#000);--dnt:color-mix(in srgb,var(--dn) 78%,#000)}
:host([data-theme=dark]){--upt:var(--up);--dnt:var(--dn)}
.lp>small.ch,.prow>.prd>small.ch,.bar .bi [data-f=c],.esur{background:color-mix(in srgb,var(--mut) 16%,var(--solid));color:var(--mut);font-weight:600;border-radius:6px}
.lp>small.ch.up,.prow>.prd>small.ch.up,.bar .bi [data-f=c].up,.esur.up{background:color-mix(in srgb,var(--up) 17%,var(--solid));color:var(--upt)}
.lp>small.ch.dn,.prow>.prd>small.ch.dn,.bar .bi [data-f=c].dn,.esur.dn{background:color-mix(in srgb,var(--dn) 17%,var(--solid));color:var(--dnt)}
/* arrotondamenti e spessore delle icone uniformi */
.bar{border-radius:24px}.row{border-radius:10px}.tabs.ticons,.tabs.ticons .tab{border-radius:12px}
.side>.hd svg,.side .tools svg,.row>.lc svg,.icon svg,.tabs svg{stroke-width:1.5}
/* prezzi in arrivo: blocchi che pulsano al posto dei numeri */
@keyframes owSk{0%,100%{opacity:.5}50%{opacity:1}}
.lp.sk .pr,.lp.sk>small.ch,.bi.sk [data-f=p],.bar .bi.sk [data-f=c]{color:transparent!important;-webkit-text-fill-color:transparent;text-shadow:none!important;background:var(--row2);border-radius:6px;animation:owSk 1.4s ease-in-out infinite}
.lp.sk .pr,.bi.sk [data-f=p]{display:inline-block;min-width:54px}.lp.sk .cu,.bi.sk .cu{display:none}
.bi.sk [data-f=p]{min-width:48px}
.lp.sk>small.ch:empty::before,.bar .bi.sk [data-f=c]:empty::before{content:"\\00a0"}.bar .bi.sk [data-f=c]{display:inline-block;min-width:46px}
.lp:not(.sk)>small.ch:empty,.bar .bi:not(.sk) [data-f=c]:empty{background:none} /* nessuna variazione (n/d): niente capsula vuota */
/* titolo aperto: barretta viola a sinistra */
.row.sel::after{content:"";position:absolute;left:2px;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--acc)}
/* avvertenze in una riga, il testo completo col tasto "i" */
.note{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px}
.note>.nt1{font-size:11px!important;flex:1;min-width:0}
.note>.ninfo{flex:none;display:grid;place-items:center;width:18px;height:18px;padding:0;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--fg);font:600 11px/1 inherit!important;cursor:pointer}
.note>.ninfo:hover,.note>.ninfo[aria-expanded=true]{background:var(--row2)}
.note>.nfull{flex-basis:100%}
/* grafico e notizie compaiono con una breve dissolvenza */
@keyframes owIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.slidein{animation:owIn .2s cubic-bezier(.2,.8,.2,1)}
@media (prefers-reduced-motion:reduce){.slidein,.lp.sk .pr,.lp.sk>small.ch,.bi.sk [data-f=p],.bar .bi.sk [data-f=c]{animation:none!important}}
/* ---------- Modalità zen: solo i titoli, i comandi compaiono col mouse sopra ---------- */
:host([data-zen]){--acc:#6f5fc4;--accbg:rgba(111,95,196,.12)}
:host([data-zen][data-theme=dark]){--acc:#9a8bec;--accbg:rgba(154,139,236,.17)}
.brand .bwm,.brand .zent{font-family:"OwlookWM",system-ui,-apple-system,"Segoe UI",sans-serif;font-weight:800;letter-spacing:-.045em}
.brand .zent{font-style:normal;font-size:11px;line-height:1;color:var(--acc);align-self:flex-end;margin:0 0 5px -4px;letter-spacing:-.01em;max-width:0;opacity:0;overflow:hidden;transition:max-width .45s cubic-bezier(.2,.8,.2,1),opacity .35s ease,color .5s ease}
:host([data-zen]) .brand .zent{max-width:30px;opacity:1}
.brand .owl{transform-origin:50% 100%;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.brand .oi{transition:fill .5s ease}
.brand .oe{transform-box:fill-box;transform-origin:50% 45%;transition:transform .4s cubic-bezier(.2,.8,.2,1) .1s,opacity .25s ease .1s}
.brand .zc{fill:none;stroke:var(--acc);stroke-width:105;stroke-linecap:round;stroke-dasharray:440;stroke-dashoffset:440;opacity:0;transition:opacity .12s ease,stroke-dashoffset 0s linear .12s,stroke .5s ease}
.brand:hover .owl{transform:rotate(6deg)}
:host([data-zen]) .brand .oe{transform:scaleY(.08);opacity:0;transition:transform .3s cubic-bezier(.4,0,.6,1),opacity .2s ease .1s}
:host([data-zen]) .brand .zc{stroke-dashoffset:0;opacity:1;transition:stroke-dashoffset .5s cubic-bezier(.2,.8,.2,1) .15s,opacity 0s linear .15s,stroke .5s ease}
:host([data-zen]) .brand:hover .owl{transform:none}
:host([data-zen]) .side>.hd>span:last-child,:host([data-zen]) .bar>.go,:host([data-zen]) .bar>.sep,:host([data-zen]) .bar>.dot,:host([data-zen]) .chart>.ctop>.tbar,:host([data-zen]) .chart>.ctop>.nbellbox,:host([data-zen]) .chart .cact>button,:host([data-zen]) .cal>.ctop>:not(.cid){opacity:0;transition:opacity .25s ease}
:host([data-zen]) .side>.hd>span:last-child:hover,:host([data-zen]) .side>.hd>span:last-child:has(:focus-visible),:host([data-zen]) .bar:hover>.go,:host([data-zen]) .bar:hover>.sep,:host([data-zen]) .bar:hover>.dot,:host([data-zen]) .bar>.go:has(:focus-visible),:host([data-zen]) .bar>.go:focus-visible,
:host([data-zen]) .chart>.ctop:hover>.tbar,:host([data-zen]) .chart>.ctop:hover>.nbellbox,:host([data-zen]) .chart>.ctop:hover .cact>button,:host([data-zen]) .chart>.ctop:has(:focus-visible)>.tbar,:host([data-zen]) .chart>.ctop:has(:focus-visible) .cact>button,
:host([data-zen]) .cal>.ctop:hover>:not(.cid),:host([data-zen]) .cal>.ctop:has(:focus-visible)>:not(.cid){opacity:1}
:host([data-zen]) .side .sub.first,:host([data-zen]) #lists,:host([data-zen]) #thead,:host([data-zen]) #pform,:host([data-zen]) #fres,:host([data-zen]) #slotsfold,:host([data-zen]) #slots,:host([data-zen]) #slotsearch,:host([data-zen]) .side .note{display:none!important}
:host([data-zen]) .side>.hd{margin-bottom:10px}
:host([data-zen]) .panel:not(.wide){height:auto}
:host([data-zen]) #list .row{padding-top:12px;padding-bottom:12px}
:host([data-zen]) .chart .clock,:host([data-zen]) .chart #legend,:host([data-zen]) .chart #plegs,:host([data-zen]) .chart #htt{display:none!important} /* zen: niente scritte a sinistra né riquadro dei valori accanto al mouse */
@media (prefers-reduced-motion:reduce){.brand .owl,.brand .oe,.brand .zc,.brand .bwm,.brand .zent,.brand .oi{transition:none!important;animation:none!important}}
/* le capsule del riquadro dei titoli in evidenza sopra il riflesso, come nel pannello */
.bar>.items,.bar>.go,.bar>.sep,.bar>.dot{position:relative;z-index:1}
:host([data-zen]) .brand::before{content:"";position:absolute;left:2px;top:50%;width:28px;height:28px;margin-top:-14px;border-radius:50%;pointer-events:none;z-index:-1;opacity:0;
background:radial-gradient(circle,color-mix(in srgb,var(--acc) 45%,transparent) 0,color-mix(in srgb,var(--acc) 22%,transparent) 45%,transparent 70%);box-shadow:0 0 0 1.5px color-mix(in srgb,var(--acc) 55%,transparent);animation:owAura 5s cubic-bezier(.25,.6,.35,1) infinite}
@keyframes owAura{0%{transform:scale(.9);opacity:0}8%{opacity:.85}36%{opacity:0;transform:scale(1.6)}100%{opacity:0;transform:scale(1.6)}} /* si dissolve prima del bordo del pannello */
:host([data-zen]) *::-webkit-scrollbar-thumb{background-color:transparent!important}
:host([data-zen]) .scr::-webkit-scrollbar-thumb{background-color:var(--sb)!important}
@media (prefers-reduced-motion:reduce){:host([data-zen]) .brand::before{animation:none;display:none}}
/* schermo intero: niente vetro sfocato (ridisegnarlo a ogni movimento del mouse rallenta tutto) */
.panel.maxed{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;background:var(--bsolid)!important}
:host([data-noglass]) *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
</style>
<div class="htip" id="htip" role="tooltip" hidden></div>
<div class="bar" id="bar"><i class="dot"></i><span id="items" class="items"></span><i class="sep"></i><button class="go brow" id="barrow" data-a="barrow" hidden></button><button class="go" id="go" data-a="toggle" aria-label="Apri o chiudi il pannello">${ARROW}</button></div>
<div class="panel" id="panel" hidden>
  <div class="rz rz-s" data-rz="s" title="Trascina per allargare la lista o il grafico"></div><div class="rz rz-t" data-rz="t" title="Trascina per allungare verso l'alto"></div><div class="rz rz-l" data-rz="l" title="Trascina per allargare"></div><div class="rz rz-r" data-rz="r" title="Trascina per allargare"></div><div class="rz rz-b" data-rz="b" title="Trascina per allungare"></div><div class="rz rz-c rz-tl" data-rz="tl"></div><div class="rz rz-c rz-tr" data-rz="tr"></div><div class="rz rz-c rz-bl" data-rz="bl"></div><div class="rz rz-c rz-br" data-rz="br"></div>
  <section class="cal" id="cal" hidden>
    <div class="ctop">
      <div class="cid"><div class="ctitle"><b>Calendario USA</b></div><div class="ctsub" id="calsub" hidden></div></div>
      <span class="ewk" id="ewk" hidden><button class="icon sm" data-a="ewk" data-d="-1" aria-label="Settimana precedente" title="Settimana precedente">${CHEVL}</button><b id="ewt"></b><button class="icon sm" data-a="ewk" data-d="1" aria-label="Settimana successiva" title="Settimana successiva">${CHEVR}</button></span>
      <span class="tabs ecv" role="tablist"><button class="tab" data-a="calv" data-v="m" role="tab">Macro</button><button class="tab" data-a="calv" data-v="e" role="tab">Utili</button></span>
      <button class="icon sm" data-a="calrefresh" aria-label="Aggiorna" title="Aggiorna">${RELOAD}</button>
      <button class="icon sm maxb" data-a="maxchart" aria-label="Riempi lo schermo" title="Riempi lo schermo">${MAXICON}</button>
      <button class="close" data-a="calclose" aria-label="Chiudi il calendario">${XICON}</button>
      <span class="evwb" id="evwb" data-cv="e" hidden></span>
      <div class="efil" id="efil" hidden></div>
    </div>
    <div class="calbody" id="calbody"></div>
    <div class="calbody ewkb" id="ebody" hidden></div>
    <div class="cfoot"><span id="calnote"></span></div>
    <div class="ctip" id="ctip" hidden></div>
  </section>
  <section class="chart" id="chart" hidden>
    <div class="ctop">
      <div class="cid"><span class="clg" id="c-lg"></span><div class="cidt">
        <div class="ctitle"><b id="c-sym"></b><i class="dly" id="c-dly" title="" hidden></i><span id="c-name"></span></div>
        <div class="cquote"><span class="cprice" id="c-price" data-f="p"></span><span class="cpc"><span class="ch" id="c-chg" data-f="c"></span><span class="cper" id="c-per"></span></span></div>
      </div></div>
      <div class="tbar" id="tbar"></div>
      <div class="nbellbox" id="nbellbox" hidden></div>
      <div class="cact"><div class="clock" id="clockbox"><span id="clocktz">NY</span><b id="clock"></b></div>
      <button class="icon sm maxb" id="maxbtn" data-a="maxchart" aria-label="Riempi lo schermo" title="Riempi lo schermo">${MAXICON}</button>
      <button class="close" data-a="close-chart" aria-label="Chiudi grafico">${XICON}</button></div>
    </div>
    <div class="cwrap">
      <div id="cbox" tabindex="0" aria-label="Grafico"></div>
      <div class="legend" id="legend"></div>
      <div id="plegs"></div><div id="ptags" aria-hidden="true"></div><div id="xtags" aria-hidden="true"></div>
      <div id="voltag" hidden></div>
      <div class="htt" id="htt" hidden></div>
      <div class="cmsg" id="cmsg" hidden></div>
    </div>
    <div class="nview" id="nview" hidden></div>
    <div class="cfoot" id="cfoot" hidden><span id="cnote"></span></div>
  </section>
  <section class="side">
    <div class="hd"><button class="brand" id="brand" data-a="zen" aria-pressed="false" aria-label="Modalità zen" data-tt="Modalità zen: solo i titoli, senza distrazioni"><svg class="owl" viewBox="220 340 2089 2089" aria-hidden="true"><g transform="translate(0.000000,2700.000000) scale(0.100000,-0.100000)"><g class="of"><path d="M11425 23293 c-421 -7 -739 -32 -1205 -93 -498 -66 -768 -121 -1350
-276 -508 -135 -1105 -354 -1526 -558 -776 -378 -1467 -871 -2039 -1457 -1355
-1388 -2132 -3344 -2305 -5809 -29 -405 -22 -1055 16 -1475 39 -444 87 -791
160 -1160 75 -379 95 -458 168 -685 35 -107 92 -294 126 -415 442 -1572 1336
-3131 2606 -4545 187 -208 831 -854 1029 -1031 1132 -1014 2261 -1761 3525
-2332 482 -217 956 -362 1345 -411 273 -34 380 -41 675 -41 295 0 402 7 675
41 389 49 863 194 1345 411 1264 571 2393 1318 3525 2332 198 177 842 823
1029 1031 1270 1414 2164 2973 2606 4545 34 121 91 308 126 415 73 227 93 306
168 685 73 369 121 716 160 1160 135 1503 -129 3349 -677 4745 -715 1822
-1942 3165 -3651 3996 -421 204 -1018 423 -1526 558 -582 155 -852 210 -1350
276 -589 77 -851 93 -1500 89 -777 -5 -1365 -4 -1700 1 -173 3 -378 5 -455 3z"/></g><g class="oi"><path d="M11425 23293 c-421 -7 -739 -32 -1205 -93 -498 -66 -768 -121 -1350
-276 -508 -135 -1105 -354 -1526 -558 -776 -378 -1467 -871 -2039 -1457 -1355
-1388 -2132 -3344 -2305 -5809 -29 -405 -22 -1055 16 -1475 39 -444 87 -791
160 -1160 75 -379 95 -458 168 -685 35 -107 92 -294 126 -415 442 -1572 1336
-3131 2606 -4545 187 -208 831 -854 1029 -1031 1132 -1014 2261 -1761 3525
-2332 482 -217 956 -362 1345 -411 273 -34 380 -41 675 -41 295 0 402 7 675
41 389 49 863 194 1345 411 1264 571 2393 1318 3525 2332 198 177 842 823
1029 1031 1270 1414 2164 2973 2606 4545 34 121 91 308 126 415 73 227 93 306
168 685 73 369 121 716 160 1160 135 1503 -129 3349 -677 4745 -715 1822
-1942 3165 -3651 3996 -421 204 -1018 423 -1526 558 -582 155 -852 210 -1350
276 -589 77 -851 93 -1500 89 -777 -5 -1365 -4 -1700 1 -173 3 -378 5 -455 3z
m-2170 -3643 c1159 -98 2246 -605 3112 -1452 280 -275 288 -275 548 -19 733
724 1617 1198 2585 1390 350 69 473 82 816 88 392 7 590 -6 924 -63 315 -53
433 -79 640 -139 1346 -394 2338 -1254 2932 -2540 156 -338 303 -777 379
-1131 80 -371 88 -422 113 -649 46 -425 51 -523 50 -960 -1 -567 -37 -1006
-119 -1460 -24 -132 -51 -283 -60 -335 -20 -122 -144 -627 -195 -795 -22 -71
-55 -182 -74 -245 -70 -236 -217 -627 -327 -870 -27 -61 -49 -113 -49 -116 0
-16 -239 -497 -329 -660 -440 -806 -993 -1580 -1651 -2309 -322 -357 -882
-899 -1249 -1210 -52 -44 -113 -96 -135 -116 -107 -94 -511 -409 -667 -521
-52 -37 -130 -93 -174 -124 -862 -615 -1967 -1196 -2655 -1395 -341 -99 -547
-128 -945 -136 -640 -13 -1093 89 -1795 401 -139 62 -612 299 -731 366 -625
353 -1008 600 -1506 973 -181 134 -489 377 -583 458 -30 26 -93 80 -140 120
-494 419 -1066 995 -1506 1514 -529 624 -1007 1321 -1369 1995 -43 80 -109
201 -146 270 -104 192 -149 291 -270 595 -215 540 -383 1037 -434 1285 -19 94
-48 221 -65 282 -16 62 -43 190 -59 283 -17 94 -46 256 -65 360 -86 475 -136
1291 -107 1770 43 714 114 1134 290 1700 422 1359 1283 2380 2476 2938 485
226 1220 418 1751 456 171 12 648 13 789 1z"/><path class="oe" d="M6705 14936 c-55 -15 -85 -45 -85 -83 0 -41 72 -102 230 -196 255
-150 320 -209 339 -310 5 -29 12 -158 15 -287 8 -326 30 -470 122 -795 135
-473 415 -813 825 -997 138 -62 220 -86 415 -120 180 -32 520 -31 734 0 316
48 375 27 511 -176 193 -288 361 -702 604 -1487 71 -229 86 -260 131 -260 80
0 87 120 81 1369 -4 1003 -4 1002 -57 1277 -19 100 -105 386 -148 494 -234
585 -657 1062 -1171 1320 -232 116 -473 191 -761 237 -129 21 -171 22 -935 24
-651 3 -809 1 -850 -10z"/><path class="oe" d="M16970 14939 c-249 -24 -415 -59 -625 -131 -650 -224 -1151 -711
-1450 -1409 -40 -92 -139 -407 -159 -504 -57 -276 -66 -470 -66 -1501 0 -1110
6 -1189 84 -1189 43 0 59 30 117 220 224 733 314 978 477 1297 136 265 226
383 325 429 56 25 161 24 342 -2 530 -76 1007 7 1352 237 115 77 300 261 381
381 90 133 182 331 236 508 81 268 104 425 115 815 9 296 13 313 95 387 29 27
99 77 157 113 308 191 354 234 318 302 -29 53 -21 53 -849 54 -421 1 -803 -2
-850 -7z"/><path d="M13592 8759 c-31 -16 -137 -124 -396 -403 -477 -515 -486 -523 -588
-495 -52 14 -115 76 -532 527 -170 183 -325 345 -346 358 -56 37 -109 31 -133
-16 -22 -43 -19 -113 18 -367 29 -198 161 -872 199 -1013 14 -52 39 -160 56
-240 17 -80 48 -203 70 -275 21 -71 55 -191 74 -266 92 -351 373 -1127 499
-1378 44 -90 58 -108 90 -124 55 -28 106 -12 146 46 107 156 455 1108 561
1537 12 47 37 137 55 200 19 63 48 178 65 254 17 77 46 199 65 272 19 73 46
197 60 276 14 79 41 213 60 298 43 199 105 609 105 699 0 109 -48 149 -128
110z"/></g></g><path class="zc" d="M705 1400Q875 1545 1045 1400"/><path class="zc" d="M1485 1400Q1655 1545 1825 1400"/></svg><b class="bwm">owlook</b><i class="zent" aria-hidden="true">zen</i></button><span><button class="icon" id="layreset" data-a="layreset" aria-label="Ripristina posizione e dimensioni" title="Ripristina posizione e dimensioni del pannello" hidden><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg></button><button class="icon calb" id="calbtn" data-a="cal" aria-label="Calendario economico USA" title="Calendario economico USA">${CALICON}<span class="leds" aria-hidden="true"><i class="led g"></i><i class="led r"></i></span></button><button class="icon" id="barbtn" data-a="bartog"></button><button class="icon sett" data-a="settings" aria-label="Impostazioni" title="Impostazioni">${GEAR}</button><button class="pill" data-a="hide" title="Nascondi il widget (lo riporti con la scorciatoia o cliccando l'icona dell'estensione)">Nascondi</button></span></div>
    <div class="sbody" id="sbody">
    <div class="sub first"><span class="tabs ticons" role="tablist"><button class="tab ti" data-a="tab" data-t="list" role="tab" aria-label="Lista" title="Lista">${LISTTAB}</button><button class="tab ti" data-a="tab" data-t="pf" role="tab" aria-label="Portafoglio" title="Portafoglio">${PFTAB}</button></span>
      <span><label class="find" id="find" title="Cerca nella lista o aggiungi un ticker">${SEARCH}<input id="fq" placeholder="Cerca…" autocomplete="off" spellcheck="false" aria-label="Cerca nella lista o aggiungi un ticker"><button data-a="findclose" aria-label="Cancella la ricerca" title="Cancella">${XSM}</button></label>
      <span class="pfbt" id="tbt"></span>
      <button class="icon sm rw" data-a="resort" aria-label="Riordina la lista" title="Riordina la lista e aggiorna i prezzi">${RELOAD}</button></span></div>
    <div id="lists"></div>
    <div class="pform" id="pform" hidden></div>
    <div class="thead" id="thead"></div>
    <div id="list"></div>
    <div class="fres" id="fres"></div>
    <button class="sub subt" id="slotsfold" data-a="slotsfold" aria-expanded="false"><span>TITOLI IN EVIDENZA</span>${CHEV}</button>
    <div class="slots" id="slots" hidden></div>
    <div class="slotsearch" id="slotsearch" hidden>
      <input id="q2" autocomplete="off" spellcheck="false">
      <div id="res2"></div>
    </div>
    <div class="note"><span class="nt1">Dati non ufficiali, possibili ritardi.</span><button class="ninfo" data-a="noteinfo" aria-expanded="false" aria-label="Informazioni sui dati" data-tt="Informazioni sui dati">i</button><div class="nfull" id="nfull" hidden>Dati da Yahoo Finance (non ufficiali), possibili ritardi o errori. Solo a scopo informativo, non è un consiglio di investimento. Grafici: <a class="tvl" href="https://www.tradingview.com/" target="_blank" rel="noopener">TradingView Lightweight Charts™</a> © TradingView, Inc.</div></div>
    </div>
  </section>
  <div class="modal" id="settings" hidden>
    <div class="card" role="dialog" aria-label="Impostazioni">
      <div class="hd"><span>Impostazioni</span><span class="tabs sects" role="tablist"><button class="tab on" data-a="sect" data-v="g" role="tab">Generali</button><button class="tab" data-a="sect" data-v="a" role="tab">Aspetto</button></span><button class="close" data-a="settings-close" aria-label="Chiudi impostazioni">${XICON}</button></div>
      <div class="sectp" data-sp="g">
      <div class="field"><span id="langlbl" data-nt></span><div class="seg" id="langseg" data-nt></div></div>
      <div class="field"><span id="nflbl" data-nt></span><div class="seg" id="nfseg" data-nt></div></div>
      <div class="field"><span>Dove compare il widget</span><div class="seg" id="evseg"></div><p class="hint" id="evhint"></p></div>
      <div class="field"><span>Clic sulla riga di un titolo</span><div class="seg" id="rowcseg"></div></div>
      <div class="field"><span>Fuso orario dell'orologio e del grafico</span><select class="pill txtsel" id="tzsel" aria-label="Fuso orario"></select>
        <p class="hint">Vale per l'orologio e per gli orari sull'asse del grafico. Il calendario economico resta nel tuo fuso, con l'ora di New York accanto.</p></div>
      <div class="field"><span>Futures a mercato chiuso</span><div class="seg" id="futseg"></div>
        <p class="hint">Fuori dalla seduta di Wall Street (15:30–22:00 italiane) S&amp;P 500, Dow Jones e NASDAQ mostrano i futures ES, YM e NQ, segnati con FUT.</p></div>
      <div class="field"><span>Scorciatoia per aprire e chiudere</span>
        <div class="keyrow"><button class="kbd" id="kbtn" data-a="krec" aria-label="Cambia scorciatoia"></button><button class="pill" data-a="kreset">Predefinita</button></div>
        <p class="hint" id="khint"></p>
        <p class="hint" id="cmdhint"></p>
      </div>
      <div class="field"><span>Backup di liste e impostazioni</span>
        <div class="keyrow"><button class="pill" data-a="export">Esporta file</button><button class="pill" data-a="import">Importa file</button><input type="file" id="impfile" accept=".json,application/json" hidden></div>
        <div id="impmsg"></div>
        <p class="hint">Il file contiene liste, portafoglio, titoli in evidenza e impostazioni: usalo per non perderli cambiando cartella o PC.</p>
      </div>
      <div class="field"><span>Scarica una lista in formato .txt</span>
        <div class="keyrow"><select class="pill txtsel" id="txtlist" aria-label="Lista da scaricare"></select><button class="pill" data-a="txtdl">Scarica .txt</button></div>
        <p class="hint">Un ticker per riga (es. AAPL, ^GSPC, BTC-USD).</p>
      </div>
      <div class="field"><span>Siti esclusi</span>
        <div class="exl" id="exlist"></div>
        <div class="exrow"><input id="exin" placeholder="es. intranet.azienda.it" autocomplete="off" spellcheck="false" aria-label="Sito da escludere"><button class="pill" data-a="excladd">Aggiungi</button></div>
        <p class="hint">Qui il widget non compare e non scarica nulla. Per riattivarlo su un sito, toglilo da questa lista.</p>
      </div>
      </div>
      <div class="sectp" data-sp="a" hidden>
      <div class="field"><span>Effetto trasparenza</span><div class="glr"><svg class="gi" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="Nessuna"><title>Nessuna</title><rect x="1.5" y="1.5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="5.5" y="5.5" width="9" height="9" rx="2.2" fill="currentColor"/></svg><input type="range" id="glassr" min="0" max="100" step="1" aria-label="Effetto trasparenza"><svg class="gi" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="Tanta"><title>Tanta</title><rect x="1.5" y="1.5" width="8.5" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="5.5" y="5.5" width="9" height="9" rx="2.2" fill="currentColor" fill-opacity=".28" stroke="currentColor" stroke-width="1.3"/></svg></div></div>
      <div class="field"><span>Tema</span><div class="seg" id="themes"></div></div>
      <div class="field"><span>Colori di rialzo e ribasso</span><div class="colrow" id="colrow"></div></div>
      <div class="field"><span>Titoli nella Lista e nel Portafoglio</span><div class="nmset" id="nmset"></div></div>
      </div>
    </div>
  </div>
  <div class="cpop" id="cpop" hidden></div>
  <div class="menu" id="menu" hidden></div>
</div>
<div class="pshade" id="pshade" hidden></div>`;
  document.documentElement.appendChild(host);

  // ---------- Lista ordinata ----------
  // valore usato per ordinare: lo stesso mostrato nelle colonne (vedi trendV e yV)
  const sortVal = (q, f) => { if (!q) return null; const v = f === "change" ? trendV(q) : f === "ychange" ? yV(q) : q[f]; return v == null || Number.isNaN(v) ? null : v; };
  function sorted() {
    const L = [...items()];
    if (!SORTS.includes(st.sort) || st.sort === "none") return L; // ordine in cui hai inserito i ticker
    const field = { p: "change", y: "ychange", r: "price" }[st.sort[0]];
    const v = (x) => sortVal(quotes[dsym(x.s)], field);
    // valori mancanti sempre in fondo
    const num = (a, b, dir) => { const x = v(a), y = v(b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : (x - y) * dir; };
    if (st.sort === "za") L.sort((a, b) => b.n.localeCompare(a.n, LOC));
    else if (field) L.sort((a, b) => num(a, b, st.sort[1] === "a" ? 1 : -1));
    else L.sort((a, b) => a.n.localeCompare(b.n, LOC));
    return L;
  }

  // ---------- Ritardo dei dati ----------
  // Minuti di ritardo di Yahoo: dal campo di Yahoo quando c'è, altrimenti dal suffisso del ticker
  // (tabella "Exchanges and data providers on Yahoo Finance").
  const DLY_SFX = { MI: [20, "Borsa Italiana"], L: [20, "Borsa di Londra"], IL: [20, "Borsa di Londra"], MX: [20, "Borsa di Città del Messico"],
    DE: [15, "Xetra"], F: [15, "Borsa di Francoforte"], PA: [15, "Euronext Parigi"], AS: [15, "Euronext Amsterdam"], BR: [15, "Euronext Bruxelles"],
    LS: [15, "Euronext Lisbona"], MC: [15, "Borsa di Madrid"], SA: [15, "B3 San Paolo"], SW: [30, "SIX Swiss Exchange"] };
  const FUT30 = /^(CL|NG|RB|HO|BZ|QM|QG|GC|SI|HG|PL|PA|MGC|SIL)=F$/; // NYMEX e COMEX: 30 min; gli altri futures (CME, CBOT): 10
  // Azioni ed ETF USA: Yahoo mostra il prezzo in tempo reale (Nasdaq Real Time Price / Cboe) anche quando il
  // campo del ritardo riporta i 15 minuti del flusso ufficiale della borsa; solo l'OTC resta in ritardo.
  const US_RT = /^(Nasdaq|NYSE|BATS|Cboe US|Cboe BZX)/i;
  function delayOf(s) {
    const q = quotes[s], m = /\.([A-Z]{1,3})$/.exec(s || ""), sx = m && DLY_SFX[m[1]];
    if (q && ((q.qs && /real ?time/i.test(q.qs)) || (q.ex && US_RT.test(q.ex) && !/=F$/.test(s)))) return null;
    const fut = /=F$/.test(s || "") ? (FUT30.test(s) ? [30, "NYMEX/COMEX"] : [10, "CME"]) : null;
    const guess = sx || fut;
    if (q && q.dl != null) return q.dl > 0 ? [q.dl, guess ? guess[1] : q.ex || ""] : null;
    return guess;
  }
  const CLOCK = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.3 1.5"/></svg>';
  const dlyTag = (ds) => `<i class="dly" data-dk="${esc(ds)}" title="" hidden></i>`;
  function paintDly() {
    root.querySelectorAll("[data-dk]").forEach((el) => {
      const d = delayOf(el.dataset.dk), ex = d && d[1] ? ` (${T(d[1])})` : "";
      const tip = d ? L(`Dati in ritardo di ${d[0]} minuti${ex}: per questa borsa Yahoo Finance non fornisce il tempo reale.`, `Data delayed by ${d[0]} minutes${ex}: Yahoo Finance has no real-time data for this exchange.`) : "";
      if (el.dataset.tip === tip) return;
      el.dataset.tip = tip; el.hidden = !d;
      if (d && !el.firstChild) el.innerHTML = CLOCK;
      el.setAttribute("aria-label", tip);
    });
  }
  // fumetto al passaggio del mouse sull'orologio
  let htipEl = null;
  function showHtip(el, text) {
    htipEl = el;
    const t = $("#htip"), r = el.getBoundingClientRect();
    t.textContent = text || el.dataset.tip; t.hidden = false;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = Math.round(r.left + r.width / 2 - w / 2), y = Math.round(r.bottom + 6);
    x = Math.max(6, Math.min(VW() - w - 6, x));
    if (y + h > innerHeight - 6) y = Math.round(r.top - h - 6);
    t.style.left = `${x}px`; t.style.top = `${y}px`;
  }
  const hideHtip = () => { htipEl = null; const t = $("#htip"); if (t) t.hidden = true; };
  // l'elemento sotto il mouse è stato nascosto o ridisegnato (pointerout non arriva): chiudo il fumetto
  const checkHtip = () => { if (htipEl && (isHidden() || !htipEl.isConnected || !htipEl.matches(":hover") || htipEl.closest("[hidden]"))) hideHtip(); };
  // ---------- Traduttore (inglese) ----------
  const trOrig = new WeakMap(), trAttrs = new WeakMap(), TR_ATTRS = ["data-tt", "aria-label", "placeholder"];
  let trOn = false;
  function trCore(c) {
    const d = I18N.dict[c];
    if (d != null) return d;
    for (const [re, f] of I18N.rules) { const m = re.exec(c); if (m) return typeof f === "function" ? f(m, T) : c.replace(re, f); }
    return null;
  }
  const trText = (s) => { const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), c = m[2]; if (!c || !/[A-Za-zÀ-ú]/.test(c)) return s; const t = trCore(c); return t == null ? s : m[1] + t + m[3]; };
  // ogni nodo ricorda il suo testo italiano: così si torna all'italiano e si riconosce un testo nuovo scritto dal codice
  function trNode(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode;
      if (!p || p.nodeName === "STYLE" || (p.closest && p.closest("[data-nt]"))) return;
      const cur = n.nodeValue;
      let o = trOrig.get(n);
      if (!o || (cur !== o.it && cur !== o.en)) o = { it: cur };
      o.en = trOn ? trText(o.it) : o.it;
      trOrig.set(n, o);
      if (cur !== o.en) n.nodeValue = o.en;
      return;
    }
    if (n.nodeType !== 1 || n.nodeName === "STYLE") return;
    for (const a of TR_ATTRS) if (n.hasAttribute(a)) trAttr(n, a);
    for (const c of n.childNodes) trNode(c);
  }
  function trAttr(el, a) {
    if (el.closest("[data-nt]")) return;
    let m = trAttrs.get(el);
    if (!m) trAttrs.set(el, (m = {}));
    const cur = el.getAttribute(a);
    let o = m[a];
    if (!o || (cur !== o.it && cur !== o.en)) o = m[a] = { it: cur };
    o.en = trOn ? trText(o.it) : o.it;
    if (cur !== o.en) el.setAttribute(a, o.en);
  }
  const trObs = new MutationObserver((ms) => {
    if (!trOn) return;
    for (const m of ms) {
      if (m.type === "characterData") trNode(m.target);
      else if (m.type === "attributes") { if (m.target.hasAttribute(m.attributeName)) trAttr(m.target, m.attributeName); }
      else m.addedNodes.forEach(trNode);
    }
    trObs.takeRecords(); // le mie sostituzioni non vanno ritradotte
  });
  const trWatch = () => { trObs.disconnect(); if (trOn) trObs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS }); };
  function setLang(l, quiet) {
    st.lang = l === "en" ? "en" : "it";
    LOC = st.lang === "en" ? "en-GB" : "it-IT";
    trOn = st.lang === "en";
    NLOC = st.nf === "it" ? "it-IT" : st.nf === "en" ? "en-GB" : LOC;
    compact = new Intl.NumberFormat(NLOC, { notation: "compact", maximumFractionDigits: 2 });
    dfmt = new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    calFmts(); clockFmt();
    host.setAttribute("lang", st.lang);
    if (!quiet) persist();
    // ridisegno tutto (le parti dinamiche ripartono dall'italiano), poi traduco (o riporto all'italiano) tutto il widget
    apply(); drawSettings(); drawRes(); renderPform(false);
    if (calOpen) { drawCal(false); drawEarn(); }
    if (cur && chart) { chart.applyOptions({ localization: { locale: LOC } }); drawTools(); drawInd(); load(false); }
    if (cur) tick();
    trObs.takeRecords();
    for (const c of root.childNodes) trNode(c);
    trWatch(); // in italiano l'osservatore resta spento: niente lavoro a ogni prezzo nuovo
  }

  // I "title" del browser hanno i colori del sistema: li sposto in data-tt e li mostro con il fumetto
  // dell'estensione, chiaro o scuro come il tema. L'orologio del ritardo compare subito, gli altri dopo una pausa.
  const ttConv = (el) => { const v = el.getAttribute("title"); el.removeAttribute("title"); if (v) el.dataset.tt = v; else delete el.dataset.tt; };
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "attributes") { if (m.target.hasAttribute("title")) ttConv(m.target); continue; }
      for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.hasAttribute("title")) ttConv(n); n.querySelectorAll("[title]").forEach(ttConv); }
    }
  }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
  root.querySelectorAll("[title]").forEach(ttConv);
  let ttT = 0, ttAnchor = null, ttMute = null;
  const ttStop = () => { clearTimeout(ttT); ttAnchor = null; hideHtip(); };
  // dopo un clic niente fumetti finché il mouse non si sposta (la riga cliccata si ridisegna proprio lì sotto)
  const ttClick = (e) => { ttStop(); ttMute = { x: e.clientX, y: e.clientY }; };
  root.addEventListener("pointermove", (e) => {
    if (!ttMute || Math.hypot(e.clientX - ttMute.x, e.clientY - ttMute.y) < 6) return;
    ttMute = null; ttEnter(e.composedPath()[0]);
  });
  root.addEventListener("pointerover", (e) => ttEnter(e.composedPath()[0]));
  function ttEnter(t) {
    if (!t || !t.closest || pdrag || layDrag || ttMute) return;
    const d = t.closest(".dly");
    if (d && d.dataset.tip) { clearTimeout(ttT); ttAnchor = d; return showHtip(d, d.dataset.tip); }
    const el = t.closest("[data-tt]");
    if (el === ttAnchor) return;
    clearTimeout(ttT); hideHtip(); ttAnchor = el;
    if (!el) return;
    ttT = setTimeout(() => {
      if (el.closest(".cal") && !$("#ctip").hidden) return; // nel calendario c'è già il pannello dei valori
      if (ttAnchor === el && el.isConnected && el.matches(":hover") && !viewHidden() && el.dataset.tt) showHtip(el, el.dataset.tt);
    }, 550);
  }
  root.addEventListener("pointerout", (e) => { const n = e.relatedTarget; if (!n || !root.contains(n)) ttStop(); });
  root.addEventListener("pointerdown", ttClick, true);
  root.addEventListener("wheel", ttStop, { capture: true, passive: true });
  root.addEventListener("keydown", ttStop, true);
  root.addEventListener("scroll", ttStop, true);

  // ---------- Loghi: riquadro arrotondato a sinistra del ticker (lo prepara il service worker) ----------
  // Azioni: Financial Modeling Prep, poi Parqet; crypto: CoinCap; indici e cambi: la bandiera del paese o
  // della valuta. Senza logo (o se la rete aziendale blocca le fonti) un riquadro colorato con l'iniziale.
  const FLAG = { "^GSPC": "us", "^DJI": "us", "^IXIC": "us", "^NDX": "us", "^RUT": "us", "^VIX": "us", "ES=F": "us", "NQ=F": "us", "YM=F": "us", "RTY=F": "us",
    "MES=F": "us", "MNQ=F": "us", "MYM=F": "us", "FTSEMIB.MI": "it", "^GDAXI": "de", "^FCHI": "fr", "^FTSE": "gb", "^STOXX50E": "eu", "^STOXX": "eu",
    "^IBEX": "es", "^N225": "jp", "^HSI": "hk", "^AEX": "nl", "^SSMI": "ch", "^GSPTSE": "ca", "^BVSP": "br", "^MXX": "mx", "^AXJO": "au", "^KS11": "kr", "000001.SS": "cn" };
  const CUR_CC = { EUR: "eu", USD: "us", GBP: "gb", JPY: "jp", CHF: "ch", CAD: "ca", AUD: "au", NZD: "nz", CNY: "cn", CNH: "cn", HKD: "hk", SEK: "se", NOK: "no",
    DKK: "dk", PLN: "pl", TRY: "tr", MXN: "mx", BRL: "br", INR: "in", KRW: "kr", ZAR: "za", SGD: "sg", CZK: "cz", HUF: "hu", ILS: "il" };
  const flagUrl = (cc) => `https://flagcdn.com/w80/${cc}.png`;
  function logoUrls(s) {
    let m;
    if (FLAG[s]) return [flagUrl(FLAG[s])];
    if ((m = /^([A-Z]{3})([A-Z]{3})=X$/.exec(s))) return CUR_CC[m[1]] ? [flagUrl(CUR_CC[m[1]])] : [];
    if ((m = /^([A-Z0-9]{2,10})-(USD|EUR|USDT|GBP|BTC)$/.exec(s))) return [`https://assets.coincap.io/assets/icons/${m[1].toLowerCase()}@2x.png`];
    if (/=F$|^\^/.test(s)) return [];
    return [`https://financialmodelingprep.com/image-stock/${encodeURIComponent(s)}.png`, `https://assets.parqet.com/logos/symbol/${encodeURIComponent(s)}?format=png`];
  }
  const LOGO = {}; // simbolo → data URL, null (nessun logo) o assente (da chiedere)
  let logoAsk = new Set(), logoT = 0;
  const lgHue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const lgInit = (n) => (String(n).replace(/^[\^]/, "").match(/[A-Za-z0-9]/) || ["?"])[0].toUpperCase();
  // Azioni USA: loghi da Brandfetch, caricati direttamente da loro come chiedono le condizioni. Cerco la versione scura:
  // 0 icona "light" (riquadro scuro con il logo chiaro), 1 simbolo chiaro su un riquadro scuro, 2 icona "dark" (chiara);
  // se nessuna c'è o la pagina blocca le immagini esterne, il riquadro preparato dal service worker con le altre fonti.
  // Ricordo il passo che ha funzionato (non quelli falliti: potrebbe essere stata solo la pagina a bloccarli).
  const BF_ID = "1idGC5quUoFvmQY3up9", BF_STEP = {}, BF_PATH = ["theme/light/fallback/404/type/icon", "theme/light/fallback/404/type/symbol", "theme/dark/fallback/404/type/icon"];
  let bfOk = {};
  chrome.storage.local.get("bfok").then((o) => { bfOk = (o && o.bfok) || {}; }, () => {});
  const bfStep = (s) => BF_STEP[s] !== undefined ? BF_STEP[s] : bfOk[s] !== undefined ? bfOk[s] : 0;
  const bfUrl = (s, k) => `https://cdn.brandfetch.io/ticker/${s}/w/96/h/96/${BF_PATH[k]}?c=${BF_ID}`;
  // già arrivata una volta: la rimetto subito visibile, senza l'iniziale sotto (ridisegnando le liste niente lampeggi)
  const BF_SEEN = new Set();
  const bfTag = (s, n, k) => BF_SEEN.has(`${s}|${k}`) ? `<img class="ok" src="${bfUrl(s, k)}" data-bf="${k}" referrerpolicy="no-referrer" alt="">` : `<i>${esc(lgInit(n))}</i><img src="${bfUrl(s, k)}" data-bf="${k}" referrerpolicy="no-referrer" alt="">`;
  const bfCan = (s) => /^[A-Z]{1,5}$/.test(s) && bfStep(s) < BF_PATH.length;
  function logoTag(s, n) {
    if (LOGO[s] === undefined && bfCan(s)) return `<span class="lg" data-lg="${esc(s)}" style="--lgh:${lgHue(s)}" aria-hidden="true">${bfTag(s, n, bfStep(s))}</span>`;
    const d = LOGO[s];
    if (d === undefined) { logoAsk.add(s); clearTimeout(logoT); logoT = setTimeout(askLogos, 60); }
    return `<span class="lg" data-lg="${esc(s)}" style="--lgh:${lgHue(s)}" aria-hidden="true">${d ? `<img src="${d}" alt="">` : `<i>${esc(lgInit(n))}</i>`}</span>`;
  }
  async function askLogos() {
    const want = [...logoAsk].filter((s) => LOGO[s] === undefined);
    logoAsk = new Set();
    if (!want.length) return;
    want.forEach((s) => (LOGO[s] = null)); // intanto l'iniziale; non lo richiedo due volte
    // a blocchi di 60 (il service worker ne serve al massimo 60 per richiesta): la settimana degli utili ne chiede molti
    await Promise.all(Array.from({ length: Math.ceil(want.length / 60) }, async (_, k) => {
      const part = want.slice(k * 60, k * 60 + 60);
      let r = {};
      try { r = (await chrome.runtime.sendMessage({ type: "logos", items: part.map((s) => ({ s, urls: logoUrls(s) })) })) || {}; } catch (_) {}
      for (const s of part) {
        if (!r[s]) continue;
        LOGO[s] = r[s];
        root.querySelectorAll(`.lg[data-lg="${CSS.escape(s)}"]`).forEach((el) => { el.innerHTML = `<img src="${r[s]}" alt="">`; });
      }
    }));
  }
  let bfSaveT = 0;
  root.addEventListener("load", (e) => {
    const t = e.target;
    if (!t || t.tagName !== "IMG" || t.dataset.bf === undefined) return;
    t.classList.add("ok");
    const s = t.parentNode && t.parentNode.dataset.lg, k = +t.dataset.bf;
    if (s) BF_SEEN.add(`${s}|${k}`);
    if (s && bfOk[s] !== k) { bfOk[s] = k; clearTimeout(bfSaveT); bfSaveT = setTimeout(() => chrome.storage.local.set({ bfok: bfOk }).catch(() => {}), 1500); }
  }, true);
  // immagine bloccata dalla pagina (CSP) o non valida: torno all'iniziale
  root.addEventListener("error", (e) => {
    const img = e.target;
    if (!img || img.tagName !== "IMG" || !img.parentNode || !img.parentNode.classList || !img.parentNode.classList.contains("lg")) return;
    const s = img.parentNode.dataset.lg;
    if (img.dataset.bf !== undefined) { // questa versione su Brandfetch non c'è (o la pagina la blocca): provo la successiva
      const k = +img.dataset.bf + 1, it = item(s);
      if (BF_STEP[s] === undefined || BF_STEP[s] < k) BF_STEP[s] = k;
      if (bfOk[s] !== undefined && bfOk[s] < k) delete bfOk[s];
      const next = bfCan(s) ? bfTag(s, it.n || s, bfStep(s)) : `<i>${esc(lgInit(it.n || s))}</i>`;
      root.querySelectorAll(`.lg[data-lg="${CSS.escape(s)}"]`).forEach((el) => { el.innerHTML = next; });
      if (!bfCan(s) && LOGO[s] === undefined) { logoAsk.add(s); clearTimeout(logoT); logoT = setTimeout(askLogos, 60); }
      return;
    }
    LOGO[s] = null;
    root.querySelectorAll(`.lg[data-lg="${CSS.escape(s)}"]`).forEach((el) => { const it = item(s); el.innerHTML = `<i>${esc(lgInit(it.n || s))}</i>`; });
  }, true);

  // ---------- Disegno ----------
  const futTag = (s0) => (dsym(s0) !== s0 ? `<span class="fut" title="Wall Street chiusa: future ${esc(FUT[s0][1])} (${esc(FUT[s0][0])}). L'indice torna all'apertura (15:30 italiane).">FUT</span>` : "");
  function drawBar() {
    // da 1 a 3 titoli una colonna, da 4 a 6 due colonne (FUT e orologio sotto al nome)
    // una colonna: tre titoli visibili, dal quarto al sesto si scorre; oppure tutti su una riga sola
    const B = st.bar.filter(Boolean), two = false, row1 = !!st.barRow && B.length >= 2;
    $("#bar").classList.remove("two"); $("#bar").classList.toggle("row1", row1);
    { const rb = $("#barrow"), t = row1 ? L("Titoli in colonna", "Tickers in a column") : L("Titoli in una riga", "Tickers in one row");
      rb.hidden = B.length < 2; rb.innerHTML = row1 ? BARCOLICON : BARROWICON; rb.dataset.tt = t; rb.setAttribute("aria-label", t); }
    $("#items").innerHTML = B.length
      ? B.map((it) => {
          const ds = dsym(it.s), q = quotes[ds], [c, t] = pct(q), k = esc(ds);
          const nm = esc(ds !== it.s ? FUT[it.s][1] : it.t || it.n), ht = L("Andamento storico", "Price history");
          // tasto dell'andamento storico accanto al nome (compare passando il mouse, come nelle liste)
          const hb = `<button class="lc blc${ds === cur && mode === "l" ? " on" : ""}" data-a="line" data-s="${k}" aria-label="${ht} ${L("di", "of")} ${nm}" title="${ht}">${LINEICON}</button>`;
          return `<div class="bi${ds === cur ? " sel" : ""}${q === undefined ? " sk" : ""}" role="button" tabindex="0" data-a="chart" data-s="${k}" title="${L("Apri il grafico di", "Open the chart of")} ${nm}">${two ? `<b>${esc(it.n)}</b><span class="bt">${futTag(it.s)}${dlyTag(ds)}${hb}</span>` : `<span class="bnm"><b>${esc(it.n)}${futTag(it.s)}${dlyTag(ds)}</b>${hb}</span>`}<span class="bpx"><span data-k="${k}" data-f="p">${val(q)}</span>${curTag(ds)}</span><span data-k="${k}" data-f="c" class="${c}">${t}</span></div>`;
        }).join('<i class="sep"></i>')
      : "";
    fitBar(); barFade();
    placePanel();
  }
  // altri titoli sotto (o di lato): sfumatura sul bordo per far capire che si può scorrere
  function barFade() {
    const it = $("#items"), b = $("#bar"); if (!it) return;
    const r1 = b.classList.contains("row1");
    const more = r1 ? it.scrollLeft + it.clientWidth < it.scrollWidth - 2 : it.scrollTop + it.clientHeight < it.scrollHeight - 2;
    const less = r1 ? it.scrollLeft > 2 : it.scrollTop > 2;
    b.classList.toggle("bmore", more); b.classList.toggle("bless", less);
  }
  // Due colonne: nome e valori vicini (il nome occupa quanto il più lungo della sua colonna, poi i
  // valori allineati a destra), lo spazio che avanza resta fra le due colonne
  function fitBar() {
    const bar = $("#bar"), bis = [...root.querySelectorAll("#items .bi")];
    if (!bar.offsetWidth || !bis.length) return;
    const two = bar.classList.contains("two"), rows = +bar.style.getPropertyValue("--brows") || 2, cols = [[], []];
    if (!two) { bis.forEach((x) => { if (x.style.gridTemplateColumns) x.style.gridTemplateColumns = ""; }); return; }
    bis.forEach((x, i) => cols[Math.min(1, Math.floor(i / rows))].push(x));
    // larghezza del contenuto (non della cella, che può essere già allargata): misurata con un intervallo di testo
    const rg = document.createRange(), W = (el) => { if (!el) return 0; rg.selectNodeContents(el); return rg.getBoundingClientRect().width; };
    for (const c of cols) {
      if (!c.length) continue;
      let nw = 0, pw = 0, cw = 0;
      for (const x of c) {
        nw = Math.max(nw, W(x.querySelector("b")), W(x.querySelector(".bt"))); // la seconda riga comprende il tasto dell'andamento storico
        pw = Math.max(pw, W(x.querySelector(".bpx")));
        const ce = x.querySelector("[data-f=c]"); cw = Math.max(cw, ce ? ce.offsetWidth : 0);
      }
      nw = Math.ceil(Math.min(nw, 160));
      // due colonne: nome e, sotto, valore e variazione; una colonna: nome · prezzo · variazione
      const g = two ? `minmax(${nw}px,max-content) minmax(${Math.ceil(Math.max(pw, cw))}px,auto)` : `minmax(${nw}px,max-content) minmax(${Math.ceil(pw)}px,auto) minmax(${Math.ceil(cw)}px,auto)`;
      for (const x of c) if (x.style.gridTemplateColumns !== g) x.style.gridTemplateColumns = g;
    }
  }

  // il pannello parte subito sotto la barra dei ticker (che ora è in colonna)
  function placePanel() {
    const b = $("#bar"), top = b.hidden || st.barOff ? 12 : 12 + b.offsetHeight + 8;
    $("#panel").style.setProperty("--pt", `${top}px`);
    applyLay();
  }
  // Posizione e dimensioni scelte col mouse: { r: distanza dal bordo destro, y: dall'alto,
  // w / h: lista, ww / wh: con il grafico aperto }. Senza valori: posizione predefinita.
  const LAY_MIN = { w: 300, h: 260, ww: 640, wh: 380 }, CMIN = 420; // CMIN: larghezza minima di grafico e calendario accanto alla lista
  const layIs = () => !!(st.lay && Object.keys(st.lay).length);
  function applyLay() {
    const pn = $("#panel"), L = PANEL ? {} : st.lay || {}, wide = pn.classList.contains("wide"), vw = VW(), vh = innerHeight;
    // riempi schermo: tutta la finestra con un margine, la lista resta a destra
    const mx = maxed && wide;
    pn.classList.toggle("maxed", mx);
    root.querySelectorAll(".maxb").forEach((mb) => { mb.innerHTML = mx ? MINICON : MAXICON; const t = mx ? L_("Riduci", "Restore size") : L_("Riempi lo schermo", "Fill the screen"); mb.dataset.tt = t; mb.removeAttribute("title"); mb.setAttribute("aria-label", t); });
    if (mx) {
      Object.assign(pn.style, { width: `${vw - 16}px`, right: "8px", top: "8px", height: `${vh - 16}px`, maxHeight: `${vh - 16}px` });
      pn.style.setProperty("--sw", `${Math.round(L.sw ? Math.min(L.sw, vw - 400) : 314)}px`);
      $("#layreset").hidden = !layIs();
      return;
    }
    const wk = wide ? "ww" : "w", hk = wide ? "wh" : "h";
    const w = L[wk] ? Math.min(L[wk], vw - 16) : null;
    pn.style.width = w ? `${w}px` : "";
    // la colonna della lista, nel pannello largo, è larga come nel pannello stretto (aprendo il grafico non si
    // muove), oppure quella scelta trascinando la barra fra grafico e lista
    // margini interni e bordi veri del pannello (cambiano con lo stile): la colonna resta larga al pixel come nel pannello stretto
    const pcs = getComputedStyle(pn), pad = ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"].reduce((t, k) => t + (parseFloat(pcs[k]) || 0), 0);
    const swList = PANEL ? Math.max(260, vw - 16 - 28) : Math.min(420, (L.w ? Math.min(L.w, vw - 16) : 340) - pad); // 340: larghezza predefinita della lista
    pn.style.setProperty("--sw", `${wide && L.sw ? Math.round(Math.max(220, Math.min(L.sw, (w || pn.offsetWidth) - CMIN))) : swList}px`);
    const width = w || pn.offsetWidth;
    if (L.r != null) pn.style.right = `${Math.max(0, Math.min(L.r, vw - width - 4))}px`; else pn.style.right = "";
    const top = L.y != null ? Math.max(4, Math.min(L.y, vh - 80)) : null;
    pn.style.top = top != null ? `${top}px` : "";
    const t0 = top != null ? top : parseFloat(pn.style.getPropertyValue("--pt")) || 62;
    // spostato: al massimo alto quanto nella posizione predefinita (sale tutto intero, il fondo non resta
    // attaccato al bordo della finestra), e comunque dentro la finestra
    const pt = parseFloat(pn.style.getPropertyValue("--pt")) || 62;
    // altezza standard (lista, portafoglio, grafico): fino in fondo alla finestra, anche con pochi titoli;
    // spostato in su resta alta come nella posizione predefinita. Ridimensionata a mano: quella scelta.
    const room = Math.max(120, top != null ? Math.min(vh - t0 - 8, vh - pt - 8) : vh - t0 - 8);
    pn.style.maxHeight = `${Math.max(room, L[hk] ? Math.min(L[hk], vh - t0 - 8) : 0)}px`;
    pn.style.height = st.zen && !wide ? "" : `${L[hk] ? Math.min(L[hk], vh - t0 - 8) : room}px`; // zen: alto quanto la lista
    $("#layreset").hidden = !layIs();
    pn.classList.toggle("moved", top != null);
    // spazio della barra di scorrimento: l'intestazione si allinea ai tasti sotto
    const sb = $("#sbody"); if (sb && sb.offsetWidth) host.style.setProperty("--gut", `${sb.offsetWidth - sb.clientWidth}px`);
  }
  let layDrag = null, barMvT = 0;
  function layStart(e, kind) {
    if (PANEL) return; // nel pannello laterale la misura la decide il browser
    finishWide();
    if (maxed && $("#panel").classList.contains("wide")) return; // a tutto schermo non si sposta né si ridimensiona
    const pn = $("#panel"), r = pn.getBoundingClientRect(), wide = pn.classList.contains("wide");
    layDrag = { id: e.pointerId, kind, x0: e.clientX, y0: e.clientY, r0: VW() - r.right, y: r.top, w: r.width, h: r.height, wide, el: e.target, sw0: $(".side").getBoundingClientRect().width };
    pn.classList.add("moving");
    if (e.target.classList.contains("rz")) e.target.classList.add("on");
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function layMove(e) {
    const d = layDrag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0, L = { ...(st.lay || {}) };
    const wk = d.wide ? "ww" : "w", hk = d.wide ? "wh" : "h", minW = LAY_MIN[wk], maxW = VW() - 16;
    if (d.kind === "move") { L.r = Math.round(d.r0 - dx); L.y = Math.round(d.y + dy); }
    else if (d.kind === "l") { L[wk] = Math.round(Math.max(minW, Math.min(maxW, d.w - dx))); L.r = Math.round(d.r0); L.y = Math.round(d.y); }
    else if (d.kind === "r") { const w = Math.max(minW, Math.min(maxW, d.w + dx)); L[wk] = Math.round(w); L.r = Math.round(d.r0 - (w - d.w)); L.y = Math.round(d.y); }
    else if (d.kind === "s") { // barra fra grafico e lista: la lista si allarga verso sinistra o si stringe
      L.sw = Math.round(Math.max(220, Math.min(d.w - CMIN, d.sw0 - dx))); L.r = Math.round(d.r0); L.y = Math.round(d.y);
      if (maxed) delete L.y, delete L.r;
    }
    else if (d.kind.length === 2) { // spigolo: larghezza e altezza insieme
      const left = d.kind[1] === "l", top = d.kind[0] === "t";
      const w = Math.round(Math.max(minW, Math.min(maxW, left ? d.w - dx : d.w + dx)));
      L[wk] = w; L.r = Math.round(left ? d.r0 : d.r0 - (w - d.w));
      if (top) { const bottom = d.y + d.h, y = Math.round(Math.max(4, Math.min(bottom - LAY_MIN[hk], d.y + dy))); L.y = y; L[hk] = Math.round(bottom - y); }
      else { L.y = Math.round(d.y); L[hk] = Math.round(Math.max(LAY_MIN[hk], Math.min(innerHeight - d.y - 8, d.h + dy))); }
    }
    else if (d.kind === "t") { // il fondo resta fermo, la cima sale o scende
      const bottom = d.y + d.h, y = Math.round(Math.max(4, Math.min(bottom - LAY_MIN[hk], d.y + dy)));
      L.y = y; L[hk] = Math.round(bottom - y); L.r = Math.round(d.r0);
    }
    else if (d.kind === "b") { L[hk] = Math.round(Math.max(LAY_MIN[hk], Math.min(innerHeight - d.y - 8, d.h + dy))); L.r = Math.round(d.r0); L.y = Math.round(d.y); }
    st.lay = L;
    applyLay();
  }
  function layEnd(e) {
    const d = layDrag;
    if (!d || e.pointerId !== d.id) return;
    layDrag = null;
    $("#panel").classList.remove("moving");
    root.querySelectorAll(".rz.on").forEach((x) => x.classList.remove("on"));
    persist();
  }
  addEventListener("resize", () => placePanel());
  // bordi: ridimensiona · intestazione (nome, titolo del grafico o del calendario): sposta
  root.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const t = e.composedPath()[0];
    if (!t || !t.closest) return;
    const rz = t.closest(".rz");
    if (rz) return layStart(e, rz.dataset.rz);
    const grip = t.closest(".side > .hd, .chart > .ctop, .cal > .ctop") || (t.matches(".panel, .chart, .cal") ? t : null);
    if (grip && !t.closest("button, input, select, a, label, .menu, #menu, .brand")) layStart(e, "move");
  }, true);
  root.addEventListener("pointermove", layMove, true);
  root.addEventListener("pointerup", layEnd, true);
  root.addEventListener("pointercancel", layEnd, true);
  function drawLists() {
    root.querySelectorAll(".tab[data-a=\"tab\"]").forEach((b) => { const on = b.dataset.t === (st.tab === "pf" ? "pf" : "list"); b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    const fq = $("#fq");
    fq.setAttribute("aria-label", st.tab === "pf" ? "Cerca nel portafoglio o aggiungi un titolo" : "Cerca nella lista o aggiungi un ticker");
    $("#find").dataset.tt = st.tab === "pf" ? "Cerca nel portafoglio o aggiungi un titolo" : "Cerca nella lista o aggiungi un ticker";
    $("[data-a=resort]").dataset.tt = st.tab === "pf" ? "Riordina il portafoglio e aggiorna i prezzi" : "Riordina la lista e aggiorna i prezzi";
    if (st.tab === "pf") {
      const left = pfEdit
        ? `<div class="pfcurl" title="${L("Valuta in cui vedi patrimonio, valori, investito e rendimenti: il valore al cambio di oggi, il costo al cambio del giorno di ogni acquisto. I prezzi restano quelli della borsa del titolo.", "Currency for holdings, values, invested amounts and returns: value at today's rate, cost at the rate of each purchase date. Prices stay in the currency of each ticker's exchange.")}"><span>${L("Valuta del portafoglio", "Portfolio currency")}</span><select class="pill" id="pfcursel" aria-label="${L("Valuta del portafoglio", "Portfolio currency")}">${PFCURS.map(([c, it, en]) => `<option value="${c}"${st.pfcur === c ? " selected" : ""}>${L(it, en)}</option>`).join("")}</select></div>`
        : `<div class="pfsum" id="pfsum" title="${L("Patrimonio: valore al cambio di oggi, costo al cambio del giorno di ogni acquisto (il risultato comprende l'effetto del cambio).", "Total holdings: value at today's rate, cost at the rate of each purchase date (the result includes currency effects).")}"></div>`;
      $("#lists").innerHTML = `<div class="pfhd" style="height:${listsH}px">${left}</div>`;
      $("#tbt").innerHTML = `<button class="rnd${pfForm && pfForm.mode === "add" ? " on" : ""}" data-a="pfadd" aria-label="Aggiungi un titolo al portafoglio" title="Aggiungi un titolo: quantità e prezzo di acquisto">${PLUSICON}</button>
        <button class="rnd${pfEdit ? " on" : ""}" data-a="pfedit" aria-label="${pfEdit ? "Fine modifica" : "Modifica il portafoglio"}" title="${pfEdit ? "Fine modifica" : L("Modifica il portafoglio: sposta, modifica o rimuovi i titoli e scegli le colonne", "Edit the portfolio: move, edit or remove holdings and choose the columns")}">${pfEdit ? CHECKICON : PENICON}</button>`;
      ensureFx();
      return;
    }
    // + e matita (nuova lista, modifica) stanno nella riga in alto, accanto alla ricerca
    $("#tbt").innerHTML = `<button class="rnd${edit && edit.mode === "new" ? " on" : ""}" data-a="lnew" aria-label="${L("Nuova lista", "New list")}" title="${L("Nuova lista", "New list")}">${PLUSICON}</button>
        <button class="rnd${lEdit ? " on" : ""}" data-a="ledit" aria-label="${lEdit ? L("Fine modifica", "Done editing") : L("Modifica la lista", "Edit the list")}" title="${lEdit ? L("Fine modifica", "Done editing") : L("Modifica: sposta o rimuovi i titoli, rinomina o elimina le liste", "Edit: move or remove tickers, rename or delete lists")}">${lEdit ? CHECKICON : PENICON}</button>`;
    if (edit) {
      const isNew = edit.mode === "new";
      // stessa altezza della riga delle liste: sotto non si sposta nulla
      $("#lists").innerHTML = `<div class="ledit" style="min-height:${listsH}px"><input id="lname" maxlength="30" autocomplete="off" spellcheck="false" placeholder="Nome della lista" value="${isNew ? "" : esc(curList().name)}" aria-label="Nome della lista">
        <button class="pill pri" data-a="lsave">${isNew ? "Crea" : "Salva"}</button>
        ${!isNew && st.lists.length > 1 ? `<button class="pill warn" data-a="ldel">${delArm ? "Conferma eliminazione" : "Elimina"}</button>` : ""}
        <button class="pill" data-a="lcancel">Annulla</button></div>`;
      const i = $("#lname"); i.focus(); i.select();
      return;
    }
    // in modifica un clic sul nome della lista la rinomina o la elimina
    $("#lists").innerHTML = `<div class="lhd${lEdit ? " led" : ""}"><div class="lists" id="lchips">${st.lists.map((l) => {
      const on = l.id === curList().id, t = lEdit ? L(`Rinomina o elimina «${l.name}»`, `Rename or delete “${l.name}”`) : l.name;
      return `<button class="lchip${on ? " on" : ""}${lEdit ? " led" : ""}" data-a="${lEdit ? "lrename" : "list"}" data-id="${esc(l.id)}" title="${esc(t)}">${esc(l.name)}${lEdit ? PENSM : ""}</button>`;
    }).join("")}</div></div>`;
    const h = $("#lists").offsetHeight;
    if (h > 0 && !lEdit) listsH = h; // il riepilogo del portafoglio occupa la stessa altezza: la riga sotto non si sposta
    // una riga sola: la lista attiva resta in vista (le altre scorrono sotto ai tasti + e matita)
    const lc = $("#lchips"), on = lc && lc.querySelector(".lchip.on");
    if (lc && on && !lEdit) { const a = on.offsetLeft - lc.offsetLeft, b2 = a + on.offsetWidth; if (a < lc.scrollLeft) lc.scrollLeft = a - 4; else if (b2 > lc.scrollLeft + lc.clientWidth) lc.scrollLeft = b2 - lc.clientWidth + 18; }
  }
  // nomi delle liste: con la rotella scorrono di lato
  root.addEventListener("wheel", (e) => {
    const it = e.composedPath()[0].closest && e.composedPath()[0].closest("#bar.row1>#items");
    if (!it || it.scrollWidth <= it.clientWidth || !e.deltaY) return;
    it.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });
  root.addEventListener("scroll", (e) => { if (e.target && e.target.id === "items") barFade(); }, true);
  root.addEventListener("wheel", (e) => {
    const lc = e.composedPath()[0].closest && e.composedPath()[0].closest("#lchips");
    if (!lc || lEdit || lc.scrollWidth <= lc.clientWidth) return;
    lc.scrollLeft += e.deltaY || e.deltaX; e.preventDefault();
  }, { passive: false });
  // modifica: le liste si riordinano trascinandole davanti o dietro alle altre. Come i titoli: il nome
  // sollevato segue il mouse e gli altri scivolano per fargli posto (l'ordine si salva al rilascio)
  let chipDrag = null, chipDragEnd = 0;
  const chipEls = () => [...root.querySelectorAll("#lchips .lchip.led")];
  root.addEventListener("pointerdown", (e) => {
    const c = e.button === 0 && lEdit && e.composedPath()[0].closest && e.composedPath()[0].closest(".lchip.led");
    if (!c) return;
    chipDrag = { id: c.dataset.id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, el: c, tx: 0, ty: 0 };
  }, true);
  // il nome trascinato resta sotto il mouse anche quando cambia posto nell'elenco
  function chipFollow(d, x, y) {
    const r = d.el.getBoundingClientRect(), lx = r.left - d.tx, ly = r.top - d.ty; // posto "vero", senza lo spostamento
    d.tx = x - d.ox - lx; d.ty = y - d.oy - ly;
    d.el.style.transform = `translate(${d.tx}px,${d.ty}px) scale(1.06)`;
  }
  root.addEventListener("pointermove", (e) => {
    const d = chipDrag;
    if (!d || e.pointerId !== d.pid) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
      if (!d.el.isConnected) { chipDrag = null; return; }
      d.moved = true;
      const r = d.el.getBoundingClientRect();
      d.ox = d.x0 - r.left; d.oy = d.y0 - r.top;
      d.el.classList.add("drag");
      try { d.el.setPointerCapture(e.pointerId); } catch (_) {}
    }
    chipFollow(d, e.clientX, e.clientY);
    // appena il mouse entra in un altro nome, quello trascinato prende il suo posto (e l'altro scivola via).
    // Il nome appena scambiato si ignora finché il mouse non ne esce: niente scambi avanti e indietro.
    // bersaglio: il nome sotto il mouse (con un margine che copre lo spazio fra i nomi); oltre l'ultimo nome
    // di una riga, o sotto l'ultima riga, vale come "dopo quel nome". Funziona con qualsiasi numero di righe.
    const ex = e.clientX, ey = e.clientY, pad = 5;
    const cand = chipEls().filter((x) => x !== d.el).map((x) => [x, x.getBoundingClientRect()]);
    let tc = null, force = null;
    const hit = cand.find(([, r]) => ex >= r.left - pad && ex <= r.right + pad && ey >= r.top - pad && ey <= r.bottom + pad);
    if (hit) tc = hit[0];
    else if (cand.length) {
      const row = cand.filter(([, r]) => ey >= r.top - pad && ey <= r.bottom + pad);
      const lastOf = (arr) => arr.reduce((m, c) => (c[1].right > m[1].right ? c : m));
      if (row.length && ex > lastOf(row)[1].right) { tc = lastOf(row)[0]; force = "after"; }
      else if (!row.length && ey > Math.max(...cand.map(([, r]) => r.bottom))) {
        const maxB = Math.max(...cand.map(([, r]) => r.top));
        tc = lastOf(cand.filter(([, r]) => r.top === maxB))[0]; force = "after";
      }
    }
    if (tc !== d.last) d.last = null;
    if (!tc || tc === d.last) return;
    const all = chipEls(), ti = all.indexOf(tc), mi = all.indexOf(d.el), after = force ? true : ti > mi;
    if (force && ti === mi - 1) return; // è già subito dopo
    d.last = tc;
    // FLIP: posizioni prima, sposto, gli altri partono da dov'erano e scivolano nel posto nuovo
    const others = all.filter((x) => x !== d.el), before = new Map(others.map((x) => [x, x.getBoundingClientRect()]));
    others.forEach((x) => { x.style.transition = "none"; x.style.transform = ""; });
    if (after) tc.after(d.el); else tc.before(d.el);
    others.forEach((x) => {
      const a = x.getBoundingClientRect(), b = before.get(x), dx = b.left - a.left, dy = b.top - a.top;
      if (dx || dy) x.style.transform = `translate(${dx}px,${dy}px)`;
    });
    others[0] && others[0].offsetWidth; // applica le posizioni di partenza
    others.forEach((x) => {
      if (!x.style.transform) { x.style.transition = ""; return; }
      x.style.transition = "transform .16s cubic-bezier(.3,.8,.25,1)"; x.style.transform = "";
      setTimeout(() => { x.style.transition = ""; }, 170);
    });
    chipFollow(d, e.clientX, e.clientY);
  }, true);
  const chipUp = (e) => {
    const d = chipDrag;
    if (!d || e.pointerId !== d.pid) return;
    chipDrag = null;
    if (!d.moved) return;
    chipDragEnd = Date.now();
    // si appoggia nel suo posto nuovo, poi salvo l'ordine
    const el = d.el;
    el.style.transition = "transform .16s ease"; el.style.transform = "";
    const ord = chipEls().map((x) => x.dataset.id);
    const L0 = ord.map((id) => st.lists.find((l) => l.id === id)).filter(Boolean).concat(st.lists.filter((l) => !ord.includes(l.id)));
    const changed = L0.map((l) => l.id).join() !== st.lists.map((l) => l.id).join();
    setTimeout(() => { el.classList.remove("drag"); el.style.transition = ""; if (changed) { st.lists = L0; persist(); drawLists(); } }, 170);
  };
  root.addEventListener("pointerup", chipUp, true);
  root.addEventListener("pointercancel", chipUp, true);
  // Ordine "congelato": i ticker restano fermi finché non premi il pulsante Riordina
  // ordine calcolato prima che arrivassero tutti i valori (es. all'apertura): lo rifaccio appena ci sono
  let listPartial = false;
  const sortField = () => (SORTS.includes(st.sort) ? { p: "change", y: "ychange", r: "price" }[st.sort[0]] : null);
  const hasSortVal = (x, f) => sortVal(quotes[dsym(x.s)], f) != null;
  function ordered() {
    const L = items();
    if (!listOrder) { listOrder = sorted().map((x) => x.s); const f = sortField(); listPartial = !!f && L.some((x) => !hasSortVal(x, f)); }
    const out = listOrder.map((s) => L.find((x) => x.s === s)).filter(Boolean);
    for (const x of L) if (!listOrder.includes(x.s)) out.push(x); // aggiunti dopo l'ultimo riordino
    return out;
  }
  // ---------- Colonne fisse: lista = % Ieri, Prezzo (con la % di oggi sotto); portafoglio = Rendimento, Valore, Totale ----------
  const COLS0 = { list: ["y", "r"], pf: ["g", "r", "v"] };
  const colDef = (sec, k) => (sec === "list" ? COLS : PCOLS).find((c) => c[0] === k);
  // colonne mostrate (nella lista "% Ieri" si nasconde da sola quando Wall Street è aperta oggi)
  const colsOn = (sec) => COLS0[sec].filter((k) => !(sec === "list" && k === "y" && $("#panel").classList.contains("noy")));
  // larghezza di ogni colonna: il testo più lungo (misurato), così le righe restano allineate in qualsiasi ordine
  const mctx = document.createElement("canvas").getContext("2d");
  // i numeri hanno le cifre tabellari (tutte larghe come lo 0): misuro con gli 0, se no la misura viene corta
  const tw = (t, font) => { mctx.font = font; return mctx.measureText(String(t).replace(/\d/g, "0")).width; };
  // il "font" calcolato è vuoto con le cifre tabellari: lo ricompongo dalle sue parti
  const fontOf = (el) => { const c = getComputedStyle(el); return `${c.fontStyle} ${c.fontWeight} ${c.fontSize} ${c.fontFamily}`; };
  let lwKey = "", pwKey = "";
  function listWidths() {
    const side = $(".side"), el = $("#list .row:not(.prow) .pr");
    if (!el) return;
    const F = fontOf(el), Hd = `600 9.5px ${getComputedStyle(el).fontFamily}`;
    let mp = 0, ms = 0;
    const cuEl = $("#list .row:not(.prow) .cu"), FC = cuEl && fontOf(cuEl);
    root.querySelectorAll("#list .row:not(.prow) .pr").forEach((x) => { const c = x.nextElementSibling; mp = Math.max(mp, tw(x.textContent, F) + (c && c.classList.contains("cu") ? 3 + tw(c.textContent, FC) : 0)); });
    const sm = $("#list .row:not(.prow) .lp>small"), FS = sm && fontOf(sm);
    if (sm) root.querySelectorAll("#list .row:not(.prow) .lp>small").forEach((x) => { ms = Math.max(ms, tw(x.textContent, FS)); });
    const m = Math.max(tw(T("Prezzo"), Hd) + 12, mp, ms, tw("00.000,00", F) + (FC ? 3 + tw("$", FC) : 0));
    const w = Math.ceil(Math.min(130, m + 8));
    const mid = colsOn("list").map((k) => (k === "r" ? `${w}px` : "54px")).join(" ");
    const grid = lEdit ? `9px minmax(0,1fr) ${mid} 14px` : `minmax(0,1fr) 22px 22px ${mid}`;
    if (grid === lwKey) return;
    lwKey = grid; side.style.setProperty("--lgrid", grid);
  }
  function drawHead() {
    const th = $("#thead");
    th.classList.toggle("ed", lEdit);
    // in modifica l'ordine è quello che trascini: etichette ferme
    if (lEdit) { th.innerHTML = `<span></span>${[COLS[0], ...colsOn("list").map((k) => colDef("list", k))].map(([k, l]) => `<span class="th th-${k}">${T(l)}</span>`).join("")}<span></span>`; return; }
    th.innerHTML = [COLS[0], null, null, ...colsOn("list").map((k) => colDef("list", k))].map((c) => {
      if (!c) return "<span></span>";
      const [k, l, first, second] = c;
      // "Trend" ordina per variazione di oggi (la % sotto al prezzo) e poi per prezzo
      const byDay = false;
      const on = st.sort === first || st.sort === second || byDay, up = st.sort === "az" || (on && st.sort !== "za" && st.sort[1] === "a");
      const lab = l, tip = k === "r" ? L("Ordina per variazione di oggi: decrescente, crescente, non ordinato", "Sort by today's change: down, up, unsorted") : `${L("Ordina per", "Sort by")} ${T(l)}`;
      return `<button class="th th-${k}${on ? " on" : ""}" data-a="colsort" data-c="${k}" aria-label="${esc(tip)}" title="${esc(tip)}">${T(lab)}<i>${on ? (up ? "▲" : "▼") : "↕"}</i></button>`;
    }).join("");
  }
  function drawList() {
    drawPformVis();
    if (st.tab === "pf") return drawPf();
    $("#thead").classList.remove("pthead", "ed");
    drawHead();
    let L = ordered();
    if (findQ) {
      const f = findQ.toLowerCase();
      L = L.filter((x) => [x.n, x.s, x.t].some((v) => v && String(v).toLowerCase().includes(f)));
    }
    const cols = colsOn("list");
    $(".side").classList.toggle("nmc", !nmCfg().sub);
    $("#list").innerHTML = L.length
      ? L.map((it) => {
          const ds = dsym(it.s), q = quotes[ds], [c, t] = pct(q), [yc, yt] = ypct(q), s = esc(ds), s0 = esc(it.s);
          const cell = {
            r: `<span class="lp${q === undefined ? " sk" : ""}"><span class="lpr"><span class="pr" data-k="${s}" data-f="p">${val(q)}</span>${curTag(ds)}</span><small class="ch ${c}" data-k="${s}" data-f="c" title="Variazione di oggi">${t}</small></span>`,
            y: `<span class="ycw"><span class="ycp" data-k="${s}" data-f="yp" title="Prezzo di chiusura della seduta precedente">${ycl(q)}</span><span class="yc ${yc}" data-k="${s}" data-f="y" title="Variazione della seduta precedente">${yt}</span></span>`,
          };
          return `<div class="row${lEdit ? " ed" : ""}${ds === cur && mode === rowM() ? " sel" : ""}" tabindex="0" role="button"${lEdit ? "" : ` data-a="${MA[rowM()]}"`} data-s="${s}" data-is="${s0}" title="${esc(ds !== it.s ? FUT[it.s][1] + " (" + ds + ")" : it.t || it.n)}">${
            lEdit ? (findQ ? "<span></span>" : `<span class="ph" aria-label="${L_("Trascina per spostare", "Drag to move")} ${esc(it.n)}" title="${L_("Trascina per spostare", "Drag to move")}">${GRIP}</span>`) : ""}${nameCell(ds, it.n, ds !== it.s && FUT[it.s] ? FUT[it.s][1] : it.t, `${futTag(it.s)}${dlyTag(ds)}`)}${lEdit ? "" : modeBtn(ds, it.n) + newsBtn(ds, it.n)}${cols.map((k) => cell[k]).join("")}${
            lEdit ? `<button class="x" data-a="rm" data-s="${s0}" aria-label="${L_("Rimuovi", "Remove")} ${esc(it.n)}" title="${L_("Rimuovi dalla lista", "Remove from the list")}">${XSM}</button>` : ""}</div>`;
        }).join("")
      : findQ ? `<div class="empty">Nessun ticker della lista corrisponde a “${esc(findQ)}”.</div>` : '<div class="empty">Lista vuota. Scrivi in “Cerca…” per aggiungere un ticker.</div>';
    listWidths();
  }
  const nmCfg = () => {
    const n = st.nm && typeof st.nm === "object" ? st.nm : {};
    return { lg: n.lg === "off" ? "off" : "l", top: "tk", sub: false }; // nelle righe solo il ticker; il nome completo è in alto nei grafici
  };
  // extra: futures, ritardo e tasto dello storico, sulla riga sopra
  // alt: seconda riga quando la riga sotto è vuota (nel portafoglio quantità e PMC)
  function nameCell(ds, tk, cn, extra, alt) {
    const c = nmCfg(), nm = cn && cn !== tk ? cn : "";
    let L2 = c.top === "cn" ? [nm, tk] : [tk, nm];
    if (!L2[0]) L2 = [tk, ""]; // senza nome esteso resta il ticker, da solo
    const [a, b] = [L2[0], c.sub ? L2[1] : ""];
    return `<span class="nm">${c.lg === "off" ? "" : logoTag(ds, tk)}<span class="nmb"><span class="nml"><span class="tk">${esc(a)}</span>${extra}</span>${b ? `<span class="cn">${esc(b)}</span>` : ""}${alt || ""}</span></span>`;
  }
  function drawSlots() {
    const open = !!st.slotsOpen; // aperta o chiusa con la freccia: resta come l'hai lasciata
    $("#slots").hidden = !open; $("#slotsfold").classList.toggle("open", open); $("#slotsfold").setAttribute("aria-expanded", open);
    $("#slots").innerHTML = [0, 1, 2, 3, 4, 5].map((i) => {
      const it = st.bar[i];
      return `<div class="slotw"><button class="slot${slot === i ? " on" : ""}${it ? "" : " add"}" data-a="slot" data-i="${i}" aria-label="${it ? "Cambia il ticker" : "Aggiungi un ticker"} in posizione ${i + 1}"${it ? "" : ' title="Aggiungi un titolo in evidenza"'}>${
        it ? `<b>${esc(it.n)}</b><span>${esc(it.t && it.t !== it.n ? it.t : it.s)}</span>` : '<i class="plus" aria-hidden="true"></i>'}</button>${
        it ? `<button class="sx" data-a="slotrm" data-i="${i}" aria-label="Togli ${esc(it.n)} dai titoli in evidenza" title="Togli dai titoli in evidenza">${XSM}</button>` : ""}</div>`;
    }).join("");
    $("#slotsearch").hidden = slot == null;
    if (slot != null) {
      $("#q2").placeholder = `Cerca il ticker per la posizione ${slot + 1}`;
      $("#res2").innerHTML = slotRes.length
        ? slotRes.map((x, i) => `<button class="res" data-a="slotpick" data-i="${i}"><b>${esc(x.symbol)}</b><span>${esc(x.name)}</span><em>${esc(x.exch)}</em></button>`).join("")
        : $("#q2").value.trim().length >= 2 ? '<div class="empty">Nessun risultato</div>' : "";
    }
  }
  function draw() { drawBar(); drawLists(); drawList(); drawSlots(); }

  // ---------- Portafoglio ----------
  // Come un broker: ogni titolo ha la sua valuta (quella della borsa) e gli acquisti ("lotti") con prezzo,
  // valuta in cui li hai pagati e data. Le righe restano nelle valute dei titoli; solo il patrimonio
  // (il riepilogo) è nella valuta scelta: valore al cambio di oggi, costo al cambio del giorno di ogni acquisto,
  // quindi il risultato comprende anche l'effetto del cambio, come nell'estratto conto del broker.
  let listsH = 24, lEdit = false, pfOrder = null, pfEdit = false, pfArm = null, pfForm = null, pfRes = [], pfTimer = null, pdrag = null, dpk = null;
  // Numeri scritti dall'utente (prezzo, quantità): punto o virgola valgono entrambi come decimali.
  // Con tutti e due, l'ultimo è il decimale; lo stesso segno ripetuto (1.234.567) è il separatore delle migliaia.
  function parseDec(v) {
    let t = String(v || "").trim().replace(/[\s€$£¥'’]/g, "");
    if (!t) return NaN;
    const lc = t.lastIndexOf(","), ld = t.lastIndexOf(".");
    if (lc >= 0 && ld >= 0) { const dsep = lc > ld ? "," : "."; t = t.split(dsep === "," ? "." : ",").join("").replace(dsep, "."); }
    else if (lc >= 0 || ld >= 0) { const c = lc >= 0 ? "," : ".", n = t.split(c).length - 1; t = n > 1 ? t.split(c).join("") : t.replace(c, "."); }
    const n = Number(t);
    return isFinite(n) ? n : NaN;
  }
  // numero riscritto con il separatore decimale della lingua scelta
  const decShow = (n) => n.toLocaleString(NLOC, { useGrouping: false, maximumFractionDigits: 6 });
  // Date del modulo di acquisto: scritte a mano (gg/mm/aaaa, o nell'ordine della lingua) o scelte dal calendario
  const dOrder = () => { try { return new Intl.DateTimeFormat(LOC, { day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date(2020, 10, 25)).filter((x) => x.type !== "literal").map((x) => x.type[0]); } catch (_) { return ["d", "m", "y"]; } };
  const dPh = () => dOrder().map((k) => ({ d: L("gg", "dd"), m: "mm", y: L("aaaa", "yyyy") })[k]).join("/");
  const dShow = (k) => { const [y, m, d] = k.split("-"); const v = { y, m, d }; return dOrder().map((x) => v[x]).join("/"); };
  function parseDay(v) {
    const t = String(v || "").trim();
    if (!t) return null;
    let a = t.split(/[^0-9]+/).filter(Boolean), y, m, d;
    if (a.length === 1 && /^\d{8}$/.test(a[0])) { const o = dOrder(), x = a[0]; a = o[0] === "y" ? [x.slice(0, 4), x.slice(4, 6), x.slice(6)] : [x.slice(0, 2), x.slice(2, 4), x.slice(4)]; }
    if (a.length !== 3) return null;
    if (a[0].length === 4) [y, m, d] = a; else { const o = dOrder(), v = {}; o.forEach((k, i) => (v[k] = a[i])); ({ y, m, d } = v); }
    y = +y; m = +m; d = +d;
    if (y < 100) y += 2000;
    const dt = new Date(y, m - 1, d);
    if (!(y > 1900) || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const CALSM = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  // calendario per scegliere il giorno di acquisto (mese mostrato in dpk = {y, m})
  function drawDpk() {
    const el = $("#dpop");
    if (!el) return;
    el.hidden = !dpk;
    if (!dpk) { el.innerHTML = ""; return; }
    const { y, m } = dpk, today = dayKey(), sel = parseDay(($("#pfdate") || {}).value || "");
    const first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const mn = new Intl.DateTimeFormat(LOC, { month: "long", year: "numeric" }).format(first);
    const wd = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(LOC, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i)));
    const nextOk = `${y}-${String(m + 2).padStart(2, "0")}` <= today.slice(0, 7) || (m === 11 && `${y + 1}-01` <= today.slice(0, 7));
    let h = `<div class="dph"><button data-a="dpm" data-d="-1" aria-label="${L("Mese precedente", "Previous month")}">‹</button><b>${esc(mn)}</b><button data-a="dpm" data-d="1"${nextOk ? "" : " disabled"} aria-label="${L("Mese successivo", "Next month")}">›</button></div><div class="dpg">`;
    h += wd.map((w) => `<i>${esc(w)}</i>`).join("") + "<span></span>".repeat(lead);
    for (let d = 1; d <= days; d++) {
      const k = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      h += `<button data-a="dpd" data-k="${k}" class="${k === sel ? "on" : ""}${k === today ? " td" : ""}"${k > today ? " disabled" : ""}>${d}</button>`;
    }
    el.innerHTML = h + "</div>";
  }
  const pfCur = (it) => (quotes[it.s] && quotes[it.s].cur) || it.c || curGuess(it.s); // valuta del titolo
  const pfPc = (it) => it.pc || pfCur(it);                                             // valuta degli acquisti
  const baseCur = (c) => (c === "GBp" ? "GBP" : c);
  const unitK = (c) => (c === "GBp" ? 0.01 : 1); // i pence di Londra valgono 1/100 di sterlina
  const dayKey = (t) => (t != null ? new Date(t) : new Date()).toLocaleDateString("sv");
  const lotsOf = (it) => (Array.isArray(it.lots) && it.lots.length ? it.lots : [{ q: it.q, p: it.p, d: it.d || null }]);
  const withLots = (x, lots) => { const q = lots.reduce((a, l) => a + l.q, 0); return { ...x, lots, q, p: lots.reduce((a, l) => a + l.q * l.p, 0) / q }; };
  // cambio a→b del giorno (prev: alla chiusura precedente, per la variazione di oggi)
  function fx(a, b, prev) {
    if (!a || !b) return null;
    const k = unitK(a) / unitK(b), A = baseCur(a), B = baseCur(b);
    if (A === B) return k;
    const F = st.fxr, e = F && F.v === 2 && F.r && F.r[A + B], v = e && (prev ? e.p : e.r);
    return v > 0 ? v * k : null;
  }
  // cambio a→b nel giorno di un acquisto (chiusura storica di Yahoo); senza data o oggi: quello di oggi
  function fxOn(a, b, d) {
    if (!d || d >= dayKey()) return fx(a, b);
    const k = unitK(a) / unitK(b), A = baseCur(a), B = baseCur(b);
    if (A === B) return k;
    const h = st.fxh && st.fxh[A + B], v = h && h[d];
    return v > 0 ? v * k : null;
  }
  function pfCalc(it) {
    const q = quotes[it.s], ci = pfCur(it), pc = pfPc(it), B = st.pfcur || "EUR";
    const r = { c: ci, pc, price: q && q.price > 0 ? q.price : null, cost: it.q * it.p };
    if (r.price == null) return r;
    r.val = it.q * r.price; // valore, nella valuta del titolo
    // guadagno di oggi: la stessa variazione della capsula (a borsa chiusa, quella rispetto all'ultima chiusura)
    const dv = trendV(q);
    if (dv != null) { r.dp = dv; r.prevP = r.price / (1 + dv / 100); r.da = it.q * (r.price - r.prevP); }
    // risultato nella valuta in cui hai pagato: il valore si converte al cambio di oggi
    const k = fx(ci, pc);
    if (k != null) { r.tot = r.val * k; r.ta = r.tot - r.cost; r.tp = r.cost ? (r.ta / r.cost) * 100 : null; }
    // patrimonio, nella valuta scelta: oggi = valore adesso − valore alla chiusura di ieri (al cambio di ieri)
    const kb = fx(ci, B), kp = fx(ci, B, true);
    if (kb != null) { r.mval = r.val * kb; r.mprice = r.price * kb; if (r.prevP != null && kp != null) r.mda = r.mval - it.q * r.prevP * kp; }
    const kg = fx(pc, B);
    if (r.ta != null && kg != null) r.mpl = r.ta * kg; // risultato nella valuta del patrimonio (per ordinare)
    let mc = 0;
    for (const l of lotsOf(it)) { const kh = fxOn(pc, B, l.d); if (kh == null) { mc = null; break; } mc += l.q * l.p * kh; }
    r.mcost = mc;
    // rendimento nella valuta del portafoglio: valore al cambio di oggi meno costo al cambio del giorno di acquisto
    if (r.mval != null && mc != null) { r.mta = r.mval - mc; r.mtp = mc ? (r.mta / mc) * 100 : null; }
    return r;
  }
  // cambi di oggi: una volta al giorno (e quando entra una valuta nuova); quelli storici: una volta sola
  let fxBusy = false, fxFail = 0;
  function fxNeeds() {
    const B = st.pfcur || "EUR", cur = new Set(), hist = {}, today = dayKey();
    const add = (a, b) => { const A = baseCur(a), C = baseCur(b); if (A && C && A !== C) cur.add(A + C); };
    for (const it of st.pf) {
      const ci = pfCur(it), pc = pfPc(it), P = baseCur(pc) + baseCur(B);
      add(ci, pc); add(ci, B); add(pc, B);
      if (baseCur(pc) !== baseCur(B)) for (const l of lotsOf(it)) if (l.d && l.d < today) (hist[P] = hist[P] || new Set()).add(l.d);
    }
    if (pfForm && pfForm.s && pfForm.pcx) add(pfForm.pcx, B); // controvalore del titolo che stai aggiungendo
    return { cur: [...cur], hist };
  }
  const FX_RANGES = [["5d", 5], ["1mo", 31], ["3mo", 92], ["6mo", 183], ["1y", 366], ["2y", 731], ["5y", 1827], ["10y", 3653]];
  async function ensureFx() {
    if (fxBusy || Date.now() - fxFail < 10 * 60000) return;
    const { cur, hist } = fxNeeds(), today = dayKey();
    const F = st.fxr && st.fxr.v === 2 && st.fxr.d === today ? st.fxr : { v: 2, d: today, r: {} };
    const H = st.fxh || {};
    const missC = cur.filter((k) => !(F.r[k] && F.r[k].r > 0));
    const missH = Object.entries(hist).map(([k, ds]) => [k, [...ds].filter((d) => !(H[k] && H[k][d] > 0))]).filter(([, ds]) => ds.length);
    if (!missC.length && !missH.length) return;
    fxBusy = true;
    let fail = false;
    try {
      if (missC.length) {
        const syms = missC.map((k) => `${k}=X`);
        const res = (await chrome.runtime.sendMessage({ type: "quotes", symbols: syms })) || {};
        const r = { ...F.r };
        missC.forEach((k, i) => {
          const q = res[syms[i]];
          if (q && q.price > 0) r[k] = { r: q.price, p: q.change != null ? q.price / (1 + q.change / 100) : q.price };
          else fail = true;
        });
        st.fxr = { v: 2, d: today, at: Date.now(), r };
      }
      const h2 = { ...H };
      for (const [k, ds] of missH) {
        const old = ds.reduce((m, d) => (d < m ? d : m), ds[0]);
        const days = (Date.now() - new Date(`${old}T12:00:00`).getTime()) / 864e5 + 4;
        const range = (FX_RANGES.find(([, n]) => n >= days) || ["max"])[0];
        const res = await chrome.runtime.sendMessage({ type: "candles", sym: `${k}=X`, range, iv: "1d", exact: true });
        const bars = (res && res.bars) || [];
        if (!bars.length) { fail = true; continue; }
        const m = { ...(h2[k] || {}) };
        for (const d of ds) {
          // chiusura del giorno dell'acquisto, o dell'ultimo giorno di mercato prima (weekend, festivi)
          let v = null;
          for (const b of bars) { if (dayKey(b.t * 1000) <= d) v = b.c; else break; }
          m[d] = v != null ? v : bars[0].c;
        }
        h2[k] = m;
      }
      st.fxh = h2;
      if (fail) fxFail = Date.now();
      persist();
      if (st.tab === "pf") { pfOrder = null; drawList(); }
    } catch (_) { fxFail = Date.now(); }
    fxBusy = false;
  }
  function pfSorted() {
    const L = [...st.pf], s = st.psort;
    if (!PSORTS.includes(s) || s === "none") return L; // il tuo ordine
    if (s === "az" || s === "za") return L.sort((a, b) => (s === "az" ? 1 : -1) * a.n.localeCompare(b.n, LOC));
    // Valore: confronto nella valuta del patrimonio, così titoli in valute diverse si ordinano bene
    // Prezzo e Valore: confronto nella valuta del patrimonio (titoli in valute diverse)
    const k = { g: "mta", r: "mprice", v: "mval", q: "mcost", d: "mda" }[s[0]], dir = s[1] === "a" ? 1 : -1, raw = { mta: "ta", mprice: "price", mval: "val", mda: "da" };
    const v = (x) => { const r = pfCalc(x); const y = r[k] == null && raw[k] ? r[raw[k]] : r[k]; return y == null ? null : y; };
    return L.sort((a, b) => { const x = v(a), y = v(b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : (x - y) * dir; });
  }
  function pfOrdered() {
    if (!pfOrder) pfOrder = pfSorted().map((x) => x.s);
    const out = pfOrder.map((s) => st.pf.find((x) => x.s === s)).filter(Boolean);
    for (const x of st.pf) if (!pfOrder.includes(x.s)) out.push(x);
    return out;
  }
  const CHECKICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  const PLUSICON = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11"/></svg>';
  const PENSM = '<svg class="pen" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M10.8 2.6l2.6 2.6-7.9 7.9-3.2.6.6-3.2z"/></svg>';
  const PENICON = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M10.8 2.6l2.6 2.6-7.9 7.9-3.2.6.6-3.2z"/><path d="M9.3 4.1l2.6 2.6"/></svg>';
  const CANDLEICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4.5 2v2.5M4.5 10.5V14M11.5 2v3.5M11.5 11v3"/><rect x="2.75" y="4.5" width="3.5" height="6" rx=".6" fill="currentColor" fill-opacity=".35"/><rect x="9.75" y="5.5" width="3.5" height="5.5" rx=".6"/></svg>';
  // clic sulla riga di un titolo: grafico a candele "c" (il tasto accanto al nome apre l'andamento storico) oppure il contrario
  const rowM = () => (st.rowc === "l" ? "l" : "c"), MA = { c: "chart", l: "line" };
  function newsBtn(s, n) {
    const on = newsOn && cur === s, nw = newsBadge(s), t = nw ? L("Notizie nuove", "New stories") : L("Notizie", "News");
    return `<button class="lc nwc${on ? " on" : ""}${nw ? " nwn" : ""}" data-a="news" data-s="${esc(s)}" aria-label="${t} ${L("su", "about")} ${esc(n)}" aria-pressed="${on}" title="${t}">${NEWSICON}${nw ? '<b class="nwd"></b>' : ""}</button>`;
  }
  function modeBtn(s, n) {
    const m = rowM() === "c" ? "l" : "c", t = m === "l" ? L("Andamento storico", "Price history") : L("Grafico a candele", "Candlestick chart");
    return `<button class="lc${s === cur && mode === m && !newsOn ? " on" : ""}" data-a="${MA[m]}" data-s="${esc(s)}" aria-label="${t} ${L("di", "of")} ${esc(n)}" title="${t}">${m === "l" ? LINEICON : CANDLEICON}</button>`;
  }
  const LINEICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 12.2c1.3 0 2-1.4 2.9-2.7.8-1.2 1.4-1.8 2.2-1.2.9.7 1.4 1.8 2.6 1.4 1.3-.5 1.9-2.2 2.8-3.8.6-1 1.2-1.7 2.5-1.9"/></svg>';
  const GRIP = '<svg viewBox="0 0 8 14" width="7" height="12" fill="currentColor" aria-hidden="true"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>';
  // riquadro a destra: "p" prezzo e % di oggi, "q" quantità × PMC e investito, "v" valore e peso sul patrimonio
  const PFB = ["p", "d", "q", "v"], PFBCOL = { d: "d", p: "r", q: "q", v: "v" };
  const pfb = () => (PFB.includes(st.pfb) ? st.pfb : "d");
  function drawPf() {
    const th = $("#thead"), ed = pfEdit, grip = pfEdit && !findQ, bc = colDef("pf", PFBCOL[pfb()]); // cercando non si trascina (vedi solo una parte)
    th.classList.add("pthead"); th.classList.toggle("ed", ed);
    const sb = ([k, l, a, b]) => {
      const on = st.psort === a || st.psort === b, up = on && (st.psort === "az" || (st.psort !== "za" && st.psort[1] === "a"));
      return `<button class="th th-${k}${on ? " on" : ""}" data-a="pcolsort" data-c="${k}" aria-label="${L("Ordina per", "Sort by")} ${T(l)}" title="${L("Ordina per", "Sort by")} ${T(l)}">${T(l)}<i>${on ? (up ? "▲" : "▼") : "↕"}</i></button>`;
    };
    // in modifica l'ordine è quello che trascini: etichette ferme
    th.innerHTML = ed
      ? `<span></span><span class="th th-n">${T("Titolo")}</span><span class="th th-r">${T("Rendimento")}</span><span class="th th-b">${T(bc[1])}</span><span></span>`
      : `<span class="pth1">${sb(PCOLS[0])}</span><span></span><span class="pthr">${sb(colDef("pf", "g"))}</span><span class="pthb">${sb(bc)}</span>`;
    $(".side").classList.toggle("nmc", !nmCfg().sub);
    let R = pfOrdered();
    if (findQ) { const f = findQ.toLowerCase(); R = R.filter((x) => [x.n, x.s, x.t].some((v) => v && String(v).toLowerCase().includes(f))); }
    $("#list").innerHTML = R.length
      ? R.map((it) => {
          const s = esc(it.s), pc = pfPc(it), sym = curSym(pc), n = lotsOf(it).length;
          // quantità × PMC (prezzo medio di carico): nel riquadro a destra
          const pmc = it.p >= 1000 ? Math.round(it.p).toLocaleString(NLOC, { useGrouping: "always" }) : fmt(it.p);
          // rendimento (guadagno o perdita e %) sotto al nome
          const rend = `<span class="prd"><b data-ps="${s}" data-pf="ta"></b><small class="ch" data-ps="${s}" data-pf="tp"></small></span>`;
          const [pcl, ptx] = pct(quotes[it.s]);
          const box = `<button class="pbx" data-a="pfbox" data-ps="${s}" aria-label="${L("Cambia: prezzo, guadagno di oggi, quantità × PMC, valore", "Switch: price, today's gain, quantity × average cost, value")}" title="${L("Clic: prezzo · guadagno di oggi · quantità × PMC · valore", "Click: price · today's gain · quantity × average cost · value")}">`
            + `<span class="bm bm-d"><span class="lp"><span class="lpr"><b data-ps="${s}" data-pf="da"></b></span><small class="ch ${pcl}" data-k="${s}" data-f="c">${ptx}</small></span></span>`
            + `<span class="bm bm-p"><span class="lp"><span class="lpr"><span class="pr" data-k="${s}" data-f="p">${val(quotes[it.s])}</span>${curTag(it.s)}</span><small class="ch ${pcl}" data-k="${s}" data-f="c">${ptx}</small></span></span>`
            + `<span class="bm bm-q"><span class="pbl">${fqty(it.q)}\u2009×\u2009${pmc} ${sym}</span><small data-ps="${s}" data-pf="inv"></small></span>`
            + `<span class="bm bm-v"><span class="pbl"><b data-ps="${s}" data-pf="v"></b></span><small data-ps="${s}" data-pf="w"></small></span></button>`;
          const tip = `${it.t && it.t !== it.n ? it.t + " · " : ""}${it.s} — ${L(`${fqty(it.q)} acquistati a ${fmt(it.p)} ${sym} (costo ${money(it.q * it.p, pc)})`, `${fqty(it.q)} bought at ${fmt(it.p)} ${sym} (cost ${money(it.q * it.p, pc)})`)}${n > 1 ? L(` · ${n} acquisti, prezzo medio`, ` · ${n} purchases, average price`) : ""}${pfEdit ? L(" · clic per modificare", " · click to edit") : ""}`;
          return `<div class="row prow${ed ? " ed" : ""}${it.s === cur && mode === rowM() ? " sel" : ""}" tabindex="0" role="button" data-a="${pfEdit ? "pfmod" : MA[rowM()]}" data-s="${s}" data-ps="${s}" title="${esc(tip)}">${
            ed ? (grip ? `<span class="ph" aria-label="${L("Trascina per spostare", "Drag to move")} ${esc(it.n)}" title="${L("Trascina per spostare", "Drag to move")}">${GRIP}</span>` : "<span></span>") : ""}<span class="pn">${nameCell(it.s, it.n, it.t, dlyTag(it.s))}</span>${pfEdit ? "" : `<span class="pic">${modeBtn(it.s, it.n)}${newsBtn(it.s, it.n)}</span>`}${rend}${box}${
            pfEdit ? `<button class="x${pfArm === it.s ? " arm" : ""}" data-a="pfrm" data-s="${s}" aria-label="${L("Rimuovi", "Remove")} ${esc(it.n)}" title="${pfArm === it.s ? L("Clicca di nuovo per rimuovere", "Click again to remove") : L("Rimuovi dal portafoglio", "Remove from portfolio")}">${pfArm === it.s ? L("Rimuovi", "Remove") : XSM}</button>` : ""}</div>`;
        }).join("")
      : findQ ? `<div class="empty">${L(`Nessun titolo del portafoglio corrisponde a “${esc(findQ)}”.`, `No holding matches “${esc(findQ)}”.`)}</div>`
        : `<div class="empty">${L("Portafoglio vuoto. Premi <b>+</b> per aggiungere un titolo con quantità e prezzo di acquisto.", "Your portfolio is empty. Press <b>+</b> to add a holding with quantity and purchase price.")}</div>`;
    $("#list").dataset.pfb = pfb();
    pwKey = ""; paintPf();
  }
  // patrimonio nella valuta scelta (tutto o niente: con un cambio mancante il totale sarebbe sbagliato)
  function pfSumHTML() {
    if (!st.pf.length) return `<span class="pfempty">${L("Il tuo patrimonio", "Your holdings")}</span>`;
    const B = st.pfcur || "EUR";
    let V = 0, C = 0, DA = 0, PV = 0, miss = 0, dOk = true;
    for (const it of st.pf) {
      const r = pfCalc(it);
      if (r.price == null) { miss++; continue; }
      if (r.mval == null || r.mcost == null) { miss++; continue; }
      V += r.mval; C += r.mcost;
      if (r.mda != null) { DA += r.mda; PV += r.mval - r.mda; } else dOk = false;
    }
    if (miss) return `<div class="pfs"><b>…</b></div><div class="pfs2">${L("Prezzi e cambi in arrivo…", "Loading prices and exchange rates…")}</div>`;
    const cl = (v) => (v > 0.004 ? "up" : v < -0.004 ? "dn" : "");
    const dp = dOk && PV ? (DA / PV) * 100 : null, tp = C ? ((V - C) / C) * 100 : null;
    return `<div class="pfs3"><b>${money(V, B)}</b><div class="pfsd">`
      // oggi: la % in una capsula come nelle righe, l'importo tenue; totale: tutto in grassetto, senza capsula
      + (dp != null ? `<span>${L("Oggi", "Today")}</span><i class="pfp ${cl(dp)}">${pctTxt(dp)}</i><i class="pfa">${smoney(DA, B)}</i>` : "")
      + (tp != null ? `<span>${L("Totale", "Total")}</span><i class="pft ${cl(tp)}">${pctTxt(tp)}</i><i class="pft ${cl(tp)}">${smoney(V - C, B)}</i>` : "") + "</div></div>";
  }
  // peso di ogni titolo sul patrimonio (nella valuta del patrimonio; con un cambio mancante niente pesi)
  function pfWeights() {
    const out = {}; let V = 0;
    for (const it of st.pf) { const r = pfCalc(it); if (r.mval == null) return null; out[it.s] = r.mval; V += r.mval; }
    if (!(V > 0)) return null;
    for (const k in out) out[k] = (out[k] / V) * 100;
    return out;
  }
  let pfLast = 0, pfTmr = 0;
  function paintPfSoon() {
    const w = 500 - (Date.now() - pfLast); // prezzi del portafoglio: al massimo ogni mezzo secondo
    if (w <= 0) { pfLast = Date.now(); paintPf(); }
    else if (!pfTmr) pfTmr = setTimeout(() => { pfTmr = 0; pfLast = Date.now(); paintPf(); }, w);
  }
  function paintPf() {
    if (st.tab !== "pf") return;
    const W = pfWeights(), B = st.pfcur || "EUR";
    root.querySelectorAll("[data-pf]").forEach((el) => {
      const it = st.pf.find((x) => x.s === el.dataset.ps);
      if (!it) return;
      const r = pfCalc(it), k = el.dataset.pf;
      let t = "", v = null;
      if (k === "v") t = r.mval != null ? money(r.mval, B) : r.tot != null ? money(r.tot, r.pc) : r.val != null ? money(r.val, r.c) : r.price === null ? "n/d" : "…";
      else if (k === "inv") t = `${L("inv.", "inv.")} ${r.mcost != null ? money(r.mcost, B) : money(r.cost, r.pc)}`;
      else if (k === "dp") { v = r.dp; t = v == null ? "–" : Math.abs(v) < 0.005 ? PCT0() : pctTxt(v); }
      else if (k === "tp") { v = r.mtp != null ? r.mtp : r.tp; t = v == null ? "" : Math.abs(v) < 0.005 ? PCT0() : pctTxt(v); }
      else if (k === "ta") { const m = r.mta != null; v = m ? r.mta : r.ta; t = v == null ? (r.price != null ? "…" : "–") : smoney(v, m ? B : r.pc); } // nella valuta del portafoglio
      else if (k === "da") { const m = r.mda != null; v = m ? r.mda : r.da; t = v == null ? (r.price != null ? "…" : "–") : smoney(v, m ? B : r.c); } // guadagno o perdita di oggi, nella valuta del portafoglio
      else if (k === "dq") { v = r.dp; t = v == null ? "" : Math.abs(v) < 0.005 ? PCT0() : pctTxt(v); }
      else if (k === "w") t = W && W[it.s] != null ? `${L("peso", "weight")} ${(W[it.s] >= 99.995 ? 100 : W[it.s]).toLocaleString(NLOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : ""; // peso sul patrimonio
      if (el.textContent !== t) el.textContent = t;
      const eps = k === "dp" || k === "tp" || k === "dq" ? 0.005 : 0.0001; // sotto lo 0,005% è "0.00%": senza colore
      const [U, D] = k === "dp" ? ["yu", "yd"] : ["up", "dn"]; // % di oggi con i colori tenui di "% Ieri"
      el.classList.toggle(U, v != null && v >= eps);
      el.classList.toggle(D, v != null && v <= -eps);
    });
    pfWidths();
    const sum = $("#pfsum");
    if (sum) { const h = pfSumHTML(); if (sum.dataset.h !== h) { sum.dataset.h = h; sum.innerHTML = h; } }
    // prezzo di acquisto proposto: quello attuale, se paghi nella valuta del titolo e finché non lo scrivi tu
    const px = $("#pfpx"), f = pfForm;
    // la valuta del titolo arriva con il primo prezzo
    if (f && f.s && f.pcFree && quotes[f.s] && quotes[f.s].cur && quotes[f.s].cur !== f.pcx) { f.pcx = quotes[f.s].cur; const cy = $("#pfcy"); if (cy) cy.textContent = curSym(f.pcx); ensureFx(); }
    if (px && f && f.s && !f.pxSet && !px.value && quotes[f.s] && quotes[f.s].price > 0 && f.pcx === ((quotes[f.s] && quotes[f.s].cur) || f.c || curGuess(f.s))) {
      const p = quotes[f.s].price;
      px.value = p.toLocaleString(NLOC, { useGrouping: false, maximumFractionDigits: dec(p) });
    }
    pfCv();
  }
  // larghezza di ogni colonna del portafoglio: il testo più lungo (in modifica senza le righe piccole)
  function pfWidths() {
    const side = $(".side"), row = $("#list .prow");
    if (!row) { // portafoglio vuoto: colonne di larghezza fissa, le etichette non si sovrappongono
      const key = `empty|${pfEdit}`;
      if (pwKey !== key) { pwKey = key; side.style.setProperty("--pgrid", pfEdit ? "9px minmax(0,1fr) 96px 13px" : "minmax(0,1fr) 20px 96px 96px"); }
      return;
    }
    const font = new Map(), f = (el) => font.get(el.className + el.tagName) || (font.set(el.className + el.tagName, fontOf(el)), font.get(el.className + el.tagName));
    let m = 40, rw = 34;
    const lineW = (el) => { let w = 0; for (const c of el.children.length ? el.children : [el]) w += tw(c.textContent, f(c)) + (c !== el.lastElementChild && el.children.length ? 3 : 0); return w; };
    root.querySelectorAll("#list .prow>.prd>*").forEach((el) => { const w = tw(el.textContent, f(el)); rw = Math.max(rw, el.matches("small.ch") ? Math.max(46, w + 12) : w); }); // la % del rendimento è una capsula
    root.querySelectorAll("#list .pbx .bm").forEach((bm) => {
      for (const el of bm.children) {
        let w = 0;
        if (el.classList.contains("lp")) { const pr = el.querySelector(".lpr"), ch = el.querySelector("small.ch"); w = Math.max(pr ? lineW(pr) : 0, ch ? Math.max(58, tw(ch.textContent, f(ch)) + 12) : 0); }
        else if (el.classList.contains("pbl")) w = lineW(el);
        else if (el.classList.contains("ppl")) { const sm = el.querySelector("small"), dl = el.querySelector(".dly"); w = (sm ? tw(sm.textContent, f(sm)) : 0) + (dl && !dl.hidden ? 15 : 0); }
        else w = tw(el.textContent, f(el));
        m = Math.max(m, w);
      }
    });
    const bw = Math.ceil(Math.min(160, m + 14)), rwc = Math.ceil(Math.min(120, rw + 2)), key = `${pfEdit}|${bw}|${rwc}`;
    if (key === pwKey) return;
    pwKey = key;
    // in modifica il rendimento si nasconde: il nome resta leggibile accanto a maniglia e ×
    side.style.setProperty("--pgrid", pfEdit ? `9px minmax(0,1fr) ${bw}px 13px` : `minmax(0,1fr) 20px ${rwc}px ${bw}px`);
    side.style.setProperty("--pgrid-arm", `9px minmax(0,1fr) ${bw}px auto`);
  }
  // modulo per aggiungere o correggere un titolo (lo ridisegno solo quando cambia, così non perdi ciò che scrivi)
  function drawPformVis() {
    $("#pform").hidden = !(pfForm && st.tab === "pf");
    const b = $("#tbt [data-a=pfadd]");
    if (b) b.classList.toggle("on", !!(pfForm && pfForm.mode === "add" && st.tab === "pf")); // + acceso finché il modulo è aperto
  }
  function renderPform(focus) {
    const el = $("#pform"), f = pfForm;
    drawPformVis();
    if (!f || st.tab !== "pf") { el.innerHTML = ""; return; }
    const head = `<div class="pfh"><span>${f.mode === "edit" ? L("Modifica l'acquisto", "Edit purchase") : L("Aggiungi al portafoglio", "Add to portfolio")}</span><button class="pill" data-a="pfcancel">${L("Annulla", "Cancel")}</button></div>`;
    const btns = (ok) => (ok ? `<div class="pfbtn"><button class="pill pri" data-a="pfsave">${f.mode === "edit" ? L("Salva", "Save") : L("Aggiungi", "Add")}</button></div>` : "");
    if (!f.s) {
      el.innerHTML = `${head}<input id="pfq" placeholder="${L("Cerca il titolo (es. AAPL, ENI.MI)", "Search for a ticker (e.g. AAPL, ENI.MI)")}" autocomplete="off" spellcheck="false" aria-label="${L("Cerca il titolo da aggiungere", "Search for the ticker to add")}" value="${esc(f.qtext || "")}"><div id="pfres"></div>${btns(false)}`;
      drawPfRes();
      if (focus !== false) $("#pfq").focus();
      return;
    }
    const o = f.mode === "add" && st.pf.find((x) => x.s === f.s), ci = (quotes[f.s] && quotes[f.s].cur) || f.c || curGuess(f.s);
    // il prezzo di acquisto è nella valuta in cui il titolo è quotato (per i titoli già in portafoglio resta la loro)
    const pc = o ? pfPc(o) : f.pc0 || ci;
    f.pcx = pc; f.pcFree = !o && !f.pc0;
    const lots = f.mode === "edit" ? lotsOf(st.pf.find((x) => x.s === f.s) || {}) : [];
    const today = dayKey(), d0 = f.mode === "edit" ? f.d0 || "" : today;
    const note = o ? L(`Hai già ${fqty(o.q)} a ${fmt(o.p)} ${esc(curSym(pc))}: è un nuovo acquisto, la quantità si somma e il prezzo diventa la media ponderata.`, `You already hold ${fqty(o.q)} at ${fmt(o.p)} ${esc(curSym(pc))}: this is a new purchase, quantities add up and the price becomes the weighted average.`)
      : lots.length > 1 ? L(`${lots.length} acquisti: salvando diventano uno solo, al prezzo medio e alla data indicata.`, `${lots.length} purchases: saving merges them into one, at the average price and the date shown.`) : "";
    el.innerHTML = `${head}<div class="pft"><b>${esc(f.n)}</b><span>${esc(f.t && f.t !== f.n ? f.t + " · " : "")}${esc(f.s)}</span>${f.mode === "add" ? `<button class="pill pri pfchg" data-a="pfchg">${L("Cambia", "Change")}</button>` : ""}</div>
      <div class="pfr"><div class="pfl"><span>${L("Quantità", "Quantity")}</span><input id="pfqty" inputmode="decimal" autocomplete="off" placeholder="${L("es. 10", "e.g. 10")}" value="${f.q0 != null ? esc(f.q0.toLocaleString(NLOC, { useGrouping: false, maximumFractionDigits: 6 })) : ""}"></div>
      <div class="pfl"><span>${L("Data di acquisto", "Purchase date")}</span><span class="dpk"><input id="pfdate" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="${dPh()}" aria-label="${L("Data di acquisto", "Purchase date")}" value="${esc(d0 ? dShow(d0) : "")}"><button class="dpb" data-a="dpk" aria-label="${L("Scegli il giorno", "Pick the day")}" title="${L("Scegli il giorno", "Pick the day")}">${CALSM}</button></span></div></div>
      <div class="dpop" id="dpop" hidden></div>
      <div class="pfpl"><span>${L("Prezzo di acquisto", "Purchase price")}</span><span class="pfin"><input id="pfpx" inputmode="decimal" autocomplete="off" value="${f.p0 != null ? esc(f.p0.toLocaleString(NLOC, { useGrouping: false, maximumFractionDigits: 6 })) : ""}"><em id="pfcy">${esc(curSym(pc))}</em></span></div>
      <div class="pfcv" id="pfcv" hidden></div><p class="pfnote">${note}</p><p class="pfnote err" id="pfmsg"></p>${btns(true)}`;
    dpk = null;
    paintPf();
    if (focus !== false) { const q = $("#pfqty"); q.focus(); q.select(); }
  }
  // controvalore: quantità × prezzo di acquisto (o, finché manca, × prezzo attuale)
  function pfCv() {
    const el = $("#pfcv"), f = pfForm;
    if (!el || !f || !f.s) return;
    const q = parseDec(($("#pfqty") || {}).value || ""), p = parseDec(($("#pfpx") || {}).value || ""), c = f.pcx || (quotes[f.s] && quotes[f.s].cur) || f.c || curGuess(f.s);
    const live = quotes[f.s] && quotes[f.s].price > 0 ? quotes[f.s].price : null;
    const px = p > 0 ? p : live;
    el.hidden = !(q > 0 && px > 0);
    if (el.hidden) return;
    // controvalore nella valuta del portafoglio (al cambio del giorno di acquisto, se lo conosco, altrimenti di oggi)
    const B = st.pfcur || "EUR", d = parseDay(($("#pfdate") || {}).value || ""), k = baseCur(c) === baseCur(B) ? unitK(c) / unitK(B) : fxOn(c, B, d) ?? fx(c, B);
    const tot = k != null ? money(q * px * k, B) : `${fmt(q * px)} ${esc(curSym(c))}`;
    const h = `<span>${L("Controvalore", "Total value")}</span><b>${tot}</b><em>${fqty(q)} × ${fmt(px)} ${esc(curSym(c))}${p > 0 ? "" : ` · ${L("al prezzo attuale", "at the current price")}`}</em>`;
    if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; }
  }
  function drawPfRes() {
    const r = $("#pfres");
    if (!r) return;
    const t = (pfForm && pfForm.qtext || "").trim();
    r.innerHTML = pfRes.length
      ? pfRes.map((x, i) => `<button class="res" data-a="pfpick" data-i="${i}"><b>${esc(x.symbol)}</b><span>${esc(x.name)}</span><em>${esc(x.exch)}</em></button>`).join("")
      : t.length >= 2 && pfForm.qdone === t ? `<div class="empty">${L("Nessun titolo trovato", "No ticker found")}</div>` : "";
  }
  function pfOpen(f) {
    pfForm = f; pfArm = null;
    renderPform(); pushSubs();
    if (f && f.s) { fullAt = 0; refresh(); ensureFx(); }
  }
  function pfPick(x) {
    pfOpen({ mode: "add", s: x.symbol, n: niceName(x.symbol, x.name, x.type), t: x.name, c: curGuess(x.symbol) });
  }
  function pfSave() {
    const f = pfForm;
    if (!f || !f.s) return;
    const q = parseDec($("#pfqty").value), p = parseDec($("#pfpx").value), m = $("#pfmsg"), dt = $("#pfdate").value.trim();
    const d = dt ? parseDay(dt) : f.mode === "edit" ? null : dayKey(), pc = f.pcx || (quotes[f.s] && quotes[f.s].cur) || f.c || curGuess(f.s);
    if (!(q > 0)) { m.textContent = L("Inserisci una quantità valida", "Enter a valid quantity"); return $("#pfqty").focus(); }
    if (!(p > 0)) { m.textContent = L("Inserisci il prezzo di acquisto: un numero maggiore di zero.", "Enter the purchase price: a number greater than zero."); return $("#pfpx").focus(); }
    if (dt && !d) { m.textContent = L(`Data non valida: scrivila come ${dPh()} o sceglila dal calendario.`, `Invalid date: type it as ${dPh()} or pick it from the calendar.`); return $("#pfdate").focus(); }
    if (d && d > dayKey()) { m.textContent = L("La data di acquisto non può essere nel futuro.", "The purchase date can't be in the future."); return $("#pfdate").focus(); }
    const c = (quotes[f.s] && quotes[f.s].cur) || f.c || curGuess(f.s);
    const o = st.pf.find((x) => x.s === f.s), lot = { q, p, d };
    if (f.mode === "edit") st.pf = st.pf.map((x) => (x.s === f.s ? withLots(x, [lot]) : x));
    else if (o) st.pf = st.pf.map((x) => (x.s === f.s ? withLots(x, [...lotsOf(x), lot]) : x));
    else {
      if (st.pf.length >= MAX_PF) { m.textContent = L(`Il portafoglio può contenere al massimo ${MAX_PF} titoli.`, `The portfolio can hold at most ${MAX_PF} tickers.`); return; }
      st.pf = [...st.pf, withLots({ s: f.s, n: f.n, ...(f.t ? { t: f.t } : {}), ...(c ? { c } : {}), pc }, [lot])];
    }
    pfForm = null; pfOrder = null;
    save(); renderPform(); ensureFx();
  }
  // trascinamento dei titoli (modalità modifica)
  root.addEventListener("pointerdown", (e) => {
    const h = e.button === 0 && e.composedPath()[0].closest && e.composedPath()[0].closest(".ph");
    if (!h) return;
    const row = h.closest(".row"), rows = [...$("#list").querySelectorAll(row.classList.contains("prow") ? ".prow" : ".row")], i = rows.indexOf(row);
    e.preventDefault(); e.stopPropagation();
    const rects = rows.map((r) => r.getBoundingClientRect());
    const gap = rows.length > 1 ? rects[1].top - rects[0].bottom : 0;
    const sb = $("#sbody");
    pdrag = { id: e.pointerId, row, rows, rects, i, j: i, y0: e.clientY, y: e.clientY, sc0: sb.scrollTop, step: rects[i].height + gap };
    row.classList.add("drag");
    rows.forEach((r) => r !== row && r.classList.add("shift"));
    h.setPointerCapture(e.pointerId);
    pdScroll();
  }, true);
  // vicino al bordo alto o basso della parte visibile l'elenco scorre da solo (più veloce più sei vicino)
  function pdScroll() {
    const d = pdrag;
    if (!d) return;
    const sb = $("#sbody"), r = sb.getBoundingClientRect(), z = 44;
    let v = 0;
    if (d.y > r.bottom - z) v = Math.min(1, (d.y - (r.bottom - z)) / z);
    else if (d.y < r.top + z) v = -Math.min(1, (r.top + z - d.y) / z);
    if (v) { const t0 = sb.scrollTop; sb.scrollTop += v * 14; if (sb.scrollTop !== t0) pdMove(d); }
    requestAnimationFrame(pdScroll);
  }
  root.addEventListener("pointermove", (e) => {
    const d = pdrag;
    if (!d || e.pointerId !== d.id) return;
    d.y = e.clientY;
    pdMove(d);
  }, true);
  function pdMove(d) {
    const n = d.rows.length, R0 = d.rects, sc = $("#sbody").scrollTop - d.sc0; // anche lo scorrimento sposta la riga
    // la riga segue il mouse, senza uscire dall'elenco
    const dy = Math.max(R0[0].top - R0[d.i].top, Math.min(R0[n - 1].bottom - R0[d.i].bottom, d.y - d.y0 + sc));
    d.row.style.transform = `translateY(${dy}px)`;
    // scambio appena il bordo che avanza supera la metà della riga vicina
    const a0 = R0[d.i].top + dy, a1 = R0[d.i].bottom + dy;
    let j = d.i;
    while (j > 0 && a0 < R0[j - 1].top + R0[j - 1].height / 2) j--;
    while (j < n - 1 && a1 > R0[j + 1].top + R0[j + 1].height / 2) j++;
    if (j === d.j) return;
    d.j = j;
    // le altre righe si spostano per farle posto
    d.rows.forEach((r, k) => {
      if (k === d.i) return;
      const t = j < d.i && k >= j && k < d.i ? d.step : j > d.i && k > d.i && k <= j ? -d.step : 0;
      r.style.transform = t ? `translateY(${t}px)` : "";
    });
  }
  const pdragEnd = (e) => {
    const d = pdrag;
    if (!d || e.pointerId !== d.id) return;
    pdrag = null;
    if (d.j === d.i) { // rilasciata dov'era: torna al suo posto
      d.row.classList.add("shift"); d.row.style.transform = "";
      setTimeout(() => { d.rows.forEach((r) => { r.classList.remove("drag", "shift"); r.style.transform = ""; }); }, 160);
      return;
    }
    // si appoggia nel posto nuovo, poi salvo l'ordine
    d.row.classList.add("shift");
    d.row.style.transform = `translateY(${(d.j - d.i) * d.step}px)`;
    const isPf = d.row.classList.contains("prow"), ord = d.rows.map((r) => (isPf ? r.dataset.ps : r.dataset.is)), [m] = ord.splice(d.i, 1);
    ord.splice(d.j, 0, m);
    if (isPf) {
      st.pf = ord.map((s) => st.pf.find((x) => x.s === s)).filter(Boolean).concat(st.pf.filter((x) => !ord.includes(x.s)));
      st.psort = "none"; pfOrder = null; // ordine scelto a mano
    } else {
      const L0 = items();
      curList().items = ord.map((s) => L0.find((x) => x.s === s)).filter(Boolean).concat(L0.filter((x) => !ord.includes(x.s)));
      st.sort = "none"; listOrder = null;
    }
    persist();
    setTimeout(() => drawList(), 160);
  };
  root.addEventListener("pointerup", pdragEnd, true);
  root.addEventListener("pointercancel", pdragEnd, true);

  // risultati online della casella "Cerca…": clic sulla riga apre il grafico (come nella lista), accanto al
  // ticker il tasto dell'altro grafico, "+ Aggiungi" lo mette in lista; la × in alto chiude la ricerca
  const fhd = (t) => `<div class="fhd"><span>${t}</span><button class="fx" data-a="findclose" aria-label="${L("Chiudi la ricerca", "Close search")}" title="${L("Chiudi la ricerca", "Close search")}">${XSM}</button></div>`;
  const resRow = (x, a, dis, tt) => `<div class="res" role="button" tabindex="0" data-a="${MA[rowM()]}" data-s="${esc(x.symbol)}" data-rn="${esc(x.name || "")}" title="${esc(x.name || x.symbol)}"><b>${esc(x.symbol)}</b><span>${esc(x.name)}</span>${modeBtn(x.symbol, x.symbol)}${newsBtn(x.symbol, x.name || x.symbol)}<em>${esc(x.exch)}</em><button class="radd" data-a="${a}" data-sym="${esc(x.symbol)}"${dis ? " disabled" : ""} title="${esc(tt)}">+ ${L("Aggiungi", "Add")}</button></div>`;
  function drawRes() {
    const el = $("#fres");
    if (!findQ || findQ.length < 2 || resQ !== findQ) { el.innerHTML = ""; return; }
    if (st.tab === "pf") {
      const R = results.slice(0, 6);
      el.innerHTML = R.length
        ? fhd("AGGIUNGI AL PORTAFOGLIO") + R.map((x) => resRow(x, "pfadd2", false, L(`Aggiungi ${x.name} al portafoglio`, `Add ${x.name} to the portfolio`))).join("")
        : fhd("NESSUN TITOLO TROVATO ONLINE");
      return;
    }
    const have = new Set(items().map((x) => x.s));
    const R = results.filter((x) => !have.has(x.symbol)).slice(0, 6);
    const full = items().length >= MAX;
    el.innerHTML = R.length
      ? fhd(full ? `LISTA PIENA (${MAX} TICKER)` : "AGGIUNGI ALLA LISTA") + R.map((x) => resRow(x, "add", full, L(`Aggiungi ${x.name}`, `Add ${x.name}`))).join("")
      : results.length ? "" : fhd("NESSUN TICKER TROVATO ONLINE");
  }
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform);
  function comboLabel(k) {
    if (!k) return "Nessuna";
    const mods = MAC
      ? [k.ctrl && "⌃", k.alt && "⌥", k.shift && "⇧", k.meta && "⌘"].filter(Boolean).join("")
      : [k.ctrl && "Ctrl", k.alt && "Alt", k.shift && "Shift", k.meta && "Win"].filter(Boolean).join("+");
    return MAC ? mods + k.key : mods ? `${mods}+${k.key}` : k.key;
  }
  function drawExcl() {
    const L = st.excl || [];
    $("#exlist").innerHTML = L.length
      ? L.map((d) => `<span>${esc(d)}<button data-a="exclrm" data-d="${esc(d)}" aria-label="Riattiva su ${esc(d)}" title="Riattiva">×</button></span>`).join("")
      : '<p class="hint">Nessun sito escluso.</p>';
  }
  function drawNmSet() {
    const c = nmCfg(), ex = { s: "AAPL", n: "AAPL", t: "Apple Inc." }; // esempio fisso: Apple
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-a="nmset" data-nk="${k}" data-v="${v}" class="${String(c[k]) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
    $("#nmset").innerHTML = `<div class="nmpv" aria-hidden="true">${nameCell(ex.s, ex.n, ex.t, "")}</div>`
      + `<div class="nmgrid"><span>${L("Logo", "Logo")}</span>${seg("lg", [["l", L("Sì", "Yes")], ["off", "No"]])}</div>`;
  }
  function drawSettings() {
    drawExcl();
    const ts = $("#txtlist"), keep = ts.value || st.cl;
    ts.innerHTML = st.lists.map((l) => `<option value="${esc(l.id)}">${esc(l.name)} (${l.items.length})</option>`).join("");
    ts.value = st.lists.some((l) => l.id === keep) ? keep : st.cl;
    $("#tzsel").innerHTML = TZS.map(([z, l]) => `<option value="${z}"${tzOf()[0] === z ? " selected" : ""}>${esc(l)}</option>`).join("");
    $("#evseg").innerHTML = [[true, "Su ogni pagina"], [false, "Solo col clic"]].map(([v, l]) => `<button data-a="every" data-v="${v}" class="${EVERY === v ? "on" : ""}">${l}</button>`).join("");
    $("#evhint").textContent = evAsk && !EVERY ? "Conferma nella scheda di Owlook che si è appena aperta."
      : EVERY ? "Owlook disegna solo il widget: non legge le pagine e non raccoglie dati."
      : "Il widget compare solo nella scheda in cui clicchi l'icona di Owlook o usi la scorciatoia, finché non cambi pagina.";
    $("#futseg").innerHTML = [[true, "Sì"], [false, "No"]].map(([v, l]) => `<button data-a="futmode" data-v="${v}" class="${futOn() === v ? "on" : ""}">${l}</button>`).join("");
    $("#langlbl").textContent = L("Lingua", "Language");
    $("#nflbl").textContent = L("Formato dei numeri", "Number format");
    $("#nfseg").innerHTML = [["it", "1.234,56"], ["en", "1,234.56"]].map(([v, l]) => `<button data-a="nfset" data-v="${v}" class="${NLOC.startsWith(v) ? "on" : ""}">${l}</button>`).join("");
    $("#langseg").innerHTML = [["it", "Italiano"], ["en", "English"]].map(([v, l]) => `<button data-a="lang" data-v="${v}" class="${st.lang === v ? "on" : ""}" lang="${v}">${l}</button>`).join("");
    drawNmSet();
    applyGlass();
    $("#rowcseg").innerHTML = [["c", L("Grafico a candele", "Candlestick chart")], ["l", L("Andamento storico", "Price history")]].map(([v, l]) => `<button data-a="rowc" data-v="${v}" class="${rowM() === v ? "on" : ""}">${l}</button>`).join("");
    $("#colrow").innerHTML = [["up", L("Rialzo", "Up")], ["dn", L("Ribasso", "Down")]]
      .map(([k, l]) => `<span class="colit">${sw(k, getColor(k), `${L("Colore", "Color")}: ${l}`)}${l}</span>`).join("")
      + `<button class="pill rst" data-a="creset" title="${L("Rimetti i colori predefiniti di rialzo e ribasso", "Restore the default up and down colors")}">Reset</button>`;
    $("#themes").innerHTML = THEMES.map(([k, l]) => `<button data-a="theme" data-t="${k}" class="${st.theme === k ? "on" : ""}">${l}</button>`).join("");
    const kb = $("#kbtn");
    kb.textContent = rec ? "Premi i tasti…" : comboLabel(st.key);
    kb.classList.toggle("rec", rec);
    $("#khint").textContent = rec
      ? "Premi la combinazione che vuoi usare (Esc per annullare)."
      : st.key && !st.key.alt && !st.key.ctrl && !st.key.meta
        ? "Senza Ctrl, Alt o Cmd la scorciatoia non funziona mentre scrivi in un campo di testo."
        : "Premi la stessa combinazione per richiudere, oppure Esc.";
    chrome.runtime.sendMessage({ type: "cmdkey" }).then((c) => {
      $("#cmdhint").hidden = !!c;
      $("#cmdhint").innerHTML = c
        ? ""
        : `Puoi aggiungere anche una scorciatoia di Chrome, attiva pure fuori dalla pagina. <button class="link" data-a="cmdedit">Imposta</button>`;
    }, () => {});
  }

  const ivNow = () => st.ci;
  function drawTools() {
    const I = st.ind;
    $("#chart").classList.toggle("lmode", mode === "l");
    $("#tbar").innerHTML = mode === "l"
      ? `<div class="seg" id="ranges">${RANGES.map(([k, l]) => `<button data-a="range" data-r="${k}" class="${st.lr === k && !lrFree ? "on" : ""}">${l}</button>`).join("")}</div>`
        + `<button class="tb rgdd${lrFree ? " free" : ""}" data-a="rgmenu" aria-label="${L("Periodo", "Period")}" title="${L("Periodo", "Period")}">${(RANGES.find((x) => x[0] === st.lr) || RANGES[0])[1]}<i>▼</i></button>`
      : `<button class="tb" data-a="ivmenu" aria-label="Intervallo delle candele" title="Intervallo delle candele">${(IVS.find((x) => x[0] === ivNow()) || IVS[1])[1]}<i>▼</i></button>
         <button class="tb" data-a="fxmenu" aria-label="Indicatori" title="Aggiungi indicatori">ƒx<i>▼</i></button>
         <button class="tb" data-a="ctmenu" aria-label="Tipo di grafico e colori" title="Tipo di grafico e colori">${CT_ICON[I.ct] || CT_ICON.candles}<i>▼</i></button>
         <button class="tb" data-a="tplmenu" aria-label="${L("Impostazioni salvate del grafico", "Saved chart setups")}" title="${L("Salva o riapri un'impostazione del grafico (indicatori, colori, tipo e intervallo)", "Save or reopen a chart setup (indicators, colors, type and interval)")}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg><i>▼</i></button>`;
  }
  const sw = (k, c, label) => `<button class="sw" data-a="color" data-ic="${k}" style="background:${c}" aria-label="${label}" title="${label}"></button>`;
  // ---------- Indicatori (catalogo e formule in indicators.js) ----------
  const IX = () => globalThis.OwlookIndicators;
  const fxList = () => st.ind.fx || [];
  const fxDef = (x) => (x && IX() ? IX().BY[x.t] : null);
  const fxFind = (id) => fxList().find((x) => x.id === id);
  const fxColor = (x, j) => (x.c && isHex(x.c[j]) ? x.c[j] : fxDef(x).l[j][1]);
  const fxWidth = (x, j) => (x.w && x.w[j] ? x.w[j] : fxDef(x).l.length === 1 ? 2 : 1);
  const isHist = (k) => k === "hist" || k === "histd";
  function fxParams(x) {
    const o = {};
    for (const [k, , d] of fxDef(x).p) o[k] = x.p && typeof x.p[k] === "number" ? x.p[k] : d;
    return o;
  }
  function fxLabel(x) {
    const d = fxDef(x), p = fxParams(x);
    return d.s + (d.p.length ? " " + d.p.map(([k]) => p[k]).join(" ") : "");
  }
  function fxNew(t) {
    const X = IX(), d = X && X.BY[t];
    if (!d) return null;
    let c = d.l.map((l) => l[1]);
    // seconda istanza dello stesso indicatore a una linea: colore diverso
    if (d.l.length === 1 && fxList().some((x) => x.t === t)) {
      const used = new Set(fxList().flatMap((x) => (fxDef(x) ? fxDef(x).l.map((_, j) => fxColor(x, j)) : [])));
      c = [X.PALETTE.find((k) => !used.has(k)) || c[0]];
    }
    return { id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t, p: {}, c, w: d.l.map(() => (d.l.length === 1 ? 2 : 1)) };
  }
  // valori in legenda: prezzo, numero con 2 decimali o volume compatto
  const fxVal = (d, v) => (v == null ? "" : d.f === "p" ? fmt(v) : d.f === "v" ? compact.format(v) : Math.abs(v) >= 1e4 ? compact.format(v) : num2(v));
  function fxCtl(x, d) {
    const p = fxParams(x);
    const inp = d.p.map(([k, l, , mn, mx, step]) => `<input type="number" min="${mn}" max="${mx}" step="${step}" data-fp="${x.id}" data-pk="${k}" value="${p[k]}" title="${esc(l)}" aria-label="${esc(l)} ${esc(d.s)}">`).join("");
    const cols = d.l.map((l, j) => (isHist(l[2]) ? "" : sw(`fx:${x.id}:${j}`, fxColor(x, j), `Colore e spessore ${l[0]}`))).join("");
    return inp + cols + `<button data-a="fxrm" data-id="${x.id}" title="Rimuovi ${esc(d.s)}" aria-label="Rimuovi ${esc(d.s)}">×</button>`;
  }
  function fxHead(x, d) {
    const vals = d.l.map((l, j) => `<b class="iv" data-j="${j}" style="color:${isHist(l[2]) ? "var(--mut)" : fxColor(x, j)}"></b>`).join("");
    const j0 = d.l.findIndex((l) => !isHist(l[2]));
    return `<span class="fxn${x.nt ? " off" : ""}" data-a="fxtag" data-id="${x.id}" role="button" title="${x.nt ? L("Mostra il valore sull'asse dei prezzi", "Show the value on the price axis") : L("Nascondi il valore sull'asse dei prezzi", "Hide the value on the price axis")}" style="color:${j0 < 0 ? "var(--fg)" : fxColor(x, j0)}">${esc(fxLabel(x))}</span>${vals}${d.intr && !(ivSec < 86400) ? " <em>solo intraday</em>" : ""}`;
  }
  // Legenda: riga dei prezzi + una riga per indicatore sul grafico; un'etichetta per ogni riquadro sotto
  function drawInd() {
    let h = '<div id="lg-main"></div>', ph = "";
    if (mode !== "l") {
      for (const x of fxList()) {
        const d = fxDef(x);
        if (!d) continue;
        if (d.pane) { if (paneIds.includes(x.id)) ph += `<div class="pleg" data-fx="${x.id}"><span class="rl">${fxHead(x, d)}</span><span class="pctl">${fxCtl(x, d)}</span></div>`; }
        else h += `<div class="irow" data-fx="${x.id}"><span class="rl">${fxHead(x, d)}</span><span class="ictl">${fxCtl(x, d)}</span></div>`;
      }
    }
    $("#legend").innerHTML = h;
    $("#plegs").innerHTML = ph;
    legend(hov);
    placeLegs();
  }
  // Menu a tendina compatti (intervallo, indicatori)
  let menuAnchor = null, menuKey = null;
  // come ritrovare il tasto se viene ridisegnato (stesso tasto, nuovo elemento)
  const anchorKey = (b) => { if (b.dataset.a === "csel") { const s0 = b.previousElementSibling; return s0 && s0.id ? `#${CSS.escape(s0.id)}+.csel` : null; } return b.dataset.a ? `[data-a="${b.dataset.a}"]` : null; };
  function openMenu(btn, html) {
    menuAnchor = btn; menuKey = anchorKey(btn);
    const m = $("#menu"), pr = $("#panel").getBoundingClientRect(), br = btn.getBoundingClientRect();
    m.innerHTML = html; m.hidden = false;
    m.style.left = `${Math.min(br.left - pr.left, pr.width - m.offsetWidth - 8)}px`;
    m.style.top = `${br.bottom - pr.top + 4}px`;
  }
  const closeMenu = () => { $("#menu").hidden = true; menuAnchor = null; menuKey = null; };
  // un menu aperto non resta mai "orfano": se il tasto che l'ha aperto viene ridisegnato, nascosto o
  // tolto (es. fine modifica del portafoglio), il menu si chiude
  const menuOrphan = () => {
    const m = $("#menu");
    if (m.hidden || !menuAnchor || (menuAnchor.isConnected && menuAnchor.offsetWidth)) return;
    const c = menuKey && [...root.querySelectorAll(menuKey)].find((x) => x.offsetWidth && !x.closest("#menu"));
    if (!c) return closeMenu();
    menuAnchor = c; // ridisegnato ma ancora lì: il menu resta aperto
    if (c.classList.contains("csel")) cselCur = c.previousElementSibling;
  };
  let moRaf = 0;
  new MutationObserver(() => { if (!moRaf) moRaf = requestAnimationFrame(() => { moRaf = 0; menuOrphan(); }); }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class"] });
  // clic fuori dal menu e fuori dal suo tasto: si chiude (il tasto stesso lo apre e chiude da sé)
  root.addEventListener("pointerdown", (e) => {
    const m = $("#menu");
    if (m.hidden) return;
    const t = e.composedPath()[0];
    if (t && t.closest && (t.closest("#menu") || t.closest("#cpop") || (menuAnchor && menuAnchor.contains(t)))) return;
    closeMenu();
  }, true);
  function ctMenu() {
    const I = st.ind;
    return `<div class="fxl">${CT.map(([k, l]) => `<button data-a="ctype" data-t="${k}"><span class="ck">${I.ct === k ? "✓" : ""}</span>${CT_ICON[k]}${l}</button>`).join("")}</div>
      ${I.ct === "line" || I.ct === "area" // linea e area: un colore solo
        ? `<div class="ccol">${I.ct === "area" ? L("Area", "Area") : L("Linea", "Line")}<span>${L("Colore", "Color")}</span>${sw("cln", cLn(), I.ct === "area" ? L("Colore dell'area", "Area color") : L("Colore della linea", "Line color"))}</div>`
        : `<div class="ccol">${L("Candele", "Candles")}<span>${L("Rialzo", "Up")}</span>${sw("cup", cUp(), L("Colore delle candele in rialzo", "Up candle color"))}<span>${L("Ribasso", "Down")}</span>${sw("cdn", cDn(), L("Colore delle candele in ribasso", "Down candle color"))}</div>`}`;
  }
  // ---------- Impostazioni salvate del grafico a candele ----------
  // Un nome per la combinazione di indicatori (con colori e spessori), tipo di grafico, volumi,
  // altezze dei riquadri e intervallo: si riapre con un clic su qualsiasi titolo.
  const TPL_MAX = 20;
  const tplList = () => (Array.isArray(st.tpl) ? st.tpl.filter((t) => t && t.id && t.ind) : []);
  const clone = (v) => JSON.parse(JSON.stringify(v == null ? null : v));
  function tplMenu() {
    const T0 = tplList(), ivl = (k) => ((IVS.find((x) => x[0] === k) || [])[1] || "");
    return `<div class="tplm"><div class="tplh">${L("Impostazioni del grafico", "Chart setups")}</div>`
      + (T0.length ? T0.map((t) => `<div class="tplr"><button class="tpln" data-a="tplapply" data-id="${esc(t.id)}" title="${L("Applica", "Apply")}"><b>${esc(t.n)}</b><small>${(t.ind.fx || []).length} ${L("indicatori", "indicators")} · ${esc(ivl(t.ci))}</small></button><button class="x" data-a="tpldel" data-id="${esc(t.id)}" aria-label="${L("Elimina", "Delete")} ${esc(t.n)}" title="${L("Elimina", "Delete")}">${XSM}</button></div>`).join("")
        : `<p class="tple">${L("Nessuna impostazione salvata.", "No saved setups yet.")}</p>`)
      + `<div class="tpls"><input id="tplname" maxlength="30" autocomplete="off" spellcheck="false" placeholder="${L("Nome dell'impostazione", "Setup name")}" aria-label="${L("Nome dell'impostazione", "Setup name")}"><button class="pill pri" data-a="tplsave">${L("Salva", "Save")}</button></div>`
      + `</div>`;
  }
  function tplSave() {
    const T0 = tplList(), inp = $("#tplname"), n = (inp && inp.value.trim()) || `${L("Impostazione", "Setup")} ${T0.length + 1}`;
    const I = st.ind, rec = { id: Date.now().toString(36), n: n.slice(0, 30), ci: st.ci, ind: clone({ fx: I.fx || [], ct: I.ct, vol: I.vol, ph: I.ph || {} }) };
    const same = T0.findIndex((t) => t.n.toLowerCase() === rec.n.toLowerCase()); // stesso nome: la aggiorno
    if (same >= 0) { rec.id = T0[same].id; T0[same] = rec; } else T0.unshift(rec);
    st.tpl = T0.slice(0, TPL_MAX); persist();
    $("#menu").innerHTML = tplMenu();
  }
  function tplApply(id) {
    const t = tplList().find((x) => x.id === id);
    if (!t) return;
    const ciCh = !!t.ci && t.ci !== st.ci;
    const ti = clone(t.ind) || {};
    st.ind = mergeInd({ ...st.ind, fx: Array.isArray(ti.fx) ? ti.fx : [], ct: ti.ct || st.ind.ct, vol: ti.vol != null ? ti.vol : st.ind.vol, ph: ti.ph || {}, tv1: true });
    if (ciCh) st.ci = t.ci;
    persist(); closeMenu(); drawTools(); drawInd();
    if (mode !== "c") return openChart(cur, "c");
    rebuildChart();
    if (ciCh) load(false);
  }
  let fxQ = "";
  function fxMenu() {
    return `<div class="fxm"><label class="fxs">${SEARCH}<input id="fxq" placeholder="Cerca indicatore…" value="${esc(fxQ)}" autocomplete="off" spellcheck="false" aria-label="Cerca indicatore"></label><div class="fxl" id="fxlist">${fxItems()}</div></div>`;
  }
  function fxItems() {
    const X = IX();
    if (!X) return '<div class="empty">Indicatori non disponibili: ricarica la pagina.</div>';
    const q = fxQ.trim().toLowerCase(), intr = ivSec < 86400, act = fxList().filter(fxDef);
    let h = "";
    if (!q && act.length) {
      h += `<div class="fxh">${L("ATTIVI", "ACTIVE")}</div>` + act.map((x) => {
        const d = fxDef(x), j = Math.max(0, d.l.findIndex((l) => !isHist(l[2])));
        return `<div class="fxa"><span class="dotc" style="background:${fxColor(x, j)}"></span><span>${esc(fxLabel(x))}</span><button data-a="fxrm" data-id="${x.id}" title="Rimuovi" aria-label="Rimuovi ${esc(fxLabel(x))}">×</button></div>`;
      }).join("");
    }
    const full = act.length >= MAX_FX;
    for (const [c, cl] of X.CATS) {
      const L = X.DEFS.filter((d) => d.cat === c && (!q || `${d.n} ${d.s} ${d.k}`.toLowerCase().includes(q)));
      if (!L.length) continue;
      h += `<div class="fxh">${T(cl).toUpperCase()}</div>` + L.map((d) => {
        const n = act.filter((x) => x.t === d.k).length, dis = full || (d.intr && !intr);
        const dc = d.l[Math.max(0, d.l.findIndex((l) => !isHist(l[2])))][1];
        return `<button data-a="fxadd" data-t="${d.k}"${dis ? " disabled" : ""} title="${d.intr && !intr ? "Solo con candele intraday" : full ? `Massimo ${MAX_FX} indicatori` : `Aggiungi ${esc(d.n)}`}"><span class="ck">${n ? "✓" + (n > 1 ? n : "") : ""}</span><span class="dotc" style="background:${dc}"></span>${esc(d.n)}<em>${d.pane ? "riquadro" : "sul grafico"}</em></button>`;
      }).join("");
    }
    return h || `<div class="empty">Nessun indicatore per “${esc(fxQ)}”.</div>`;
  }
  function fxRefreshMenu() {
    const l = $("#fxlist");
    if (!l || $("#menu").hidden) return;
    const y = l.scrollTop; l.innerHTML = fxItems(); l.scrollTop = y;
    $("#fxq").focus({ preventScroll: true }); // il pulsante cliccato non c'è più: il focus resta nel menu
  }

  // la colonna "Ult. chius." sparisce solo mentre Wall Street è aperta (dalla chiusura torna subito)
  const syncY = () => { const pn = $("#panel"), was = pn.classList.contains("noy"); pn.classList.toggle("noy", usSessionOpen()); yOn = !pn.classList.contains("noy"); if (was !== !yOn) { lwKey = ""; listOrder = null; draw(); paint(); } syncMkt(); };
  setInterval(syncY, 30000);
  // ---------- Grafico e calendario escono dal pannello della lista (e ci rientrano) ----------
  // Il layout largo è subito quello finale; un ritaglio (clip-path) che si allarga verso sinistra lo
  // scopre a partire dal riquadro della lista, mentre una cornice con bordo e ombra segue il ritaglio.
  let wideAnim = null, afterQ = [];
  // chiusura del pannello: svanisce verso l'alto invece di sparire di colpo
  let pnOut = null;
  function panelVis(pn, show) {
    if (show) { if (pnOut) { pnOut.cancel(); pnOut = null; } pn.hidden = false; return; }
    if (isHidden()) { if (pnOut) { pnOut.cancel(); pnOut = null; } pn.hidden = true; return; } // widget nascosto: via tutto insieme
    if (pn.hidden || pnOut) return;
    if (!motionOK()) { pn.hidden = true; return; }
    pnOut = pn.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-8px) scale(.985)" }], { duration: 180, easing: "ease-in" });
    pnOut.onfinish = () => { pnOut = null; if (!(!isHidden() && isOpen())) pn.hidden = true; };
  }
  // impostazioni: due pannelli, Generali (all'apertura) e Aspetto
  function showSect(v) {
    root.querySelectorAll("#settings .sectp").forEach((x) => { x.hidden = x.dataset.sp !== v; });
    root.querySelectorAll('#settings [data-a="sect"]').forEach((x) => { x.classList.toggle("on", x.dataset.v === v); x.setAttribute("aria-selected", x.dataset.v === v); });
    const c = root.querySelector("#settings .card"); if (c) c.scrollTop = 0;
    if ($("#settings").scrollTop) $("#settings").scrollTop = 0;
  }
  // Animazioni del widget: una sola coppia di funzioni (Web Animations API) per comparire e sparire,
  // con la stessa curva e durate brevi; niente animazioni se il sistema chiede di ridurle.
  const EASE = "cubic-bezier(.2,.8,.2,1)";
  function animIn(el, o = {}) {
    if (!el || !motionOK()) return;
    const y = o.y == null ? 5 : o.y, sc = o.s || 1;
    (el._an || []).forEach((a) => a.cancel());
    el._an = [el.animate([{ opacity: 0, transform: `translateY(${y}px) scale(${sc})` }, { opacity: 1, transform: "none" }], { duration: o.d || 200, easing: EASE })];
  }
  function animOut(el, done, o = {}) {
    if (!el || !motionOK()) { if (done) done(); return; }
    const y = o.y == null ? 4 : o.y, sc = o.s || 1;
    (el._an || []).forEach((a) => a.cancel());
    const a = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateY(${y}px) scale(${sc})` }], { duration: o.d || 140, easing: "ease-in", fill: "forwards" });
    el._an = [a];
    a.onfinish = () => { if (done) done(); a.cancel(); };
  }
  const fadeIn = (el) => animIn(el, { y: 0, d: 250 });
  // il carattere della scritta "owlook" (Schibsted Grotesk ExtraBold, licenza OFL), solo le lettere che servono:
  // caricato dai byte, senza richieste in rete e senza dipendere dalle regole della pagina sui caratteri
  try {
    if (![...document.fonts].some((f) => f.family.replace(/["']/g, "") === "OwlookWM")) {
      const bin = atob("d09GRgABAAAAAAbUAA8AAAAACHwAAQABAAAAAAAAAAAAAAAAAAAAAAAAAABHREVGAAAFsAAAABYAAAAWABEACEdQT1MAAAXIAAAApAAAAPYsjyQWR1NVQgAABmwAAAAqAAAAKrj6uPRPUy8yAAAD4AAAAEcAAABgb69a3VNUQVQAAAaYAAAAOwAAAETmPMwYY21hcAAABCgAAABEAAAAVAEEAdJnYXNwAAAFqAAAAAgAAAAIAAAAEGdseWYAAAFYAAAB2QAAAe58ZZiGaGVhZAAAA2gAAAA2AAAANjUvJjdoaGVhAAADwAAAACAAAAAkHzQSTWhtdHgAAAOgAAAAIAAAACAmGgJ0bG9jYQAAA1QAAAASAAAAEgJkAcxtYXhwAAADNAAAAB0AAAAgABwAw25hbWUAAARsAAABJQAAAoJBhFuicG9zdAAABZQAAAATAAAAIP/RAJx4nCWQT2gTURjE53v7ktQqypLsVg2mvBg2oHjJdreLKC0eJM1FNDT4Bxs9FEVkERGDIEFCImihWYIHabEWRV0rkoOnIngQBW96KYIW1ENBb0IP0ib7VtLAzHFmmB8YxsI1PseL2IMMEElnDGvEzpi5FNOEPqSbOXs0spORMLKGsT8djUXZ3UX5b2GOBp6de7twIYgPZs3rxy+nyDGefpEfaXYwsW/SmjivDyRnwvbrYMa+v/H+4nhp4kThZusYe3X0wGGrVNgLEBoAX4+sYjtgqkIlQSSUmNqgMt2mmrxFD2VVNiOr3a/UkG5wlt48kL9AqALsTD8n0oalCjWhm6ZG881ZKseHC7U7/FunlNY3QagD/BEvQtva0OxR28zpuqYKdaR3R1PrNGmeOl2tPc7LJ2Mnpy9x5920c6TyuR5U2I2r15Y/yEMAw3i4xtu8iF1IblFifUpc1xJRns3ZVr8uobOKH6LZJPg+wfNk+HzKdctTrpv0CC/80PNC3w+9zlKrtdQzCAYQS3EHOwChiHi8J0UoCg1v0JVGm1Ze3qPipkzOL3Kn+0MR3d/K7s4n5WB3pUcxD3CDO9gGmBYJVWgk1DwbkjFlOfjDUn9ZhjLrwU/5Hf8B5qaSjwAAAHicY2BkYGDgYEhhYGeIZWBnAPEQgJWBEQATwwDgAAAAAAAAAAA9AFkAbwCTAMEA4AD3AAAAAQAAAAEZmiZvTXpfDzz1AAMIAAAAAADejxFMAAAAAOAnrtX+Of3gGSgJoQAAAAYAAgAAAAAAAAQAAAAE2QA/BQoAhQKAAH4FDgCEBO8AQAdDACYEdwBIeJxjYGRgYL/w9wMDg2TKP8tfHyQ1GBgZUAEHAKqbBq54nGNgYeVmVmBgZWBgNWY5y8DAMIsBChh1mb4woAJGZI6TUwgDwwGGVIYq9gt/PzAwcB5jsoCpYbFgXcDAwKDAwAwAnxAKTgB4nD3LMQ5AQBQA0WdXoVA6kMtsRSgl7iA6Gnf9kpWYZjLFICFjkDXVrRG9TtIqZqvNHoFisnwVT9xxxRlH/X5e5Y4QzXicndE9ThtRFIbh5/IXkiCKrGBKUvgHB5ACFUYo0CFApIhSGDMZDxgGzYwl2AJVFkVFxRpYAGtAGiYIy67SvefcT+859158dmdWmPuIB2oONjzUPGM5/OvP2gvLNc+9y8zbDCc1L1gLf185sBTua573JTzW/MFSeKp50afwbEfm2q1cKjFQinS0dXwTOTYQixzpG0idKpRiZxp+yGVVVbgQOajqc7F+Zdk2UhrI5AqRlcpeulbY1NKSSKvEyKmmvsyllmJi1rReQzI2/+uUHaOJHXfdKOV6ujJDZw7FEiNDPblVTava2rZ0dR3bmuIdtzamWE/E1a1TmSvRmDfxRymrkoVf2pq+a+pY9/u/pv0Uv/3e5Om+Us9Qqu+weuOeqxfS6mVfAAAAeJxjYGYAg//nGOYwYAEAN7MCbQAAAQAB//8ADwABAAAADAAAAAAAAAACAAEAAQAHAAEAAHicTY7NCcJAEIW/3cTNxkOwCCuwBvHk0QY8eFJyEAvwbA22InYjqEG9qEGMT3aJ4MBjhvczPAzQpc8AOxyNJxSL6aqkIAWQCLqZz5YlPlwRKTkeE2EBj2UdExu2ZMGpDy4AdNQNVOP1JFeji878jU7trkDX8F/68ar0atWHdrprr4PekQguo0ZSTQ+LwZDFdhZHBxe5hLRVLAmd2N2RfQFMtzvJAAEAAAAKACYAKAACREZMVAAObGF0bgAYAAQAAAAA//8AAAAAAAAAAAAAAAB4nB3IMQ5AQAAEwNlDXKnwAIWPqZAoL/F9cc0UI6IqWLu78p5XC+52PJnFaPGHTMOGQZRUvfgAp5oEBQA="), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const ff = new FontFace("OwlookWM", u8.buffer, { weight: "800" });
      ff.load().then(() => document.fonts.add(ff), () => {});
    }
  } catch (_) {}
  // FLIP: misuro gli elementi, applico il cambiamento e li faccio scivolare dalla posizione di prima a quella nuova
  // Il gufo del logo socchiude gli occhi dopo 10 s, poi dopo 5 s, poi dopo 7 s, e ricomincia (così non è
  // ripetitivo). La testa si inclina solo col mouse sopra. In zen ha già gli occhi chiusi.
  let owlT = 0, owlN = 0, newsInfo = false;
  const OWL_W = [10000, 5000, 7000];
  function owlIdle() {
    clearTimeout(owlT);
    owlT = setTimeout(() => { owlSquint(); owlIdle(); }, OWL_W[owlN++ % OWL_W.length]);
  }
  const owlCan = () => motionOK() && !document.hidden && !isHidden() && isOpen();
  function owlSquint() {
    if (st.zen || !owlCan()) return;
    root.querySelectorAll("#brand .oe").forEach((e) => e.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.42)", offset: 0.3 }, { transform: "scaleY(.42)", offset: 0.7 }, { transform: "scaleY(1)" }], { duration: 1300, easing: "ease-in-out" }));
  }
  owlIdle();
  // zen: la barra di scorrimento compare solo mentre scorri (liste, portafoglio, notizie, calendario…)
  root.addEventListener("scroll", (e) => {
    const t = e.target; if (!st.zen || !t.classList) return;
    t.classList.add("scr"); clearTimeout(t._scr); t._scr = setTimeout(() => t.classList.remove("scr"), 900);
  }, true);

  // (gli elementi si riconoscono dal simbolo o dall'id: il cambiamento può ridisegnarli)
  function flip(get, change, o = {}) {
    const key = (e) => e.dataset.s || e.id || e.className;
    const before = motionOK() ? new Map(get().map((e) => [key(e), e.getBoundingClientRect().top])) : null;
    change();
    if (!before) return;
    for (const e of get()) {
      const t0 = before.get(key(e));
      if (t0 == null || !e.offsetParent) continue;
      const dy = t0 - e.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      e.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: o.d || 360, easing: EASE });
    }
  }
  const slideIn = (el) => animIn(el);
  const motionOK = () => typeof host.animate === "function" && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  function flushAfter() { const q = afterQ; afterQ = []; q.forEach((f) => { try { f(); } catch (_) {} }); }
  function setWide(w) {
    $("#panel").classList.toggle("wide", w);
    $("#chart").hidden = !cur;
    $("#cal").hidden = !calOpen || !!cur;
  }
  function collapseWide() {
    const pn = $("#panel"), ch = $("#chart").hidden, ca = $("#cal").hidden;
    setWide(false); placePanel();
    const r0 = pn.getBoundingClientRect(); // dove finirà: il riquadro della lista
    pn.classList.add("wide"); $("#chart").hidden = ch; $("#cal").hidden = ca; placePanel();
    wideAnimate(false, r0, ch ? $("#cal") : $("#chart"), () => { setWide(false); placePanel(); });
  }
  function wideAnimate(expand, r0, sec, done) {
    const pn = $("#panel"), sh = $("#pshade"), r = pn.getBoundingClientRect();
    const l = Math.max(0, Math.round(r0.left - r.left)), b = Math.max(0, Math.round(r.bottom - r0.bottom));
    if (l < 4 && b < 4) { if (done) done(); return; }
    const box = (ll, bb) => ({ left: `${r.left + ll}px`, top: `${r.top}px`, width: `${r.width - ll}px`, height: `${r.height - bb}px` });
    const k = (a, z) => (expand ? [a, z] : [z, a]);
    const o = { duration: expand ? 280 : 210, easing: expand ? "cubic-bezier(.2,.8,.2,1)" : "cubic-bezier(.45,0,.75,.6)", fill: "forwards" };
    pn.classList.add("anim"); sh.hidden = false;
    wideAnim = { to: expand, done, anims: [
      pn.animate(k({ clipPath: `inset(0px 0px ${b}px ${l}px round 12px)` }, { clipPath: "inset(0px 0px 0px 0px round 12px)" }), o),
      sh.animate(k(box(l, b), box(0, 0)), o),
      sec.animate(k({ opacity: 0, transform: "translateX(32px)" }, { opacity: 1, transform: "none" }), { ...o, duration: o.duration * (expand ? 1 : 0.8) }),
    ] };
    const me = wideAnim;
    wideAnim.anims[0].onfinish = () => { if (wideAnim === me) finishWide(); };
  }
  function finishWide() {
    const w = wideAnim;
    if (!w) return;
    wideAnim = null;
    if (w.done) w.done();
    w.anims.forEach((a) => { try { a.cancel(); } catch (_) {} });
    $("#panel").classList.remove("anim"); $("#pshade").hidden = true;
    flushAfter();
  }
  // trasparenza: 0 = pannelli pieni, 100 = vetro molto trasparente (predefinita 40)
  const glassT = () => (Number.isFinite(st.glass) ? Math.max(0, Math.min(100, st.glass)) : 40);
  // Luminosità della pagina dietro al pannello (solo colori di sfondo: le immagini contano come grigio medio).
  // Con tanto vetro, se è opposta al tema i testi grigi diventano più chiari (tema scuro) o più scuri (tema chiaro)
  // e prendono un leggero alone: restano leggibili senza cambiare l'aspetto del vetro.
  function bgLum(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|IFRAME|SVG|PICTURE)$/i.test(e.tagName)) return 0.45;
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return 0.45;
      const m = cs.backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] == null || +m[3] > 0.5)) return lum("#" + [m[0], m[1], m[2]].map((v) => (+v | 0).toString(16).padStart(2, "0")).join(""));
    }
    return 1; // nessuno sfondo: la pagina è bianca
  }
  let bkT = 0;
  function checkBack() {
    bkT = 0;
    const pn = $("#panel");
    if (glassT() < 40 || isHidden() || !isOpen() || !pn || !pn.offsetWidth) { if (host.dataset.bk) { delete host.dataset.bk; themeChart.t = null; themeChart(); } return; }
    const r = pn.getBoundingClientRect();
    let sum = 0, n = 0;
    for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const el = document.elementsFromPoint(x, y).find((e) => e !== host && !host.contains(e) && e !== document.documentElement);
      sum += el ? bgLum(el) : bgLum(document.body); n++;
    }
    if (!n) return;
    const L0 = sum / n, dark = host.dataset.theme === "dark", v = dark && L0 > 0.5 ? "light" : !dark && L0 < 0.18 ? "dark" : "";
    if ((host.dataset.bk || "") !== v) { if (v) host.dataset.bk = v; else delete host.dataset.bk; themeChart.t = null; themeChart(); }
  }
  const checkBackSoon = () => { if (!bkT) bkT = setTimeout(checkBack, 250); };
  addEventListener("scroll", checkBackSoon, { passive: true, capture: true });
  addEventListener("resize", checkBackSoon);
  setInterval(() => { if (!document.hidden) checkBack(); }, 3000);
  function applyGlass() {
    checkBackSoon();
    const t = glassT();
    host.style.setProperty("--gp", `${Math.round(100 - t * 0.55)}%`);
    host.style.setProperty("--gb", t ? "32px" : "0px");
    if (t) delete host.dataset.noglass; else host.dataset.noglass = "1"; // trasparenza nulla: niente sfocatura dietro il widget
    const r = $("#glassr"); if (r) { if (+r.value !== t) r.value = t; r.style.setProperty("--gf", t / 100); }
  }
  // Colori principali: rialzo e ribasso valgono anche per prezzi e percentuali. Con i colori predefiniti
  // restano le tonalità del tema (più scure nel tema chiaro); scelti a mano, uguali in entrambi i temi.
  const lum = (h) => { const n = parseInt(String(h).slice(1, 7), 16), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
  // testo sopra un colore: nero o bianco, quello con più contrasto
  const onCol = (c) => { const l = lum(c); return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? "#000" : "#fff"; };
  // colori di Owlook: viola per l'interfaccia (e la linea dell'andamento storico), verde delle sopracciglia per i rialzi, arancio per i ribassi
  const THEME_COL = { light: { up: "#16c467", dn: "#f2541b", acc: "#6236ff" }, dark: { up: "#22e07a", dn: "#ff6b3d", acc: "#7352ff" } };
  function applyCols() {
    const dark = host.dataset.theme === "dark";
    for (const [k, v, on] of [["up", "--up", "--onup"], ["dn", "--dn", "--ondn"], ["acc", "--acc", "--onacc"]]) {
      const c = k !== "acc" && st.ind && st.ind[k], own = c && isHex(c) && c.toLowerCase() !== IND0[k];
      const eff = own ? c : THEME_COL[dark ? "dark" : "light"][k];
      if (own) host.style.setProperty(v, c); else host.style.removeProperty(v);
      host.style.setProperty(on, onCol(eff));
      if (k === "acc") { if (own) host.style.setProperty("--accbg", `color-mix(in srgb,${c} ${dark ? 15 : 12}%,transparent)`); else host.style.removeProperty("--accbg"); }
    }
  }
  function apply() {
    applyGlass();
    syncY();
    const dark = st.theme === "dark" || (st.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    host.dataset.theme = dark ? "dark" : "light";
    if (st.zen) host.dataset.zen = "1"; else delete host.dataset.zen; // modalità zen
    { const z = $("#brand"), t = st.zen ? L("Esci dalla modalità zen", "Leave zen mode") : L("Modalità zen: solo i titoli, senza distrazioni", "Zen mode: just your tickers, no distractions"); z.setAttribute("aria-pressed", String(!!st.zen)); z.dataset.tt = t; z.setAttribute("aria-label", t); }
    if (PANEL) { host.dataset.panel = "1"; document.documentElement.style.background = document.body.style.background = dark ? "#101114" : "#f2f2f4"; }
    applyCols();
    $("#bar").hidden = isHidden() || !st.bar.some(Boolean); // nessun titolo in barra: niente barra, il pannello sale in cima
    $("#bar").classList.toggle("off", !!st.barOff); // nascosta col tasto: svanisce verso l'alto
    { const bb = $("#barbtn"), t = st.barOff ? L("Mostra i titoli in evidenza", "Show featured tickers") : L("Nascondi i titoli in evidenza", "Hide featured tickers");
      bb.hidden = !st.bar.some(Boolean); bb.innerHTML = st.barOff ? BARDN : BARUP; bb.dataset.tt = t; bb.setAttribute("aria-label", t); }
    const pn = $("#panel"), showP = !isHidden() && isOpen(), want = !!cur || calOpen;
    if (wideAnim && (wideAnim.to !== want || !showP)) finishWide();
    if (!wideAnim) {
      const anim = showP && !pn.hidden && pn.classList.contains("wide") !== want && motionOK();
      if (anim && !want) collapseWide();
      else {
        const r0 = anim ? pn.getBoundingClientRect() : null;
        panelVis(pn, showP); setWide(want); placePanel();
        if (anim) wideAnimate(true, r0, cur ? $("#chart") : $("#cal"), null);
      }
    }
    $("#calbtn").classList.toggle("on", calOpen && !cur);
    checkHtip();
    $("#go").classList.toggle("open", isOpen());
    const vis = !isHidden() && isOpen();
    if (vis && !wasVis) setTimeout(restoreView, 0); // widget riaperto: torna com'era quando l'hai chiuso
    wasVis = vis;
    themeChart();
    draw();
    if (!wideAnim) flushAfter();
    paint();
  }

  // ---------- Quotazioni ----------
  // Il service worker decide qual è il dato più recente: qui lo mostro e basta
  function put(sym, q, flash) {
    if (!q) { if (!(sym in quotes)) quotes[sym] = null; return false; }
    const o = quotes[sym];
    const changed = !o || o.price !== q.price;
    quotes[sym] = { ...q, dir: flash && o && o.price != null ? Math.sign(q.price - o.price) : 0 };
    return changed;
  }
  const isLive = (s) => quotes[s] && quotes[s].live && Date.now() - quotes[s].live < LIVE_MS;
  // Lo streaming aggiorna all'istante; via HTTP interrogo solo i simboli che non ricevono tick
  // (ogni 3 s) e, una volta al minuto, tutti, per aggiornare le chiusure precedenti.
  async function refresh() {
    if (viewHidden()) return;
    const all = subsList();
    const full = Date.now() - fullAt > 60000;
    const syms = full ? all : all.filter((s) => !isLive(s));
    if (!syms.length) return;
    if (full) fullAt = Date.now();
    try {
      const fresh = (await chrome.runtime.sendMessage({ type: "quotes", symbols: syms })) || {};
      for (const k in fresh) {
        const was = quotes[k];
        if (put(k, fresh[k], !!was) && k === cur && fresh[k] && !fresh[k].live && !fresh[k].xs) {
          live({ price: fresh[k].price, tt: fresh[k].tt || fresh[k].time, vol: fresh[k].vol }); // il grafico segue anche i dati HTTP
        }
      }
      paint();
      syncMkt(); // lo stato di Wall Street arriva con le quotazioni degli indici
    } catch (_) { /* estensione ricaricata: ricarica la pagina */ }
  }
  function loop() {
    clearTimeout(timer);
    const gen = ++loopGen;
    syncLive();
    if (isHidden()) return;
    // calendario: date in memoria nel service worker (aggiornate dai siti ogni 6 ore), qui solo il pallino
    if (!calData || Date.now() - calData.at > 30 * 60000) loadCal(false);
    clearInterval(calBadgeT); calBadgeT = setInterval(() => { if (!viewHidden()) calBadge(); }, 60000);
    const go = async () => {
      await refresh();
      if (gen === loopGen && !isHidden()) timer = setTimeout(go, 3000);
    };
    go();
  }

  // ---------- Streaming live ----------
  const subsList = () => {
    const S0 = [...items().map((x) => x.s), ...st.bar.filter(Boolean).map((x) => x.s)];
    const P = [...(st.pf || []).map((x) => x.s), ...(pfForm && pfForm.s ? [pfForm.s] : [])]; // il portafoglio non passa ai futures
    return [...new Set([...S0, ...(futOn() ? S0.filter((s) => FUT[s]).map((s) => FUT[s][0]) : []), ...P, ...(cur ? [cur] : [])])];
  };
  function onTick(m) {
    if (!(m.price > 0)) return;
    lastTick = Date.now();
    if (m.ext) return; // after market: non mostrato
    put(m.sym, m, false);
    dirty.add(m.sym);
    // in lista si vede anche il pre-market; il grafico mostra solo la seduta regolare
    if (m.sym === cur && !m.xs) pendLive = m;
    if (!painting) painting = requestAnimationFrame(paintTicks);
  }
  function pushSubs() {
    if (!port) return;
    const subs = subsList(), key = JSON.stringify(subs);
    if (key === lastSubs) return;
    lastSubs = key;
    port.postMessage({ sub: subs });
  }
  function connect() {
    if (port) return;
    try {
      const p = (port = chrome.runtime.connect({ name: "live" }));
      p.onMessage.addListener(onTick);
      p.onDisconnect.addListener(() => {
        if (port !== p) return;
        port = null; lastSubs = "";
        setTimeout(syncLive, 1000); // il service worker può riavviarsi: mi riconnetto
      });
      pushSubs();
    } catch (_) { port = null; }
  }
  function disconnect() {
    if (!port) return;
    const p = port;
    port = null; lastSubs = "";
    p.disconnect();
  }
  function syncLive() {
    if (!isHidden() && !viewHidden()) { connect(); pushSubs(); } else disconnect();
  }

  // Aggiorna prezzi e variazioni sul posto: scrivo nel DOM solo quando testo o colore cambiano davvero
  function paintEl(el) {
    const q = quotes[el.dataset.k], f = el.dataset.f;
    if (f === "yp") { const t = ycl(q); if (el.textContent !== t) el.textContent = t; return false; }
    if (f === "p") {
      const w = el.closest(".lp,.bi"), sk = q === undefined;
      if (w && w.classList.contains("sk") !== sk) w.classList.toggle("sk", sk);
      const cu = el.nextElementSibling;
      if (cu && cu.dataset.cu && q && (q.cur || q.qt)) { const c = pxCur(cu.dataset.cu); if (cu.textContent !== c) cu.textContent = c; }
      const t = val(q);
      if (el.textContent === t) return false;
      const grew = el.textContent.length !== t.length;
      el.textContent = t;
      return grew; // cambia la lunghezza: forse cambia la larghezza delle colonne
    }
    const [c, t] = f === "y" ? ypct(q) : pct(q);
    if (el.textContent !== t) el.textContent = t;
    if ((el.dataset.c || "") !== c) {
      el.classList.remove("up", "dn", "yu", "yd");
      if (c) el.classList.add(c);
      el.dataset.c = c;
    }
    return false;
  }
  function paint() {
    if (listPartial && st.tab !== "pf" && !lEdit) { const f = sortField(); if (!f) listPartial = false; else if (items().every((x) => hasSortVal(x, f))) { listOrder = null; listPartial = false; drawList(); } }
    dirty.clear();
    root.querySelectorAll("[data-k]").forEach(paintEl);
    paintDly(); paintPf(); if (st.tab !== "pf") listWidths(); fitBar(); checkHtip();
    dot();
  }
  // tick in streaming: ridisegno solo i titoli arrivati in questo fotogramma
  const dirty = new Set();
  let pendLive = null;
  function paintTicks() {
    painting = 0;
    if (pendLive) { const m = pendLive; pendLive = null; live(m); } // il grafico: al massimo un aggiornamento per fotogramma
    if (!dirty.size) return;
    let grew = false, inPf = false;
    for (const sym of dirty) {
      root.querySelectorAll(`[data-k="${CSS.escape(sym)}"]`).forEach((el) => { if (paintEl(el)) grew = true; });
      if (!inPf && st.tab === "pf" && (st.pf || []).some((x) => x.s === sym)) inPf = true;
    }
    dirty.clear();
    if (inPf) paintPfSoon();
    if (grew && st.tab !== "pf") listWidths();
    checkHtip(); dot();
  }
  let dotOn = null;
  function dot() {
    const on = Date.now() - lastTick < LIVE_MS;
    if (on === dotOn) return;
    dotOn = on;
    root.querySelectorAll(".dot, .bdot").forEach((d) => {
      d.classList.toggle("on", on);
      d.dataset.tt = on ? "Streaming in tempo reale" : "Nessun tick live in questo momento (mercati chiusi?): controllo via HTTP ogni 3 s";
    });
  }

  // ---------- Grafico pronto prima del clic ----------
  // passando col mouse su un titolo (per 120 ms) carico la libreria e chiedo le candele: al clic il grafico è subito lì
  let preT = 0, preKey = "";
  const reqOf = (m) => (m === "l" ? { range: st.lr, iv: DEF_IV[st.lr], exact: "h" } : { range: IV_RANGE[st.ci] || "5d", iv: st.ci });
  root.addEventListener("pointerover", (e) => {
    const t = e.target && e.target.closest ? e.target : null;
    const el = t && t.closest(".lc[data-s], .row[data-s], .bi[data-s]");
    if (!el || (el.classList.contains("row") && el.classList.contains("ed"))) return;
    const m = el.classList.contains("bi") ? "c" : el.classList.contains("lc") ? (el.dataset.a === "line" ? "l" : "c") : rowM();
    const key = `${el.dataset.s}|${m}`;
    if (key === preKey) return;
    preKey = key; clearTimeout(preT);
    preT = setTimeout(() => {
      lib().catch(() => {});
      chrome.runtime.sendMessage({ type: "candles", sym: el.dataset.s, ...reqOf(m) }).catch(() => {});
    }, 120);
  });

  // ---------- Ricerca simboli (Yahoo) ----------
  async function search(text) {
    try { return (await chrome.runtime.sendMessage({ type: "search", q: text })) || []; } catch (_) { return []; }
  }

  // ---------- Grafico ----------
  // Orari del grafico all'ora di New York (costa est USA, con l'ora legale americana).
  // La libreria disegna gli istanti come se fossero UTC: sposto ogni istante dello scarto di New York.
  let NYO = null, nyOffZ = null;
  const nyOffC = new Map();
  function nyOff(t) {
    if (nyOffZ !== tzOf()[0]) { nyOffZ = tzOf()[0]; nyOffC.clear(); NYO = new Intl.DateTimeFormat("en-US", { timeZone: nyOffZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    const k = Math.floor(t / 1800); // i cambi d'ora cadono a ore piene: basta uno scarto ogni mezz'ora
    let o = nyOffC.get(k);
    if (o == null) {
      const p = Object.fromEntries(NYO.formatToParts(new Date(k * 1800000)).map((x) => [x.type, x.value]));
      o = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) / 1000 - k * 1800;
      if (nyOffC.size > 20000) nyOffC.clear();
      nyOffC.set(k, o);
    }
    return o;
  }
  const sh = (t) => t + nyOff(t); // ora del fuso scelto (predefinito: New York)
  // con il vetro trasparente su una pagina di luminosità opposta al tema, il testo dell'asse diventa più deciso
  const pal = () => { const d = host.dataset.theme === "dark", p = PAL[d ? "dark" : "light"], bk = host.dataset.bk; return (d && bk === "light") ? { ...p, tx: "#d4d6dc" } : (!d && bk === "dark") ? { ...p, tx: "#3a3d45" } : p; };
  const msg = (t) => { $("#cmsg").hidden = !t; $("#cmsg").textContent = t || ""; };

  async function lib() {
    if (globalThis.LightweightCharts) return;
    await chrome.runtime.sendMessage({ type: "lib" });
    if (!globalThis.LightweightCharts) throw new Error("lib");
  }

  // Pannelli aperti (grafico, andamento o calendario): ricordati per riaprire il widget com'era
  function chartLogo() { const el = $("#c-lg"); if (el) el.innerHTML = !cur || nmCfg().lg === "off" ? "" : logoTag(cur, item(cur).n); }
  function setView(v) {
    if (JSON.stringify(v || null) === JSON.stringify(st.view || null)) return;
    st.view = v || null;
    try { chrome.storage.local.set({ view: st.view }); } catch (_) {}
  }
  let wasVis = true, viewPend = false;
  function restoreView() {
    viewPend = false;
    const v = st.view;
    if (isHidden() || !isOpen()) return;
    if (viewHidden()) { viewPend = true; return; } // scheda in background: quando torna visibile
    // in un'altra scheda hai chiuso grafico o calendario, o uscito dal tutto schermo: qui lo stesso
    if (!v) { if (cur) closeChart(); if (calOpen) closeCal(); if (maxed) { maxed = false; applyLay(); } return; }
    if (!v.max && maxed) { maxed = false; applyLay(); }
    syncMkt(); // Wall Street può aver aperto o chiuso mentre il widget era nascosto
    if (v.cal) { if (v.max && !maxed) { maxed = true; applyLay(); } if (!calOpen || cur) openCal(v.max); return; }
    if (!v.s) return;
    // S&P 500, Dow e NASDAQ: indice o future a seconda di Wall Street aperta o chiusa
    const all = [...items(), ...st.bar.filter(Boolean)].map((x) => x.s);
    let s = v.s;
    if (FUT[s]) s = dsym(s);
    else if (!all.includes(s)) { const k = Object.keys(FUT).find((k) => FUT[k][0] === s && all.includes(k)); if (k) s = dsym(k); }
    if (v.max && !maxed) { maxed = true; applyLay(); } // era a tutto schermo: riapre a tutto schermo
    if (cur !== s || mode !== (v.m || "c")) openChart(s, v.m || "c", true);
    if (!!v.n !== newsOn) setNews(!!v.n); // notizie aperte in un'altra scheda
  }
  const userCloseChart = () => { const wm = maxed; setView(null); closeChart(); if (backCal) { backCal = false; openCal(wm); } }; // aperto dagli utili: torno al calendario
  // tutto schermo acceso o spento: lo ricordo con il grafico aperto, per riaprirlo uguale
  function setMax(v) {
    maxed = v;
    if (st.view && st.view.s) setView({ s: st.view.s, m: st.view.m, ...(v ? { max: 1 } : {}), ...(st.view.n ? { n: 1 } : {}) });
    else if (st.view && st.view.cal) setView({ cal: 1, ...(v ? { max: 1 } : {}) });
    layAnim(); applyLay();
  }
  // posizione e dimensioni del pannello cambiano con un movimento morbido (tutto schermo, ripristino…)
  function layAnim() {
    if (!motionOK()) return;
    const pn = $("#panel");
    pn.classList.add("barmv"); clearTimeout(barMvT); barMvT = setTimeout(() => pn.classList.remove("barmv"), 450);
  }
  const userCloseCal = () => { setView(null); closeCal(); };
  // ---------- Notizie del titolo aperto (feed RSS di Yahoo Finance, vedi background.js) ----------
  let newsOn = false, newsItems = null, newsSym = null, newsReq = 0, NNEW = {};
  chrome.storage.local.get("nnew").then((o) => { NNEW = (o && o.nnew) || {}; if (Object.keys(NNEW).length) draw(); }, () => {});
  const newsBadge = (s) => !!(st.nsub && st.nsub[s] && NNEW[s]);
  function ago(t) {
    const m = Math.max(1, Math.round((Date.now() - t) / 60000));
    if (m < 60) return L(`${m} min fa`, `${m} min ago`);
    const h = Math.round(m / 60);
    if (h < 24) return L(`${h} h fa`, `${h} h ago`);
    const d = Math.round(h / 24);
    return d === 1 ? L("ieri", "yesterday") : L(`${d} gg fa`, `${d} d ago`);
  }
  // tag delle notizie (codici da background.js)
  const NTAG = { res: ["Risultati", "Results"], gui: ["Previsioni", "Outlook"], ma: ["Acquisizione", "M&A"], exe: ["Dirigenti", "Management"], reg: ["Autorizzazioni", "Approval"],
    leg: ["Legale", "Legal"], cap: ["Azionisti", "Shareholders"], fin: ["Finanziamento", "Financing"], deal: ["Accordo", "Deal"], ana: ["Analisti", "Analysts"], cal: ["Calendario", "Schedule"],
    pr: ["Comunicato", "Press release"], gen: ["Notizia", "News"], bk: ["Fallimento", "Bankruptcy"], rst: ["Ristrutturazione", "Restructuring"], acc: ["Contabilità", "Accounting"],
    lst: ["Quotazione", "Listing"], vote: ["Assemblea", "Shareholder vote"] };
  function alignBell() {
    const b = $("#nbellbox"); if (!b || b.hidden) return;
    b.style.transform = "";
    const t = root.querySelector(".side .tabs.ticons");
    if (!t || !t.offsetWidth) return;
    const tb = t.getBoundingClientRect(), bb = b.getBoundingClientRect(), dy = Math.round(tb.top + tb.height / 2 - (bb.top + bb.height / 2));
    if (dy > 0 && dy < 60) b.style.transform = `translateY(${dy}px)`;
  }
  function setNews(on) {
    const ct = root.querySelector("#chart>.ctop"), was = newsOn;
    if (on && !was && ct.offsetHeight) ct.style.minHeight = `${ct.offsetHeight}px`; // logo, nome e prezzo restano dove sono nel grafico
    newsOn = !!on && !!cur;
    if (!newsOn) ct.style.minHeight = "";
    $("#chart").classList.toggle("nmode", newsOn);
    $("#nview").hidden = !newsOn; $("#nbellbox").hidden = !newsOn;
    root.querySelectorAll(".row .lc.nwc").forEach((x) => { const o = newsOn && x.dataset.s === cur; x.classList.toggle("on", o); x.setAttribute("aria-pressed", String(o)); });
    root.querySelectorAll(".row .lc:not(.nwc)").forEach((x) => x.classList.toggle("on", !newsOn && x.dataset.s === cur && x.dataset.a === MA[mode])); // con le notizie aperte il tasto del grafico si spegne
    closeMenu();
    if (cur) setView({ s: cur, m: mode, ...(maxed ? { max: 1 } : {}), ...(newsOn ? { n: 1 } : {}) });
    if (newsOn) { loadNews(false); requestAnimationFrame(alignBell); }
    if (!wideAnim) slideIn(newsOn ? $("#nview") : root.querySelector("#chart>.cwrap"));
  }
  async function loadNews(fresh) {
    const s = cur, my = ++newsReq;
    if (newsSym !== s) { newsSym = s; newsItems = null; }
    drawNews();
    let r = null;
    try { r = await chrome.runtime.sendMessage({ type: "news", s, fresh, read: newsBadge(s), n: (() => { const it = item(s); return it.t || (quotes[s] && (quotes[s].ln || quotes[s].sn)) || ""; })() }); } catch (_) {}
    if (my !== newsReq || cur !== s) return;
    newsItems = r || (newsItems && newsItems.length ? newsItems : false);
    drawNews();
  }
  function drawNews() {
    const v = $("#nview"); if (!v || !newsOn || !cur) return;
    const s = cur, sub = !!(st.nsub && st.nsub[s]), nm = item(s).n;
    const bell = `<button class="pill nbell${sub ? " on" : ""}" data-a="newssub" aria-pressed="${sub}" title="${sub
      ? L(`Avvisi attivi: ti mando una notifica quando esce una notizia su ${nm}. Clic per disattivarli.`, `Alerts on: you get a notification when there is a story about ${nm}. Click to turn them off.`)
      : L(`Ricevi una notifica quando esce una notizia su ${nm}`, `Get a notification when there is a story about ${nm}`)}">${BELLICON}<span>${sub ? L("Avvisi attivi", "Alerts on") : L("Avvisami", "Notify me")}</span></button>`;
    const back = `<button class="link nback" data-a="newsback" title="${L("Torna al grafico", "Back to the chart")}">‹ ${L("Grafico", "Chart")}</button>`;
    $("#nbellbox").innerHTML = bell;
    const head = `<div class="nvh">${back}<b>${L("Notizie su", "News about")} ${esc(nm)}</b></div>`
      + (newsItems && newsItems.length ? `<div class="nvc"><span></span><span>${L("Grado notizia", "Importance")}</span><span>${L("Tag notizia", "News tag")}</span></div>` : "");
    const dots = (n) => `<span class="nlv" aria-label="${L("Grado", "Importance")} ${n}/3">${[1, 2, 3].map((i) => `<i${i > n ? ' class="o"' : ""}></i>`).join("")}</span>`;
    const tag = (k) => { const t = NTAG[k] || NTAG.gen; return `<span class="ntag">${L(t[0], t[1])}</span>`; };
    const src = (n) => n.k === "sec" ? L("SEC, modulo 8-K", "SEC, Form 8-K") : esc(n.src || "Yahoo Finance");
    let body;
    if (newsItems === null) body = `<div class="nvmsg">${L("Caricamento…", "Loading…")}</div>`;
    else if (newsItems === false) body = `<div class="nvmsg">${L("Notizie non raggiungibili in questo momento.", "News can't be reached right now.")} <button class="link" data-a="newsretry">${L("Riprova", "Try again")}</button></div>`;
    else if (!newsItems.length) body = `<div class="nvmsg">${L(`Nessuna notizia importante recente su ${esc(nm)}.`, `No recent important stories about ${esc(nm)}.`)}</div>`;
    else body = `<div class="nvl">${newsItems.map((n) => `<a class="ni" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer" title="${L("Apri in una nuova scheda", "Open in a new tab")}"><span class="nx"><span class="nt">${esc(L(n.titleIt || n.title, n.title))}</span><span class="nm2">${src(n)}${n.t ? `, ${ago(n.t)}` : ""}</span></span>${dots(n.lvl || 1)}${tag(n.tag)}</a>`).join("")}</div>`;
    const disc = `<div class="nvd note"><span class="nt1">${L("Owlook mostra solo le notizie rilevanti", "Owlook shows only relevant news")}</span><button class="ninfo" data-a="noteinfo" aria-expanded="${newsInfo}" aria-label="${L("Quali notizie", "Which news")}" data-tt="${L("Quali notizie", "Which news")}">i</button><div class="nfull"${newsInfo ? "" : " hidden"}>${L("Owlook mostra solo le notizie rilevanti: agenzie e testate principali (Reuters, AP, Bloomberg, Wall Street Journal, CNBC…), comunicati ufficiali delle aziende e moduli 8-K depositati alla SEC (solo società USA). Classifiche, consigli d'acquisto e articoli d'opinione sono esclusi. Grado e tag sono assegnati automaticamente.",
      "Owlook shows only relevant news: major agencies and outlets (Reuters, AP, Bloomberg, Wall Street Journal, CNBC…), official company press releases and Form 8-K filings with the SEC (US companies only). Rankings, buy tips and opinion pieces are left out. Importance and tag are assigned automatically.")}</div></div>`;
    v.innerHTML = head + body + disc;
  }
  async function openChart(sym, m = "c", keepNews = false) {
    const wasVis = !$("#chart").hidden && cur && cur !== sym;
    if (newsOn && !keepNews) setNews(false); // riga o tasto dei grafici: torna il grafico
    setView({ s: sym, m, ...(maxed ? { max: 1 } : {}), ...(newsOn && cur === sym ? { n: 1 } : {}) });
    if (cur === sym && chart && mode === m) return;
    if (newsOn && cur !== sym) setNews(false);
    const changed = cur !== sym || mode !== m;
    if (mode !== m && chart) { chart.remove(); chart = null; S = {}; resetFx(); }
    mode = m; closeMenu();
    backCal = false;
    if (calOpen) { calOpen = false; clearInterval(calT); clearInterval(eT); } // il grafico prende il posto del calendario
    cur = sym; dayVol = null; pendVol = null; hov = null; lag = null; liveBar = null; lrFree = false; yLock = null; if (changed) fitAll = false;
    // la vista ricordata vale solo finché resti su questo titolo: aprendo un altro titolo dimentico le altre
    { let ch = false; for (const k of Object.keys(CZ)) if (k.split("|")[0] !== sym) { delete CZ[k]; ch = true; } if (ch) czStore(); }
    if (!isOpen()) { setOpen(true); persist(); }
    const it = item(sym);
    $("#c-sym").textContent = it.n;
    chartLogo(); // logo in alto a sinistra, se scelto per le liste
    $("#c-name").textContent = it.t && it.t !== it.n ? it.t : sym !== it.n ? sym : "";
    $("#c-price").dataset.k = sym; $("#c-chg").dataset.k = sym; $("#c-dly").dataset.dk = sym; delete $("#c-dly").dataset.tip;
    delete $("#c-price").dataset.hk;
    $("#c-price").textContent = ""; $("#c-chg").textContent = ""; $("#c-per").textContent = "";
    chgPlace();
    tick(); clearInterval(clockT); clockT = setInterval(tick, 1000);
    drawTools(); drawInd();
    apply(); syncLive();
    if (changed) { bars = []; if (chart) setAll(); }
    if (wasVis && !wideAnim) slideIn($("#chart")); // altro titolo col grafico già aperto
    msg("Caricamento…");
    try { await lib(); } catch (_) { return msg("Impossibile caricare il grafico. Ricarica la pagina e riprova."); }
    if (cur !== sym) return;
    build();
    load(false);
  }
  function tick() {
    if (!NY) clockFmt();
    const z = tzOf();
    $("#clocktz").textContent = z[2]; $("#clockbox").dataset.tt = `Ora di ${z[1]} · si cambia nelle impostazioni`;
    $("#clock").textContent = NY.format(new Date());
  }

  // ---------- Calendario economico USA (date dai siti ufficiali, vedi calendar.js) ----------
  let calOpen = false, calData = null, calT = null, calDays = 45, calLoading = false, calBadgeT = null, calRows = [], fcData = null, tipRow = null;
  let LTIME, ETIME, DAYF;
  const calFmts = () => {
    LTIME = new Intl.DateTimeFormat(LOC, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    ETIME = new Intl.DateTimeFormat(LOC, { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    DAYF = new Intl.DateTimeFormat(LOC, { weekday: "long", day: "numeric", month: "long" });
  };
  calFmts();
  const dkey = (t) => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  async function loadCal(force) {
    if (calLoading) return;
    calLoading = true;
    if (force && calOpen && st.calv !== "e") { $("#calsub").hidden = false; $("#calsub").textContent = L("Aggiorno dai siti ufficiali…", "Updating from the official sites…"); }
    try { const r = await chrome.runtime.sendMessage({ type: "calendar", force: !!force }); if (r && r.ev) calData = r; } catch (_) {}
    calLoading = false;
    if (calOpen) { drawCal(force); loadFc(force); }
    calBadge();
  }
  async function loadFc(force) {
    try { const r = await chrome.runtime.sendMessage({ type: "forecasts", force: !!force }); if (r && r.items) { fcData = r; if (calOpen && st.calv !== "e") drawCal(false); } } catch (_) {}
  }
  function openCal(keepMax) {
    calOpen = true; // prima: dal grafico al calendario il pannello resta largo
    const wasMax = maxed; // a tutto schermo resta a tutto schermo passando fra grafico, macro e utili
    if (cur) closeChart();
    if (keepMax || wasMax) maxed = true;
    setView({ cal: 1, ...(maxed ? { max: 1 } : {}) });
    if (!isOpen()) { setOpen(true); persist(); }
    apply(); applyCalv(); drawCal(true);
    if (!calData || Date.now() - calData.at > 30 * 60000) loadCal(false); else loadFc(false);
    // ogni secondo controllo se siamo vicini a un'uscita: dal minuto prima finché arriva il valore pubblicato
    // ridisegno ogni secondo (conto alla rovescia, poi il dato appena c'è), altrimenti ogni 30 secondi
    clearInterval(calT); let calN = 0; calT = setInterval(() => { calN++; if (calHot() || calN % 30 === 0) drawCal(false); }, 1000);
    if (st.calv === "e") { eGoToday = true; drawEarn(); loadEarn(false); }
    // utili: il service worker decide se riscaricare (ogni 10 minuti nelle ore dei report)
    clearInterval(eT); eT = setInterval(() => { if (calOpen && st.calv === "e" && !document.hidden) loadEarn(false); }, 60000);
  }
  function closeCal() { calOpen = false; maxed = false; clearInterval(calT); clearInterval(eT); apply(); }
  const until = (ms) => { if (ms < 60000) return ms < 1000 ? L("adesso", "now") : L(`tra ${Math.ceil(ms / 1000)} s`, `in ${Math.ceil(ms / 1000)} s`); const m = Math.round(ms / 60000); return m < 60 ? `tra ${m} min` : m < 1440 ? `tra ${Math.floor(m / 60)} h ${pad2(m % 60)} min` : ""; };
  // vicino a un'uscita importante: dal minuto prima finché il valore pubblicato non è arrivato (al massimo 10 minuti)
  const calHot = () => { const now = Date.now(); return calRows.some((e) => e.t - now < 61000 && now - e.t < 10 * 60000 && (e.t > now || (EVMET[e.k] && !(ACT[`${e.k}:${e.t}`] || {}).fresh))); };
  const pad2 = (n) => String(n).padStart(2, "0");
  function drawCal(scroll) {
    const body = $("#calbody"), min = 3; // solo le pubblicazioni di importanza massima
    if (!calData) { body.innerHTML = '<div class="empty">Carico le date dai siti ufficiali…</div>'; return; }
    const now = Date.now(), from = now - 7 * 864e5, to = now + calDays * 864e5;
    const EV = (calRows = calData.ev.filter((e) => e.imp >= min && e.t >= from && e.t <= to));
    for (const e of EV) if (e.t <= now && now - e.t < 36 * 3600000) ensureActual(e, fcData && fcData.items.filter((x) => FC_RE[e.k] && FC_RE[e.k].test(x.title) && Math.abs(x.t - e.t) < 3 * 3600000));
    const next = EV.find((e) => e.t > now);
    const today = dkey(now), tomorrow = dkey(now + 864e5);
    let h = "", day = null;
    for (const e of EV) {
      const k = dkey(e.t);
      if (k !== day) {
        day = k;
        h += `<div class="cday${k === today ? " today" : ""}" data-day="${k}">${k === today ? "Oggi · " : k === tomorrow ? "Domani · " : ""}${DAYF.format(new Date(e.t))}</div>`;
      }
      const past = e.t <= now, url = past ? e.rel || e.page : e.page;
      const lbl = past && e.rel ? "Comunicato ↗" : "Calendario ↗";
      const tip = past && e.rel ? "Apri il comunicato sul sito ufficiale" : "Apri il calendario ufficiale (il link al comunicato compare all'ora di pubblicazione)";
      const cd = e === next ? until(e.t - now) : "";
      const todayPub = past && k === today; // uscito oggi: resta in evidenza
      h += `<div class="cev${past ? " past" : ""}${past && k !== today ? " old" : ""}${todayPub ? " tpub" : ""}${e === next ? " next" : ""}" data-i="${EV.indexOf(e)}"><span class="ctime"><b>${LTIME.format(new Date(e.t))}</b><span>${ETIME.format(new Date(e.t))} ET</span></span>`
        + `<span class="cname"><b>${esc(e.n)}</b><span>${esc(e.src)}${e.est ? ' · <i title="Data calcolata dal calendario abituale: verifica sul sito">≈ data calcolata</i>' : ""}${cd ? ` · <em>${cd}</em>` : ""}</span></span>`
        + `<a class="clink${past && e.rel ? " rel" : ""}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${tip}">${lbl}</a>${evVals(e)}</div>`;
    }
    if (!EV.length) h = '<div class="empty">Nessun evento in questo periodo.</div>';
    if (calDays < 400) h += `<button class="pill calmore" data-a="calmore">Mostra le settimane successive</button>`;
    hideTip();
    const y = body.scrollTop;
    body.innerHTML = h;
    if (scroll) {
      // in cima l'intestazione del giorno: quello di oggi se oggi è uscito qualcosa, altrimenti quello
      // del prossimo dato (così la riga non finisce sotto l'intestazione fissa)
      const day = body.querySelector(`.cday[data-day="${today}"]`) || (next && body.querySelector(`.cday[data-day="${dkey(next.t)}"]`));
      body.scrollTop = 0; // le intestazioni fisse (sticky) danno la posizione giusta solo a lista in cima
      body.scrollTop = day ? Math.max(0, day.offsetTop - body.offsetTop) : 0;
    } else body.scrollTop = y;
    if (cvI != null) { const r = body.querySelector(`.cev.old[data-i="${cvI}"]`); if (r && r.matches(":hover")) cvShow(r); else hideTip(); } // arrivati i valori: aggiorno il riquadro aperto
    const fail = calData.fail || [], upd = calData.at ? L(`Aggiornato alle ${LTIME.format(new Date(calData.at))}`, `Updated at ${LTIME.format(new Date(calData.at))}`) : "";
    if (st.calv !== "e") {
      // sotto il titolo: fuso e ultimo aggiornamento (fonti nel suggerimento); in fondo: la legenda dei colori, una frase per riga
      const cs = $("#calsub");
      cs.hidden = false;
      cs.textContent = `${L("Orari nel fuso scelto · ET = New York.", "Your time zone · ET = New York.")} ${upd}.`;
      cs.dataset.tt = `${L("Date", "Dates")}: BLS, BEA, Census, Federal Reserve · ${L("valori attesi", "forecasts")}: Forex Factory${fcData && fcData.fail ? ` (${L("non raggiungibile", "unreachable")})` : ""}`
        + (fail.length ? ` · ${fail.join(", ")}: ${L("non raggiungibile, uso le date già pubblicate", "unreachable, using the dates already published")}` : "");
      $("#calnote").innerHTML = `<span class="cln"><b class="ar">=</b> ${L("pubblicato uguale all'atteso/precedente", "actual equal to the forecast/previous")}</span>`
        + `<span class="cln"><b style="color:var(--cgood)">${L("Verde", "Green")}:</b> ${L("meglio delle attese - più crescita, occupazione e consumi, meno inflazione, disoccupazione e tassi", "better than expected - more growth, jobs and spending, less inflation, unemployment and rates")}</span>`
        + `<span class="cln"><b style="color:var(--cbad)">${L("Rosso", "Red")}:</b> ${L("peggio delle attese - il contrario", "worse than expected - the opposite")}</span>`;
    }
  }
  // ---------- Calendario degli utili (dati: Nasdaq, vedi calendar.js) ----------
  let eMon = null, eData = null, eOpen = null, eSort = null, eGoToday = false, eDf = "all", eAll = false, eLoad = null, eT = null, backCal = false;
  const ECAPS = [0, 5e8, 1e10, 5e10, 1e11];
  const eCapV = () => (ECAPS.includes(st.ecap) ? st.ecap : 1e10);
  const eSessV = () => (st.esess === "b" || st.esess === "a" ? st.esess : "all");
  const NYD = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  const EYP = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" });
  const nyDay = (t = Date.now()) => NYD.format(new Date(t));
  const ymdU = (d) => { const [y, m, g] = d.split("-").map(Number); return Date.UTC(y, m - 1, g); };
  const addD = (d, n) => new Date(ymdU(d) + n * 864e5).toISOString().slice(0, 10);
  const monOf = (d) => { const w = new Date(ymdU(d)).getUTCDay(); return addD(d, w === 0 ? 1 : w === 6 ? 2 : 1 - w); }; // nel weekend: la settimana dopo
  function etMs(d, h, mi) { // ora di New York → istante
    const [y, m, g] = d.split("-").map(Number);
    let t = Date.UTC(y, m - 1, g, h + 5, mi);
    for (let i = 0; i < 2; i++) {
      const p = Object.fromEntries(EYP.formatToParts(new Date(t)).map((x) => [x.type, +x.value || 0]));
      const diff = (Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - Date.UTC(y, m - 1, g, h, mi)) / 60000;
      if (!diff) break;
      t -= diff * 60000;
    }
    return t;
  }
  const dU = (d, o) => new Intl.DateTimeFormat(LOC, { timeZone: "UTC", ...o }).format(new Date(ymdU(d)));
  const cap1 = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  let ewtW = null;
  function weekLabel(mon) {
    const fri = addD(mon, 4), m1 = dU(mon, { month: "short" }), m2 = dU(fri, { month: "short" });
    return m1 === m2 ? `${+mon.slice(8)} – ${+fri.slice(8)} ${m2}` : `${+mon.slice(8)} ${m1} – ${+fri.slice(8)} ${m2}`;
  }
  const eNum = (v, dg = 2) => v.toLocaleString(NLOC, { minimumFractionDigits: dg, maximumFractionDigits: dg });
  const eUsd = (v) => (v == null ? "—" : st.lang === "en" ? `${v < 0 ? "−" : ""}$${eNum(Math.abs(v))}` : `${v < 0 ? "−" : ""}${eNum(Math.abs(v))} $`);
  const eCapS = (c) => (!c ? "—" : st.lang === "en"
    ? c >= 1e12 ? `${eNum(c / 1e12)}T` : c >= 1e9 ? `${eNum(c / 1e9, c >= 1e10 ? 0 : 1)}B` : `${eNum(c / 1e6, 0)}M`
    : c >= 1e9 ? `${eNum(c / 1e9, c >= 1e10 ? 0 : 1)} mld` : `${eNum(c / 1e6, 0)} mln`);
  const ESUN = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const EMOON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  const EQ = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ESTAR = '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  const mineSet = () => new Set([...(st.lists || []).flatMap((l) => (l.items || []).map((x) => x.s)), ...(st.pf || []).map((x) => x.s)]);
  // righe del giorno con i filtri: i tuoi titoli ci sono sempre (anche sotto la soglia) e vengono per primi
  function eRows(d, mine) {
    const e = eData && eData.days[d];
    if (!e) return null;
    const c = eCapV();
    return e.rows.map((r) => ({ s: r[0], n: r[1], cap: r[2] || 0, t: r[3], est: r[4], act: r[5], sur: r[6], ly: r[7], ne: r[8], tm: r[9] || null, me: mine.has(r[0]) }))
      .filter((r) => (st.emine ? r.me : r.me || r.cap >= c))
      .sort((a, b) => b.me - a.me || b.cap - a.cap);
  }
  // Stato del report. Il calendario dice solo "prima dell'apertura" o "dopo la chiusura": la fascia
  // in cui escono di solito i risultati (e parte la conference call) è 6:00–9:30 o 16:00–18:30 di New York.
  const EWIN = { b: [[6, 0], [9, 30]], a: [[16, 0], [18, 30]] };
  function eState(d, r, now = Date.now()) {
    if (r.act != null) return "out";
    if (r.tm) return now < r.tm - 15 * 60000 ? "wait" : now <= r.tm + 90 * 60000 ? "live" : "late"; // orario annunciato dall'azienda
    const w = EWIN[r.t];
    if (!w) return d < nyDay(now) ? "nd" : "wait";
    const a = etMs(d, ...w[0]), b = etMs(d, ...w[1]);
    return now < a ? "wait" : now <= b ? "live" : "late";
  }
  const eWinTxt = (d, t, tm) => { if (tm) return LTIME.format(new Date(tm)); const w = EWIN[t]; return w ? `${LTIME.format(new Date(etMs(d, ...w[0])))}–${LTIME.format(new Date(etMs(d, ...w[1])))}` : ""; };
  const eLive = (d, r) => (eState(d, r) === "live" ? `<i class="elive" title="${L(`Risultati in uscita adesso (${r.tm ? "alle" : "fascia"} ${eWinTxt(d, r.t, r.tm)} ora tua)`, `Results due now (${r.tm ? "at" : ""} ${eWinTxt(d, r.t, r.tm)} your time)`)}"></i>` : "");
  const eTile = (r, d) => `<button class="et${r.me ? " mine" : ""}" data-a="eopen" data-s="${esc(r.s)}" data-n="${esc(r.n)}" title="${esc(r.s)} · ${esc(r.n)}${r.cap ? ` · ${eCapS(r.cap)}` : ""}">${logoTag(r.s, r.s)}${r.me ? `<i class="ems">${ESTAR}</i>` : ""}${d ? eLive(d, r) : ""}<b>${esc(r.s)}</b></button>`;
  const EK = () => ({ b: [ESUN, L("Prima dell'apertura", "Before the open")], a: [EMOON, L("Dopo la chiusura", "After the close")], n: [EQ, L("Orario non comunicato", "Time not announced")] });
  // una riga di loghi per fascia oraria; extra: aziende di un'altra fascia che non ha una riga sua (entrano nel "+N")
  function eLine(d, k, rows, n, extra = 0) {
    if (!rows.length) return "";
    const show = rows.length > n || extra ? rows.slice(0, n - 1) : rows, more = rows.length - show.length + extra, [ic, tt] = EK()[k];
    return `<div class="eg" style="--en:${n}"><span class="es" title="${tt}">${ic}</span>${show.map((r) => eTile(r, d)).join("")}`
      + (more ? `<button class="et more" data-a="emore" data-d="${d}" data-ek="${k}" title="${L("Mostra tutte", "Show all")}"><span class="lg">+${more}</span><b>${L("altre", "more")}</b></button>` : "") + "</div>";
  }
  function eMacro(d) {
    if (!calData) return "";
    const SH = { nfp: "NFP", cpi: "CPI", ppi: "PPI", gdp: L("PIL", "GDP"), pce: "PCE", retail: L("Vendite", "Retail"), fomc: "Fed" };
    return calData.ev.filter((e) => SH[e.k] && e.imp >= 3 && nyDay(e.t) === d).slice(0, 2)
      .map((e) => `<em class="emac" title="${esc(T(e.n))}">${SH[e.k]} ${LTIME.format(new Date(e.t))}</em>`).join("");
  }
  const eLogo = (r) => `<span class="elw">${logoTag(r.s, r.s)}${r.d ? eLive(r.d, r) : ""}</span>`;
  function eCols() { const w = $("#ebody").clientWidth || 640; return Math.max(5, Math.min(30, Math.floor((w - 12 - 14 - 82 - 18 + 4) / 42))); } // 38 px per logo + 4 di spazio
  function drawEarn() {
    if (st.calv !== "e") return;
    if (!eMon) eMon = monOf(nyDay());
    $("#ewt").textContent = weekLabel(eMon);
    // larghezza fissa, quella dell'etichetta più lunga dell'anno: cambiando settimana la barra non si ridimensiona
    if (!ewtW || ewtW.k !== st.lang) { const el = $("#ewt"), f = fontOf(el); let m = 0; for (let k = -60; k <= 60; k++) m = Math.max(m, tw(weekLabel(addD(eMon, k * 7)), f)); if (m > 0) ewtW = { k: st.lang, w: Math.ceil(m) + 10 }; }
    if (ewtW) $("#ewt").style.width = `${ewtW.w}px`;
    const cv = eCapV(), sv = eSessV();
    const capL = [L("Tutte", "All"), "0,5", "10", "50", L("100 mld", "100 $B")].map((x, i) => (i === 1 && NLOC.startsWith("en") ? "0.5" : x));
    const capT = [L("Tutte le capitalizzazioni", "Any market cap"), ...["0,5", "10", "50", "100"].map((x) => L(`Capitalizzazione da ${x} mld $`, `Market cap from $${x.replace(",", ".")}B`))];
    const ev = st.eview === "r" ? "r" : "w";
    const evw = `<span class="tabs evw">${[["w", L("Calendario", "Calendar"), ""], ["r", L("Risultati", "Results"), L("Stime e risultati", "Estimates and results")]].map(([v, l, t]) => `<button class="tab${ev === v ? " on" : ""}" data-a="eview" data-v="${v}"${t ? ` title="${t}"` : ""}>${l}</button>`).join("")}</span>`;
    if ($("#evwb").dataset.h !== evw) { $("#evwb").dataset.h = evw; $("#evwb").innerHTML = evw; } // ridisegno solo se cambia (il cursore scorre)
    $("#efil").innerHTML = `<div class="efr"><span class="tabs ecaps" title="${L("Capitalizzazione minima", "Minimum market cap")}">${ECAPS.map((v, i) => `<button class="tab${cv === v && !st.emine ? " on" : ""}" data-a="ecap" data-v="${v}" title="${capT[i]}">${capL[i]}</button>`).join("")}</span>`
      + `<span class="efs"><span class="tabs esv">${[["all", L("Tutti", "All"), ""], ["b", ESUN, L("Prima dell'apertura", "Before the open")], ["a", EMOON, L("Dopo la chiusura", "After the close")]].map(([v, l, t]) => `<button class="tab${sv === v ? " on" : ""}" data-a="esess" data-v="${v}"${t ? ` title="${t}" aria-label="${t}"` : ""}>${l}</button>`).join("")}</span>`
      + `<button class="tb emine${st.emine ? " on" : ""}" data-a="emine" aria-pressed="${!!st.emine}" title="${L("Solo i titoli delle tue liste e del portafoglio", "Only tickers in your lists and portfolio")}">${ESTAR} ${L("I miei", "Mine")}</button></span></div>`;
    const body = $("#ebody");
    if (!eData || eData.mon !== eMon) { body.innerHTML = `<div class="empty">${L("Carico gli utili…", "Loading earnings…")}</div>`; eNote(); return; }
    const n = eCols(), today = nyDay(), mine = mineSet();
    if (ev === "r") { const y0 = body.scrollTop; body.innerHTML = eResults(today, mine, sv); body.scrollTop = y0; eNote(); eKeep(today); spScan(); return; }
    let h = "";
    for (let i = 0; i < 5; i++) {
      const d = addD(eMon, i), rows = eRows(d, mine), by = (k) => (rows ? rows.filter((r) => r.t === k) : []);
      const g = { b: sv !== "a" ? by("b") : [], a: sv !== "b" ? by("a") : [], n: sv === "all" ? by("n") : [] };
      const cnt = g.b.length + g.a.length + g.n.length, open = eOpen === d;
      const lines = !rows ? `<div class="enone">${L("Dati non disponibili", "No data")}</div>`
        : !cnt ? `<div class="enone">${L("Nessun report con questi filtri", "No reports with these filters")}</div>`
        : (() => { // al massimo due righe per giorno: la terza fascia (senza orario) finisce nel "+N" della seconda
          const ls = ["b", "a", "n"].filter((k) => g[k].length);
          return ls.slice(0, 2).map((k, i) => eLine(d, k, g[k], n, i === 1 && ls[2] ? g[ls[2]].length : 0)).join("");
        })();
      h += `<div class="ewd${d === today ? " today" : ""}${d < today ? " past" : ""}${open ? " open" : ""}${cnt ? " ego" : ""}" data-ed="${d}"${cnt ? ` data-a="eday" data-d="${d}" title="${L("Stime e risultati del giorno", "Estimates and results for the day")}"` : ""}>`
        + `<button class="edl" data-a="eday" data-d="${d}" aria-expanded="${open}"><b>${cap1(dU(d, { weekday: "short" }).replace(".", ""))} <span>${+d.slice(8)}</span></b><small>${cnt} ${L("report", cnt === 1 ? "report" : "reports")}</small>${eMacro(d)}${cnt ? `<i class="echev">${L("Risultati ›", "Results ›")}</i>` : ""}</button>`
        + `<div class="egs">${lines}</div></div>`;
    }
    const y = body.scrollTop;
    body.innerHTML = h;
    body.scrollTop = y;
    eNote();
    eKeep(today);
  }
  // il giorno di oggi resta in cima anche quando i filtri cambiano l'altezza dei giorni prima; smette solo se
  // scorri tu (rotella, dita, tastiera, barra), e ci torna aprendo gli utili o aggiornando
  let eAnch = true;
  function eKeep(today) {
    if (eGoToday) { eGoToday = false; eAnch = true; }
    if (eAnch) eScroll(today);
    const b = $("#ebody");
    if (b && !b.dataset.anch) {
      b.dataset.anch = 1;
      const off = () => { eAnch = false; };
      b.addEventListener("wheel", off, { passive: true });
      b.addEventListener("touchmove", off, { passive: true });
      b.addEventListener("keydown", (e) => { if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key)) off(); });
      b.addEventListener("pointerdown", (e) => { if (e.offsetX > b.clientWidth) off(); }); // barra di scorrimento
    }
  }
  // Stime e risultati: per ogni giorno della settimana (dal più recente) chi ha già pubblicato, con stima,
  // EPS effettivo e sorpresa, chi sta pubblicando adesso e chi è atteso; in cima il bilancio della settimana.
  function eResults(today, mine, sv) {
    const days = [0, 1, 2, 3, 4].map((i) => addD(eMon, i));
    let beat = 0, miss = 0, inl = 0, pub = 0, live = 0, h = "";
    for (const d of days) {
      const rows = (eRows(d, mine) || []).filter((r) => sv === "all" || r.t === sv).map((r) => ({ ...r, d, stt: eState(d, r) }));
      if (!rows.length) continue;
      rows.sort((a, b) => b.cap - a.cap); // per capitalizzazione, dalla più grande
      if (eSort) { // per sorpresa: prima chi l'ha già (dalla più alta o dalla più bassa), poi gli altri nell'ordine solito
        const k = (r) => (r.act != null && r.sur != null ? r.sur : null);
        rows.sort((a, b) => { const x = k(a), y = k(b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : eSort === "d" ? y - x : x - y; });
      }
      for (const r of rows) {
        if (r.stt === "live") live++;
        if (r.act == null || r.sur == null) continue;
        pub++; if (r.sur > 0) beat++; else if (r.sur < 0) miss++; else inl++;
      }
      const show = eAll || eOpen === d ? rows : rows.slice(0, 30);
      h += `<div class="ersec${d === today ? " today" : " nosp"}" data-ed="${d}"><div class="cday${d === today ? " today" : ""}">${d === today ? L("Oggi · ", "Today · ") : ""}${cap1(dU(d, { weekday: "long", day: "numeric", month: "long" }))}</div>`
        + `<div class="erh"><span></span><span></span><span></span><span>${L("Stima", "Estimate")}</span><span>${L("Effettivo", "Actual")}</span><button class="th ersort${eSort ? " on" : ""}" data-a="esort" title="${L("Ordina per sorpresa", "Sort by surprise")}" aria-label="${L("Ordina per sorpresa", "Sort by surprise")}">${L("Sorpresa", "Surprise")}<i>${eSort === "d" ? "▼" : eSort === "a" ? "▲" : "↕"}</i></button></div>`
        + show.map(eResRow).join("")
        + (show.length < rows.length ? `<button class="pill eall" data-a="eresall" data-d="${d}">${L(`Mostra tutte e ${rows.length}`, `Show all ${rows.length}`)}</button>` : "") + "</div>";
    }
    const pct = (n) => (pub ? Math.round((n / pub) * 100) : 0);
    const sum = `<div class="ersum">${live ? `<span class="erlive"><i class="elive"></i>${L(`${live} in uscita adesso`, `${live} reporting now`)}</span>` : ""}`
      + `<span><b>${pub}</b> ${L("pubblicati", "reported")}</span><span class="up"><b>${beat}</b> ${L("sopra le stime", "beat")}${pub ? ` · ${pct(beat)}%` : ""}</span>`
      + `<span class="dn"><b>${miss}</b> ${L("sotto", "missed")}${pub ? ` · ${pct(miss)}%` : ""}</span>${inl ? `<span><b>${inl}</b> ${L("in linea", "in line")}</span>` : ""}</div>`;
    return (h || `<div class="empty">${L("Nessun report in questa settimana con questi filtri.", "No reports this week with these filters.")}</div>`);
  }
  function eResRow(r) {
    const st0 = r.stt, sess = EK()[r.t] ? EK()[r.t][0] : "";
    const res = st0 === "out"
      ? `<b class="eact">${eUsd(r.act)}</b>` + (r.sur != null && r.sur !== 0 ? `<span class="esur ${r.sur > 0 ? "up" : "dn"}">${r.sur > 0 ? "▲" : "▼"}${eNum(Math.abs(r.sur), 2)}%</span>` : `<span class="esur wait">${r.sur === 0 ? L("in linea", "in line") : "—"}</span>`)
      : st0 === "live" ? `<span class="erst live"><i class="elive"></i>${L("in uscita", "now")}</span><span class="esur wait">${eWinTxt(r.d, r.t, r.tm)}</span>`
      : st0 === "late" ? `<span class="erst">${L("non ancora", "not yet")}</span><span class="esur wait">—</span>`
      : st0 === "wait" ? `<span class="erst">${r.tm ? L(`alle ${LTIME.format(new Date(r.tm))}`, `at ${LTIME.format(new Date(r.tm))}`) : r.d === nyDay() && EWIN[r.t] ? L(`dalle ${LTIME.format(new Date(etMs(r.d, ...EWIN[r.t][0])))}`, `from ${LTIME.format(new Date(etMs(r.d, ...EWIN[r.t][0])))}`) : L("attesi", "due")}</span><span class="esur wait">—</span>`
      : `<span class="erst">—</span><span class="esur wait">—</span>`;
    return `<div class="erw erx" data-a="eopen" data-s="${esc(r.s)}" data-n="${esc(r.n)}" title="${L("Apri il grafico", "Open the chart")}">${eLogo(r)}`
      + `<span class="enm"><b>${esc(r.s)}${r.me ? `<i class="estar">${ESTAR}</i>` : ""}<i class="ess">${sess}</i></b><span>${esc(r.n)}</span></span>`
      + spSlot(r)
      + `<span class="eeps"><b>${eUsd(r.est)}</b><span>${r.ne ? `${r.ne} ${r.ne === 1 ? L("stima", "est.") : L("stime", "ests.")}` : ""}</span></span>${res}</div>`;
  }
  // ---------- Mini grafico della seduta nelle righe degli utili (come nell'app Borsa di Apple) ----------
  // Solo per chi pubblica oggi: la seduta di oggi, verde sopra la chiusura precedente (tratteggiata) e rossa
  // sotto. Scarico solo le righe visibili e le aggiorno ogni minuto.
  const SPK = new Map(), spQ = [], spBusy = new Set();
  let spIO = null, spT = null, spN = 0;
  const spDay = (r) => (r.d === nyDay() ? r.d : null); // solo chi pubblica oggi: la seduta di oggi, in diretta
  function spSvg(v) {
    if (!v || !v.p || v.p.length < 2) return "";
    const W = 64, H = 26, N = Math.max(78, v.p[v.p.length - 1][0] + 1), ys = v.p.map((x) => x[1]), base = v.pc || v.p[0][1];
    let lo = Math.min(base, ...ys), hi = Math.max(base, ...ys); if (hi - lo < base * 0.002) { lo -= base * 0.001; hi += base * 0.001; }
    const X = (i) => ((i / (N - 1)) * W).toFixed(1), Y = (y) => (2 + (1 - (y - lo) / (hi - lo)) * (H - 4)).toFixed(1), by = Y(base), id = `sp${++spN}`;
    const d = v.p.map((x, i) => `${i ? "L" : "M"}${X(x[0])} ${Y(x[1])}`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><defs><clipPath id="${id}a"><rect x="-2" y="-2" width="${W + 4}" height="${+by + 2}"/></clipPath><clipPath id="${id}b"><rect x="-2" y="${by}" width="${W + 4}" height="${H - by + 2}"/></clipPath></defs>`
      + `<line x1="0" x2="${W}" y1="${by}" y2="${by}" stroke="var(--mut)" stroke-width="1" stroke-dasharray="1.5 2.5" opacity=".7"/>`
      + `<path d="${d}" fill="none" stroke="var(--up)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#${id}a)"/>`
      + `<path d="${d}" fill="none" stroke="var(--dn)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#${id}b)"/></svg>`;
  }
  function spSlot(r) {
    const d = spDay(r);
    if (!d) return '<span class="espk"></span>';
    const k = `${r.s}|${d}`, tt = L(`Andamento della seduta del ${dU(d, { day: "numeric", month: "short" })} rispetto alla chiusura precedente (tratteggiata)`, `${dU(d, { month: "short", day: "numeric" })} session vs. the previous close (dashed)`);
    return `<span class="espk" data-sk="${esc(k)}" data-tt="${esc(tt)}">${spSvg(SPK.get(k))}</span>`;
  }
  function spPaint(k) { const h = spSvg(SPK.get(k)); root.querySelectorAll(`.espk[data-sk="${CSS.escape(k)}"]`).forEach((el) => { el.innerHTML = h; }); }
  function spPump() {
    while (spBusy.size < 4 && spQ.length) {
      const k = spQ.shift(); if (spBusy.has(k)) continue;
      spBusy.add(k);
      const [s, d] = k.split("|");
      chrome.runtime.sendMessage({ type: "spark", s, d }).then((v) => { if (v) { v._at = Date.now(); SPK.set(k, v); spPaint(k); } }, () => {}).finally(() => { spBusy.delete(k); spPump(); });
    }
  }
  const spWant = (k) => { const v = SPK.get(k); if ((!v || (!v.done && Date.now() - (v._at || 0) > 55000)) && !spQ.includes(k) && !spBusy.has(k)) { if (v) v._at = Date.now(); spQ.push(k); spPump(); } };
  function spScan() {
    const b = $("#ebody");
    if (!spIO) spIO = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) spWant(e.target.dataset.sk); }, { root: b, rootMargin: "120px 0px" });
    spIO.disconnect();
    b.querySelectorAll(".espk[data-sk]").forEach((el) => spIO.observe(el));
    clearInterval(spT);
    spT = setInterval(() => { // la seduta di oggi: ogni minuto, solo le righe visibili
      if (!calOpen || st.calv !== "e" || st.eview !== "r" || document.hidden) return;
      const br = b.getBoundingClientRect(), td = nyDay();
      b.querySelectorAll(".espk[data-sk]").forEach((el) => { const k = el.dataset.sk, r = el.getBoundingClientRect(); if (k.endsWith(`|${td}`) && r.bottom > br.top && r.top < br.bottom) { const v = SPK.get(k); if (v) v._at = 0; spWant(k); } });
    }, 60000);
  }
  // porta il giorno in cima all'elenco; se sotto non c'è abbastanza contenuto per scorrere fin lì, aggiungo
  // uno spazio vuoto in fondo: così il giorno resta fermo in cima anche quando i giorni prima cambiano altezza
  function eScroll(d) {
    const b = $("#ebody"), el = b.querySelector(`.ewd[data-ed="${d}"],.ersec[data-ed="${d}"]`);
    let sp = b.querySelector(":scope>.espc");
    if (!el) { if (sp) sp.remove(); return; }
    if (!sp) { sp = document.createElement("div"); sp.className = "espc"; sp.setAttribute("aria-hidden", "true"); }
    b.appendChild(sp); sp.style.height = "0px";
    const top = el.getBoundingClientRect().top - b.getBoundingClientRect().top + b.scrollTop - 6, h0 = b.clientHeight;
    const need = top + b.clientHeight - b.scrollHeight;
    sp.style.height = top > 0 && need > 0 ? `${Math.ceil(need)}px` : "0px";
    if (b.clientHeight !== h0) sp.style.height = "0px"; // l'elenco non scorre (entra tutto): niente spazio vuoto
    b.scrollTop = Math.max(0, top);
  }
  function eNote(busy) {
    if (st.calv !== "e") return;
    const ds = eData && eData.mon === eMon ? Object.values(eData.days).filter(Boolean) : [];
    const at = ds.length ? Math.max(...ds.map((x) => x.at)) : 0, src = ds.some((x) => x.src === "y") ? "Yahoo Finance" : L("Nasdaq (date) e Yahoo Finance (stime, EPS e sorpresa)", "Nasdaq (dates) and Yahoo Finance (estimates, EPS and surprise)"), f = eData && eData.mon === eMon ? eData.fail : "";
    const err = f === "nasdaq+yahoo" ? L("Nasdaq e Yahoo non raggiungibili: riprova più tardi.", "Nasdaq and Yahoo unreachable: try again later.")
      : f === "nasdaq+yahoo-old" ? L("Fonti non raggiungibili: mostro i dati già scaricati.", "Sources unreachable: showing the data already downloaded.")
      : f === "nasdaq" || f === "rete" ? L("Nasdaq non raggiungibile: uso Yahoo Finance (senza EPS di un anno fa e numero di stime).", "Nasdaq unreachable: using Yahoo Finance (no year-ago EPS or number of estimates).") : "";
    const ye = eData && eData.mon === eMon && eData.yerr ? `<span class="err">${L(`EPS di oggi da Yahoo non disponibili (${esc(eData.yerr)}).`, `Today's EPS from Yahoo unavailable (${esc(eData.yerr)}).`)}</span> ` : "";
    $("#calsub").hidden = true; // la nota sotto il titolo è solo della sezione Macro
    $("#calnote").innerHTML = `<span class="enote">` + (busy ? L("Aggiorno… ", "Updating… ") : err ? `<span class="err">${err}</span> ` : "") + ye
      + (at ? L(`Aggiornato alle ${LTIME.format(new Date(at))} · `, `Updated at ${LTIME.format(new Date(at))} · `) : "")
      + L(`Fonte: ${src} · EPS rettificato (non-GAAP) · Sorpresa = (effettivo − stima) ÷ |stima| · ★ titoli delle tue liste e del portafoglio.`,
        `Source: ${src} · adjusted (non-GAAP) EPS · Surprise = (actual − estimate) ÷ |estimate| · ★ tickers in your lists and portfolio.`) + "</span>";
  }
  async function loadEarn(force) {
    if (!eMon) eMon = monOf(nyDay());
    const mon = eMon;
    if (eLoad === mon && !force) return;
    eLoad = mon;
    if (force) eNote(true);
    try { const r = await chrome.runtime.sendMessage({ type: "earnings", mon, force: !!force }); if (r && r.days && r.mon === mon) eData = r; } catch (_) {}
    if (eLoad === mon) eLoad = null;
    if (calOpen && st.calv === "e" && mon === eMon) drawEarn();
  }
  function applyCalv() {
    const e = st.calv === "e";
    $("#calbody").hidden = e; $("#ebody").hidden = !e; $("#efil").hidden = !e; $("#ewk").hidden = !e;
    root.querySelectorAll("#cal [data-cv]").forEach((x) => { x.hidden = x.dataset.cv !== (e ? "e" : "m"); });
    root.querySelectorAll('#cal [data-a="calv"]').forEach((x) => { x.classList.toggle("on", x.dataset.v === (e ? "e" : "m")); x.setAttribute("aria-selected", x.dataset.v === (e ? "e" : "m")); });
    if (e) hideTip();
  }
  function setCalv(v) {
    if (st.calv === v) return;
    st.calv = v; persist(); applyCalv(); fadeIn($(v === "e" ? "#ebody" : "#calbody"));
    if (v === "e") { eGoToday = true; drawEarn(); loadEarn(false); } else drawCal(true);
  }
  let eRsT = 0;
  addEventListener("resize", () => { clearTimeout(eRsT); eRsT = setTimeout(() => { if (calOpen && st.calv === "e") drawEarn(); }, 150); });
  // il riquadro cambia larghezza (tutto schermo, pannello allargato a mano): più o meno loghi per riga
  let eW = 0;
  new ResizeObserver(() => { const w = $("#ebody").clientWidth; if (!w || Math.abs(w - eW) < 20) return; eW = w; clearTimeout(eRsT); eRsT = setTimeout(() => { if (calOpen && st.calv === "e") drawEarn(); }, 120); }).observe($("#ebody"));

  // ---------- Pannellino con i valori attesi (consenso) ----------
  // voci del consenso per ogni pubblicazione e, per ognuna, se un valore più alto è favorevole
  const FC_RE = { nfp: /non-?farm|unemployment rate|average hourly/i, cpi: /\bcpi\b/i, ppi: /\bppi\b/i, gdp: /\bgdp\b/i, pce: /\bpce\b|personal (spending|income)/i, retail: /retail sales/i, fomc: /federal funds rate/i };
  // più alto = peggio: inflazione e prezzi, disoccupazione, salari (spingono i prezzi), tassi della Fed
  const badUp = (t) => /cpi|ppi|pce|price|unemployment rate|hourly earnings|funds rate|claims/i.test(t);
  const FC_IT = [
    [/^Non-?Farm (Employment Change|Payrolls)$/i, "Nuovi posti di lavoro (NFP)"], [/^Unemployment Rate$/i, "Tasso di disoccupazione"],
    [/^Average Hourly Earnings (m\/m|y\/y)$/i, "Salari orari $1"], [/^Federal Funds Rate$/i, "Tassi della Fed"],
    [/^Advance GDP q\/q$/i, "PIL q/q (stima preliminare)"], [/^Prelim GDP q\/q$/i, "PIL q/q (seconda stima)"], [/^Final GDP q\/q$/i, "PIL q/q (stima finale)"],
    [/^(Advance |Prelim |Final )?GDP Price Index q\/q$/i, "Deflatore del PIL q/q"],
    [/^Core PCE Price Index (m\/m|y\/y)$/i, "Inflazione PCE core $1"], [/^PCE Price Index (m\/m|y\/y)$/i, "Inflazione PCE $1"],
    [/^Personal Spending m\/m$/i, "Spesa personale m/m"], [/^Personal Income m\/m$/i, "Reddito personale m/m"],
    [/^Core Retail Sales m\/m$/i, "Vendite al dettaglio core m/m"], [/^Retail Sales m\/m$/i, "Vendite al dettaglio m/m"],
    [/^Core (CPI|PPI) (m\/m|y\/y)$/i, "$1 core $2"]
  ];
  // valori pubblicati: voce del calendario → dato calcolato dalle fonti ufficiali (calendar.js)
  const MET = {
    cpi_mm: "CPI m/m", ccpi_mm: "CPI core m/m", cpi_yy: "CPI y/y", ccpi_yy: "CPI core y/y",
    ppi_mm: "PPI m/m", cppi_mm: "PPI core m/m", ppi_yy: "PPI y/y", cppi_yy: "PPI core y/y",
    nfp: "Nuovi posti di lavoro (NFP)", ur: "Tasso di disoccupazione", ahe_mm: "Salari orari m/m", ahe_yy: "Salari orari y/y",
    ret_mm: "Vendite al dettaglio m/m", cret_mm: "Vendite al dettaglio core m/m", gdp: "PIL q/q (annualizzato)", gdpdef: "Deflatore del PIL q/q",
    pce_mm: "Inflazione PCE m/m", pce_yy: "Inflazione PCE y/y", cpce_mm: "Inflazione PCE core m/m", cpce_yy: "Inflazione PCE core y/y",
    spend_mm: "Spesa personale m/m", inc_mm: "Reddito personale m/m", ffr: "Tassi della Fed"
  };
  const MET_EN = {
    cpi_mm: "CPI m/m", ccpi_mm: "Core CPI m/m", cpi_yy: "CPI y/y", ccpi_yy: "Core CPI y/y",
    ppi_mm: "PPI m/m", cppi_mm: "Core PPI m/m", ppi_yy: "PPI y/y", cppi_yy: "Core PPI y/y",
    nfp: "Non-Farm Payrolls", ur: "Unemployment Rate", ahe_mm: "Average Hourly Earnings m/m", ahe_yy: "Average Hourly Earnings y/y",
    ret_mm: "Retail Sales m/m", cret_mm: "Core Retail Sales m/m", gdp: "GDP q/q (annualized)", gdpdef: "GDP Price Index q/q",
    pce_mm: "PCE Price Index m/m", pce_yy: "PCE Price Index y/y", cpce_mm: "Core PCE Price Index m/m", cpce_yy: "Core PCE Price Index y/y",
    spend_mm: "Personal Spending m/m", inc_mm: "Personal Income m/m", ffr: "Federal Funds Rate"
  };
  const metName = (k) => (st.lang === "en" ? MET_EN[k] : MET[k]);
  const EVMET = { cpi: ["cpi_mm", "ccpi_mm", "cpi_yy", "ccpi_yy"], ppi: ["ppi_mm", "cppi_mm", "ppi_yy", "cppi_yy"], nfp: ["nfp", "ur", "ahe_mm", "ahe_yy"], retail: ["ret_mm", "cret_mm"], gdp: ["gdp", "gdpdef"], pce: ["cpce_mm", "cpce_yy", "pce_mm", "pce_yy", "spend_mm", "inc_mm"], fomc: ["ffr"] };
  const ACT_RE = [
    [/^CPI m\/m$/i, "cpi_mm"], [/^Core CPI m\/m$/i, "ccpi_mm"], [/^CPI y\/y$/i, "cpi_yy"], [/^Core CPI y\/y$/i, "ccpi_yy"],
    [/^PPI m\/m$/i, "ppi_mm"], [/^Core PPI m\/m$/i, "cppi_mm"], [/^PPI y\/y$/i, "ppi_yy"], [/^Core PPI y\/y$/i, "cppi_yy"],
    [/^Non-?Farm (Employment Change|Payrolls)$/i, "nfp"], [/^Unemployment Rate$/i, "ur"], [/^Average Hourly Earnings m\/m$/i, "ahe_mm"], [/^Average Hourly Earnings y\/y$/i, "ahe_yy"],
    [/^Core Retail Sales m\/m$/i, "cret_mm"], [/^Retail Sales m\/m$/i, "ret_mm"],
    [/^(Advance |Prelim |Final )?GDP q\/q$/i, "gdp"], [/GDP Price Index q\/q$/i, "gdpdef"],
    [/^Core PCE Price Index m\/m$/i, "cpce_mm"], [/^Core PCE Price Index y\/y$/i, "cpce_yy"], [/^PCE Price Index m\/m$/i, "pce_mm"], [/^PCE Price Index y\/y$/i, "pce_yy"],
    [/^Personal Spending m\/m$/i, "spend_mm"], [/^Personal Income m\/m$/i, "inc_mm"], [/^Federal Funds Rate$/i, "ffr"]
  ];
  // più alto = sfavorevole (inflazione, disoccupazione, salari, tassi)
  const BAD_K = new Set(["cpi_mm", "ccpi_mm", "cpi_yy", "ccpi_yy", "ppi_mm", "cppi_mm", "ppi_yy", "cppi_yy", "ur", "ahe_mm", "ahe_yy", "gdpdef", "pce_mm", "pce_yy", "cpce_mm", "cpce_yy", "ffr"]);
  const actKey = (t) => (ACT_RE.find(([re]) => re.test(t)) || [])[1];
  const ACT = {}, actPend = {};
  // chiede al service worker il valore pubblicato (lui rispetta i limiti delle fonti e tiene i dati in memoria)
  function ensureActual(e, items) {
    const key = `${e.k}:${e.t}`;
    if (!EVMET[e.k] || e.t > Date.now() || (ACT[key] && ACT[key].fresh) || actPend[key]) return;
    if (ACT[key] && Date.now() - ACT[key].seen < (Date.now() - e.t < 10 * 60000 ? 2500 : 30000)) return; // appena uscito: chiedo spesso
    const g = (items || []).find((x) => actKey(x.title) === "gdp");
    actPend[key] = true;
    chrome.runtime.sendMessage({ type: "actual", k: e.k, t: e.t, prev: g ? { gdp: g.p } : null }).then((r) => {
      const was = ACT[key] && ACT[key].fresh;
      ACT[key] = { ...(r || {}), seen: Date.now() };
      if (calOpen && st.calv !== "e" && ACT[key].fresh && !was) drawCal(false); // il dato è arrivato: lo mostro subito
    }, () => {}).finally(() => { delete actPend[key]; });
  }
  const fcName = (t) => { if (st.lang === "en") return t; for (const [re, it] of FC_IT) if (re.test(t)) return t.replace(re, it); return t; };
  const fcNum = (s) => { const m = /(-?\d+(?:\.\d+)?)\s*([KMBT%])?/i.exec(String(s).replace(/,/g, "")); return m ? { v: +m[1], u: (m[2] || "").toUpperCase() } : null; };
  const itNum = (s) => (NLOC.startsWith("en") ? String(s) : String(s).replace(/(\d)\.(\d)/g, "$1,$2"));
  // valori della pubblicazione dentro la riga: Precedente · Atteso · Pubblicato
  function evVals(e, pop) {
    if (e.k === "presser") return "";
    const re = FC_RE[e.k], now = Date.now();
    const items = re && fcData ? fcData.items.filter((x) => re.test(x.title) && Math.abs(x.t - e.t) < 3 * 3600000) : [];
    const A = ACT[`${e.k}:${e.t}`], pub = e.t <= now && A && A.fresh ? A : null;
    const lines = items.length ? items.map((x) => ({ name: fcName(x.title), key: actKey(x.title), f: x.f, p: x.p, title: x.title }))
      : pub ? (EVMET[e.k] || []).filter((k) => pub.vals[k]).map((k) => ({ name: metName(k), key: k, f: "", p: (pub.prevs || {})[k] || "", title: MET_EN[k] })) : [];
    const old = e.t <= now && dkey(e.t) !== dkey(now); // giorni passati: i valori compaiono in un riquadro col mouse sopra
    if (old && !pop) return "";
    if (!lines.length && old && EVMET[e.k]) lines.push(...EVMET[e.k].map((k) => ({ name: metName(k), key: k, f: "", p: "", title: MET_EN[k] })));
    if (!lines.length) return "";
    const rows = lines.map((x) => {
      const a = pub && x.key ? pub.vals[x.key] : "";
      let act = "–";
      if (a) {
        const av = fcNum(a), rv = fcNum(x.f || x.p), dir = av && rv && av.u === rv.u ? Math.sign(Math.round((av.v - rv.v) * 1e6)) : null;
        const bad = x.key ? BAD_K.has(x.key) : badUp(x.title), cls = dir == null || dir === 0 ? "" : (dir > 0) !== bad ? "good" : "bad";
        const ar = dir == null ? "" : dir === 0 ? '<i class="ar eq">=</i>' : `<i class="ar ${cls}">${dir > 0 ? "▲" : "▼"}</i>`;
        act = `<b>${esc(itNum(a))}</b>${ar}`;
      }
      return `<span class="cvn">${esc(x.name)}</span><span>${x.p ? esc(itNum(x.p)) : "–"}</span><span><b>${x.f ? esc(itNum(x.f)) : "–"}</b></span><span class="cva">${act}</span>`;
    }).join("");
    return `<div class="cvals"><span></span><span class="cvh">${L("Precedente", "Previous")}</span><span class="cvh">${L("Atteso", "Forecast")}</span><span class="cvh pub">${L("Pubblicato", "Actual")}</span>${rows}</div>`;
  }
  function hideTip() { tipRow = null; cvI = null; const t = $("#ctip"); if (t) { (t._an || []).forEach((a) => a.cancel()); t.hidden = true; } }
  // uscita passata: Precedente · Atteso · Pubblicato in un riquadro sopra l'elenco (non sposta le righe sotto)
  let cvI = null;
  function cvShow(r) {
    const i = +r.dataset.i, e = calRows[i], t = $("#ctip"), h = e && evVals(e, true);
    if (!h) return cvHide();
    const same = cvI === i && !t.hidden;
    cvI = i; tipRow = r;
    t.className = "ctip cvp"; t.innerHTML = h; t.hidden = false;
    const pr = t.offsetParent.getBoundingClientRect(), rr = r.getBoundingClientRect();
    t.style.left = `${Math.round(rr.left - pr.left + 4)}px`; t.style.width = `${Math.round(rr.width - 8)}px`;
    let top = rr.bottom - pr.top - 6, up = false;
    if (top + t.offsetHeight > pr.height - 8) { top = rr.top - pr.top - t.offsetHeight + 6; up = true; }
    t.style.top = `${Math.round(top)}px`;
    if (!same) animIn(t, { y: up ? 5 : -5, s: 0.98, d: 180 });
  }
  function cvHide() {
    const t = $("#ctip"); cvI = null; tipRow = null;
    if (t.hidden) return;
    animOut(t, () => { if (cvI == null) t.hidden = true; }, { y: -3, d: 120 });
  }
  $("#calbody").addEventListener("scroll", hideTip, { passive: true });
  $("#calbody").addEventListener("pointerover", (ev) => { // uscita passata: chiedo i valori pubblicati e li mostro nel riquadro
    const r = ev.target.closest && ev.target.closest(".cev.old"), e = r && calRows[+r.dataset.i];
    if (!e) return;
    ensureActual(e, fcData && fcData.items.filter((x) => FC_RE[e.k] && FC_RE[e.k].test(x.title) && Math.abs(x.t - e.t) < 3 * 3600000));
    if (cvI !== +r.dataset.i) cvShow(r);
  });
  $("#calbody").addEventListener("pointerout", (ev) => {
    const r = ev.target.closest && ev.target.closest(".cev.old"), to = ev.relatedTarget;
    if (r && !(to && r.contains(to))) cvHide();
  });

  // pallino rosso sul pulsante se un evento importante esce entro un'ora
  // Led del tasto calendario: rosso se esce un dato macro importante (da un'ora prima a 15 minuti dopo),
  // verde se stanno pubblicando gli utili titoli delle tue liste o del portafoglio; entrambi affiancati.
  let eBadge = null, eBadgeAt = 0;
  async function eBadgeLoad() {
    const td = nyDay(), wd = new Date(ymdU(td)).getUTCDay();
    if (wd < 1 || wd > 5) { eBadge = null; return; }
    if (Date.now() - eBadgeAt < 5 * 60000 && eBadge && eBadge.days && eBadge.days[td]) return;
    eBadgeAt = Date.now();
    try { const r = await chrome.runtime.sendMessage({ type: "earnings", mon: monOf(td), force: false }); if (r && r.days) eBadge = r; } catch (_) {}
  }
  function eLiveMine() {
    const td = nyDay(), src = eData && eData.days && eData.days[td] ? eData : eBadge, e = src && src.days && src.days[td];
    if (!e) return [];
    const mine = mineSet();
    return e.rows.filter((r) => mine.has(r[0])).map((r) => ({ s: r[0], t: r[3], act: r[5], tm: r[9] || null })).filter((r) => eState(td, r) === "live");
  }
  async function calBadge() {
    const b = $("#calbtn"), now = Date.now();
    await eBadgeLoad();
    const e = calData && calData.ev.find((x) => x.imp === 3 && x.t - now < 3600000 && now - x.t < 15 * 60000);
    const lv = eLiveMine();
    b.classList.toggle("alert", !!e);
    b.classList.toggle("elv", lv.length > 0);
    const ut = root.querySelector('.ecv .tab[data-v="e"]'); if (ut) ut.classList.toggle("elv", lv.length > 0); // lo stesso bollino sul tasto Utili
    const tt = [];
    if (lv.length) tt.push(L(`Utili in uscita adesso: ${lv.map((x) => x.s).join(", ")}`, `Earnings due now: ${lv.map((x) => x.s).join(", ")}`));
    if (e) tt.push(e.t > now ? `${T(e.n)}: ${until(e.t - now)} (${LTIME.format(new Date(e.t))})` : `${T(e.n)}: ${L("appena pubblicato", "just released")} (${LTIME.format(new Date(e.t))})`);
    b.dataset.tt = tt.length ? tt.join(" · ") : L("Calendario USA: macro e utili", "US calendar: macro and earnings");
  }
  function closeChart() {
    if (newsOn) { newsOn = false; $("#chart").classList.remove("nmode"); $("#nview").hidden = true; $("#nbellbox").hidden = true; root.querySelectorAll(".row .nwc.on").forEach((x) => x.classList.remove("on")); }
    czFlush();
    closeColor(); closeMenu(); clearInterval(clockT);
    maxed = false;
    cur = null;
    clearTimeout(ctimer); clearInterval(rsiTimer);
    if (sizeObs) { sizeObs.disconnect(); sizeObs = null; }
    wantRange = null;
    req++;
    if (chart) { const c = chart; chart = null; S = {}; afterQ.push(() => c.remove()); } // lo tolgo a fine animazione
    resetFx();
    bars = []; idx = new Map();
    afterQ.push(() => { if (!cur) { $("#plegs").innerHTML = ""; $("#voltag").hidden = true; } });
    apply(); syncLive();
  }

  function build() {
    if (chart) return;
    const L = LightweightCharts, p = pal();
    chart = L.createChart($("#cbox"), {
      autoSize: true,
      layout: {
        background: { type: "solid", color: p.bg }, textColor: p.tx, fontSize: 11,
        fontFamily: 'Inter,-apple-system,"Segoe UI",Roboto,sans-serif',
        panes: { separatorColor: p.line, separatorHoverColor: p.grid, enableResize: true }
      },
      grid: { vertLines: { color: st.zen ? "rgba(0,0,0,0)" : p.grid }, horzLines: { color: st.zen ? "rgba(0,0,0,0)" : p.grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: mode === "l" ? L.CrosshairMode.Magnet : L.CrosshairMode.Normal, vertLine: { labelVisible: false }, horzLine: { labelVisible: false } }, // storico: le linee partono dal punto della curva; i valori sugli assi li disegno io (capsule)
      // trascinamento e doppio clic sull'asse dei prezzi li gestisco io (vedi più sotto)
      handleScale: { axisPressedMouseMove: { time: true, price: false }, axisDoubleClickReset: { time: false, price: false } },
      localization: { locale: LOC }
    });
    // S.c è la serie principale: candele, oppure linea celeste con area sfumata
    const t = st.ind.ct, o = { autoscaleInfoProvider: candleScale, lastValueVisible: false };
    S.c = mode === "l" ? chart.addSeries(L.AreaSeries, { ...o, lineColor: histCol(), topColor: histCol() + "42", bottomColor: histCol() + "06", lineWidth: 1, priceLineVisible: false })
      : t === "bars" ? chart.addSeries(L.BarSeries, { ...o, thinBars: false })
      : t === "line" ? chart.addSeries(L.LineSeries, { ...o, lineWidth: 2 })
      : t === "area" ? chart.addSeries(L.AreaSeries, { ...o, lineWidth: 2 })
      : chart.addSeries(L.CandlestickSeries, o);
    // andamento storico: riflesso lucido sulla linea, acceso solo nei tratti più alti del periodo visibile
    if (mode === "l") {
      S.gl = chart.addSeries(L.LineSeries, { lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, autoscaleInfoProvider: () => null });
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => { if (!glossT) glossT = requestAnimationFrame(() => { glossT = 0; glossSet(); }); });
    }
    chart.subscribeCrosshairMove((pr) => {
      hovPt = pr && pr.point ? pr.point : null; // dove si trova il mouse (per il riquadro dei valori dell'andamento storico)
      if (mode === "l" && pr && pr.point && pr.time == null && bars.length && pr.logical != null && S.c) {
        const j = pr.logical > bars.length - 1 ? bars.length - 1 : pr.logical < 0 ? 0 : null;
        if (j != null) { const mp = hovPt; try { chart.setCrosshairPosition(bars[j].close, bars[j].time, S.c); } catch (_) {} hovPt = mp; hov = j; legend(hov); return; }
      }
      hov = pr && pr.time != null ? idx.get(pr.time) ?? null : null; legend(hov);
      crossTags(pr);
    });
    // andamento storico: ingrandendo o spostando a mano il grafico la selezione del periodo si toglie
    let vrRaf = 0;
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      tagSoon();
      if (vrRaf) return;
      vrRaf = requestAnimationFrame(() => {
        vrRaf = 0;
        if (!(touching || Date.now() - touchAt < 400)) return; // solo quando sei tu a spostare il grafico
        czSave();
        if (mode !== "l") return;
        if (!lrFree) { lrFree = true; drawTools(); }
        perHeader(); legend(hov);
      });
    });
    rsiTimer = setInterval(placeLegs, 400); // le etichette seguono il ridimensionamento dei riquadri
    if (sizeObs) sizeObs.disconnect();
    sizeObs = new ResizeObserver(() => {
      if (newsOn) alignBell();
      if (!chart || !wantRange) return;
      requestAnimationFrame(() => { if (chart && wantRange) { chart.timeScale().setVisibleLogicalRange(wantRange); rescale(); } });
    });
    sizeObs.observe($("#cbox"));
  }
  // colori del grafico: candele (scelte nel menu del grafico, altrimenti rialzo e ribasso delle impostazioni),
  // linea (sempre il colore del tema), volumi dell'andamento storico (grigi)
  // il viola del tema è quello di Owlook e non si cambia (resta riconoscibile il marchio); rialzo e ribasso sì
  const ZEN_ACC = { light: "#6f5fc4", dark: "#9a8bec" }; // viola attenuato della modalità zen (come il gufo)
  const effCol = (k) => { const c = k === "acc" ? null : st.ind[k], th = host.dataset.theme === "dark" ? "dark" : "light"; return c && isHex(c) && c.toLowerCase() !== IND0[k] ? c : k === "acc" && st.zen ? ZEN_ACC[th] : THEME_COL[th][k]; };
  const cUp = () => (isHex(st.ind.cup) ? st.ind.cup : effCol("up"));
  const cDn = () => (isHex(st.ind.cdn) ? st.ind.cdn : effCol("dn"));
  const lineCol = () => effCol("acc");
  const cLn = () => (isHex(st.ind.cln) ? st.ind.cln : lineCol()); // grafico a linea o ad area: scelto nel menu, altrimenti il colore del tema
  // andamento storico: il colore del tema un po' più tenue (schiarito verso il bianco)
  const mixHex = (a, b, t) => "#" + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, "0")).join("");
  const histCol = () => mixHex(lineCol(), "#ffffff", host.dataset.theme === "dark" ? 0.3 : 0.22);
  const VOLGREY = () => (host.dataset.theme === "dark" ? "rgba(160,164,175,.32)" : "rgba(110,114,125,.28)");
  function setType(t) {
    st.ind.ct = t; persist(); drawTools();
    if (mode !== "l") rebuildChart();
  }
  // ricrea il grafico mantenendo la vista (serve anche quando passa alla finestra flottante)
  function rebuildChart() {
    if (!chart) return;
    const lr = chart.timeScale().getVisibleLogicalRange();
    chart.remove(); chart = null; S = {}; resetFx(); clearInterval(rsiTimer);
    build(); syncSeries();
    if (lr) chart.timeScale().setVisibleLogicalRange(lr);
    rescale();
  }
  function themeChart() {
    if (!chart) return;
    const p = pal();
    const th = host.dataset.theme;
    if (themeChart.t !== th) { themeChart.t = th; syncSeries(); } // colori del tema (linea, candele predefinite, volumi)
    chart.applyOptions({
      layout: { background: { type: "solid", color: p.bg }, textColor: p.tx, panes: { separatorColor: p.line } },
      grid: { vertLines: { color: st.zen ? "rgba(0,0,0,0)" : p.grid }, horzLines: { color: st.zen ? "rgba(0,0,0,0)" : p.grid } },
      rightPriceScale: { borderColor: p.line }, timeScale: { borderColor: p.line }
    });
  }

  // Doppio clic sull'asse dei prezzi: adatta l'altezza alle sole candele visibili
  $("#cbox").addEventListener("dblclick", (e) => {
    if (!chart || !S.c) return;
    if (onSep(e)) { e.preventDefault(); e.stopPropagation(); return resetPaneH(); }
    const r = $("#cbox").getBoundingClientRect(), w = chart.priceScale("right").width();
    if (e.clientX < r.right - w) return; // non è sull'asse
    const y = e.clientY - r.top, h0 = chart.panes()[0].getHeight();
    const pid = y > h0 ? paneAxis(e) : null;
    if (pid) { pz[pid] = 1; po[pid] = 0; return rescalePane(pid); }
    fitVisible();
  }, true);
  // Con la scala automatica la libreria adatta i prezzi alle sole candele visibili,
  // rispettando lo spazio riservato ai volumi; resta attiva mentre ti sposti.
  function fitVisible() {
    vz = 1; vo = 0; yLock = null; fitAll = true;
    rescale();
  }

  // Indicatori: un array per linea, allineato alle candele (null finché non c'è abbastanza storico)
  function calcInd() {
    IND = {};
    if (mode === "l" || !IX()) return;
    for (const x of fxList()) if (fxDef(x)) IND[x.id] = IX().compute(x, bars, { ivSec });
  }
  const lineish = () => mode === "l" || st.ind.ct === "line" || st.ind.ct === "area";
  const candle = (b) => (lineish() ? { time: b.time, value: b.close } : { time: b.time, open: b.open, high: b.high, low: b.low, close: b.close });
  const volPt = (b) => ({ time: b.time, value: b.volume, color: mode === "l" ? VOLGREY() : (b.close >= b.open ? cUp() : cDn()) + "66" });
  // asse e etichette del grafico con il formato della lingua (5.973,59 / 5,973.59)
  const numFmt = (d) => (v) => v.toLocaleString(NLOC, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
  const pf = () => {
    const p = bars.length ? bars[bars.length - 1].close : 100, d = dec(p);
    return { type: "custom", minMove: 1 / 10 ** d, formatter: numFmt(d) };
  };

  // Crea / rimuove le serie in base alle impostazioni e ridisegna tutto
  function syncSeries() {
    if (!chart) return;
    const L = LightweightCharts, I = st.ind, cm = mode !== "l";
    S.c.applyOptions({ priceFormat: pf() });
    const lc = histCol(), U = cUp(), D = cDn();
    if (!cm) { S.c.applyOptions({ lineColor: lc, topColor: lc + "42", bottomColor: lc + "06", lineWidth: 1 }); glossK = ""; glossSet(); } // andamento storico: linea col colore del tema e riflesso lucido
    if (cm) {
      const t = I.ct;
      if (t === "hollow") S.c.applyOptions({ upColor: "rgba(0,0,0,0)", downColor: D, borderVisible: true, borderUpColor: U, borderDownColor: D, wickUpColor: U, wickDownColor: D });
      else if (t === "bars") S.c.applyOptions({ upColor: U, downColor: D });
      else if (t === "line") S.c.applyOptions({ color: cLn(), lineWidth: 1 });
      else if (t === "area") S.c.applyOptions({ lineColor: cLn(), topColor: cLn() + "55", bottomColor: "rgba(0,0,0,0)", lineWidth: 1 });
      else S.c.applyOptions({ upColor: U, downColor: D, wickUpColor: U, wickDownColor: D, borderVisible: false });
    }
    // volumi: nel grafico a candele colorati come le candele, nell'andamento storico grigi
    if (!S.v) {
      S.v = chart.addSeries(L.HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
      S.v.priceScale().applyOptions({ scaleMargins: { top: cm ? 0.7 : 0.86, bottom: 0 } }); // candele: volumi più alti
    }
    const zl = st.zen && !cm; // zen nell'andamento storico: solo la linea (le candele tengono volumi e indicatori)
    S.v.applyOptions({ visible: !zl });
    S.c.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: zl ? 0.06 : cm ? 0.32 : 0.16 } });
    syncFx(cm);
    drawInd();
    setAll();
    requestAnimationFrame(placeLegs);
  }
  // Serie degli indicatori: quelli "sul grafico" nel riquadro dei prezzi, gli altri ognuno nel
  // suo riquadro, impilati sotto il grafico nell'ordine in cui li aggiungi.
  let fxSigO = "", fxSigP = "", paneIds = [], pz = {}, po = {}, paneH = {}; // pz/po: allungamento e spostamento di ogni riquadro
  function resetFx() { fxSigO = ""; fxSigP = ""; paneIds = []; }
  // Proporzioni dei riquadri: quelle che hai scelto trascinando i separatori (salvate), altrimenti
  // le predefinite. Le altezze diventano proporzioni (stretch factor) e seguono il ridimensionamento.
  // Altezza utile dei riquadri: il contenitore meno l'asse dei tempi (stessa base per default e reset).
  function paneTot() {
    let ax = 0; try { ax = chart ? chart.timeScale().height() : 0; } catch (_) {}
    return Math.max(120, ($("#cbox").clientHeight || 420) - (ax || 0));
  }
  function applyPaneH(def, tot) {
    if (!chart) return;
    tot = tot || paneTot();
    def = def || Math.round(Math.max(48, Math.min(100, (tot * 0.5) / Math.max(1, paneIds.length))));
    const saved = st.ind.ph || {};
    const all = paneIds.length && saved.__main && paneIds.every((id) => saved[id]);
    let hs, main;
    if (all) { hs = paneIds.map((id) => saved[id]); main = saved.__main; }
    else {
      hs = paneIds.map((id) => saved[id] || paneH[id] || def);
      let sum = hs.reduce((a, b) => a + b, 0);
      const room = tot * 0.62; // il grafico dei prezzi resta il più grande
      if (sum > room) { hs = hs.map((h) => (h * room) / sum); sum = room; }
      main = tot - sum;
    }
    try { const ps = chart.panes(); ps[0].setStretchFactor(Math.max(1, main)); hs.forEach((h, i) => ps[i + 1] && ps[i + 1].setStretchFactor(Math.max(1, h))); } catch (_) {}
  }
  function savePaneH() {
    if (!chart || !paneIds.length) return;
    const ps = chart.panes(), ph = {};
    ph.__main = Math.round(ps[0].getHeight());
    paneIds.forEach((id, i) => { if (ps[i + 1]) ph[id] = Math.round(ps[i + 1].getHeight()); });
    st.ind.ph = ph; paneH = { ...paneH, ...ph };
    persist();
  }
  function resetPaneH() {
    sepTok++; // annulla un salvataggio in sospeso dal clic appena fatto
    delete st.ind.ph; paneH = {};
    applyPaneH(); persist();
    requestAnimationFrame(placeLegs);
  }
  const fxPf = (d) => (d.f === "v" ? { type: "volume" } : d.f === "p" ? pf() : { type: "custom", minMove: 0.01, formatter: numFmt(2) });
  function syncFx(cm) {
    const L = LightweightCharts;
    S.fx = S.fx || {};
    const act = cm ? fxList().filter(fxDef) : [];
    const ov = act.filter((x) => !fxDef(x).pane), pn = act.filter((x) => fxDef(x).pane);
    const sigO = ov.map((x) => x.id + x.t).join("|"), sigP = pn.map((x) => x.id + x.t).join("|");
    const add = (x, pi) => {
      const d = fxDef(x);
      S.fx[x.id] = d.l.map((l) => {
        const o = { priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: fxPf(d),
          autoscaleInfoProvider: d.pane ? () => paneRange(x.id) : () => null }; // le linee sul grafico non allargano la scala dei prezzi
        if (isHist(l[2])) return chart.addSeries(L.HistogramSeries, o, pi);
        const z = chart.addSeries(L.LineSeries, l[2] === "dots" ? { ...o, lineVisible: false, pointMarkersVisible: true } : o, pi);
        TAGGED.add(z); // ultimo valore in una capsula sull'asse (si può nascondere cliccando il nome dell'indicatore)
        return z;
      });
      if (d.pane && d.lv) for (const v of d.lv) S.fx[x.id][0].createPriceLine({ price: v, color: "#787b86", lineWidth: 1, lineStyle: L.LineStyle.Dashed, axisLabelVisible: false });
    };
    const drop = (id) => { for (const sr of S.fx[id] || []) { try { chart.removeSeries(sr); } catch (_) {} } delete S.fx[id]; };
    if (sigO !== fxSigO) {
      for (const id in S.fx) if (!paneIds.includes(id)) drop(id);
      for (const x of ov) add(x, 0);
      fxSigO = sigO;
    }
    if (sigP !== fxSigP) {
      // riquadri ricreati da capo: tengo l'altezza di quelli che restano
      try { const ps = chart.panes(); paneIds.forEach((id, i) => { if (ps[i + 1]) paneH[id] = ps[i + 1].getHeight(); }); } catch (_) {}
      for (const id of paneIds) drop(id);
      try { for (let i = chart.panes().length - 1; i >= 1; i--) chart.removePane(i); } catch (_) {}
      paneIds = [];
      for (const x of pn) { paneIds.push(x.id); add(x, paneIds.length); }
      const tot = paneTot(), n = paneIds.length;
      const def = Math.round(Math.max(48, Math.min(100, (tot * 0.5) / Math.max(1, n))));
      applyPaneH(def, tot);
      fxSigP = sigP;
    }
    for (const x of act) {
      const d = fxDef(x);
      (S.fx[x.id] || []).forEach((sr, j) => {
        const k = d.l[j][2], c = fxColor(x, j), w = fxWidth(x, j);
        if (isHist(k)) sr.applyOptions({ priceFormat: fxPf(d) });
        else if (k === "dots") sr.applyOptions({ color: c, pointMarkersRadius: 1 + w * 0.5, priceFormat: fxPf(d) });
        else sr.applyOptions({ color: c, lineWidth: w, priceFormat: fxPf(d) });
      });
    }
  }
  // un punto dell'indicatore (spazio vuoto dove il valore manca: così le linee si interrompono)
  function fxPt(x, j, i) {
    const a = IND[x.id] && IND[x.id][j], v = a ? a[i] : null, time = bars[i].time;
    if (v == null) return { time };
    const k = fxDef(x).l[j][2];
    if (k === "hist") return { time, value: v, color: (v >= 0 ? cUp() : cDn()) + "b3" };
    if (k === "histd") { const pv = a[i - 1]; return { time, value: v, color: (pv == null || v >= pv ? cUp() : cDn()) + "b3" }; }
    return { time, value: v };
  }
  // scala di un riquadro: fissa (es. RSI 0–100) o adattata ai valori visibili; si allunga dalla sua colonna
  function paneRange(id) {
    const x = fxFind(id), d = fxDef(x), a = IND[id];
    if (!d) return null;
    let lo, hi;
    if (d.r) { lo = d.r[0]; hi = d.r[1]; }
    else {
      if (!a || !chart || !bars.length) return null;
      const lr = chart.timeScale().getVisibleLogicalRange();
      const s0 = lr ? Math.max(0, Math.ceil(lr.from)) : 0, e0 = lr ? Math.min(bars.length - 1, Math.floor(lr.to)) : bars.length - 1;
      lo = Infinity; hi = -Infinity;
      for (const arr of a) for (let i = s0; i <= e0; i++) { const v = arr[i]; if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }
      if (!isFinite(lo)) return null;
      if (d.l.some((l) => isHist(l[2]))) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1;
      lo -= pad; hi += pad;
    }
    const z = pz[id] || 1, h = ((hi - lo) / 2) * z, m = (hi + lo) / 2 + (po[id] || 0) * h;
    return { priceRange: { minValue: m - h, maxValue: m + h } };
  }
  function rescalePane(id) {
    const sr = S.fx && S.fx[id] && S.fx[id][0];
    if (!sr) return;
    sr.priceScale().setAutoScale(true);
    sr.applyOptions({ autoscaleInfoProvider: () => paneRange(id) });
  }
  const setPz = (id, z) => { pz[id] = Math.min(5, Math.max(0.1, z)); rescalePane(id); czSave(); };
  // Etichette dei riquadri sotto il grafico, in alto a sinistra di ciascuno
  function placeLegs() {
    const box = $("#plegs"), vt = $("#voltag");
    let ps, w = 0;
    try { ps = chart.panes(); w = chart.priceScale("right").width(); } catch (_) { box.hidden = vt.hidden = true; return; }
    const h0 = ps[0].getHeight();
    box.hidden = !bars.length;
    let top = h0 + 1;
    paneIds.forEach((id, i) => {
      const el = box.querySelector(`[data-fx="${id}"]`);
      if (el) el.style.top = `${top + 4}px`;
      top += (ps[i + 1] ? ps[i + 1].getHeight() : 0) + 1;
    });
    vt.style.top = `${h0 - 20}px`; vt.style.width = `${w - 4}px`;
    vt.hidden = mode === "l" || !bars.length || !hasVol;
    tagSoon();
  }
  // riflesso: bianco tanto più intenso quanto il punto è vicino al massimo del tratto visibile
  let glossT = 0, glossK = "";
  function glossPts() {
    const lr = chart.timeScale().getVisibleLogicalRange();
    const a = lr ? Math.max(0, Math.floor(lr.from)) : 0, z = lr ? Math.min(bars.length - 1, Math.ceil(lr.to)) : bars.length - 1;
    let lo = Infinity, hi = -Infinity;
    for (let i = a; i <= z; i++) { const v = bars[i].close; if (v < lo) lo = v; if (v > hi) hi = v; }
    const d = hi - lo || 1, w = host.dataset.theme === "dark" ? 0.75 : 0.8;
    return bars.map((b) => { const t = Math.max(0, Math.min(1, (b.close - lo) / d)), u = Math.max(0, (t - 0.5) / 0.5), al = w * Math.pow(u, 1.4); return { time: b.time, value: b.close, color: `rgba(255,255,255,${al.toFixed(3)})` }; });
  }
  function glossSet() {
    if (!S.gl || !bars.length) return;
    const lr = chart.timeScale().getVisibleLogicalRange(), k = `${bars.length}|${lr ? Math.round(lr.from) + ":" + Math.round(lr.to) : ""}|${host.dataset.theme}`;
    if (k === glossK) return;
    glossK = k; S.gl.setData(glossPts());
  }
  function setAll() {
    if (!chart) return;
    calcInd();
    idx = new Map(bars.map((b, i) => [b.time, i]));
    hasVol = bars.some((b) => b.volume > 0);
    S.c.setData(bars.map(candle)); tagSoon();
    glossK = ""; glossSet();
    if (S.v) S.v.setData(bars.map(volPt));
    for (const x of fxList()) { const sr = S.fx && S.fx[x.id]; if (sr) sr.forEach((z, j) => z.setData(bars.map((_, i) => fxPt(x, j, i)))); }
    legend(hov);
  }
  function updLast() {
    const n = bars.length - 1, b = bars[n];
    calcInd();
    S.c.update(candle(b)); tagSoon();
    if (S.gl) { const g = glossPts()[n]; if (g) S.gl.update(g); }
    if (S.v) S.v.update(volPt(b));
    for (const x of fxList()) {
      const sr = S.fx && S.fx[x.id];
      if (sr) sr.forEach((z, j) => { try { z.update(fxPt(x, j, n)); } catch (_) {} });
    }
    legend(hov);
  }

  // Legenda: valori della candela sotto il cursore (o dell'ultima)
  let dfmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  // riquadro dei valori dell'andamento storico: a destra del mouse nella metà sinistra del grafico, a
  // sinistra nella metà destra (così non copre la linea che stai guardando); il mouse a metà altezza
  let hovPt = null, httSide = 1;
  function placeHtt() {
    const t = $("#htt"), w = $(".cwrap");
    if (!t || t.hidden || !hovPt || !w) return;
    const W = w.clientWidth, H = w.clientHeight, tw = t.offsetWidth, th = t.offsetHeight, g = 16;
    // cambio lato con un po' di margine attorno alla metà: niente salti avanti e indietro
    if (hovPt.x > W * 0.55) httSide = -1; else if (hovPt.x < W * 0.45) httSide = 1;
    let x = httSide > 0 ? hovPt.x + g : hovPt.x - g - tw;
    if (x + tw > W - 4) x = hovPt.x - g - tw;
    if (x < 4) x = Math.min(W - tw - 4, hovPt.x + g);
    const y = Math.max(4, Math.min(H - th - 4, hovPt.y - th / 2));
    // allineato ai pixel dello schermo: il testo resta nitido anche muovendo il mouse
    const dp = devicePixelRatio || 1, px = (v) => `${Math.round(v * dp) / dp}px`;
    t.style.transform = ""; t.style.left = px(x); t.style.top = px(y);
  }
  function legend(i) {
    const main = $("#lg-main"), vt = $("#voltag");
    if (!main) return;
    if (!bars.length) { main.innerHTML = ""; vt.hidden = true; return; }
    const tt = $("#htt");
    if (mode !== "l" || i == null || !hovPt) tt.hidden = true;
    // andamento storico: il prezzo grande in alto segue il punto indicato, poi torna a quello attuale
    const cpEl = $("#c-price");
    if (mode === "l" && i != null && hovPt && i < bars.length) {
      if (cpEl.dataset.k) { cpEl.dataset.hk = cpEl.dataset.k; delete cpEl.dataset.k; }
      cpEl.textContent = fmt(bars[i].close);
    } else if (cpEl.dataset.hk) { cpEl.dataset.k = cpEl.dataset.hk; delete cpEl.dataset.hk; paintEl(cpEl); }
    if (mode === "l" && (i == null || !hovPt)) { main.innerHTML = ""; return; } // andamento storico: i valori solo indicando un punto
    const hv = i != null && i < bars.length; // il puntatore è sul grafico
    if (i == null || i >= bars.length) i = bars.length - 1;
    const b = bars[i], I = st.ind, f = (v) => fmt(v);
    if (mode === "l") {
      // andamento: data, prezzo e variazione rispetto all'inizio del periodo
      const p0 = bars[baseIdx()].close, cp = p0 ? ((b.close - p0) / p0) * 100 : 0;
      const rowL = (l, v) => `<div class="lgr"><i>${l}</i><b>${v}</b></div>`;
      const per = ivSec >= 2e6 ? cap1(new Intl.DateTimeFormat(LOC, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(b.time * 1000))) : ivSec >= 6e5 ? `${L("Sett.", "Wk")} ${dfmt.format(new Date(b.time * 1000))}` : dfmt.format(new Date(b.time * 1000));
      main.innerHTML = "";
      // valori in un riquadro accanto al mouse
      // riquadro quadrato di misura fissa: data, variazione dall'inizio, poi i valori
      const h = `<div class="lgst"><div class="lgd">${per}</div><div class="lgp"><b style="color:var(${cp >= 0 ? "--up" : "--dn"})">${cp >= 0 ? "+" : ""}${num2(cp)}%</b></div>`
        + rowL(L("Chiusura", "Close"), f(b.close)) + rowL(L("Apertura", "Open"), f(b.open)) + rowL(L("Massimo", "High"), f(b.high)) + rowL(L("Minimo", "Low"), f(b.low))
        + (hasVol ? rowL(L("Volume", "Volume"), compact.format(b.volume || 0)) : "") + "</div>";
      if (tt.dataset.h !== h) { tt.dataset.h = h; tt.innerHTML = h; }
      tt.hidden = false;
      placeHtt();
      return;
    }
    const c = b.close >= b.open ? cUp() : cDn();
    let h = `<i>${L("A", "O")} <b style="color:${c}">${f(b.open)}</b></i><i>${L("Max", "H")} <b style="color:${c}">${f(b.high)}</b></i><i>${L("Min", "L")} <b style="color:${c}">${f(b.low)}</b></i><i>C <b style="color:${c}">${f(b.close)}</b></i>`;
    const ref = i > 0 ? bars[i - 1].close : b.open, cp = ref ? ((b.close - ref) / ref) * 100 : 0;
    main.innerHTML = h + `<i><b style="color:var(${cp >= 0 ? "--up" : "--dn"})">${cp >= 0 ? "+" : ""}${num2(cp)}%</b></i>`;
    for (const r of root.querySelectorAll("[data-fx]")) {
      const x = fxFind(r.dataset.fx), d = fxDef(x), a = IND[r.dataset.fx];
      if (!d) continue;
      r.querySelectorAll(".iv").forEach((el) => { el.textContent = a && hv ? fxVal(d, a[+el.dataset.j][i]) : ""; }); // solo indicando un punto
    }
    // volume della candela in fondo alla colonna dei prezzi, col colore della candela
    vt.hidden = !hasVol; // indici e cambi: Yahoo non fornisce volumi
    vt.textContent = compact.format(b.volume || 0);
    vt.style.background = c; vt.style.color = onCol(c);
  }

  async function load(keep) {
    const sym = cur, my = ++req;
    clearTimeout(ctimer);
    if (!keep) msg("Caricamento…");
    let r;
    const req0 = reqOf(mode);
    // aggiornamento periodico: dati freschi; apertura: va bene anche quanto appena preparato al passaggio del mouse
    try { r = await chrome.runtime.sendMessage({ type: "candles", sym, ...req0, fresh: !!keep }); }
    catch (_) { r = { error: "estensione non raggiungibile, ricarica la pagina" }; }
    if (my !== req || sym !== cur || !chart) return;
    if (!r || r.error || !r.bars || !r.bars.length) {
      if (!keep) {
        bars = []; setAll(); placeLegs();
        msg(r && r.error ? `Dati non disponibili: ${r.error}` : "Nessun dato per questo periodo e intervallo.");
      }
      return schedule();
    }
    const ts = chart.timeScale(), lr = keep ? ts.getVisibleLogicalRange() : null, oldN = bars.length;
    const nb = [];
    for (const x of r.bars) {
      const b = { time: sh(x.t), open: x.o, high: x.h, low: x.l, close: x.c, volume: x.v, est: !!x.e };
      const p = nb[nb.length - 1];
      if (p && b.time <= p.time) { p.high = Math.max(p.high, b.high); p.low = Math.min(p.low, b.low); p.close = b.close; p.volume += b.volume; }
      else nb.push(b);
    }
    // Volume della candela in corso: Yahoo la manda quasi sempre a 0. Lo stimo come volume scambiato
    // oggi meno quello delle candele già chiuse di oggi, solo se la candela è davvero quella in corso
    // e il risultato è plausibile (le somme di Yahoo non sempre tornano col volume del giorno).
    if (r.dv && r.sec < 86400 && nb.length) {
      const yl = nb[nb.length - 1], nowS = sh(Math.floor(Date.now() / 1000)), day = Math.floor(yl.time / 86400);
      if (nowS >= yl.time && nowS < yl.time + r.sec + 90) {
        let s = 0, mx = 0, n = 0;
        for (let i = nb.length - 2; i >= 0 && Math.floor(nb[i].time / 86400) === day; i--) { s += nb[i].volume || 0; if (n++ < 15) mx = Math.max(mx, nb[i].volume || 0); }
        const rest = r.dv - s;
        if (rest > (yl.volume || 0) && (n < 3 || rest <= mx * 8)) yl.volume = rest;
      } else if (nowS >= yl.time + r.sec && Math.floor(nowS / 86400) === day) {
        // Yahoo non ha ancora la candela in corso: quello scambiato da allora va nella candela che parte coi tick
        let s = 0, mx = 0, n = 0;
        for (let i = nb.length - 1; i >= 0 && Math.floor(nb[i].time / 86400) === day; i--) { s += nb[i].volume || 0; if (n++ < 15) mx = Math.max(mx, nb[i].volume || 0); }
        const rest = r.dv - s, t0 = yl.time + Math.floor((nowS - yl.time) / r.sec) * r.sec;
        if (rest > 0 && (n < 3 || rest <= mx * 8)) pendVol = { t: t0, v: rest };
      }
    }
    // Ricarica periodica: l'ultima candela di Yahoo è spesso incompleta o in ritardo di qualche
    // secondo. Non deve cancellare quella costruita dai tick live: unisco i due dati.
    if (keep && bars.length && r.sec === ivSec && nb.length) {
      const yl = nb[nb.length - 1];
      for (const ob of bars) {
        if (ob.time < yl.time) continue;
        if (ob.time === yl.time) {
          // apertura: quella vera di Yahoo appena c'è; finché è stimata non la cambio più
          if (yl.est) { yl.open = ob.open; yl.est = ob.est; }
          yl.high = Math.max(yl.high, ob.high, yl.open); yl.low = Math.min(yl.low, ob.low, yl.open);
          yl.close = ob.close; yl.volume = Math.max(yl.volume, ob.volume);
        } else nb.push({ ...ob }); // candele che Yahoo non ha ancora
      }
    }
    // l'ultimo prezzo noto (stream o HTTP) aggiorna subito l'ultima candela
    const q = quotes[sym], lb = nb[nb.length - 1];
    const qt = q && q.price > 0 ? sh(Math.floor((q.tt || q.time) / 1000)) : null;
    if (lb && extH(q) && (mode === "l" || r.sec >= 86400)) {
      lb.close = q.rp; lb.high = Math.max(lb.high, q.rp); lb.low = Math.min(lb.low, q.rp);
    } else if (lb && qt != null && qt >= lb.time && (r.sec >= 86400 || qt < lb.time + r.sec)) {
      lb.close = q.price; lb.high = Math.max(lb.high, q.price); lb.low = Math.min(lb.low, q.price);
    }
    bars = nb; ivSec = r.sec;
    if (mode === "l" && !keep) hFrom = periodFrom();
    $("#cnote").textContent = r.note || ""; $("#cfoot").hidden = !r.note;
    msg("");
    syncSeries();
    if (keep && lr && !wantRange) {
      const d = bars.length - oldN;
      if (lr.to >= oldN - 1) { ts.setVisibleLogicalRange({ from: lr.from + d, to: lr.to + d }); focusFrom += d; } else ts.setVisibleLogicalRange(lr);
    } else {
      showRange();
      czRestore();
    }
    perHeader();
    schedule();
  }
  // Mostra il periodo scelto (le candele precedenti restano disponibili scorrendo a sinistra).
  // Se il periodo ha poche candele (es. all'apertura) ne mostro comunque almeno MIN_BARS.
  const MIN_BARS = 60;
  // Scala automatica dei prezzi, ricalcolata a ogni spostamento del grafico:
  //  - candele intraday: si adatta alle candele visibili del giorno più a destra dello schermo
  //    (le sedute precedenti fanno da contesto e possono uscire dalla scala, come su TradingView);
  //  - candele giornaliere o più lunghe: nella vista iniziale considera il periodo scelto,
  //    se scorri più indietro tutte le candele visibili.
  // vz (allungamento) e vo (spostamento verticale) li imposti col mouse e restano attivi.
  let rangeStart = -Infinity, focusFrom = 0, vz = 1, vo = 0, yLock = null;
  // Zoom con la rotella sul grafico: blocco la scala dei prezzi com'è adesso, così poi trascinando il grafico
  // si muove liberamente (anche in su e in giù) senza riadattarsi. Il doppio clic sull'asse la sblocca.
  function lockY() {
    if (yLock || !S.c) return;
    const r = candleScale();
    if (!r) return;
    yLock = { min: r.priceRange.minValue, max: r.priceRange.maxValue }; vz = 1; vo = 0;
  }
  // vista iniziale da mantenere finché non tocchi il grafico: se il riquadro cambia dimensione
  // (es. il pannello si sta ancora allargando) la ricalcolo, altrimenti resterebbe compressa
  let wantRange = null, sizeObs = null, lrFree = false, hFrom = 0, touchAt = 0, touching = false;
  function candleScale() {
    if (!chart || !bars.length) return null;
    const lr = chart.timeScale().getVisibleLogicalRange();
    if (!lr) return null;
    const a = Math.max(0, Math.ceil(lr.from)), b = Math.min(bars.length - 1, Math.floor(lr.to));
    if (a > b) return null;
    const lm = lineish(), intraday = mode !== "l" && ivSec < 86400, day = Math.floor(bars[b].time / 86400);
    const focus = mode !== "l" && !intraday && lr.from >= focusFrom - 2 && !fitAll;
    let lo = Infinity, hi = -Infinity, lo2 = Infinity, hi2 = -Infinity;
    for (let i = a; i <= b; i++) {
      const x = bars[i], xl = lm ? x.close : x.low, xh = lm ? x.close : x.high;
      if (xl < lo2) lo2 = xl; if (xh > hi2) hi2 = xh;
      const keep = fitAll || (intraday ? Math.floor(x.time / 86400) === day : !focus || x.time >= rangeStart);
      if (keep) { if (xl < lo) lo = xl; if (xh > hi) hi = xh; }
    }
    if (!isFinite(lo)) { lo = lo2; hi = hi2; }
    if (!isFinite(lo)) return null;
    if (fitAll && !lm) for (const x of fxList()) { // anche le linee degli indicatori sul grafico (medie, VWAP, bande…)
      const d = fxDef(x), A = IND[x.id];
      if (!d || d.pane || !A) continue;
      for (const line of A) if (line) for (let i = a; i <= b; i++) { const v = line[i]; if (v != null && isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
    }
    if (yLock) { lo = yLock.min; hi = yLock.max; } // dopo uno zoom con la rotella la scala resta ferma: scorri libero
    const h0 = (hi - lo) / 2 || Math.abs(hi) * 0.001 || 1, h = h0 * vz, m = (hi + lo) / 2 + vo * h;
    return { priceRange: { minValue: m - h, maxValue: m + h } };
  }
  // forza il ricalcolo della scala (dopo aver cambiato vz / vo)
  function rescale() {
    if (!S.c) return;
    S.c.priceScale().setAutoScale(true);
    S.c.applyOptions({ autoscaleInfoProvider: candleScale });
    tagSoon();
  }
  // ---------- Zoom e posizione del grafico ----------
  // Ricordati per titolo, tipo di grafico e intervallo (o periodo): riaprendo il grafico, anche dopo
  // aver chiuso il browser, torna com'era. Salvo la distanza dall'ultima candela, così vale anche
  // quando nel frattempo sono arrivate candele nuove.
  let CZ = {}, czT = 0, czW = 0;
  try { chrome.storage.local.get("cz").then((v) => { CZ = Object.assign((v && v.cz) || {}, CZ); }, () => {}); } catch (_) {}
  const czKey = () => (cur ? `${cur}|${mode}|${mode === "l" ? st.lr : st.ci}` : "");
  const czStore = () => { clearTimeout(czW); czW = setTimeout(() => { try { chrome.storage.local.set({ cz: CZ }); } catch (_) {} }, 300); };
  function czDo() {
    czT = 0;
    const k = czKey();
    if (!k || !chart || !bars.length) return;
    const r = chart.timeScale().getVisibleLogicalRange();
    if (!r) return;
    const n = bars.length - 1;
    CZ[k] = { a: +(n - r.from).toFixed(2), b: +(n - r.to).toFixed(2), vz: +vz.toFixed(3), vo: +vo.toFixed(4), pz: { ...pz }, po: { ...po }, f: lrFree ? 1 : 0, y: yLock, t: Date.now() };
    const ks = Object.keys(CZ);
    if (ks.length > 40) ks.sort((x, y) => CZ[x].t - CZ[y].t).slice(0, ks.length - 40).forEach((x) => delete CZ[x]);
    czStore();
  }
  function czSave() { clearTimeout(czT); czT = setTimeout(czDo, 500); }
  // grafico che si chiude (o pagina che va via) con un salvataggio in sospeso: lo faccio subito
  const czFlush = () => { if (czT) { clearTimeout(czT); czDo(); clearTimeout(czW); try { chrome.storage.local.set({ cz: CZ }); } catch (_) {} } };
  addEventListener("pagehide", czFlush);
  document.addEventListener("visibilitychange", () => { if (document.hidden) czFlush(); });
  function czRestore() {
    const z = CZ[czKey()];
    if (!z || !chart || !bars.length) return false;
    const n = bars.length - 1, r = { from: n - z.a, to: n - z.b };
    if (!(r.to > r.from)) return false;
    wantRange = r; // resta così anche se il pannello sta ancora cambiando dimensione
    chart.timeScale().setVisibleLogicalRange(r);
    vz = z.vz || 1; vo = z.vo || 0; yLock = z.y || null;
    if (z.pz) Object.assign(pz, z.pz);
    if (z.po) Object.assign(po, z.po);
    for (const id of paneIds) { try { rescalePane(id); } catch (_) {} }
    if (mode === "l" && z.f) { lrFree = true; drawTools(); }
    rescale();
    return true;
  }
  // ---------- Etichette dell'ultimo valore sull'asse dei prezzi (angoli arrotondati) ----------
  // La libreria le disegna rettangolari: le nascondo e le metto io sopra l'asse, nella stessa posizione.
  let tagRaf = 0;
  const TAGGED = new WeakSet();
  const tagSoon = () => { if (!tagRaf) tagRaf = requestAnimationFrame(placeTags); };
  function lastOf(sr) {
    try { const d = sr.dataByIndex(Infinity, LightweightCharts.MismatchDirection.NearestLeft); return d ? (d.close != null ? d.close : d.value) : null; } catch (_) { return null; }
  }
  // valori del mirino: prezzo sull'asse a destra (del riquadro in cui si trova il mouse) e data sull'asse in basso
  const XT_MON = () => new Intl.DateTimeFormat(LOC, { month: "short", timeZone: "UTC" });
  function crossTags(pr) {
    const box = $("#xtags"); if (!box) return;
    if (!pr || !pr.point || !chart || !S.c) { if (box.firstChild) box.innerHTML = ""; return; }
    let ps, w = 0, th = 0;
    try { ps = chart.panes(); w = chart.priceScale("right").width(); th = chart.timeScale().height(); } catch (_) { return; }
    const y = pr.point.y, x = pr.point.x;
    let top = 0, pi = -1, tot = 0;
    ps.forEach((p, i) => { const h = p.getHeight(); if (pi < 0 && y >= tot && y <= tot + h) { pi = i; top = tot; } tot += h + 1; });
    let h = "";
    if (pi >= 0) {
      let sr = pi === 0 ? S.c : null;
      if (!sr) for (const id in S.fx || {}) { for (const z of S.fx[id] || []) { try { if (z.getPane().paneIndex() === pi) { sr = z; break; } } catch (_) {} } if (sr) break; }
      if (sr) {
        let v = sr.coordinateToPrice(y - top), yy = y;
        if (mode === "l" && pi === 0 && hov != null && bars[hov]) { v = bars[hov].close; const c = sr.priceToCoordinate(v); if (c != null) yy = top + c; } // storico: la linea orizzontale si aggancia alla curva
        if (v != null && isFinite(v)) { let txt; try { txt = sr.priceFormatter().format(v); } catch (_) { txt = String(v); } h += `<span class="xtag p" style="top:${Math.round(yy)}px;width:${w - 4}px">${esc(txt)}</span>`; }
      }
    }
    const b = hov != null ? bars[hov] : null;
    if (b && th) {
      const d = new Date(b.time * 1000), dd = String(d.getUTCDate()).padStart(2, "0"), mo = XT_MON().format(d).replace(".", ""), yy = String(d.getUTCFullYear()).slice(2);
      const txt = ivSec >= 2e6 ? `${mo} '${yy}` : `${dd} ${mo} '${yy}${ivSec < 86400 && mode !== "l" ? ` ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}` : ""}`;
      const bx = chart.timeScale().timeToCoordinate(b.time);
      h += `<span class="xtag t" style="left:${Math.round(bx != null ? bx : x)}px;top:${Math.round(tot - 1 + th / 2)}px">${esc(txt)}</span>`;
    }
    if (box.innerHTML !== h) box.innerHTML = h;
  }
  function placeTags() {
    tagRaf = 0;
    const box = $("#ptags");
    if (!box) return;
    if (!chart || !S.c || !bars.length) { box.innerHTML = ""; return; }
    let ps, w = 0;
    try { ps = chart.panes(); w = chart.priceScale("right").width(); } catch (_) { return; }
    const tops = [], hs = [];
    let y = 0;
    ps.forEach((p, i) => { tops[i] = y; hs[i] = p.getHeight(); y += hs[i] + 1; });
    const tags = [];
    const put = (sr, v, bg, pi, ind) => {
      if (v == null || !isFinite(v)) return;
      const c = sr.priceToCoordinate(v);
      if (c == null || c < 0 || c > hs[pi]) return;
      let txt; try { txt = sr.priceFormatter().format(v); } catch (_) { txt = String(v); }
      tags.push({ pi, y: tops[pi] + c, h: ind ? 16 : 19, html: `<span class="ptag${ind ? " ind" : ""}" style="top:@Y@px;width:${w - 4}px;background:${bg};color:${onCol(bg)}">${esc(txt)}</span>` });
    };
    const lb = bars[bars.length - 1], I = st.ind;
    const mainCol = mode === "l" ? histCol() : lineish() ? cLn() : lb.close >= lb.open ? cUp() : cDn();
    put(S.c, lb.close, mainCol, 0);
    for (const x of fxList()) {
      const sr = S.fx && S.fx[x.id];
      if (!sr || x.nt) continue;
      sr.forEach((z) => {
        const o = z.options();
        if (!TAGGED.has(z) || o.visible === false) return;
        let pi = 0; try { pi = z.getPane().paneIndex(); } catch (_) {}
        put(z, lastOf(z), o.color || "#787b86", pi, true);
      });
    }
    // capsule vicine: le impilo (la più alta sopra), senza uscire dal riquadro
    const byPane = {};
    for (const t of tags) (byPane[t.pi] = byPane[t.pi] || []).push(t);
    for (const [pi, arr] of Object.entries(byPane)) {
      arr.sort((a, b) => a.y - b.y);
      const lo = tops[pi], hi = tops[pi] + hs[pi];
      for (let i = 1; i < arr.length; i++) { const g = (arr[i - 1].h + arr[i].h) / 2; if (arr[i].y < arr[i - 1].y + g) arr[i].y = arr[i - 1].y + g; }
      for (let i = arr.length - 1; i >= 0; i--) {
        const max = i === arr.length - 1 ? hi - arr[i].h / 2 : arr[i + 1].y - (arr[i].h + arr[i + 1].h) / 2;
        if (arr[i].y > max) arr[i].y = max;
        if (arr[i].y < lo + arr[i].h / 2 && i === 0) arr[i].y = lo + arr[i].h / 2;
      }
    }
    box.innerHTML = tags.map((t) => t.html.replace("@Y@", Math.round(t.y))).join("");
  }
  // Vista iniziale. Candele intraday: la seduta più recente (almeno MIN_BARS candele, le
  // precedenti restano scorrendo a sinistra). Candele giornaliere o più lunghe: le ultime 120.
  // Andamento di lungo termine: tutto il periodo scelto.
  // andamento storico: prima candela del periodo scelto (lo storico scaricato è più lungo, per lo zoom)
  function periodFrom() {
    const n = bars.length, day = (t) => Math.floor(t / 86400);
    if (!n) return 0;
    const T = bars[n - 1].time, r = st.lr;
    if (r === "max") return 0;
    let cut;
    if (r === "1d" || r === "5d") {
      let k = r === "1d" ? 1 : 5, i = n - 1, d = day(T);
      while (i > 0) { if (day(bars[i - 1].time) !== d) { if (--k === 0) break; d = day(bars[i - 1].time); } i--; }
      return i;
    }
    if (r === "ytd") cut = Date.UTC(new Date(T * 1000).getUTCFullYear(), 0, 1) / 1000;
    else cut = T - ({ "1mo": 31, "6mo": 183, "1y": 366, "5y": 1827 }[r] || 366) * 86400;
    let i = n - 1;
    while (i > 0 && bars[i - 1].time >= cut) i--;
    return i;
  }
  // primo valore di riferimento della variazione: inizio del periodo, oppure prima candela visibile
  // quando hai spostato o ingrandito il grafico
  function baseIdx() {
    if (!lrFree || !chart) return Math.min(hFrom, bars.length - 1);
    const lr = chart.timeScale().getVisibleLogicalRange();
    return lr ? Math.max(0, Math.min(bars.length - 1, Math.ceil(lr.from))) : 0;
  }
  // andamento storico: la variazione di oggi sale sulla riga del titolo e accanto al prezzo va quella del periodo;
  // nel grafico a candele resta accanto al prezzo
  function chgPlace() {
    const q = $(".chart .cquote"); if (q) q.classList.add("hl");
    if (mode !== "l") { const p = $("#c-per"); if (p) { p.textContent = "\u00a0"; p.className = "cper"; } } // riga vuota: prezzo e % restano dove sono nello storico
  }
  function perHeader() {
    chgPlace();
    if (mode !== "l" || !bars.length) return;
    const p0 = bars[baseIdx()].close, cp = p0 ? ((bars[bars.length - 1].close - p0) / p0) * 100 : 0, el = $("#c-per");
    // stesse sigle dei tasti dei periodi: "in 1M", "in YTD"; tutto lo storico: "da inizio"
    const RL = { "1d": ["1G", "1D"], "5d": ["5G", "5D"], "1mo": ["1M", "1M"], "6mo": ["6M", "6M"], ytd: ["YTD", "YTD"], "1y": ["1A", "1Y"], "5y": ["5A", "5Y"] }[st.lr];
    el.textContent = `${cp >= 0 ? "▲" : "▼"}${num2(Math.abs(cp))}% ${lrFree ? L("nel periodo visibile", "in the visible period") : RL ? L(`in ${RL[0]}`, `in ${RL[1]}`) : L("da inizio", "all time")}`;
    el.className = `cper ${cp >= 0 ? "up" : "dn"}`;
  }
  function showRange() {
    const ts = chart.timeScale(), n = bars.length;
    if (!n) return;
    const day = (t) => Math.floor(t / 86400);
    let from = 0;
    if (mode === "l") { from = hFrom = periodFrom(); lrFree = false; }
    if (mode !== "l") {
      if (ivSec < 86400) {
        const d = day(bars[n - 1].time);
        from = n - 1;
        while (from > 0 && day(bars[from - 1].time) === d) from--;
      } else from = n - 120;
      from = Math.max(0, Math.min(from, n - MIN_BARS));
    }
    rangeStart = bars[Math.max(0, Math.min(from, n - 1))].time;
    focusFrom = from;
    vz = 1; vo = 0; yLock = null;
    wantRange = { from: from - 0.5, to: n - 1 + (mode !== "l" ? 6 : 1) };
    ts.setVisibleLogicalRange(wantRange);
    rescale();
  }

  // Ricarico ogni minuto per correggere candele e volumi (nel frattempo aggiornano i tick)
  function schedule(soon) {
    clearTimeout(ctimer);
    if (!cur) return;
    const est = bars.length && bars[bars.length - 1].est;
    if (!est) estTries = 0;
    // apertura dell'ultima candela ancora stimata: richiedo la candela vera ogni 5 s (per un minuto)
    const wait = (soon || est) && estTries++ < 12 ? 5000 : 60000;
    ctimer = setTimeout(() => { if (cur && !viewHidden()) load(true); else schedule(); }, wait);
  }

  // Prezzo in tempo reale sul simbolo del grafico: aggiorna l'ultima candela o ne apre una nuova
  function live(m) {
    if (!chart || !bars.length || !S.c) return;
    const q0 = quotes[cur];
    if (extH(q0) && (mode === "l" || ivSec >= 86400)) {
      // mercato chiuso: niente punti/candele con i prezzi pre o after market, l'ultima resta sulla chiusura regolare
      const lb = bars[bars.length - 1];
      if (lb.close !== q0.rp) { lb.close = q0.rp; lb.high = Math.max(lb.high, q0.rp); lb.low = Math.min(lb.low, q0.rp); updLast(); }
      return;
    }
    let dv = 0;
    // volume del giorno: lo stream e Yahoo via HTTP lo contano in modo diverso, quindi tengo un riferimento per
    // ciascuno (altrimenti passando da uno all'altro la differenza finiva tutta nella candela, gonfiandola)
    if (m.vol != null) { const k = m.live ? "s" : "h"; dayVol = dayVol || {}; if (dayVol[k] != null && m.vol > dayVol[k]) dv = m.vol - dayVol[k]; dayVol[k] = m.vol; }
    // Minuto della candela. Tick dello stream: istante di arrivo (l'orario inviato da Yahoo può
    // essere arrotondato al minuto e farebbe partire la candela successiva in anticipo); per le
    // borse con dati differiti tolgo il ritardo misurato. Dati HTTP: orario dello scambio.
    let ms;
    if (m.live) {
      const now = Date.now(), lagNow = Math.max(0, now - (m.tt || now));
      lag = lag == null ? lagNow : Math.min(lagNow, lag + 1000);
      ms = now - (lag < 60000 ? 0 : lag);
    } else ms = m.tt || m.time || Date.now();
    const t = sh(Math.floor(ms / 1000)), lastB = bars[bars.length - 1], p = m.price;
    if (t < lastB.time) return;
    let b = lastB;
    if (ivSec < 86400 && t >= lastB.time + ivSec) {
      // Se ho visto i tick del minuto precedente, il primo tick è l'apertura. Altrimenti (grafico
      // appena aperto o pausa) l'apertura vera non la conosco: la stimo con la chiusura
      // precedente e chiedo subito a Yahoo la candela vera.
      const seen = m.live && liveBar === lastB.time, o = seen ? p : lastB.close;
      b = { time: lastB.time + Math.floor((t - lastB.time) / ivSec) * ivSec, open: o, high: Math.max(o, p), low: Math.min(o, p), close: p, volume: 0, est: !seen };
      if (pendVol && pendVol.t === b.time) b.volume = pendVol.v; // volume già scambiato in questa candela prima dell'apertura del grafico
      pendVol = null;
      bars.push(b);
      idx.set(b.time, bars.length - 1);
      if (b.est) schedule(true);
    } else {
      b.high = Math.max(b.high, p); b.low = Math.min(b.low, p); b.close = p;
    }
    // salto impossibile (più di quanto scambiato nelle ultime 30 candele messe insieme): è un riallineamento, non scambi
    if (dv > 0) { let tot = 0; for (let i = Math.max(0, bars.length - 31); i < bars.length - 1; i++) tot += bars[i].volume || 0; if (tot > 0 && dv > tot) dv = 0; }
    b.volume += dv;
    if (m.live) liveBar = b.time;
    updLast();
  }

  // Tastiera sul grafico (dopo averlo cliccato)
  function panY(dir) { vo += 0.3 * dir; rescale(); }
  function panX(dir) {
    const ts = chart.timeScale(), r = ts.getVisibleLogicalRange();
    if (!r) return;
    const d = Math.max(1, (r.to - r.from) * 0.1) * dir;
    ts.setVisibleLogicalRange({ from: r.from + d, to: r.to + d });
  }

  // ---------- Nascondi (tasto "Nascondi" o Esc) ----------
  function hideWidget() {
    if (PANEL) { try { window.close(); } catch (_) {} return; } // pannello laterale: "Nascondi" lo chiude
    rec = false; hideHtip();
    closeColor();
    $("#settings").hidden = true;
    st.hidden = true;
    if (cur) closeChart();
    save();
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || isHidden() || !st.open || e.defaultPrevented) return;
    if (cp) return closeColor();               // prima chiudo menu e selettore colore aperti
    if (!$("#menu").hidden) return closeMenu();
    if (maxed && cur) return setMax(false);
    hideWidget();
  });
  document.addEventListener("click", (e) => { if (e.target !== host) { closeMenu(); closeColor(); if (pfArm) { pfArm = null; drawList(); } } }, true);
  function toggleWidget() {
    if (st.hidden) { st.hidden = false; st.open = true; save(); } // nascosto: lo riapro col pannello
    // visibile (anche solo la barra dei titoli in evidenza, col pannello chiuso): lo nascondo subito
    else hideWidget();
  }
  const isModifier = (c) => /^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/.test(c) || c === "CapsLock" || c === "Fn";
  const keyName = (e) => {
    let m;
    if ((m = /^Key([A-Z])$/.exec(e.code))) return m[1];
    if ((m = /^Digit(\d)$/.exec(e.code))) return m[1];
    if ((m = /^Numpad(\d)$/.exec(e.code))) return `Num ${m[1]}`;
    if (e.code === "Space") return "Spazio";
    if (/^F\d{1,2}$/.test(e.code)) return e.code;
    return e.key.length === 1 ? e.key.toUpperCase() : e.key;
  };
  const isTyping = (e) => {
    const t = e.target === host ? root.activeElement : e.composedPath()[0];
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  };
  // La scorciatoia la intercetto prima della pagina (fase di cattura sulla finestra)
  function onKey(e) {
    if (rec) {
      e.preventDefault(); e.stopPropagation();
      if (e.code === "Escape") { rec = false; return drawSettings(); }
      if (isModifier(e.code) || isModifier(e.key)) return; // aspetto il tasto principale
      st.key = { code: e.code, key: keyName(e), alt: e.altKey, shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey };
      rec = false; persist(); return drawSettings();
    }
    const k = st.key;
    if (!k || e.repeat || e.code !== k.code) return;
    if (e.altKey !== k.alt || e.shiftKey !== k.shift || e.ctrlKey !== k.ctrl || e.metaKey !== k.meta) return;
    if (!k.alt && !k.ctrl && !k.meta && isTyping(e)) return;
    e.preventDefault(); e.stopPropagation();
    if (excludedHere()) return; // sito escluso: si riattiva solo togliendolo dalla lista nelle impostazioni
    toggleWidget();
  }
  window.addEventListener("keydown", onKey, true);

  // ---------- Selettore colore: griglia standard + sfumature su richiesta ----------
  const hex2hsv = (h) => {
    const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let hh = 0;
    if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (hh * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
  };
  const hsv2hex = (h, s, v) => {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
  };
  // chiavi dei colori: "up", "dn", "lc" (candele e linea) oppure "fx:<id>:<linea>" (indicatori)
  const fxKey = (k) => { const [, id, j] = k.split(":"); return [fxFind(id), +j]; };
  const getColor = (k) => { if (k === "up" || k === "dn" || k === "acc") return effCol(k); if (k === "cup") return cUp(); if (k === "cdn") return cDn(); if (k === "cln") return cLn(); if (k === "lc") return lineCol(); if (flatColor(k)) return st.ind[k]; const [x, j] = fxKey(k); return x && fxDef(x) ? fxColor(x, j) : "#2962ff"; };
  const getWidth = (k) => { const [x, j] = fxKey(k); return x && fxDef(x) ? fxWidth(x, j) : 2; };
  function putFx(k, field, v) {
    const [x, j] = fxKey(k), d = fxDef(x);
    if (!d) return;
    x[field] = d.l.map((_, i) => (field === "c" ? fxColor(x, i) : fxWidth(x, i)));
    x[field][j] = v;
  }
  let colorRaf = 0, colorSave;
  function setColor(hex, final) {
    const k = cp.key, I = st.ind;
    if (flatColor(k)) { I[k] = hex; applyCols(); if (k === "acc" || k === "up" || k === "dn") root.querySelectorAll('.sw[data-ic="cup"],.sw[data-ic="cdn"],.sw[data-ic="cln"]').forEach((x) => (x.style.background = getColor(x.dataset.ic))); } else putFx(k, "c", hex);
    Object.assign(cp, hex2hsv(hex));
    root.querySelectorAll(`.sw[data-ic="${k}"]`).forEach((b) => (b.style.background = hex));
    root.querySelectorAll(`.lcb[data-ic="${k}"]`).forEach((b) => (b.style.color = hex));
    if (!colorRaf) colorRaf = requestAnimationFrame(() => { colorRaf = 0; syncSeries(); });
    clearTimeout(colorSave);
    colorSave = setTimeout(persist, final ? 0 : 400);
  }
  // colori usati di recente (il più nuovo per primo): compaiono accanto ad "Altri colori…"
  const RCOL_MAX = 10;
  const rcols = () => (Array.isArray(st.rcol) ? st.rcol.filter(isHex) : []);
  function rememberColor() {
    if (!cp) return;
    const c = getColor(cp.key).toLowerCase();
    if (!isHex(c) || c === cp.c0) return;
    st.rcol = [c, ...rcols().filter((x) => x.toLowerCase() !== c)].slice(0, RCOL_MAX);
  }
  function openColor(btn) {
    rememberColor();
    cp = { key: btn.dataset.ic, custom: false, anchor: btn, c0: getColor(btn.dataset.ic).toLowerCase(), ...hex2hsv(getColor(btn.dataset.ic)) };
    drawColor();
    $("#cpop").hidden = false;
    placeColor();
  }
  // Il riquadro resta sempre tutto visibile, dentro il pannello e dentro la finestra (anche quando
  // si allarga con "Altri colori…"): sotto il pulsante se c'è spazio, altrimenti sopra, altrimenti
  // il più in alto possibile; se non entra comunque, scorre.
  function placeColor() {
    const pop = $("#cpop");
    if (!cp || pop.hidden) return;
    if (!(cp.anchor && cp.anchor.isConnected)) cp.anchor = [...root.querySelectorAll(`[data-a="color"][data-ic="${CSS.escape(cp.key)}"]`)].find((x) => x.offsetWidth) || null; // ridisegnato: lo ritrovo
    const pr = panel.getBoundingClientRect(), btn = cp.anchor && cp.anchor.isConnected ? cp.anchor : null;
    const br = btn ? btn.getBoundingClientRect() : { left: pr.left + 8, top: pr.top + 8, bottom: pr.top + 8 };
    const minY = Math.max(8, 8 - pr.top), maxY = Math.min(pr.height, innerHeight - pr.top) - 8; // area visibile del pannello
    pop.style.maxHeight = `${Math.max(120, maxY - minY)}px`;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.min(Math.max(8, br.left - pr.left - 8), pr.width - w - 8);
    let top = br.bottom - pr.top + 6;
    if (top + h > maxY) top = br.top - pr.top - h - 6; // non c'è spazio sotto: sopra
    if (top < minY) top = Math.max(minY, maxY - h);   // nemmeno sopra: il più possibile in vista
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }
  // provetta: mentre scegli spariscono il riquadro dei colori e, se è aperto, il pannello delle impostazioni
  async function pickScreen() {
    if (!cp || !window.EyeDropper) return;
    const pop = $("#cpop"), set = $("#settings");
    pop.style.visibility = set.style.visibility = "hidden";
    try { const r = await new window.EyeDropper().open(); if (cp && r && isHex(r.sRGBHex)) { setColor(r.sRGBHex.toLowerCase(), true); drawColor(); } }
    catch (_) {} // annullata con Esc
    finally { pop.style.visibility = set.style.visibility = ""; placeColor(); }
  }
  function closeColor() {
    if (!cp) return;
    rememberColor();
    cp = null;
    $("#cpop").hidden = true;
    persist();
  }
  function drawColor() {
    if (!cp) return;
    const c = getColor(cp.key).toLowerCase();
    const tv = cp.key === "cln" ? `<div class="tvrow"><span>${L("Colore del tema", "Theme color")}</span><button class="pill rst" data-a="creset" title="${L("La linea torna al colore del tema", "The line goes back to the theme color")}">Reset</button></div>`
      : cp.key === "cup" || cp.key === "cdn"
      ? `<div class="tvrow"><span>Colori TradingView</span><button class="pill rst" data-a="creset" title="${L("Le candele tornano ai colori di rialzo e ribasso delle impostazioni", "Candles go back to the up and down colors of the settings")}">Reset</button>${[["#089981", "Verde TradingView"], ["#f23645", "Rosso TradingView"]].map(([x, l]) =>
          `<button data-a="cpick" data-c="${x}" class="${x === c ? "on" : ""}" style="background:${x}" aria-label="${l}" title="${l} ${x.toUpperCase()}"></button>`).join("")}</div>`
      : flatColor(cp.key) ? `<div class="tvrow"><span>Colore predefinito</span><button class="pill rst" data-a="creset" title="${cp.key === "lc" ? L("Rimetti colore e spessore predefiniti della linea", "Restore the default line color and width") : L("Rimetti i colori predefiniti di rialzo, ribasso e tema", "Restore the default up, down and theme colors")}">Reset</button></div>` : "";
    let h = tv + `<div class="grid">${SWATCHES.map((x) => `<button data-a="cpick" data-c="${x}" class="${x === c ? "on" : ""}" style="background:${x}" aria-label="${x}"></button>`).join("")}</div>`;
    if (cp.custom) {
      h += `<div class="hsv"><div class="sv" id="sv" style="background:linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${cp.h},100%,50%))"><i style="left:${cp.s * 100}%;top:${(1 - cp.v) * 100}%"></i></div>
        <div class="hue" id="hue"><i style="left:${(cp.h / 360) * 100}%"></i></div></div>`;
    }
    if (!flatColor(cp.key) || cp.key === "lc") {
      const w = cp.key === "lc" ? st.ind.lw || 2 : getWidth(cp.key);
      h += `<div class="lw"><span>Spessore</span>${[1, 2, 3, 4].map((n) => `<button data-a="lwidth" data-w="${n}" class="${n === w ? "on" : ""}" aria-label="Spessore ${n}" style="color:${c}"><i style="height:${n}px"></i></button>`).join("")}</div>`;
    }
    // recenti: solo quelli che entrano nella riga (gli altri restano nascosti, niente righe in più)
    const rec = rcols().map((x) => `<button data-a="cpick" data-c="${x}" style="background:${x}" aria-label="${L("Colore recente", "Recent color")} ${x.toUpperCase()}" title="${L("Recente", "Recent")} ${x.toUpperCase()}"></button>`).join("");
    h += `<div class="cfoot2"><button class="pill" data-a="ccustom">${cp.custom ? "Nascondi sfumature" : "Altri colori…"}</button><span class="crec">${rec}</span><span style="display:flex;gap:6px;align-items:center">${window.EyeDropper ? `<button class="icon cdrop" data-a="cdrop" aria-label="${L("Provetta", "Eyedropper")}" title="${L("Provetta: prendi un colore da qualsiasi punto dello schermo", "Eyedropper: pick a color anywhere on the screen")}">${DROPICON}</button>` : ""}<span class="cprev" style="background:${c}"></span></span></div>`;
    $("#cpop").innerHTML = h;
    placeColor();
    if (cp.custom) {
      drag($("#sv"), (x, y) => { cp.s = x; cp.v = 1 - y; setColor(hsv2hex(cp.h, cp.s, cp.v)); paintHsv(); });
      drag($("#hue"), (x) => { cp.h = Math.min(359.9, x * 360); setColor(hsv2hex(cp.h, cp.s, cp.v)); paintHsv(); });
    }
  }
  // aggiorna solo i cursori (senza ricostruire il riquadro mentre trascini)
  function paintHsv() {
    const sv = $("#sv"), hue = $("#hue");
    if (!sv) return;
    const hsvH = cp.h;
    sv.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hsvH},100%,50%))`;
    sv.firstElementChild.style.left = `${cp.s * 100}%`; sv.firstElementChild.style.top = `${(1 - cp.v) * 100}%`;
    hue.firstElementChild.style.left = `${(cp.h / 360) * 100}%`;
    const c = getColor(cp.key);
    $("#cpop .cprev").style.background = c;
    root.querySelectorAll("#cpop .grid button, #cpop .tvrow button").forEach((b) => b.classList.toggle("on", b.dataset.c === c.toLowerCase()));
  }
  function drag(el, fn) {
    const at = (e) => {
      const r = el.getBoundingClientRect();
      fn(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
    };
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); at(e); });
    el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) at(e); });
  }

  // ---------- Allungare / comprimere il grafico dalla colonna dei prezzi ----------
  // Trascinando in su il grafico si allunga, in giù si comprime; la rotella sull'asse fa lo stesso.
  const cbox = $("#cbox");
  function onPriceAxis(e) {
    if (!chart || !S.c) return false;
    const r = cbox.getBoundingClientRect(), w = chart.priceScale("right").width();
    if (e.clientX < r.right - w || e.clientX > r.right) return false;
    let h0 = 0;
    try { h0 = chart.panes()[0].getHeight(); } catch (_) { return false; }
    const y = e.clientY - r.top;
    return y >= 0 && y <= h0;
  }
  const setVz = (z) => { vz = Math.min(20, Math.max(0.05, z)); rescale(); czSave(); };
  // Riquadri degli indicatori: la loro colonna dei valori si allunga come quella dei prezzi
  function paneAxis(e) {
    if (!chart || !paneIds.length) return null;
    const r = cbox.getBoundingClientRect(), w = chart.priceScale("right").width();
    if (e.clientX < r.right - w || e.clientX > r.right) return null;
    let y = e.clientY - r.top, ps;
    try { ps = chart.panes(); } catch (_) { return null; }
    for (let i = 0; i < ps.length; i++) {
      const h = ps[i].getHeight();
      if (y <= h) return i >= 1 ? paneIds[i - 1] || null : null;
      y -= h + 1;
    }
    return null;
  }
  // separatori tra i riquadri (li trascina la libreria: io salvo le proporzioni a fine trascinamento)
  function paneSeps() {
    const ps = chart.panes(), out = [];
    let y = 0;
    for (let i = 0; i < ps.length - 1; i++) { y += ps[i].getHeight(); out.push(y + 0.5); y += 1; }
    return out;
  }
  function onSep(e) {
    if (!chart || !paneIds.length) return false;
    const y = e.clientY - cbox.getBoundingClientRect().top;
    try { return paneSeps().some((s) => Math.abs(y - s) <= 4); } catch (_) { return false; }
  }
  // riquadro (0 = prezzi) sotto il puntatore, nell'area del grafico (non sulla colonna dei valori)
  function paneAt(e) {
    const r = cbox.getBoundingClientRect(), w = chart.priceScale("right").width();
    if (e.clientX < r.left || e.clientX >= r.right - w) return -1;
    let y = e.clientY - r.top;
    const ps = chart.panes();
    for (let i = 0; i < ps.length; i++) { const h = ps[i].getHeight(); if (y <= h) return i; y -= h + 1; }
    return -1;
  }
  let sepDrag = null, sepTok = 0;
  // trascinamento verticale nel grafico: sposta su e giù (in orizzontale ci pensa la libreria)
  let paneDrag = null;
  function onMainPane(e) {
    if (!chart || !S.c) return false;
    const r = cbox.getBoundingClientRect(), w = chart.priceScale("right").width();
    let h0 = 0;
    try { h0 = chart.panes()[0].getHeight(); } catch (_) { return false; }
    return e.clientX >= r.left && e.clientX < r.right - w && e.clientY - r.top >= 0 && e.clientY - r.top <= h0;
  }
  // appena interagisci col grafico (trascinamento, rotella, tastiera) la vista è tua
  // Pizzico sul touchpad (arriva come rotella con Ctrl, a piccoli passi): lo zoom lo faccio io, più deciso,
  // attorno al punto in cui sono le dita
  cbox.addEventListener("wheel", (e) => {
    if (!e.ctrlKey || !chart || !bars.length) return;
    const ts = chart.timeScale(), r = ts.getVisibleLogicalRange(), box = cbox.getBoundingClientRect();
    if (!r) return;
    e.preventDefault(); e.stopPropagation();
    let w = 0; try { w = chart.priceScale("right").width(); } catch (_) {}
    const x = Math.min(box.width - w, Math.max(0, e.clientX - box.left)), at = ts.coordinateToLogical(x);
    const c = at == null ? (r.from + r.to) / 2 : at, f = Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.022);
    const span = Math.max(6, Math.min(bars.length * 1.5 + 20, (r.to - r.from) * f)), k = (c - r.from) / (r.to - r.from || 1);
    wantRange = null; touchAt = Date.now();
    ts.setVisibleLogicalRange({ from: c - span * k, to: c + span * (1 - k) });
  }, { capture: true, passive: false });
  for (const ev of ["pointerdown", "wheel", "keydown"]) cbox.addEventListener(ev, (e) => { wantRange = null; touchAt = Date.now(); if (e.type === "pointerdown") touching = true; if (e.type === "wheel" && onMainPane(e)) lockY(); }, { capture: true, passive: true });
  addEventListener("pointerup", () => { if (touching) { touching = false; touchAt = Date.now(); } }, true);
  cbox.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (onSep(e)) { sepDrag = { id: e.pointerId, hs: chart.panes().map((p) => p.getHeight()).join() }; return; } // lo gestisce la libreria
    const pid = onPriceAxis(e) ? null : paneAxis(e);
    if (onPriceAxis(e) || pid) {
      if (!pid) lockY(); // allungando o comprimendo la scala dei prezzi poi il grafico si sposta liberamente, come dopo la rotella
      axDrag = { id: e.pointerId, y0: e.clientY, z0: pid ? pz[pid] || 1 : vz, pid };
      cbox.setPointerCapture(e.pointerId);
      e.preventDefault(); e.stopPropagation(); // la libreria non deve gestire questo trascinamento
    } else if (onMainPane(e)) {
      // in su e in giù solo a scala libera (dopo uno zoom con la rotella); a scala automatica solo destra-sinistra
      if (yLock) paneDrag = { id: e.pointerId, y0: e.clientY, o0: vo, h: chart.panes()[0].getHeight() * 0.7 };
    } else if (chart) {
      // riquadri degli oscillatori: stesso trascinamento verticale del grafico dei prezzi
      const i = paneAt(e), id = i >= 1 ? paneIds[i - 1] : null;
      if (id) paneDrag = { id: e.pointerId, y0: e.clientY, o0: po[id] || 0, h: chart.panes()[i].getHeight() * 0.7, pid: id };
    }
  }, true);
  cbox.addEventListener("pointermove", (e) => {
    if (paneDrag && e.pointerId === paneDrag.id && e.buttons & 1) {
      // trascinare in giù fa scendere le candele (cioè sale la finestra dei prezzi)
      const o = paneDrag.o0 + ((e.clientY - paneDrag.y0) * 2) / paneDrag.h;
      if (paneDrag.pid) { po[paneDrag.pid] = o; rescalePane(paneDrag.pid); } else { vo = o; rescale(); }
      return;
    }
    if (!axDrag || e.pointerId !== axDrag.id) {
      if (chart) cbox.style.cursor = onPriceAxis(e) || paneAxis(e) ? "ns-resize" : "";
      return;
    }
    e.preventDefault(); e.stopPropagation();
    // trascinare in su allunga (ingrandisce) le candele, in giù le comprime
    const z = axDrag.z0 * Math.exp((e.clientY - axDrag.y0) * 0.006);
    if (axDrag.pid) setPz(axDrag.pid, z); else setVz(z);
  }, true);
  const endAx = (e) => {
    if (paneDrag && e.pointerId === paneDrag.id) paneDrag = null;
    if (sepDrag && sepDrag.id === e.pointerId) {
      const before = sepDrag.hs;
      sepDrag = null;
      // salvo solo se le altezze sono cambiate davvero (un clic o un doppio clic non conta)
      const tok = ++sepTok;
      setTimeout(() => { if (tok === sepTok && chart && chart.panes().map((p) => p.getHeight()).join() !== before) savePaneH(); placeLegs(); }, 30);
    }
    if (!axDrag || e.pointerId !== axDrag.id) return;
    e.stopPropagation();
    try { cbox.releasePointerCapture(e.pointerId); } catch (_) {}
    axDrag = null; czSave();
  };
  cbox.addEventListener("pointerup", endAx, true);
  cbox.addEventListener("pointercancel", endAx, true);
  cbox.addEventListener("wheel", (e) => {
    const main = onPriceAxis(e), pid = main ? null : paneAxis(e);
    if (!main && !pid) return;
    e.preventDefault(); e.stopPropagation();
    if (main) { lockY(); setVz(vz * Math.exp(e.deltaY * 0.0015)); } else setPz(pid, (pz[pid] || 1) * Math.exp(e.deltaY * 0.0015));
  }, { capture: true, passive: false });

  // ---------- Liste ----------
  function saveListName() {
    const name = ($("#lname").value || "").trim().slice(0, 30);
    if (edit.mode === "new") {
      const id = "l" + Date.now().toString(36);
      st.lists = [...st.lists, { id, name: name || `Lista ${st.lists.length + 1}`, items: [] }];
      st.cl = id;
    } else if (name) {
      curList().name = name;
      st.lists = [...st.lists];
    }
    edit = null;
    save();
  }

  // ---------- Selettori a segmenti (Lista/Portafoglio, impostazioni, periodi del grafico…) ----------
  // Un cursore unico per selettore scivola dal pulsante di prima a quello nuovo, anche quando il
  // selettore viene ridisegnato: ricordo l'ultima posizione di ognuno.
  const SEGQ = ".tabs,.seg,#lchips", thumbPos = new Map();
  let segRaf = 0;
  function segKey(c) {
    if (c.id) return c.id;
    const a = c.parentElement && c.parentElement.closest("[id]");
    return `${a ? a.id : "?"}:${a ? [...a.querySelectorAll(SEGQ)].filter((x) => !x.id).indexOf(c) : 0}`; // senza quelli con id: l'indice non cambia se uno compare o sparisce
  }
  const thPlace = (th, p) => { th.style.transform = `translate(${p.x}px,${p.y}px)`; th.style.width = `${p.w}px`; th.style.height = `${p.h}px`; };
  function syncSeg(c) {
    const on = c.querySelector(":scope > .on");
    let th = c.querySelector(":scope > .sth");
    if (!on || !on.offsetWidth || !c.offsetParent) { if (th) th.style.opacity = "0"; return; }
    const cr = c.getBoundingClientRect(), br = on.getBoundingClientRect(), r2 = (v) => Math.round(v * 2) / 2;
    const k = segKey(c), p = { x: r2(br.left - cr.left - c.clientLeft + c.scrollLeft), y: r2(br.top - cr.top - c.clientTop + c.scrollTop), w: r2(br.width), h: r2(br.height) }, prev = thumbPos.get(k);
    if (!th) {
      th = document.createElement("i"); th.className = "sth"; th.setAttribute("aria-hidden", "true");
      c.prepend(th); c.classList.add("hasth");
      { const cs = getComputedStyle(c), rr = parseFloat(cs.borderTopLeftRadius) || 0, pd = parseFloat(cs.paddingTop) || 0; if (rr > pd) th.style.borderRadius = `${rr - pd}px`; } // curva concentrica a quella del contenitore
      th.style.transition = "none"; thPlace(th, prev || p); th._p = prev || p; void th.offsetWidth; th.style.transition = "";
    }
    const at = th._p; // dove si trova davvero il cursore (non l'ultimo valore ricordato, che può essere di un altro momento)
    if (!at || at.x !== p.x || at.y !== p.y || at.w !== p.w || at.h !== p.h || th.style.opacity === "0") { thPlace(th, p); th._p = p; }
    th.style.opacity = "1";
    thumbPos.set(k, p);
  }
  const syncSegs = () => { segRaf = 0; root.querySelectorAll(SEGQ).forEach(syncSeg); };
  const segSoon = () => { if (!segRaf) segRaf = requestAnimationFrame(syncSegs); };
  // ---------- Menu a tendina con lo stile del widget ----------
  // Il menu nativo del sistema (bianco, in stile Windows) non si può personalizzare: lascio il <select>
  // nascosto (tiene valore ed eventi) e al suo posto mostro un pulsante che apre un elenco come gli altri menu.
  const CSCHEV = '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
  let cselCur = null, cselRaf = 0;
  const cselLabel = (sel) => { const o = sel.options[sel.selectedIndex]; return o ? o.textContent : ""; };
  function cselSync(sel) {
    const b = sel.nextElementSibling;
    if (!b || !b.classList.contains("csel")) return;
    const t = cselLabel(sel);
    if (b.firstChild.textContent !== t) b.firstChild.textContent = t;
    if (b.disabled !== sel.disabled) b.disabled = sel.disabled;
  }
  function cselEnhance(sel) {
    if (sel.dataset.cs) return cselSync(sel);
    sel.dataset.cs = "1"; sel.classList.add("cshid"); sel.tabIndex = -1;
    const b = document.createElement("button");
    b.type = "button"; b.className = "csel"; b.dataset.a = "csel";
    b.setAttribute("aria-haspopup", "listbox"); b.setAttribute("aria-label", sel.getAttribute("aria-label") || "");
    if (sel.title) b.title = sel.title;
    b.innerHTML = `<span></span>${CSCHEV}`;
    sel.after(b); cselSync(sel);
  }
  const cselAll = () => { cselRaf = 0; root.querySelectorAll("select").forEach(cselEnhance); };
  const cselSoon = () => { if (!cselRaf) cselRaf = requestAnimationFrame(cselAll); };
  function cselOpen(b) {
    const sel = b.previousElementSibling;
    if (!sel || sel.tagName !== "SELECT") return;
    if (!$("#menu").hidden && cselCur === sel) { cselCur = null; return closeMenu(); }
    cselCur = sel;
    openMenu(b, `<div class="csl" role="listbox">${[...sel.options].map((o, i) => `<button data-a="csopt" data-i="${i}" role="option" aria-selected="${i === sel.selectedIndex}" class="${i === sel.selectedIndex ? "on" : ""}"><span class="ck">${i === sel.selectedIndex ? "✓" : ""}</span>${esc(o.textContent)}</button>`).join("")}</div>`);
    const m = $("#menu"), on = m.querySelector(".csl .on");
    m.style.minWidth = `${b.offsetWidth}px`;
    const pr = $("#panel").getBoundingClientRect(), br = b.getBoundingClientRect(), room = pr.bottom - br.bottom - 14;
    m.querySelector(".csl").style.maxHeight = `${Math.max(150, Math.min(300, room))}px`;
    if (on) on.scrollIntoView({ block: "nearest" });
  }
  function cselPick(i) {
    const sel = cselCur;
    closeMenu(); cselCur = null;
    if (!sel || !sel.isConnected || sel.selectedIndex === i) return;
    sel.selectedIndex = i;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    cselSync(sel);
  }
  new MutationObserver((ms) => {
    for (const m of ms) {
      const t = m.target;
      if (t.nodeType === 1 && (t.tagName === "SELECT" || t.tagName === "OPTION")) { cselSoon(); continue; }
      if (m.type === "childList") for (const n of m.addedNodes) if (n.nodeType === 1 && (n.tagName === "SELECT" || (n.querySelector && n.querySelector("select")))) cselSoon();
    }
  }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled"] });
  root.addEventListener("change", (e) => { if (e.target && e.target.tagName === "SELECT") cselSync(e.target); }, true);
  new MutationObserver((ms) => {
    for (const m of ms) {
      const t = m.target;
      if (m.type === "attributes") return segSoon(); // anche un contenitore che ricompare (classi del pannello)
      if (t.nodeType === 1 && t.closest(SEGQ)) return segSoon();
      if (m.type === "childList") for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches(SEGQ) || n.querySelector(SEGQ))) return segSoon();
    }
  }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
  addEventListener("resize", segSoon);

  // ---------- Salvataggio ----------
  function persist() {
    try { chrome.storage.local.set(Object.fromEntries(KEYS.map((k) => [k, st[k]]))); } catch (_) {}
  }
  function save() { persist(); apply(); loop(); }

  // ---------- Eventi ----------
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (pfArm && !(b && b.dataset.a === "pfrm")) {
      const inList = !!e.target.closest("#list"); // prima di ridisegnare: dopo l'elemento non c'è più
      pfArm = null; drawList();
      if (inList) return; // il clic serviva solo ad annullare la rimozione
    }
    if (!b) {
      if (e.target.id === "settings") { $("#settings").hidden = true; } // clic sullo sfondo
      if (!e.target.closest("#cpop")) closeColor();
      if (!e.target.closest("#menu")) closeMenu();
      return;
    }
    const a = b.dataset.a;
    if (!b.closest("#cpop") && a !== "color") closeColor();
    if (a === "color") return cp && cp.key === b.dataset.ic ? closeColor() : openColor(b);
    if (a === "cpick") return setColor(b.dataset.c, true), drawColor();
    if (a === "creset") { // colori predefiniti: rialzo, ribasso e tema (oppure linea e spessore, dal grafico storico)
      if (cp && cp.key === "cln") { // linea e area: tornano al colore del tema
        delete st.ind.cln;
        root.querySelectorAll('.sw[data-ic="cln"]').forEach((x) => (x.style.background = cLn()));
        Object.assign(cp, hex2hsv(cLn()));
        syncSeries(); persist(); return drawColor();
      }
      if (cp && (cp.key === "cup" || cp.key === "cdn")) { // candele: tornano a seguire rialzo e ribasso
        delete st.ind.cup; delete st.ind.cdn;
        root.querySelectorAll('.sw[data-ic="cup"]').forEach((x) => (x.style.background = cUp()));
        root.querySelectorAll('.sw[data-ic="cdn"]').forEach((x) => (x.style.background = cDn()));
        Object.assign(cp, hex2hsv(getColor(cp.key)));
        syncSeries(); persist(); return drawColor();
      }
      const ks = ["up", "dn", "acc"];
      for (const k of ks) { st.ind[k] = IND0[k]; root.querySelectorAll(`.sw[data-ic="${k}"]`).forEach((x) => (x.style.background = getColor(k))); }
      applyCols();
      if (cp) Object.assign(cp, hex2hsv(getColor(cp.key)));
      syncSeries(); persist(); return drawColor();
    }
    if (a === "ccustom") { cp.custom = !cp.custom; drawColor(); return placeColor(); }
    if (a === "cdrop") return pickScreen();
    if (a === "cdone") return closeColor();
    if (a === "lwidth") {
      if (cp.key === "lc") { st.ind.lw = +b.dataset.w; drawTools(); } else putFx(cp.key, "w", +b.dataset.w);
      syncSeries(); persist(); return drawColor();
    }
    if (e.target.closest(".ph")) return; // la maniglia serve solo a trascinare
    if (a === "resort") { // riordina e aggiorna: prezzi, notizie aperte e avvisi delle notizie
      listOrder = null; pfOrder = null; drawList(); fullAt = 0; refresh();
      if (newsOn && cur) loadNews(true);
      if (st.nsub && Object.keys(st.nsub).length) chrome.runtime.sendMessage({ type: "newscheck" }).catch(() => {});
      return;
    }
    if (a === "tab") {
      const t = b.dataset.t === "pf" ? "pf" : "list";
      if (st.tab === t) return;
      st.tab = t; pfEdit = false; lEdit = false; pfArm = null; pfForm = null; renderPform();
      closeFind(); persist(); drawLists(); drawList(); pushSubs(); fadeIn($("#list")); return paint();
    }
    if (a === "dpk") { // calendario della data di acquisto
      if (dpk) dpk = null;
      else { const k = parseDay($("#pfdate").value) || dayKey(); dpk = { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 }; }
      drawDpk(); return;
    }
    if (a === "dpm") { if (dpk) { const t = new Date(dpk.y, dpk.m + +b.dataset.d, 1); dpk = { y: t.getFullYear(), m: t.getMonth() }; drawDpk(); } return; }
    if (a === "dpd") { $("#pfdate").value = dShow(b.dataset.k); dpk = null; drawDpk(); $("#pfmsg").textContent = ""; pfCv(); return; }
    if (a === "pfbox") {
      st.pfb = PFB[(PFB.indexOf(pfb()) + 1) % PFB.length]; persist();
      $("#list").dataset.pfb = st.pfb; drawPf(); return;
    }
    if (a === "pcolsort") {
      const [, , first, second] = PCOLS.find((x) => x[0] === b.dataset.c);
      st.psort = st.psort === first ? second : st.psort === second ? "none" : first;
      pfOrder = null; persist(); return drawList();
    }
    if (a === "pfadd") return pfForm && pfForm.mode === "add" && !pfForm.s ? (pfForm = null, renderPform()) : pfOpen({ mode: "add" });
    if (a === "pfadd2") { const x = results.find((y) => y.symbol === b.dataset.sym); if (!x) return; closeFind(); return pfPick(x); }
    if (a === "pfpick") { const x = pfRes[+b.dataset.i]; if (x) pfPick(x); return; }
    if (a === "pfchg") return pfOpen({ mode: "add", qtext: "" });
    if (a === "pfcancel") { pfForm = null; renderPform(); return pushSubs(); }
    if (a === "pfsave") return pfSave();
    if (a === "pfedit") { pfEdit = !pfEdit; pfArm = null; if (pfForm && pfForm.mode === "edit") { pfForm = null; renderPform(); } drawLists(); return drawList(); }
    if (a === "pfmod") { const it = st.pf.find((x) => x.s === b.dataset.s); if (it) pfOpen({ mode: "edit", s: it.s, n: it.n, t: it.t, c: it.c, q0: it.q, p0: it.p, pc0: pfPc(it), d0: lotsOf(it)[0].d, pxSet: true, pcSet: true }); return; }
    if (a === "pfrm") {
      if (pfArm !== b.dataset.s) { pfArm = b.dataset.s; return drawList(); }
      st.pf = st.pf.filter((x) => x.s !== b.dataset.s); pfArm = null; pfOrder = null;
      if (pfForm && pfForm.s === b.dataset.s && pfForm.mode === "edit") { pfForm = null; renderPform(); }
      return save();
    }
    if (a === "colsort") {
      const [, , first, second] = COLS.find((x) => x[0] === b.dataset.c);
      // 1° clic: Ticker dalla A alla Z, le altre colonne dal maggiore al minore; 2° inverte, 3° torna all'ordine in cui hai inserito i ticker
      // Trend: solo % di oggi decrescente ↔ crescente; le altre colonne: ↓, ↑, poi l'ordine tuo
      const cyc = b.dataset.c === "r" ? ["pd", "pa"] : [first, second], i = cyc.indexOf(st.sort);
      st.sort = i < 0 ? cyc[0] : i === cyc.length - 1 ? "none" : cyc[i + 1]; // Trend: decrescente, crescente, non ordinato
      listOrder = null; persist(); drawList(); return paint();
    }
    if (a === "findclose") { closeFind(); return $("#fq").focus(); }
    if (a === "export") return exportData();
    if (a === "txtdl") return exportTxt($("#txtlist").value);
    if (a === "import") { impData = null; $("#impmsg").innerHTML = ""; $("#impfile").value = ""; return $("#impfile").click(); }
    if (a === "impok") return applyImport();
    if (a === "impno") { impData = null; $("#impmsg").innerHTML = ""; return; }
    { const rr = b.closest(".res[data-rn]"); if (rr && rr.dataset.rn && (a === "chart" || a === "line" || a === "news")) EXN[rr.dataset.s] = rr.dataset.rn; } // titolo trovato con la ricerca: il nome per l'intestazione
    if (a === "chart") return cur === b.dataset.s && mode === "c" && !newsOn ? userCloseChart() : openChart(b.dataset.s, "c");
    if (a === "close-chart") return userCloseChart();
    if (a === "slotsfold") { // la sezione si apre e si chiude scorrendo in altezza
      const el = $("#slots"), op = !st.slotsOpen;
      st.slotsOpen = op; if (!op) { slot = null; slotRes = []; } persist();
      if (!motionOK()) return drawSlots();
      (el._an || []).forEach((x) => x.cancel());
      if (op) { drawSlots(); const h = el.scrollHeight; el.style.overflow = "hidden"; const x = el.animate([{ height: "0px", opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 300, easing: EASE }); el._an = [x]; x.onfinish = () => { el.style.overflow = ""; }; }
      else {
        $("#slotsfold").classList.remove("open"); $("#slotsfold").setAttribute("aria-expanded", "false"); const ss = $("#slotsearch"); if (ss) ss.hidden = true;
        const h = el.offsetHeight; el.style.overflow = "hidden";
        const x = el.animate([{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 240, easing: EASE, fill: "forwards" }); el._an = [x];
        x.onfinish = () => { el.style.overflow = ""; drawSlots(); x.cancel(); };
      }
      return;
    }
    if (a === "maxchart") return setMax(!maxed);
    if (a === "newsback") return setNews(false);
    if (a === "newsretry") return loadNews(true);
    if (a === "news") { // icona delle notizie nella riga: apre (o richiude) le notizie del titolo
      e.stopPropagation();
      const sm = b.dataset.s;
      if (newsOn && cur === sm) return setNews(false);
      if (cur !== sm) openChart(sm, cur ? mode : rowM(), true);
      return setNews(true);
    }
    if (a === "newssub") {
      if (!cur) return;
      st.nsub = { ...(st.nsub || {}) };
      if (st.nsub[cur]) { delete st.nsub[cur]; chrome.runtime.sendMessage({ type: "newsread", s: cur }).catch(() => {}); }
      else st.nsub[cur] = Date.now();
      persist(); drawNews(); draw(); return;
    }
    if (a !== "csel" && a !== "ivmenu" && a !== "rgmenu" && a !== "fxmenu" && a !== "ctmenu" && !b.closest("#menu")) closeMenu();
    // ricliccando lo stesso ticker (o il pulsante dell'analisi storica) il grafico si richiude
    if (a === "line") return cur === b.dataset.s && mode === "l" && !newsOn ? userCloseChart() : openChart(b.dataset.s, "l");
    if (a === "rgmenu") { // grafico stretto: i periodi in un menu
      if (!$("#menu").hidden) return closeMenu();
      return openMenu(b, `<div class="ivgrid">${RANGES.map(([k, l]) => `<button data-a="range" data-r="${k}" class="${st.lr === k && !lrFree ? "on" : ""}">${l}</button>`).join("")}</div>`);
    }
    if (a === "range") { closeMenu(); st.lr = b.dataset.r; lrFree = false; delete CZ[czKey()]; czStore(); persist(); drawTools(); return load(false); }
    if (a === "ivmenu") {
      if (!$("#menu").hidden) return closeMenu();
      return openMenu(b, `<div class="ivgrid">${IVS.map(([k, l]) => `<button data-a="ivpick" data-v="${k}" class="${ivNow() === k ? "on" : ""}">${l}</button>`).join("")}</div>`);
    }
    if (a === "csel") return cselOpen(b);
    if (a === "csopt") return cselPick(+b.dataset.i);
    if (a === "tplmenu") { if (!$("#menu").hidden) return closeMenu(); openMenu(b, tplMenu()); return $("#tplname").focus(); }
    if (a === "tplsave") return tplSave();
    if (a === "tpldel") { st.tpl = tplList().filter((t) => t.id !== b.dataset.id); persist(); $("#menu").innerHTML = tplMenu(); return; }
    if (a === "tplapply") return tplApply(b.dataset.id);
    if (a === "ivpick") { st.ci = b.dataset.v; closeMenu(); persist(); drawTools(); return load(false); }
    if (a === "fxmenu") {
      if (!$("#menu").hidden) return closeMenu();
      fxQ = ""; // a ogni apertura la ricerca riparte da capo
      openMenu(b, fxMenu());
      // l'elenco scorre dentro il pannello
      $("#fxlist").style.maxHeight = `${Math.max(160, $("#panel").clientHeight - $("#menu").offsetTop - 70)}px`;
      return $("#fxq").focus();
    }
    if (a === "fxadd") {
      if (fxList().filter(fxDef).length >= MAX_FX) return;
      const x = fxNew(b.dataset.t);
      if (!x) return;
      st.ind.fx = [...fxList(), x];
      persist(); syncSeries(); fxRefreshMenu();
      return;
    }
    if (a === "fxtag") { const x = fxFind(b.dataset.id); if (x) { x.nt = !x.nt; persist(); drawInd(); tagSoon(); } return; }
    if (a === "fxrm") {
      st.ind.fx = fxList().filter((x) => x.id !== b.dataset.id);
      delete pz[b.dataset.id]; delete po[b.dataset.id]; delete paneH[b.dataset.id];
      if (st.ind.ph) delete st.ind.ph[b.dataset.id];
      if (cp && cp.key.startsWith(`fx:${b.dataset.id}:`)) closeColor();
      persist(); syncSeries(); fxRefreshMenu();
      return;
    }
    if (a === "ctmenu") { if (!$("#menu").hidden) return closeMenu(); return openMenu(b, ctMenu()); }
    if (a === "ctype") { setType(b.dataset.t); $("#menu").innerHTML = ctMenu(); return; }
    if (a === "layreset") { st.lay = {}; persist(); layAnim(); return applyLay(); }
    if (a === "bartog") { // titoli in evidenza: spariscono o ricompaiono, il pannello si allunga o si accorcia con loro
      st.barOff = !st.barOff; persist();
      layAnim();
      return apply();
    }
    if (a === "cal") return calOpen && !cur ? userCloseCal() : openCal();
    if (a === "calclose") return userCloseCal();
    if (a === "calrefresh") {
      eAnch = true;
      if (st.calv !== "e") return loadCal(true);
      // utili: torno alla settimana e al giorno di oggi
      const td = nyDay(), wd = new Date(ymdU(td)).getUTCDay();
      eMon = monOf(td); eAll = false; eDf = "all"; eOpen = wd >= 1 && wd <= 5 ? td : null;
      if (st.eview === "r") eOpen = null;
      drawEarn(); loadEarn(true).then(() => eScroll(td));
      return;
    }
    if (a === "zen") { // le righe scivolano al loro posto, il pannello cambia altezza e quello che compare si dissolve
      const pn = $("#panel"), h0 = pn.offsetHeight, ZB = ".side .sub.first,#lists,#thead,#slotsfold,.side .note";
      flip(() => [...root.querySelectorAll("#list>.row,#slotsfold,.side .note,#chart>.cwrap")], () => {
        st.zen = !st.zen; persist(); apply();
        if (chart) { syncSeries(); themeChart(); }
      });
      const h1 = pn.offsetHeight;
      if (motionOK() && h0 !== h1 && !pn.classList.contains("wide")) pn.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 360, easing: EASE });
      if (!st.zen) root.querySelectorAll(ZB).forEach((el) => animIn(el, { y: -4, d: 300 }));
      return;
    }
    if (a === "noteinfo") { const f = b.parentElement.querySelector(".nfull"), o = f.hidden; f.hidden = !o; b.setAttribute("aria-expanded", String(o)); if (b.closest(".nvd")) newsInfo = o; if (o) slideIn(f); return; }
    if (a === "eview") { st.eview = b.dataset.v === "r" ? "r" : "w"; persist(); drawEarn(); $("#ebody").scrollTop = 0; if (st.eview === "r") eScroll(nyDay()); return fadeIn($("#ebody")); }
    if (a === "esort") { eSort = eSort === "d" ? "a" : eSort === "a" ? null : "d"; return drawEarn(); } // tre clic: dalla più alta, dalla più bassa, ordine solito
    if (a === "eresall") { eOpen = b.dataset.d; drawEarn(); return eScroll(b.dataset.d); }
    if (a === "calv") return setCalv(b.dataset.v === "e" ? "e" : "m");
    if (a === "ewk") { eMon = addD(eMon || monOf(nyDay()), 7 * (+b.dataset.d || 0)); eOpen = null; eAll = false; drawEarn(); $("#ebody").scrollTop = 0; return loadEarn(false); }
    if (a === "ecap") { st.ecap = +b.dataset.v || 0; persist(); return drawEarn(); }
    if (a === "esess") { st.esess = b.dataset.v; persist(); return drawEarn(); }
    if (a === "emine") { st.emine = !st.emine; persist(); return drawEarn(); }
    // il giorno (o "+N altre") apre "Stime e risultati" su quel giorno
    if (a === "eday" || a === "emore") { const d = b.dataset.d; eAnch = d === nyDay(); st.eview = "r"; eOpen = a === "emore" ? d : null; eAll = false; persist(); drawEarn(); fadeIn($("#ebody")); return eScroll(d); }
    if (a === "edf") { eDf = b.dataset.v; return drawEarn(); }
    if (a === "eall") { eAll = true; return drawEarn(); }
    if (a === "eopen") { const sy = b.dataset.s; if (b.dataset.n) EXN[sy] = b.dataset.n; openChart(sy); backCal = true; return; }
    if (a === "calmore") { calDays = Math.min(400, calDays + 60); return drawCal(false); }
    if (a === "slotrm") { const i = +b.dataset.i; st.bar[i] = null; if (slot === i) { slot = null; slotRes = []; } return save(); }
    if (a === "lang") { if (st.lang !== b.dataset.v) setLang(b.dataset.v); return; }
    if (a === "nfset") { st.nf = b.dataset.v === "en" ? "en" : "it"; setLang(st.lang); return; } // formato dei numeri, indipendente dalla lingua
    if (a === "settings") { // si apre sempre su "Generali", dalla cima
      drawSettings(); showSect("g"); $("#settings").hidden = false;
      const top = () => { const S = $("#settings"); [S, ...S.querySelectorAll("*")].forEach((el) => { if (el.scrollTop) el.scrollTop = 0; }); };
      top(); requestAnimationFrame(top);
      return;
    }
    if (a === "sect") { showSect(b.dataset.v); return fadeIn(root.querySelector(`.sectp[data-sp="${b.dataset.v}"]`)); }
    if (a === "settings-close") { rec = false; $("#settings").hidden = true; return; }
    if (a === "krec") { rec = !rec; return drawSettings(); }
    if (a === "exclhere" || a === "excladd") {
      const d = a === "exclhere" ? HOST : normSite($("#exin").value);
      if (!d || !/^[a-z0-9.-]+\.[a-z0-9-]+$|^localhost$/.test(d)) { $("#exin").focus(); return; }
      if (!(st.excl || []).includes(d)) st.excl = [...(st.excl || []), d].sort();
      $("#exin").value = "";
      drawExcl(); return save();
    }
    if (a === "exclrm") { st.excl = (st.excl || []).filter((d) => d !== b.dataset.d); drawExcl(); return save(); }
    if (a === "kreset") { rec = false; st.key = { ...KEY0 }; persist(); return drawSettings(); }
    if (a === "cmdedit") { chrome.runtime.sendMessage({ type: "shortcuts" }).catch(() => {}); return; }
    if (a !== "ldel") delArm = false;
    if (a === "lrename" && Date.now() - chipDragEnd < 400) return; // fine trascinamento: non è un clic
    if (a === "lnew" || a === "lrename") {
      if (a === "lrename" && b.dataset.id && b.dataset.id !== st.cl) { st.cl = b.dataset.id; listOrder = null; persist(); drawList(); pushSubs(); }
      edit = a === "lnew" && edit && edit.mode === "new" ? null : { mode: a === "lnew" ? "new" : "rename" }; return drawLists();
    }
    if (a === "ledit") { lEdit = !lEdit; edit = null; delArm = false; drawLists(); return drawList(); }
    if (a === "lcancel") { edit = null; return drawLists(); }
    if (a === "lsave") return saveListName();
    if (a === "slot") {
      const i = +b.dataset.i;
      slot = slot === i ? null : i;
      slotRes = []; $("#q2").value = "";
      drawSlots();
      if (slot != null) $("#q2").focus();
      return;
    }
    if (a === "slotpick") {
      const x = slotRes[+b.dataset.i];
      if (!x || slot == null) return;
      const B = [...st.bar], j = B.findIndex((y) => y && y.s === x.symbol);
      const inList = st.lists.flatMap((l) => l.items).find((y) => y.s === x.symbol);
      const it = inList ? { ...inList } : { s: x.symbol, n: niceName(x.symbol, x.name, x.type), t: x.name };
      if (j >= 0 && j !== slot) B[j] = B[slot]; // era già in un'altra posizione: scambio
      B[slot] = it;
      st.bar = B; slot = null; slotRes = [];
    }
    else if (a === "theme") { st.theme = b.dataset.t; drawSettings(); }
    else if (a === "every") { // su ogni pagina (chiede l'accesso a tutti i siti, se manca) o solo col clic
      const v = b.dataset.v === "true";
      if (v === EVERY) return;
      chrome.runtime.sendMessage({ type: v ? "everyon" : "everyoff" }).then((r) => { evAsk = r === "ask"; drawSettings(); }, () => {});
    }
    else if (a === "futmode") { st.fut = b.dataset.v === "true"; listOrder = null; drawSettings(); pushSubs(); }
    else if (a === "list") { if (b.dataset.id === st.cl) return; st.cl = b.dataset.id; listOrder = null; requestAnimationFrame(() => fadeIn($("#list"))); }
    else if (a === "ldel") {
      if (!delArm) { delArm = true; return drawLists(); }
      delArm = false;
      st.lists = st.lists.filter((l) => l.id !== st.cl);
      st.cl = st.lists[0].id; edit = null;
    }
    else if (a === "rowc") { st.rowc = b.dataset.v === "l" ? "l" : "c"; drawSettings(); }
    else if (a === "nmset") {
      const k = b.dataset.nk, v = b.dataset.v, c = nmCfg();
      if (k === "lg") c.lg = v; else if (k === "top") c.top = v === "cn" ? "cn" : "tk"; else if (k === "sub") c.sub = v === "true";
      st.nm = c; drawSettings(); chartLogo();
    }
    else if (a === "toggle") { setOpen(!isOpen()); if (!isOpen() && cur) closeChart(); }
    else if (a === "hide") return hideWidget();
    else if (a === "barrow") { // titoli in riga o in colonna: il riquadro cambia forma e il pannello sale o scende con un'animazione
      const bb = $("#bar"), pn = $("#panel"), it = $("#items"), anim = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      const r0 = bb.getBoundingClientRect();
      st.barRow = !st.barRow; persist(); it.scrollTop = 0; it.scrollLeft = 0;
      if (anim) pn.classList.add("pmove");
      drawBar();
      if (anim) {
        const r1 = bb.getBoundingClientRect(), E = "cubic-bezier(.2,.8,.2,1)";
        Object.assign(bb.style, { width: `${r0.width}px`, height: `${r0.height}px`, overflow: "hidden", transition: "none" });
        it.style.opacity = "0";
        requestAnimationFrame(() => requestAnimationFrame(() => {
          Object.assign(bb.style, { transition: `width .38s ${E},height .38s ${E}`, width: `${r1.width}px`, height: `${r1.height}px` });
          Object.assign(it.style, { transition: "opacity .22s ease .16s", opacity: "1" });
        }));
        clearTimeout(bb._mt);
        bb._mt = setTimeout(() => { ["width", "height", "overflow", "transition"].forEach((k) => (bb.style[k] = "")); it.style.transition = it.style.opacity = ""; pn.classList.remove("pmove"); barFade(); }, 460);
      }
      return;
    }
    else if (a === "rm") { setItems(items().filter((x) => x.s !== b.dataset.s)); }
    else if (a === "add") {
      const x = results.find((y) => y.symbol === b.dataset.sym);
      if (!x || items().length >= MAX || items().some((y) => y.s === x.symbol)) return;
      setItems([...items(), { s: x.symbol, n: niceName(x.symbol, x.name, x.type), t: x.name }]);
      closeFind(); // la ricerca si azzera e il nuovo ticker compare in lista
    } else return;
    save();
  });

  // Ordinamento, intervallo e controlli degli indicatori
  root.addEventListener("change", (e) => {
    const t = e.target;
    // uscendo dal campo riscrivo prezzo, quantità e data nel formato della lingua scelta
    if ((t.id === "pfpx" || t.id === "pfqty") && t.value.trim()) { const n = parseDec(t.value); if (n > 0) t.value = decShow(n); return; }
    if (t.id === "pfdate" && t.value.trim()) { const k = parseDay(t.value); if (k) t.value = dShow(k); return; }
    if (t.id === "langsel" || t.dataset.a === "lang") return;
    if (t.id === "pfcursel") {
      st.pfcur = PFCURS.some(([c]) => c === t.value) ? t.value : "EUR";
      ensureFx();
      pfOrder = null; persist(); drawLists(); drawList(); return;
    }
    if (t.id === "tzsel") {
      st.tz = t.value; clockFmt(); persist(); tick();
      if (cur && chart) load(false); // l'asse dei tempi si ridisegna nel nuovo fuso
      return;
    }
    if (!t.dataset.fp) return;
    // parametro di un indicatore (periodo, moltiplicatore…): fuori dai limiti torna al valore di prima
    const x = fxFind(t.dataset.fp), d = fxDef(x), pd = d && d.p.find((q) => q[0] === t.dataset.pk);
    if (!pd) return;
    let v = +t.value;
    if (!(t.value !== "" && v >= pd[3] && v <= pd[4])) { t.value = fxParams(x)[pd[0]]; return; }
    if (pd[5] >= 1) v = Math.round(v);
    x.p = { ...(x.p || {}), [pd[0]]: v };
    persist(); syncSeries();
  });

  root.addEventListener("input", (e) => {
    const t = e.composedPath()[0];
    if (t && t.id === "fxq") { fxQ = t.value; const l = $("#fxlist"); if (l) { l.innerHTML = fxItems(); l.scrollTop = 0; } }
    if (t && t.id === "glassr") {
      // vicino a inizio, metà o fine il cursore si aggancia al punto
      let v = +t.value; const pt = [0, 50, 100].find((x) => Math.abs(v - x) <= 6);
      if (pt != null && pt !== v) { v = pt; t.value = v; }
      st.glass = v; applyGlass(); clearTimeout(glassT0); glassT0 = setTimeout(persist, 250); // si vede subito mentre trascini
    }
  });
  let glassT0 = 0;

  // Tastiera: niente scorciatoie del sito mentre usi il pannello
  const panel = $("#panel");
  // impostazioni aperte: l'icona dell'ingranaggio resta accesa col colore del tema
  new MutationObserver(() => { const g = $(".icon.sett"); if (g) g.classList.toggle("on", !$("#settings").hidden); }).observe($("#settings"), { attributes: true, attributeFilter: ["hidden"] });
  ["keydown", "keyup", "keypress"].forEach((ev) => panel.addEventListener(ev, (e) => e.stopPropagation()));
  // Incolla: alcuni siti (es. claude.ai) intercettano Ctrl+V per i loro allegati e il testo non
  // arriverebbe ai nostri campi. Lo inserisco io e non lascio arrivare l'evento al sito.
  root.addEventListener("paste", (e) => {
    const t = e.composedPath()[0];
    if (!t || t.tagName !== "INPUT" || !e.clipboardData) return;
    const text = e.clipboardData.getData("text/plain").replace(/[\r\n]+/g, " ");
    e.preventDefault(); e.stopPropagation();
    if (!text) return;
    if (t.type === "number") t.value = text.trim();
    else {
      const a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
      t.setRangeText(text, a, b, "end");
    }
    t.dispatchEvent(new Event("input", { bubbles: true }));
  }, true);
  for (const ev of ["copy", "cut", "paste"]) panel.addEventListener(ev, (e) => e.stopPropagation());
  panel.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.id === "lname") {
      if (e.key === "Enter") { e.preventDefault(); saveListName(); }
      else if (e.key === "Escape") { edit = null; drawLists(); }
      return;
    }
    if (t.id === "q2" && e.key === "Escape") { slot = null; drawSlots(); return; }
    if (e.key === "Escape" && pfArm) { e.preventDefault(); pfArm = null; return drawList(); }
    if (t.closest && t.closest("#pform")) {
      if (e.key === "Escape") { e.preventDefault(); pfForm = null; renderPform(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        if (t.id === "pfq") { const r = $("#pfres .res"); if (r) r.click(); return; }
        return pfSave();
      }
      return;
    }
    if (t.id === "exin" && e.key === "Enter") { e.preventDefault(); return $("[data-a=excladd]").click(); }
    if (t.id === "fq" && e.key === "Escape") {
      e.preventDefault();
      if (findQ || t.value) closeFind(); else t.blur(); // 1° Esc cancella, 2° esce dalla casella
      return;
    }
    if (t.id === "fq" && e.key === "Enter") { // Invio: aggiunge il primo risultato online se nella lista (o nel portafoglio) non c'è nulla
      e.preventDefault();
      const r = $("#fres .radd:not([disabled])");
      if (r && !$("#list .row")) r.click();
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && t.classList && t.classList.contains("row")) { e.preventDefault(); cur === t.dataset.s && mode === "c" ? userCloseChart() : openChart(t.dataset.s); }
    else if (e.key === "Escape") {
      if (cp) closeColor();
      else if (!$("#menu").hidden) closeMenu();
      else if (!$("#settings").hidden) $("#settings").hidden = true;
      else if (maxed && cur) setMax(false);
      else hideWidget();
    } else if (t.id === "cbox" && chart) {
      const k = { ArrowUp: () => panY(1), ArrowDown: () => panY(-1), ArrowLeft: () => panX(-1), ArrowRight: () => panX(1) }[e.key];
      if (k) { e.preventDefault(); k(); }
    }
  });

  // Ricerca simboli da aggiungere alla lista
  // ---------- Ricerca nella lista ----------
  // la casella filtra subito la lista e, dopo una breve pausa, cerca online i ticker da aggiungere
  function syncFind() { $("#find").classList.toggle("has", !!$("#fq").value); }
  function closeFind() {
    clearTimeout(searchTimer);
    findQ = ""; resQ = ""; results = []; $("#fq").value = "";
    syncFind(); drawList(); drawRes(); paint();
  }
  root.addEventListener("click", (e) => { const t = e.composedPath()[0]; if (t && t.tagName === "INPUT" && t.type === "date" && !t.disabled) { try { t.showPicker(); } catch (_) {} } });
  root.addEventListener("keydown", (e) => { // titoli in evidenza: Invio o spazio aprono il grafico
    const t = e.target;
    if ((e.key === "Enter" || e.key === " ") && t && t.classList && t.classList.contains("bi")) { e.preventDefault(); t.click(); }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target && e.target.id === "tplname") { e.preventDefault(); e.stopPropagation(); tplSave(); } }, true);
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "pfpx" && pfForm) pfForm.pxSet = !!t.value;
    if ((t.id === "pfqty" || t.id === "pfpx" || t.id === "pfdate") && $("#pfmsg")) $("#pfmsg").textContent = "";
    if (t.id === "pfdate") { if (dpk) { const k = parseDay(t.value); if (k) dpk = { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 }; drawDpk(); } pfCv(); }
    if (t.id === "pfqty" || t.id === "pfpx") pfCv();
    if (t.id !== "pfq" || !pfForm) return;
    const text = t.value.trim();
    pfForm.qtext = t.value;
    clearTimeout(pfTimer);
    if (text.length < 2) { pfRes = []; return drawPfRes(); }
    pfTimer = setTimeout(async () => {
      const r = await search(text);
      if (!pfForm || (pfForm.qtext || "").trim() !== text) return;
      pfRes = r.slice(0, 8); pfForm.qdone = text; drawPfRes();
    }, 300);
  });
  $("#fq").addEventListener("input", () => {
    findQ = $("#fq").value.trim();
    syncFind(); drawList(); drawRes(); paint();
    clearTimeout(searchTimer);
    if (findQ.length < 2) return;
    const text = findQ;
    searchTimer = setTimeout(async () => {
      const r = await search(text);
      if (text !== findQ) return; // nel frattempo hai continuato a scrivere
      results = r; resQ = text; drawRes();
    }, 300);
  });

  // ---------- Esporta / importa liste e impostazioni ----------
  const EXP = ["lists", "cl", "bar", "barRow", "sort", "theme", "ind", "key", "excl", "ci", "lr", "fut", "lay", "tz", "pf", "psort", "pfcur", "lang", "nm", "rowc", "glass", "tpl", "rcol", "nf"];
  function exportData() {
    const data = Object.fromEntries(EXP.map((k) => [k, st[k]]));
    const json = JSON.stringify({ app: "Owlook", version: chrome.runtime.getManifest().version, exported: new Date().toISOString(), data }, null, 2);
    download(json, "application/json", `${L("owlook-liste", "owlook-lists")}-${new Date().toISOString().slice(0, 10)}.json`);
    $("#impmsg").innerHTML = `<span>Esportate ${st.lists.length} liste.</span>`;
  }
  // una sola lista, un ticker per riga (a capo in stile Windows, così il Blocco note lo legge bene)
  function exportTxt(id) {
    const l = st.lists.find((x) => x.id === id);
    if (!l) return;
    download(l.items.map((x) => x.s).join("\r\n") + "\r\n", "text/plain",
      `${l.name.replace(/[\\/:*?"<>|]+/g, "").trim() || "lista"}.txt`);
  }
  function download(text, type, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    a.download = name;
    root.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  // controllo il file: tengo solo dati con la forma giusta
  function cleanImport(o) {
    const d = o && (o.app === "Owlook" || o.app === "Tickwave") && o.data ? o.data : null;
    if (!d || !Array.isArray(d.lists) || !d.lists.length) return null;
    const lists = d.lists.filter((l) => l && Array.isArray(l.items)).slice(0, 50).map((l, i) => ({
      id: typeof l.id === "string" && l.id ? l.id.slice(0, 40) : "l" + Date.now().toString(36) + i,
      name: String(l.name || `Lista ${i + 1}`).slice(0, 30),
      items: l.items.filter((x) => x && typeof x.s === "string" && x.s).slice(0, MAX)
        .map((x) => ({ s: x.s.slice(0, 30), n: String(x.n || x.s).slice(0, 40), ...(x.t ? { t: String(x.t).slice(0, 80) } : {}) }))
    }));
    if (!lists.length) return null;
    const out = { lists };
    out.cl = lists.some((l) => l.id === d.cl) ? d.cl : lists[0].id;
    if (Array.isArray(d.bar)) out.bar = [0, 1, 2, 3, 4, 5].map((i) => (d.bar[i] && typeof d.bar[i].s === "string" ? { s: d.bar[i].s.slice(0, 30), n: String(d.bar[i].n || d.bar[i].s).slice(0, 40) } : null));
    if (SORTS.includes(d.sort)) out.sort = d.sort;
    if (THEMES.some(([k]) => k === d.theme)) out.theme = d.theme;
    if (d.ind && typeof d.ind === "object") out.ind = mergeInd(d.ind);
    if (d.key && typeof d.key.code === "string") out.key = d.key;
    if (Array.isArray(d.excl)) out.excl = d.excl.map(normSite).filter(Boolean).slice(0, 200);
    for (const k of ["ci", "lr"]) if (typeof d[k] === "string") out[k] = d[k];
    const dOk = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
    if (Array.isArray(d.pf)) out.pf = d.pf.filter((x) => x && typeof x.s === "string" && x.s && +x.q > 0 && +x.p > 0).slice(0, MAX_PF).map((x) => {
      const lots = (Array.isArray(x.lots) && x.lots.length ? x.lots : [{ q: x.q, p: x.p, d: x.d }]).filter((l) => l && +l.q > 0 && +l.p > 0).slice(0, 200).map((l) => ({ q: +l.q, p: +l.p, d: dOk(l.d) }));
      const c = typeof x.c === "string" ? x.c.slice(0, 5) : null;
      return withLots({ s: x.s.slice(0, 30), n: String(x.n || x.s).slice(0, 40), ...(x.t ? { t: String(x.t).slice(0, 80) } : {}), ...(c ? { c } : {}), pc: typeof x.pc === "string" ? x.pc.slice(0, 5) : c || curGuess(x.s) }, lots.length ? lots : [{ q: +x.q, p: +x.p, d: null }]);
    });
    if (d.lang === "it" || d.lang === "en") out.lang = d.lang;
    if (d.rowc === "c" || d.rowc === "l") out.rowc = d.rowc;
    if (Array.isArray(d.tpl)) out.tpl = d.tpl.filter((t) => t && typeof t.id === "string" && typeof t.n === "string" && t.ind && typeof t.ind === "object").slice(0, 20)
      .map((t) => ({ id: t.id.slice(0, 20), n: t.n.slice(0, 30), ci: IVS.some((x) => x[0] === t.ci) ? t.ci : "5m", ind: (({ fx, ct, vol, ph }) => ({ fx, ct, vol, ph }))(mergeInd({ ...t.ind, tv1: true })) }));
    if (Number.isFinite(d.glass)) out.glass = Math.max(0, Math.min(100, Math.round(d.glass)));
    if (d.nm && typeof d.nm === "object") out.nm = { lg: d.nm.lg === "off" ? "off" : "l", top: d.nm.top === "cn" ? "cn" : "tk", sub: d.nm.sub !== false };
    if (PSORTS.includes(d.psort)) out.psort = d.psort;
    if (PFCURS.some(([c]) => c === d.pfcur)) out.pfcur = d.pfcur;
    return out;
  }
  $("#impfile").addEventListener("change", async () => {
    const f = $("#impfile").files[0];
    if (!f) return;
    let o = null;
    try { o = cleanImport(JSON.parse(await f.text())); } catch (_) {}
    if (!o) { impData = null; $("#impmsg").innerHTML = '<span class="err">File non valido: scegli un file esportato da Owlook.</span>'; return; }
    impData = o;
    const n = o.lists.reduce((s, l) => s + l.items.length, 0);
    $("#impmsg").innerHTML = `<span>Sostituire liste e impostazioni con ${o.lists.length} liste (${n} ticker) dal file?</span>
      <button class="pill pri" data-a="impok">Sostituisci</button><button class="pill" data-a="impno">Annulla</button>`;
  });
  function applyImport() {
    if (!impData) return;
    if (cur) closeChart();
    Object.assign(st, impData);
    while (st.bar.length < 6) st.bar.push(null);
    const n = st.lists.length;
    impData = null; listOrder = null; edit = null;
    save(); drawSettings(); drawRes();
    $("#impmsg").innerHTML = `<span>Importate ${n} liste.</span>`;
  }

  // Ricerca per una posizione della barra in alto
  const q2 = $("#q2");
  q2.addEventListener("input", () => {
    clearTimeout(slotTimer);
    const text = q2.value.trim();
    if (text.length < 2) { slotRes = []; return drawSlots(); }
    slotTimer = setTimeout(async () => { slotRes = (await search(text)).slice(0, 8); if (slot != null) drawSlots(); }, 300);
  });

  // Sincronizza le impostazioni tra le schede aperte
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.every) { EVERY = ch.every.newValue === true; evAsk = false; drawSettings(); }
    if (ch.nnew) { // notizie nuove trovate dal controllo periodico (o lette in un'altra scheda)
      NNEW = ch.nnew.newValue || {}; draw();
      if (newsOn && cur && NNEW[cur]) loadNews(true);
    }
    const diff = {};
    for (const k in ch) {
      if (!KEYS.includes(k) || !("newValue" in ch[k])) continue;
      const v = k === "ind" ? mergeInd(ch[k].newValue) : ch[k].newValue;
      if (JSON.stringify(v) !== JSON.stringify(st[k])) { st[k] = v; diff[k] = 1; }
    }
    if (!Object.keys(diff).length) return;
    if (!st.lists.some((l) => l.id === st.cl)) st.cl = st.lists[0].id;
    if (cur && (isHidden() || !isOpen())) closeChart();
    if (diff.ind && cur) { drawInd(); syncSeries(); }
    if ((diff.lr || diff.ci) && cur) { drawTools(); load(false); }
    if (diff.lists || diff.cl) edit = null;
    if (diff.pf || diff.psort || diff.pfcur || diff.fxr || diff.fxh) pfOrder = null;
    if (diff.cols) { lwKey = ""; pwKey = ""; }
    if (diff.lang) setLang(st.lang, true);
    if (diff.tab) { pfEdit = false; pfForm = null; renderPform(); }
    if (diff.theme || diff.excl) drawSettings();
    if (diff.nm) chartLogo();
    if (diff.nsub) { draw(); drawNews(); }
    apply(); loop();
    // grafici e calendario aperti in un'altra scheda: questa li riapre uguali appena torni a guardarla
    if (diff.view && viewHidden()) viewPend = true;
  });
  document.addEventListener("visibilitychange", () => {
    syncLive();
    if (!viewHidden() && viewPend) setTimeout(restoreView, 0);
    if (viewHidden()) hideHtip();
    if (!viewHidden()) { fullAt = 0; refresh(); if (cur) load(true); }
  });
  setInterval(dot, 5000);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", apply);

  // ---------- Avvio ----------
  chrome.storage.local.get(null).then(async (v) => {
    // Migrazione dalle versioni precedenti (una sola lista, barra come elenco di simboli)
    if (!v.lists && Array.isArray(v.list)) v.lists = [{ id: "l1", name: "La mia lista", items: v.list }];
    if (Array.isArray(v.bar) && v.bar.some((x) => typeof x === "string")) {
      const old = v.list || DEFAULTS;
      v.bar = v.bar.map((s) => old.find((x) => x.s === s) || { s, n: shortName(s) });
    }
    if (Array.isArray(v.bar) && !v.bar.length) delete v.bar;
    if (v.sort === "manual") v.sort = "az";
    const keep = Object.fromEntries(KEYS.filter((k) => k in v).map((k) => [k, v[k]]));
    st = { ...st, ...keep, ind: mergeInd(v.ind) };
    if (st.ind.up === "#089981" && st.ind.dn === "#f23645") { st.ind.up = "#2bd97c"; st.ind.dn = "#ff6b3d"; }
    if (st.ind.lc === "#38bdf8") st.ind.lc = "#2bd97c";
    if (!v.ind || !v.ind.tv1 || !Array.isArray(v.ind.fx)) persist(); // salvo subito colori e indicatori nel formato nuovo
    if (!Array.isArray(st.lists) || !st.lists.length) st.lists = [{ id: "l1", name: "La mia lista", items: DEFAULTS }];
    if (!st.lists.some((l) => l.id === st.cl)) st.cl = st.lists[0].id;
    while (st.bar.length < 6) st.bar.push(null);
    if (!Array.isArray(st.pf)) st.pf = [];
    if (!PFCURS.some(([c]) => c === st.pfcur)) st.pfcur = "EUR";
    // versioni precedenti: un solo prezzo, senza valuta né data di acquisto
    if (st.pf.some((x) => !Array.isArray(x.lots))) { st.pf = st.pf.map((x) => (Array.isArray(x.lots) ? x : withLots({ ...x, pc: x.pc || x.c || curGuess(x.s) }, [{ q: x.q, p: x.p, d: x.d || null }]))); persist(); }
    if (!st.fxh || typeof st.fxh !== "object") st.fxh = {};
    if (st.tab !== "pf") st.tab = "list";
    if ("list" in v) { persist(); try { chrome.storage.local.remove("list"); } catch (_) {} }
    // correggo i nomi generati dal simbolo; nella barra uso lo stesso nome che il ticker ha nelle liste
    const before = JSON.stringify([st.lists, st.bar]);
    st.lists = st.lists.map((l) => ({ ...l, items: l.items.map(fixName) }));
    const all = st.lists.flatMap((l) => l.items);
    st.bar = st.bar.map((it) => (it ? { ...fixName(it), n: (all.find((y) => y.s === it.s) || fixName(it)).n } : it));
    if (JSON.stringify([st.lists, st.bar]) !== before) persist();
    EVERY = v.every === true;
    wasVis = !isHidden() && isOpen(); // pagina appena caricata: nessun ripristino automatico
    setLang(st.lang === "en" || st.lang === "it" ? st.lang : /^it\b/i.test(navigator.language || "") ? "it" : "en", true);
    // Mostro subito l'ultimo valore registrato (anche da altre schede), poi aggiorno
    try {
      const p = (await chrome.runtime.sendMessage({ type: "peek", symbols: subsList() })) || {};
      for (const k in p) if (p[k]) put(k, p[k], false);
    } catch (_) {}
    apply();
    drawRes();
    loop();
  });
})();
