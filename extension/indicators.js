// Owlook — indicatori tecnici (formule e impostazioni predefinite come su TradingView).
// File senza dipendenze: definisce solo globalThis.OwlookIndicators.
// Ogni calcolo riceve le candele { open, high, low, close, volume, time } e restituisce un array
// per ogni linea, allineato alle candele (null finché non c'è abbastanza storico).
(() => {
  if (globalThis.OwlookIndicators) return;

  // ---------- Funzioni di base (null = valore mancante) ----------
  const N = (n) => new Array(n).fill(null);
  const ok = (v) => v != null && isFinite(v);
  const map = (n, f) => { const o = N(n); for (let i = 0; i < n; i++) { const v = f(i); o[i] = ok(v) ? v : null; } return o; };
  const has = (...v) => v.every(ok); // tutti i valori presenti
  const at = (a, i) => (i >= 0 && i < a.length ? a[i] : null);
  // somma mobile: null se nella finestra manca un valore
  function sum(a, n) {
    const o = N(a.length); let s = 0, bad = 0;
    for (let i = 0; i < a.length; i++) {
      if (ok(a[i])) s += a[i]; else bad++;
      if (i >= n) { if (ok(a[i - n])) s -= a[i - n]; else bad--; }
      if (i >= n - 1 && !bad) o[i] = s;
    }
    return o;
  }
  const sma = (a, n) => sum(a, n).map((v) => (v == null ? null : v / n));
  // media esponenziale con partenza dalla media semplice dei primi n valori (come Pine)
  function emaK(a, n, k) {
    const o = N(a.length); let e = null, c = 0, s = 0;
    for (let i = 0; i < a.length; i++) {
      const v = a[i];
      if (!ok(v)) { if (e != null) o[i] = null; continue; }
      if (e == null) { s += v; c++; if (c === n) { e = s / n; o[i] = e; } continue; }
      e = v * k + e * (1 - k); o[i] = e;
    }
    return o;
  }
  const ema = (a, n) => emaK(a, n, 2 / (n + 1));
  const rma = (a, n) => emaK(a, n, 1 / n); // media di Wilder
  function wma(a, n) {
    const o = N(a.length), d = (n * (n + 1)) / 2;
    for (let i = n - 1; i < a.length; i++) {
      let s = 0, bad = false;
      for (let j = 0; j < n; j++) { const v = a[i - j]; if (!ok(v)) { bad = true; break; } s += v * (n - j); }
      if (!bad) o[i] = s / d;
    }
    return o;
  }
  function stdev(a, n) {
    const m = sma(a, n), o = N(a.length);
    for (let i = n - 1; i < a.length; i++) {
      if (m[i] == null) continue;
      let s = 0;
      for (let j = 0; j < n; j++) s += (a[i - j] - m[i]) ** 2;
      o[i] = Math.sqrt(s / n);
    }
    return o;
  }
  function extreme(a, n, hi) {
    const o = N(a.length);
    for (let i = n - 1; i < a.length; i++) {
      let x = hi ? -Infinity : Infinity, bad = false;
      for (let j = 0; j < n; j++) { const v = a[i - j]; if (!ok(v)) { bad = true; break; } x = hi ? Math.max(x, v) : Math.min(x, v); }
      if (!bad) o[i] = x;
    }
    return o;
  }
  const highest = (a, n) => extreme(a, n, true);
  const lowest = (a, n) => extreme(a, n, false);
  const change = (a, k = 1) => map(a.length, (i) => (i >= k && ok(a[i]) && ok(a[i - k]) ? a[i] - a[i - k] : null));
  const cum = (a) => { const o = N(a.length); let s = 0, st = false; for (let i = 0; i < a.length; i++) { if (ok(a[i])) { s += a[i]; st = true; } if (st) o[i] = s; } return o; };
  const sub = (a, b) => map(a.length, (i) => (ok(a[i]) && ok(b[i]) ? a[i] - b[i] : null));
  const shift = (a, k) => map(a.length, (i) => at(a, i - k)); // k > 0: in avanti, k < 0: indietro
  function linreg(a, n) {
    const o = N(a.length), sx = (n * (n - 1)) / 2, sxx = ((n - 1) * n * (2 * n - 1)) / 6;
    for (let i = n - 1; i < a.length; i++) {
      let sy = 0, sxy = 0, bad = false;
      for (let j = 0; j < n; j++) { const v = a[i - n + 1 + j]; if (!ok(v)) { bad = true; break; } sy += v; sxy += j * v; }
      if (bad) continue;
      const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), icpt = (sy - slope * sx) / n;
      o[i] = icpt + slope * (n - 1);
    }
    return o;
  }
  function rsi(a, n) {
    const up = map(a.length, (i) => (i > 0 && ok(a[i]) && ok(a[i - 1]) ? Math.max(a[i] - a[i - 1], 0) : null));
    const dn = map(a.length, (i) => (i > 0 && ok(a[i]) && ok(a[i - 1]) ? Math.max(a[i - 1] - a[i], 0) : null));
    const ru = rma(up, n), rd = rma(dn, n);
    return map(a.length, (i) => (ru[i] == null || rd[i] == null ? null : rd[i] === 0 ? 100 : ru[i] === 0 ? 0 : 100 - 100 / (1 + ru[i] / rd[i])));
  }
  function stoch(c, h, l, n) {
    const hh = highest(h, n), ll = lowest(l, n);
    return map(c.length, (i) => (hh[i] == null || ll[i] == null ? null : hh[i] === ll[i] ? 50 : (100 * (c[i] - ll[i])) / (hh[i] - ll[i])));
  }
  const src = (B) => {
    const n = B.length, o = { o: N(n), h: N(n), l: N(n), c: N(n), v: N(n) };
    for (let i = 0; i < n; i++) { const b = B[i]; o.o[i] = b.open; o.h[i] = b.high; o.l[i] = b.low; o.c[i] = b.close; o.v[i] = b.volume || 0; }
    o.hl2 = map(n, (i) => (o.h[i] + o.l[i]) / 2);
    o.hlc3 = map(n, (i) => (o.h[i] + o.l[i] + o.c[i]) / 3);
    o.tr = map(n, (i) => (i === 0 ? o.h[i] - o.l[i] : Math.max(o.h[i] - o.l[i], Math.abs(o.h[i] - o.c[i - 1]), Math.abs(o.l[i] - o.c[i - 1]))));
    return o;
  };
  const mid = (h, l, n) => { const a = highest(h, n), b = lowest(l, n); return map(h.length, (i) => (has(a[i], b[i]) ? (a[i] + b[i]) / 2 : null)); };

  // ---------- Catalogo ----------
  // k: chiave · n: nome · s: nome breve in legenda · cat: categoria · pane: riquadro separato sotto il grafico
  // p: parametri [chiave, etichetta, predefinito, min, max, passo] · l: linee [nome, colore, tipo]
  //   tipo: "line" (predefinito), "hist" (istogramma: colore dal segno o dalla variazione), "dots" (punti)
  // lv: livelli orizzontali · r: scala fissa [min, max] · f: formato valori ("p" prezzo, "n" 2 decimali, "v" volume)
  // intr: solo candele intraday · vol: richiede i volumi
  const BLUE = "#2962ff", ORANGE = "#ff6d00", RED = "#f23645", GREEN = "#089981", PURPLE = "#7e57c2", TEAL = "#00bcd4", PINK = "#e91e63", YELLOW = "#ffb300", GRAY = "#787b86";
  const L = (n = "Valore", c = BLUE, t = "line") => [n, c, t];
  const P = (k, l, d, min = 1, max = 500, st = 1) => [k, l, d, min, max, st];
  const LEN = (d) => P("len", "Periodo", d);
  const MA = (k, n, s, d, f, c = BLUE) => ({ k, n, s, cat: "ma", p: [LEN(d)], l: [L(s, c)], f: "p", calc: (S, p) => [f(S, p.len)] });

  const DEFS = [
    // Medie mobili (sul grafico)
    MA("sma", "Media mobile semplice (SMA)", "SMA", 20, (S, n) => sma(S.c, n)),
    MA("ema", "Media mobile esponenziale (EMA)", "EMA", 20, (S, n) => ema(S.c, n)),
    MA("wma", "Media mobile ponderata (WMA)", "WMA", 20, (S, n) => wma(S.c, n)),
    MA("smma", "Media mobile smussata (SMMA / RMA)", "SMMA", 7, (S, n) => rma(S.c, n)),
    MA("hma", "Hull Moving Average (HMA)", "HMA", 9, (S, n) => {
      const a = wma(S.c, Math.max(1, Math.floor(n / 2))), b = wma(S.c, n);
      return wma(map(a.length, (i) => (a[i] == null || b[i] == null ? null : 2 * a[i] - b[i])), Math.max(1, Math.floor(Math.sqrt(n))));
    }),
    MA("vwma", "Media ponderata per volume (VWMA)", "VWMA", 20, (S, n) => { const a = sum(map(S.c.length, (i) => S.c[i] * S.v[i]), n), b = sum(S.v, n); return map(S.c.length, (i) => (a[i] == null || !b[i] ? null : a[i] / b[i])); }),
    MA("dema", "Doppia media esponenziale (DEMA)", "DEMA", 20, (S, n) => { const e = ema(S.c, n), e2 = ema(e, n); return map(e.length, (i) => (e2[i] == null ? null : 2 * e[i] - e2[i])); }),
    MA("tema", "Tripla media esponenziale (TEMA)", "TEMA", 20, (S, n) => { const e = ema(S.c, n), e2 = ema(e, n), e3 = ema(e2, n); return map(e.length, (i) => (e3[i] == null ? null : 3 * (e[i] - e2[i]) + e3[i])); }),
    MA("lsma", "Media a minimi quadrati (LSMA)", "LSMA", 25, (S, n) => linreg(S.c, n)),
    {
      k: "alma", n: "Arnaud Legoux MA (ALMA)", s: "ALMA", cat: "ma", f: "p", l: [L("ALMA")],
      p: [LEN(9), P("off", "Offset", 0.85, 0, 1, 0.05), P("sig", "Sigma", 6, 0.5, 50, 0.5)],
      calc: (S, p) => {
        const n = p.len, m = p.off * (n - 1), s = n / p.sig, w = [];
        let ws = 0;
        for (let i = 0; i < n; i++) { w[i] = Math.exp(-((i - m) ** 2) / (2 * s * s)); ws += w[i]; }
        return [map(S.c.length, (t) => { if (t < n - 1) return null; let v = 0; for (let i = 0; i < n; i++) v += S.c[t - (n - 1 - i)] * w[i]; return v / ws; })];
      }
    },
    {
      k: "kama", n: "Kaufman Adaptive MA (KAMA)", s: "KAMA", cat: "ma", f: "p", l: [L("KAMA")],
      p: [LEN(10), P("fast", "Veloce", 2), P("slow", "Lenta", 30)],
      calc: (S, p) => {
        const c = S.c, n = p.len, fa = 2 / (p.fast + 1), sa = 2 / (p.slow + 1), o = N(c.length);
        let k = null;
        for (let i = 0; i < c.length; i++) {
          if (i < n) continue;
          let vol = 0;
          for (let j = 0; j < n; j++) vol += Math.abs(c[i - j] - c[i - j - 1]);
          const er = vol ? Math.abs(c[i] - c[i - n]) / vol : 0, a = (er * (fa - sa) + sa) ** 2;
          k = a * c[i] + (1 - a) * (k == null ? c[i] : k);
          o[i] = k;
        }
        return [o];
      }
    },
    {
      k: "mcg", n: "McGinley Dynamic", s: "McGinley", cat: "ma", f: "p", l: [L("McGinley")], p: [LEN(14)],
      calc: (S, p) => {
        const c = S.c, e = ema(c, p.len), o = N(c.length);
        let m = null;
        for (let i = 0; i < c.length; i++) {
          if (m == null) { m = e[i]; o[i] = m; continue; }
          m = m + (c[i] - m) / (p.len * (c[i] / m) ** 4); o[i] = m;
        }
        return [o];
      }
    },
    {
      k: "macross", n: "Incrocio di medie (MA Cross)", s: "MA Cross", cat: "ma", f: "p",
      p: [P("a", "Breve", 9), P("b", "Lunga", 21)], l: [L("Breve", ORANGE), L("Lunga", BLUE)],
      calc: (S, p) => [sma(S.c, p.a), sma(S.c, p.b)]
    },
    {
      k: "vwap", n: "VWAP (dall'apertura del giorno)", s: "VWAP", cat: "ma", f: "p", intr: true, vol: true, p: [], l: [L("VWAP", "#f472b6")],
      calc: (S, p, B) => {
        const o = N(B.length); let d = null, pv = 0, v = 0;
        for (let i = 0; i < B.length; i++) {
          const day = Math.floor(B[i].time / 86400);
          if (day !== d) { d = day; pv = 0; v = 0; }
          pv += S.hlc3[i] * S.v[i]; v += S.v[i];
          if (v > 0) o[i] = pv / v;
        }
        return [o];
      }
    },

    // Bande e canali (sul grafico)
    {
      k: "bb", n: "Bande di Bollinger", s: "BB", cat: "band", f: "p",
      p: [LEN(20), P("mult", "Deviazioni", 2, 0.1, 10, 0.1)], l: [L("Base", ORANGE), L("Sup.", BLUE), L("Inf.", BLUE)],
      calc: (S, p) => { const m = sma(S.c, p.len), d = stdev(S.c, p.len); return [m, map(m.length, (i) => (has(m[i], d[i]) ? m[i] + p.mult * d[i] : null)), map(m.length, (i) => (has(m[i], d[i]) ? m[i] - p.mult * d[i] : null))]; }
    },
    {
      k: "kc", n: "Canali di Keltner", s: "KC", cat: "band", f: "p",
      p: [LEN(20), P("mult", "Moltiplicatore", 2, 0.1, 10, 0.1), P("atr", "Periodo ATR", 10)], l: [L("Base", BLUE), L("Sup.", BLUE), L("Inf.", BLUE)],
      calc: (S, p) => { const m = ema(S.c, p.len), a = rma(S.tr, p.atr); return [m, map(m.length, (i) => (has(m[i], a[i]) ? m[i] + p.mult * a[i] : null)), map(m.length, (i) => (has(m[i], a[i]) ? m[i] - p.mult * a[i] : null))]; }
    },
    {
      k: "dc", n: "Canali di Donchian", s: "DC", cat: "band", f: "p",
      p: [LEN(20)], l: [L("Base", ORANGE), L("Sup.", BLUE), L("Inf.", BLUE)],
      calc: (S, p) => { const h = highest(S.h, p.len), l = lowest(S.l, p.len); return [map(h.length, (i) => (has(h[i], l[i]) ? (h[i] + l[i]) / 2 : null)), h, l]; }
    },
    {
      k: "env", n: "Inviluppo (Envelope)", s: "Env", cat: "band", f: "p",
      p: [LEN(20), P("pct", "Percentuale", 10, 0.1, 100, 0.1)], l: [L("Base", ORANGE), L("Sup.", BLUE), L("Inf.", BLUE)],
      calc: (S, p) => { const m = sma(S.c, p.len); return [m, map(m.length, (i) => (ok(m[i]) ? m[i] * (1 + p.pct / 100) : null)), map(m.length, (i) => (ok(m[i]) ? m[i] * (1 - p.pct / 100) : null))]; }
    },
    {
      k: "ichi", n: "Ichimoku Cloud", s: "Ichimoku", cat: "band", f: "p",
      p: [P("conv", "Conversione", 9), P("base", "Base", 26), P("lead", "Span B", 52), P("disp", "Spostamento", 26)],
      l: [L("Conv.", BLUE), L("Base", "#b71c1c"), L("Span A", "#43a047"), L("Span B", "#f44336"), L("Ritardo", "#43a047")],
      calc: (S, p) => {
        const cv = mid(S.h, S.l, p.conv), bs = mid(S.h, S.l, p.base), lb = mid(S.h, S.l, p.lead), k = p.disp - 1;
        const la = map(cv.length, (i) => (cv[i] == null || bs[i] == null ? null : (cv[i] + bs[i]) / 2));
        return [cv, bs, shift(la, k), shift(lb, k), shift(S.c, -k)];
      }
    },
    {
      k: "psar", n: "SAR parabolico", s: "SAR", cat: "band", f: "p",
      p: [P("start", "Inizio", 0.02, 0.001, 1, 0.001), P("inc", "Incremento", 0.02, 0.001, 1, 0.001), P("max", "Massimo", 0.2, 0.01, 1, 0.01)],
      l: [L("SAR", BLUE, "dots")],
      calc: (S, p) => {
        const h = S.h, l = S.l, n = h.length, o = N(n);
        if (n < 2) return [o];
        let up = S.c[1] >= S.c[0], sar = up ? l[0] : h[0], ep = up ? h[1] : l[1], af = p.start;
        for (let i = 1; i < n; i++) {
          sar = sar + af * (ep - sar);
          if (up) {
            sar = Math.min(sar, l[i - 1], i > 1 ? l[i - 2] : l[i - 1]);
            if (l[i] < sar) { up = false; sar = ep; ep = l[i]; af = p.start; }
            else if (h[i] > ep) { ep = h[i]; af = Math.min(af + p.inc, p.max); }
          } else {
            sar = Math.max(sar, h[i - 1], i > 1 ? h[i - 2] : h[i - 1]);
            if (h[i] > sar) { up = true; sar = ep; ep = h[i]; af = p.start; }
            else if (l[i] < ep) { ep = l[i]; af = Math.min(af + p.inc, p.max); }
          }
          o[i] = sar;
        }
        return [o];
      }
    },
    {
      k: "st", n: "SuperTrend", s: "SuperTrend", cat: "band", f: "p",
      p: [P("atr", "Periodo ATR", 10), P("fac", "Fattore", 3, 0.1, 20, 0.1)], l: [L("Rialzo", GREEN), L("Ribasso", RED)],
      calc: (S, p) => {
        const a = rma(S.tr, p.atr), n = S.c.length, up = N(n), dn = N(n);
        let pu = null, pl = null, pst = null, dir = 1;
        for (let i = 0; i < n; i++) {
          if (a[i] == null) continue;
          let ub = S.hl2[i] + p.fac * a[i], lb = S.hl2[i] - p.fac * a[i];
          if (pl != null) lb = lb > pl || S.c[i - 1] < pl ? lb : pl;
          if (pu != null) ub = ub < pu || S.c[i - 1] > pu ? ub : pu;
          if (pst == null) dir = 1;
          else if (pst === pu) dir = S.c[i] > ub ? -1 : 1;
          else dir = S.c[i] < lb ? 1 : -1;
          const v = dir === -1 ? lb : ub;
          if (dir === -1) up[i] = v; else dn[i] = v;
          pu = ub; pl = lb; pst = v;
        }
        return [up, dn];
      }
    },

    // Oscillatori (riquadro sotto)
    {
      k: "rsi", n: "Relative Strength Index (RSI)", s: "RSI", cat: "osc", pane: true, f: "n", r: [0, 100], lv: [70, 30],
      p: [LEN(14)], l: [L("RSI", PURPLE)], calc: (S, p) => [rsi(S.c, p.len)]
    },
    {
      k: "macd", n: "MACD", s: "MACD", cat: "osc", pane: true, f: "n", lv: [0],
      p: [P("fast", "Veloce", 12), P("slow", "Lenta", 26), P("sig", "Segnale", 9)],
      l: [L("Istogramma", GRAY, "hist"), L("MACD", BLUE), L("Segnale", ORANGE)],
      calc: (S, p) => { const m = sub(ema(S.c, p.fast), ema(S.c, p.slow)), s = ema(m, p.sig); return [sub(m, s), m, s]; }
    },
    {
      k: "stoch", n: "Stocastico", s: "Stoch", cat: "osc", pane: true, f: "n", r: [0, 100], lv: [80, 20],
      p: [P("k", "%K", 14), P("ks", "Smussamento %K", 1), P("d", "%D", 3)], l: [L("%K", BLUE), L("%D", ORANGE)],
      calc: (S, p) => { const k = sma(stoch(S.c, S.h, S.l, p.k), p.ks); return [k, sma(k, p.d)]; }
    },
    {
      k: "srsi", n: "RSI stocastico (Stoch RSI)", s: "Stoch RSI", cat: "osc", pane: true, f: "n", r: [0, 100], lv: [80, 20],
      p: [P("k", "K", 3), P("d", "D", 3), P("rsi", "Periodo RSI", 14), P("st", "Periodo stocastico", 14)], l: [L("K", BLUE), L("D", ORANGE)],
      calc: (S, p) => { const r = rsi(S.c, p.rsi), k = sma(stoch(r, r, r, p.st), p.k); return [k, sma(k, p.d)]; }
    },
    {
      k: "cci", n: "Commodity Channel Index (CCI)", s: "CCI", cat: "osc", pane: true, f: "n", lv: [100, 0, -100],
      p: [LEN(20)], l: [L("CCI", BLUE)],
      calc: (S, p) => {
        const t = S.hlc3, m = sma(t, p.len), n = p.len;
        return [map(t.length, (i) => {
          if (m[i] == null) return null;
          let d = 0; for (let j = 0; j < n; j++) d += Math.abs(t[i - j] - m[i]);
          d /= n; return d ? (t[i] - m[i]) / (0.015 * d) : 0;
        })];
      }
    },
    {
      k: "wpr", n: "Williams %R", s: "%R", cat: "osc", pane: true, f: "n", r: [-100, 0], lv: [-20, -80],
      p: [LEN(14)], l: [L("%R", PURPLE)],
      calc: (S, p) => { const h = highest(S.h, p.len), l = lowest(S.l, p.len); return [map(h.length, (i) => (!has(h[i], l[i]) ? null : h[i] === l[i] ? -50 : (100 * (S.c[i] - h[i])) / (h[i] - l[i])))]; }
    },
    { k: "mom", n: "Momentum", s: "Mom", cat: "osc", pane: true, f: "n", lv: [0], p: [LEN(10)], l: [L("Mom", BLUE)], calc: (S, p) => [change(S.c, p.len)] },
    {
      k: "roc", n: "Rate of Change (ROC)", s: "ROC", cat: "osc", pane: true, f: "n", lv: [0], p: [LEN(9)], l: [L("ROC", BLUE)],
      calc: (S, p) => [map(S.c.length, (i) => (i >= p.len && S.c[i - p.len] ? (100 * (S.c[i] - S.c[i - p.len])) / S.c[i - p.len] : null))]
    },
    {
      k: "ao", n: "Awesome Oscillator", s: "AO", cat: "osc", pane: true, f: "n", lv: [0], p: [P("fast", "Veloce", 5), P("slow", "Lenta", 34)],
      l: [L("AO", GRAY, "histd")], calc: (S, p) => [sub(sma(S.hl2, p.fast), sma(S.hl2, p.slow))]
    },
    {
      k: "trix", n: "TRIX", s: "TRIX", cat: "osc", pane: true, f: "n", lv: [0], p: [LEN(18)], l: [L("TRIX", RED)],
      calc: (S, p) => { const lg = S.c.map((v) => (v > 0 ? Math.log(v) : null)), e = ema(ema(ema(lg, p.len), p.len), p.len); return [change(e).map((v) => (v == null ? null : v * 10000))]; }
    },
    {
      k: "uo", n: "Oscillatore Ultimate", s: "UO", cat: "osc", pane: true, f: "n", r: [0, 100], lv: [70, 30],
      p: [P("a", "Breve", 7), P("b", "Medio", 14), P("c", "Lungo", 28)], l: [L("UO", RED)],
      calc: (S, p) => {
        const n = S.c.length;
        const bp = map(n, (i) => (i ? S.c[i] - Math.min(S.l[i], S.c[i - 1]) : null));
        const tr = map(n, (i) => (i ? Math.max(S.h[i], S.c[i - 1]) - Math.min(S.l[i], S.c[i - 1]) : null));
        const av = (k) => { const a = sum(bp, k), b = sum(tr, k); return map(n, (i) => (a[i] == null || !b[i] ? null : a[i] / b[i])); };
        const x = av(p.a), y = av(p.b), z = av(p.c);
        return [map(n, (i) => (z[i] == null ? null : (100 * (4 * x[i] + 2 * y[i] + z[i])) / 7))];
      }
    },
    {
      k: "cmo", n: "Chande Momentum Oscillator", s: "CMO", cat: "osc", pane: true, f: "n", lv: [50, 0, -50], r: [-100, 100], p: [LEN(9)], l: [L("CMO", BLUE)],
      calc: (S, p) => {
        const d = change(S.c), u = sum(d.map((v) => (v == null ? null : Math.max(v, 0))), p.len), w = sum(d.map((v) => (v == null ? null : Math.max(-v, 0))), p.len);
        return [map(d.length, (i) => (u[i] == null ? null : u[i] + w[i] ? (100 * (u[i] - w[i])) / (u[i] + w[i]) : 0))];
      }
    },
    {
      k: "tsi", n: "True Strength Index (TSI)", s: "TSI", cat: "osc", pane: true, f: "n", lv: [0],
      p: [P("long", "Lungo", 25), P("short", "Breve", 13), P("sig", "Segnale", 13)], l: [L("TSI", BLUE), L("Segnale", RED)],
      calc: (S, p) => {
        const pc = change(S.c), a = ema(ema(pc, p.long), p.short), b = ema(ema(pc.map((v) => (v == null ? null : Math.abs(v))), p.long), p.short);
        const t = map(pc.length, (i) => (a[i] == null || !b[i] ? null : (100 * a[i]) / b[i]));
        return [t, ema(t, p.sig)];
      }
    },
    {
      k: "dpo", n: "Detrended Price Oscillator (DPO)", s: "DPO", cat: "osc", pane: true, f: "n", lv: [0], p: [LEN(21)], l: [L("DPO", "#43a047")],
      calc: (S, p) => { const m = sma(S.c, p.len), k = Math.floor(p.len / 2) + 1; return [map(m.length, (i) => (at(m, i - k) == null ? null : S.c[i] - m[i - k]))]; }
    },
    {
      k: "copp", n: "Curva di Coppock", s: "Coppock", cat: "osc", pane: true, f: "n", lv: [0],
      p: [P("wma", "Periodo WMA", 10), P("lr", "ROC lungo", 14), P("sr", "ROC breve", 11)], l: [L("Coppock", BLUE)],
      calc: (S, p) => {
        const r = (k) => map(S.c.length, (i) => (i >= k && S.c[i - k] ? (100 * (S.c[i] - S.c[i - k])) / S.c[i - k] : null));
        const a = r(p.lr), b = r(p.sr);
        return [wma(map(a.length, (i) => (a[i] == null || b[i] == null ? null : a[i] + b[i])), p.wma)];
      }
    },
    {
      k: "fish", n: "Trasformata di Fisher", s: "Fisher", cat: "osc", pane: true, f: "n", lv: [1.5, 0.75, 0, -0.75, -1.5],
      p: [LEN(9)], l: [L("Fisher", BLUE), L("Trigger", ORANGE)],
      calc: (S, p) => {
        const x = S.hl2, hh = highest(x, p.len), ll = lowest(x, p.len), n = x.length, f = N(n), t = N(n);
        let v = 0, fi = 0, started = false;
        for (let i = 0; i < n; i++) {
          if (hh[i] == null) continue;
          const r = hh[i] === ll[i] ? 0 : (x[i] - ll[i]) / (hh[i] - ll[i]) - 0.5;
          v = Math.max(-0.999, Math.min(0.999, 0.66 * r + 0.67 * v));
          const prev = fi;
          fi = 0.5 * Math.log((1 + v) / (1 - v)) + 0.5 * fi;
          f[i] = fi; if (started) t[i] = prev; started = true;
        }
        return [f, t];
      }
    },
    {
      k: "bbp", n: "Bull Bear Power", s: "BBP", cat: "osc", pane: true, f: "n", lv: [0], p: [LEN(13)], l: [L("BBP", GRAY, "hist")],
      calc: (S, p) => { const e = ema(S.c, p.len); return [map(e.length, (i) => (e[i] == null ? null : S.h[i] + S.l[i] - 2 * e[i]))]; }
    },
    {
      k: "ppo", n: "Percentage Price Oscillator (PPO)", s: "PPO", cat: "osc", pane: true, f: "n", lv: [0],
      p: [P("fast", "Veloce", 12), P("slow", "Lenta", 26), P("sig", "Segnale", 9)], l: [L("Istogramma", GRAY, "hist"), L("PPO", "#26a69a"), L("Segnale", RED)],
      calc: (S, p) => { const a = ema(S.c, p.fast), b = ema(S.c, p.slow), m = map(a.length, (i) => (b[i] ? (100 * (a[i] - b[i])) / b[i] : null)), s = ema(m, p.sig); return [sub(m, s), m, s]; }
    },

    // Trend (riquadro sotto)
    {
      k: "dmi", n: "Directional Movement Index (ADX / DMI)", s: "DMI", cat: "trend", pane: true, f: "n", lv: [25],
      p: [P("di", "Periodo DI", 14), P("adx", "Smussamento ADX", 14)], l: [L("ADX", RED), L("+DI", BLUE), L("−DI", ORANGE)],
      calc: (S, p) => {
        const n = S.c.length;
        const u = map(n, (i) => (i ? S.h[i] - S.h[i - 1] : null)), d = map(n, (i) => (i ? S.l[i - 1] - S.l[i] : null));
        const pdm = map(n, (i) => (u[i] == null ? null : u[i] > d[i] && u[i] > 0 ? u[i] : 0)), mdm = map(n, (i) => (d[i] == null ? null : d[i] > u[i] && d[i] > 0 ? d[i] : 0));
        const tr = rma(S.tr.map((v, i) => (i ? v : null)), p.di), pp = rma(pdm, p.di), mm = rma(mdm, p.di);
        const pl = map(n, (i) => (tr[i] ? (100 * pp[i]) / tr[i] : null)), mi = map(n, (i) => (tr[i] ? (100 * mm[i]) / tr[i] : null));
        const dx = map(n, (i) => (pl[i] == null ? null : Math.abs(pl[i] - mi[i]) / (pl[i] + mi[i] || 1)));
        return [rma(dx, p.adx).map((v) => (v == null ? null : 100 * v)), pl, mi];
      }
    },
    {
      k: "aroon", n: "Aroon", s: "Aroon", cat: "trend", pane: true, f: "n", r: [0, 100], p: [LEN(14)], l: [L("Up", ORANGE), L("Down", BLUE)],
      calc: (S, p) => {
        const n = S.c.length, k = p.len, up = N(n), dn = N(n);
        for (let i = k; i < n; i++) {
          let hi = i, lo = i;
          for (let j = i - k; j <= i; j++) { if (S.h[j] >= S.h[hi]) hi = j; if (S.l[j] <= S.l[lo]) lo = j; }
          up[i] = (100 * (k - (i - hi))) / k; dn[i] = (100 * (k - (i - lo))) / k;
        }
        return [up, dn];
      }
    },
    {
      k: "chop", n: "Choppiness Index", s: "CHOP", cat: "trend", pane: true, f: "n", r: [0, 100], lv: [61.8, 38.2], p: [LEN(14)], l: [L("CHOP", BLUE)],
      calc: (S, p) => {
        const a = sum(S.tr, p.len), h = highest(S.h, p.len), l = lowest(S.l, p.len);
        return [map(a.length, (i) => (a[i] == null || h[i] === l[i] ? null : (100 * Math.log10(a[i] / (h[i] - l[i]))) / Math.log10(p.len)))];
      }
    },
    {
      k: "vortex", n: "Indicatore Vortex", s: "VI", cat: "trend", pane: true, f: "n", p: [LEN(14)], l: [L("VI+", BLUE), L("VI−", PINK)],
      calc: (S, p) => {
        const n = S.c.length;
        const vp = sum(map(n, (i) => (i ? Math.abs(S.h[i] - S.l[i - 1]) : null)), p.len), vm = sum(map(n, (i) => (i ? Math.abs(S.l[i] - S.h[i - 1]) : null)), p.len);
        const tr = sum(S.tr.map((v, i) => (i ? v : null)), p.len);
        return [map(n, (i) => (tr[i] ? vp[i] / tr[i] : null)), map(n, (i) => (tr[i] ? vm[i] / tr[i] : null))];
      }
    },

    // Volatilità (riquadro sotto)
    { k: "atr", n: "Average True Range (ATR)", s: "ATR", cat: "vol", pane: true, f: "p", p: [LEN(14)], l: [L("ATR", RED)], calc: (S, p) => [rma(S.tr, p.len)] },
    { k: "sd", n: "Deviazione standard", s: "StdDev", cat: "vol", pane: true, f: "p", p: [LEN(20)], l: [L("StdDev", BLUE)], calc: (S, p) => [stdev(S.c, p.len)] },
    {
      k: "hv", n: "Volatilità storica", s: "HV", cat: "vol", pane: true, f: "n", p: [LEN(10)], l: [L("HV", BLUE)],
      calc: (S, p, B, x) => {
        const r = map(S.c.length, (i) => (i && S.c[i - 1] > 0 && S.c[i] > 0 ? Math.log(S.c[i] / S.c[i - 1]) : null));
        const per = x.ivSec < 86400 * 2 ? 1 : 7, f = 100 * Math.sqrt(365 / per);
        return [stdev(r, p.len).map((v) => (v == null ? null : v * f))];
      }
    },
    {
      k: "bbpct", n: "Bande di Bollinger %B", s: "%B", cat: "vol", pane: true, f: "n", lv: [1, 0.5, 0],
      p: [LEN(20), P("mult", "Deviazioni", 2, 0.1, 10, 0.1)], l: [L("%B", TEAL)],
      calc: (S, p) => { const m = sma(S.c, p.len), d = stdev(S.c, p.len); return [map(m.length, (i) => (d[i] ? (S.c[i] - (m[i] - p.mult * d[i])) / (2 * p.mult * d[i]) : null))]; }
    },
    {
      k: "bbw", n: "Bollinger BandWidth", s: "BBW", cat: "vol", pane: true, f: "n",
      p: [LEN(20), P("mult", "Deviazioni", 2, 0.1, 10, 0.1)], l: [L("BBW", BLUE)],
      calc: (S, p) => { const m = sma(S.c, p.len), d = stdev(S.c, p.len); return [map(m.length, (i) => (m[i] ? (200 * p.mult * d[i]) / m[i] : null))]; }
    },

    // Volume (riquadro sotto)
    {
      k: "obv", n: "On Balance Volume (OBV)", s: "OBV", cat: "volu", pane: true, f: "v", vol: true, p: [], l: [L("OBV", BLUE)],
      calc: (S) => [cum(map(S.c.length, (i) => (i ? Math.sign(S.c[i] - S.c[i - 1]) * S.v[i] : 0)))]
    },
    {
      k: "mfi", n: "Money Flow Index (MFI)", s: "MFI", cat: "volu", pane: true, f: "n", vol: true, r: [0, 100], lv: [80, 20], p: [LEN(14)], l: [L("MFI", PURPLE)],
      calc: (S, p) => {
        const t = S.hlc3, n = t.length;
        const pos = sum(map(n, (i) => (i ? (t[i] > t[i - 1] ? t[i] * S.v[i] : 0) : null)), p.len), neg = sum(map(n, (i) => (i ? (t[i] < t[i - 1] ? t[i] * S.v[i] : 0) : null)), p.len);
        return [map(n, (i) => (pos[i] == null ? null : neg[i] === 0 ? (pos[i] === 0 ? 50 : 100) : 100 - 100 / (1 + pos[i] / neg[i])))];
      }
    },
    {
      k: "cmf", n: "Chaikin Money Flow (CMF)", s: "CMF", cat: "volu", pane: true, f: "n", vol: true, lv: [0], p: [LEN(20)], l: [L("CMF", "#43a047")],
      calc: (S, p) => {
        const n = S.c.length, mv = map(n, (i) => (S.h[i] === S.l[i] ? 0 : ((S.c[i] - S.l[i] - (S.h[i] - S.c[i])) / (S.h[i] - S.l[i])) * S.v[i]));
        const a = sum(mv, p.len), b = sum(S.v, p.len);
        return [map(n, (i) => (b[i] ? a[i] / b[i] : null))];
      }
    },
    {
      k: "ad", n: "Accumulazione / Distribuzione", s: "A/D", cat: "volu", pane: true, f: "v", vol: true, p: [], l: [L("A/D", "#999915")],
      calc: (S) => [cum(map(S.c.length, (i) => (S.h[i] === S.l[i] ? 0 : ((S.c[i] - S.l[i] - (S.h[i] - S.c[i])) / (S.h[i] - S.l[i])) * S.v[i])))]
    },
    {
      k: "co", n: "Oscillatore di Chaikin", s: "Chaikin Osc", cat: "volu", pane: true, f: "v", vol: true, lv: [0], p: [P("fast", "Veloce", 3), P("slow", "Lenta", 10)], l: [L("Chaikin", RED)],
      calc: (S, p) => { const ad = cum(map(S.c.length, (i) => (S.h[i] === S.l[i] ? 0 : ((S.c[i] - S.l[i] - (S.h[i] - S.c[i])) / (S.h[i] - S.l[i])) * S.v[i]))); return [sub(ema(ad, p.fast), ema(ad, p.slow))]; }
    },
    {
      k: "pvt", n: "Price Volume Trend (PVT)", s: "PVT", cat: "volu", pane: true, f: "v", vol: true, p: [], l: [L("PVT", BLUE)],
      calc: (S) => [cum(map(S.c.length, (i) => (i && S.c[i - 1] ? ((S.c[i] - S.c[i - 1]) / S.c[i - 1]) * S.v[i] : 0)))]
    },
    {
      k: "vo", n: "Oscillatore di volume", s: "Vol Osc", cat: "volu", pane: true, f: "n", vol: true, lv: [0], p: [P("fast", "Breve", 5), P("slow", "Lungo", 10)], l: [L("%", BLUE)],
      calc: (S, p) => { const a = ema(S.v, p.fast), b = ema(S.v, p.slow); return [map(a.length, (i) => (b[i] ? (100 * (a[i] - b[i])) / b[i] : null))]; }
    },
    {
      k: "efi", n: "Indice di forza (Elder)", s: "EFI", cat: "volu", pane: true, f: "v", vol: true, lv: [0], p: [LEN(13)], l: [L("EFI", RED)],
      calc: (S, p) => [ema(map(S.c.length, (i) => (i ? (S.c[i] - S.c[i - 1]) * S.v[i] : null)), p.len)]
    },
    {
      k: "eom", n: "Ease of Movement (EOM)", s: "EOM", cat: "volu", pane: true, f: "n", vol: true, lv: [0], p: [LEN(14), P("div", "Divisore", 10000, 1, 1e9, 1)], l: [L("EOM", "#43a047")],
      calc: (S, p) => [sma(map(S.c.length, (i) => (i && S.v[i] ? (p.div * (S.hl2[i] - S.hl2[i - 1]) * (S.h[i] - S.l[i])) / S.v[i] : null)), p.len)]
    }
  ];
  const CATS = [["ma", "Medie mobili"], ["band", "Bande e canali"], ["osc", "Oscillatori"], ["trend", "Trend"], ["vol", "Volatilità"], ["volu", "Volume"]];
  const BY = Object.fromEntries(DEFS.map((d) => [d.k, d]));
  // colori per le istanze successive dello stesso indicatore
  const PALETTE = [BLUE, ORANGE, PURPLE, GREEN, RED, TEAL, PINK, YELLOW];

  function compute(inst, bars, ctx) {
    const d = BY[inst.t];
    if (!d || !bars.length || (d.intr && !(ctx.ivSec < 86400))) return d ? d.l.map(() => N(bars.length)) : [];
    const p = {};
    for (const [k, , def] of d.p) p[k] = inst.p && ok(+inst.p[k]) ? +inst.p[k] : def;
    try { return d.calc(src(bars), p, bars, ctx).map((a) => a.map((v) => (ok(v) ? v : null))); }
    catch (_) { return d.l.map(() => N(bars.length)); }
  }

  globalThis.OwlookIndicators = { DEFS, BY, CATS, PALETTE, compute };
})();
