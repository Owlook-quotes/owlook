# Chrome Web Store: materiale per la pubblicazione

Tutto quello che serve per compilare la scheda di Owlook nella [Developer Dashboard](https://chrome.google.com/webstore/devconsole). I testi in inglese sono quelli da incollare (lingua principale della scheda); sotto ogni campo c'è la versione italiana per la traduzione della scheda.

## File da caricare

| Campo | File |
|---|---|
| Pacchetto | `Owlook-ChromeWebStore.zip` dell'ultima [release](https://github.com/Owlook-quotes/owlook/releases/latest): gli stessi file di `Owlook-Chrome.zip`, ma con `manifest.json` nella radice dello zip, come chiede lo store |
| Icona 128×128 | già nel pacchetto (`icons/128.png`) |
| Screenshot 1280×800 | `screenshots/1-watchlist.png` … `5-calendar.png` (inglese): «Screenshot globali» e «Screenshot localizzati» della scheda English · `screenshots-it/…` (italiano): «Screenshot localizzati» della scheda Italiano. Dati e loghi dimostrativi |
| Riquadro promozionale piccolo 440×280 | `promo-small-440x280.png` |
| Riquadro promozionale grande 1400×560 (facoltativo) | `promo-marquee-1400x560.png` |

## Scheda dello store

**Nome** (dal manifest, già tradotto): EN "Owlook – Stock Quotes & Charts" · IT "Owlook – Quotazioni e grafici di borsa"

**Riepilogo** (dal manifest, max 132 caratteri):
Live stock, ETF and crypto quotes on any page: watchlists, portfolio, candlestick charts, earnings and economic calendar.

IT: Quotazioni di azioni, ETF e cripto su ogni pagina: liste, portafoglio, grafici a candele, calendario utili e macro.

**Categoria:** Productivity › Tools (in alternativa Lifestyle › News & Weather)

**Descrizione (EN):**

```
Owlook puts your markets in a small, elegant panel on top of any web page: follow stocks, ETFs, indices, currencies and crypto while you browse, without switching tabs.

📈 Watchlists with live prices
Create your lists and see price, today's change and the last close at a glance. Logos, sorting and quick search included.

⭐ Featured tickers
Up to six indices or stocks always visible at the top of every page, in a column or in one row.

🕯️ Professional charts
Candlesticks from 1 minute to 1 month with EMA, VWAP, RSI, Bollinger bands and more, or the long-term price history. Save your favourite chart setups.

💼 Portfolio
Quantity, average cost, today's gain and total return for every holding and for the whole portfolio, converted into your currency.

📰 Only the news that matters
Stories from major outlets (Reuters, AP, Bloomberg, WSJ, CNBC…), official press releases and SEC 8-K filings, ranked by importance and tagged (results, outlook, deals, management…). Turn on an alert to get a notification when a new story comes out.

🗓️ US economic and earnings calendar
Payrolls, CPI, GDP, the Fed and more, with forecasts and actual values. The week's earnings with estimates, actual EPS, surprise and a live chart of the session for companies reporting today.

🧘 Zen mode
Click the owl: only your tickers stay on screen, the controls appear when you need them.

🎨 Light and dark theme, English and Italian, keyboard shortcut (Alt+Shift+M). Where the panel can't appear, it opens in the browser side panel.

🔒 Private and transparent
• No account, no ads, no analytics. There is no Owlook server: your lists, portfolio and settings stay in your browser.
• Data comes directly from public sources: Yahoo Finance, Google News, Nasdaq, SEC, official US statistics sites, Forex Factory; logos from Brandfetch and others. They only receive ticker symbols and company names, never the pages you visit.
• Source available (PolyForm Noncommercial): https://github.com/Owlook-quotes/owlook

Data from Yahoo Finance (unofficial) may be delayed or inaccurate. For information only, not financial advice. Owlook is not affiliated with Yahoo, Nasdaq, Google or TradingView. Charts: TradingView Lightweight Charts™ © TradingView, Inc.
```

**Descrizione (IT):**

```
Owlook mette i tuoi mercati in un piccolo pannello elegante sopra qualsiasi pagina web: segui azioni, ETF, indici, valute e criptovalute mentre navighi, senza cambiare scheda.

📈 Liste con prezzi in tempo reale
Crea le tue liste e vedi a colpo d'occhio prezzo, variazione di oggi e dell'ultima chiusura. Con loghi, ordinamento e ricerca rapida.

⭐ Titoli in evidenza
Fino a sei indici o azioni sempre visibili in cima a ogni pagina, in colonna o in una riga.

🕯️ Grafici professionali
Candele da 1 minuto a 1 mese con EMA, VWAP, RSI, bande di Bollinger e altri indicatori, oppure l'andamento storico di lungo periodo. Salva le tue impostazioni preferite.

💼 Portafoglio
Quantità, prezzo medio di carico, guadagno di oggi e rendimento totale di ogni titolo e dell'intero portafoglio, convertiti nella tua valuta.

📰 Solo le notizie che contano
Articoli delle grandi testate (Reuters, AP, Bloomberg, WSJ, CNBC…), comunicati ufficiali e moduli 8-K della SEC, con grado d'importanza e tag (risultati, previsioni, accordi, dirigenti…). Attiva un avviso per ricevere una notifica quando ne esce una nuova.

🗓️ Calendario economico e degli utili USA
Occupazione, inflazione, PIL, Fed e altro, con valori attesi e pubblicati. Le trimestrali della settimana con stime, EPS effettivo, sorpresa e grafico della seduta in diretta per chi pubblica oggi.

🧘 Modalità zen
Clicca il gufo: sullo schermo restano solo i tuoi titoli, i comandi compaiono quando servono.

🎨 Tema chiaro e scuro, italiano e inglese, scorciatoia da tastiera (Alt+Maiusc+M). Dove il pannello non può comparire, si apre nel pannello laterale del browser.

🔒 Privato e trasparente
• Niente account, pubblicità o statistiche. Non esiste un server di Owlook: liste, portafoglio e impostazioni restano nel tuo browser.
• I dati arrivano direttamente da fonti pubbliche: Yahoo Finance, Google News, Nasdaq, SEC, siti ufficiali di statistica USA, Forex Factory; loghi da Brandfetch e altri. Ricevono solo i simboli e i nomi dei titoli, mai le pagine che visiti.
• Codice sorgente pubblico (PolyForm Noncommercial): https://github.com/Owlook-quotes/owlook

Dati da Yahoo Finance (non ufficiale), possono essere in ritardo o inesatti. Solo a scopo informativo, non è una consulenza finanziaria. Owlook non è affiliato a Yahoo, Nasdaq, Google o TradingView. Grafici: TradingView Lightweight Charts™ © TradingView, Inc.
```

**Sito web:** https://owlook-quotes.github.io/owlook/
**Assistenza:** https://github.com/Owlook-quotes/owlook/issues

## Scheda "Privacy" della Dashboard

**Scopo unico (single purpose):**
Show stock market quotes, charts, a portfolio and US economic and earnings calendars in a small panel on top of web pages.

**Motivazione dei permessi:**

| Permesso | Testo da incollare |
|---|---|
| `storage` | Saves the user's watchlists, portfolio, settings and cached calendar data locally in the browser. |
| `unlimitedStorage` | The logo cache (small images of company logos, saved locally so they are not downloaded again) can exceed the default storage quota. |
| `scripting` | Injects the panel into the active tab when the user clicks the toolbar icon or uses the keyboard shortcut, and loads the bundled chart library into the page only when the user opens a chart. |
| `activeTab` | Lets the toolbar icon and the shortcut show the panel on the current tab even when the user has restricted the extension's site access to "on click". |
| `alarms` | Checks every 2 minutes for new stories about the tickers for which the user turned on news alerts (it does nothing when no alerts are on). |
| `notifications` | Shows a browser notification when a new story comes out for a ticker the user asked to be alerted about; clicking it opens the article. |
| `sidePanel` | Opens the same panel in the browser side panel on pages where it cannot be shown (new tab, browser pages, offline). |
| Host permissions `http://*/*`, `https://*/*` | The panel is meant to be available on any website the user visits, so the content script runs on all http/https pages (the user can exclude sites in the settings). The extension also downloads public market data from several providers (Yahoo Finance, Nasdaq, US government statistics sites, Forex Factory, logo services). It does not read, store or transmit the content of the pages. |

**Codice remoto:** "No, I am not using remote code." (Tutto il codice è nel pacchetto; dalla rete arrivano solo dati JSON/testo e immagini.)

**Uso dei dati:** non selezionare nessuna categoria di dati raccolti. Owlook salva liste e portafoglio solo nel browser e non li trasmette a nessuno: ai fornitori di dati arrivano solo i simboli dei titoli. Spunta le tre dichiarazioni (non vendo i dati a terzi; non li uso per scopi diversi dallo scopo unico; non li uso per valutare il merito creditizio).

**Informativa sulla privacy (URL):** https://owlook-quotes.github.io/owlook/privacy.html

## Consigli per l'approvazione

- Con l'accesso a tutti i siti la revisione è più approfondita e può durare da qualche giorno a qualche settimana. Le motivazioni qui sopra spiegano perché serve.
- Per aggiornare: alza `version` in `extension/manifest.json`, fai il push (la release su GitHub si crea da sola) e carica `Owlook-ChromeWebStore.zip` della nuova release nella Dashboard (stessi file del pacchetto su GitHub, con impronta e attestato).
- La scorciatoia predefinita (Alt+Shift+M) non è riservata da Chrome; l'utente può cambiarla in `chrome://extensions/shortcuts`.
