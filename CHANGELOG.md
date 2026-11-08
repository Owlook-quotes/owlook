# Changelog

## 1.84.2 beta

- Featured tickers box: the change pills now have exactly the same colours as in the lists and the portfolio (their background no longer mixes with the lighter sheen of the box).

## 1.84.1 beta

- Licence: Owlook's code is source available under the PolyForm Noncommercial License 1.0.0. You can read, use, change and share it for any noncommercial purpose; selling it or using it to make money is not allowed. The Owlook name and logo are not covered by the licence.

## 1.83.3 beta

- Store icon (128×128): the owl is 96×96 with 16 px of transparent margin per side, as the Chrome Web Store asks.

## 1.83.2 beta

- Store name and summary that say what Owlook does: "Owlook – Stock Quotes & Charts" (in Italian "Owlook – Quotazioni e grafici di borsa"). The toolbar keeps the short name "Owlook".

## 1.83.1 beta

- The package now also contains Owlook's licence and the third-party notices.

## 1.83.0 beta

- Charts: the values on the axes are pills, like the price labels: the price where the mouse is (on the right) and the date and time (at the bottom). On the price-history chart the price follows the point on the line.

## 1.82.0 beta

- Panel position: the right edge no longer slides left when you resize the panel. Owlook measured the window including the page's scroll bar.
- Full screen: the same fix keeps an equal margin on the left and on the right.
- Owl logo: leaving zen mode, the closed eyes disappear at once and then the eyes open.
- Zen mode: the owl's aura pulses every 5 seconds.

## 1.81.0 beta

- Transparency set to none: the widget no longer applies any filter to the page behind it. Before, blur was zero but the colour filter was still on, and the browser recomputed it at every redraw, which slowed down the mouse.
- Candlestick chart, 1M interval: every candle is one month again. For tickers listed more recently (for example SanDisk or CoreWeave), Yahoo sent weekly or daily candles when asked for the whole history. Owlook now asks for exact dates and, if needed, groups the candles itself (also for 1W).
- Featured tickers section in the panel: it opens and closes smoothly.
- Zen mode: the chart buttons appear while the mouse is anywhere on the top strip (logo, name, price, buttons). The same goes for the calendar (Macro/Earnings, Calendar/Results, week and filters).

## 1.80.0 beta

- Panel: the scroll bar is closer to the right edge and the rows of lists and portfolio are a little wider.
- Owl logo: it no longer tilts its head by itself, only when the mouse is over it. It half-closes its eyes after 10 s, then after 5 s, then after 7 s, and again.
- Zen mode:
  - a soft violet aura pulses from the owl's face every 3 seconds and fades out before reaching the panel edge;
  - scroll bars show only while you scroll (lists, portfolio, news, calendars).
- Full screen: no more lag. The frosted-glass effect is turned off in full screen, because redrawing it at every mouse move slowed everything down.
- Candlestick chart: double-click the price axis to fit everything that is visible, candles and indicator lines from every day shown. The fit continues while you scroll or zoom, until you open another ticker or interval.
- Settings: Language and Number format are separate (for example Italian with 1,234.56).
- Lists: a ticker with no data no longer shows an empty grey pill.

## 1.79.0 beta

- Wordmark: the "owlook" lettering now really uses the website's typeface. Before, the browser fell back to a system font.
- Owl logo:
  - a little larger;
  - it tilts its head to the right, so it is no longer cut off at the panel edge;
  - in zen mode it stays still: no breathing, tilting or zoom on mouse over.
- News:
  - more sources: Owlook also searches Google News for the company name, which shows which outlet each story comes from. This finds Reuters, AP or Bloomberg stories that Yahoo republishes without a byline, the reason some tickers (for example NVDA) showed nothing;
  - a few more outlets allowed (Investor's Business Daily, The Economist, The Guardian, Politico, TechCrunch, The Information, The Verge);
  - the note at the bottom is one sentence, with an "i" button for the details.
- Zen mode:
  - the candlestick chart keeps indicator lines and their price labels on the right, but not the texts on the left (OHLC, indicator names);
  - the price-history chart no longer shows the values box next to the mouse;
  - the buttons next to "owlook", on the charts and in the featured tickers box show only while the mouse is over them. Clicking a button no longer keeps them visible.
- Portfolio:
  - the chart and news buttons are in a fixed column, as in the lists, one above the other;
  - Today and Total are easier to tell apart: today's change is in a pill, the total in bold;
  - the weight of each holding reads "weight 12.3%".
- Search results: ticker, full name, chart and news buttons in fixed columns, exchange, Add.

## 1.78.0 beta

- Zen mode:
  - the switch is smooth: the rows slide into place and the panel changes height gradually;
  - a small violet "zen" appears next to "owlook";
  - the violet of the theme, the buttons and the price-history line is softened to the owl's violet;
  - the featured tickers box stays; its buttons, like the buttons next to "owlook" and those of the chart and calendar headers, show only while the mouse is over them;
  - the candlestick chart keeps the indicators and volume you set; the logo at the top left of the chart stays if it is turned on in the settings.
- Owl logo: the closed eyes in zen mode are centred on the face. Every now and then the owl tilts its head and half-closes its eyes (after 10 s and 5 s, then after 15 s and 2 s, and again).
- The "owlook" wordmark is the same in and out of zen mode, and uses the same typeface as the website (Schibsted Grotesk).
- News view: logo, name and price stay exactly where they are on the chart.
- Featured tickers box: the change pills have the same colours as in the panel (the light sheen of the box was drawn over them).
- Settings: removed the option to show the changes without pills.
- Lists: when you open a ticker's news, its chart button is no longer highlighted.

## 1.77.0 beta

- Zen mode: click the owl or the name "owlook" to keep only your tickers. The buttons, the toolbar, the lists, the column titles, the featured tickers and the notes go away; the header buttons come back while the mouse is over the header. On the chart, the toolbar and the buttons show only while the mouse is over it, and volume, gridlines and indicators are hidden. The owl closes its eyes and breathes slowly while zen mode is on; click it again to leave.
- Macro calendar: the Previous / Forecast / Actual values of past releases now open in a floating box over the list, with a short animation, instead of pushing the rows below.
- Earnings: the small session chart is shown only for companies reporting today (it showed misleading lines for other days); on other days the columns use the freed space.
- Earnings: better recovery of the before-open / after-close time for past weeks. When Yahoo gives the exact time instead of "before open" / "after close", Owlook works it out from the time; reports without a time that Yahoo dates at midnight UTC are no longer put on the previous day. Past days are downloaded again once.
- Animations: showing and hiding now use the same short curve everywhere (chart, news, calendar, values box).

## 1.76.0 beta

- Earnings results: a small chart of the session in each row, like Apple's Stocks app. The line is green above the previous close (dotted) and red below it. It shows the session in which the stock reacts to the report: the same day for reports before the open, the next session for reports after the close. Today's session updates every minute; only the rows on screen are downloaded. The Estimate, Actual and Surprise columns are a little closer together to make room.
- Earnings: past weeks keep the before-open / after-close icon. Nasdaq drops that information once the day has passed, so Owlook now keeps what it already knew and fills the gaps from Yahoo Finance.
- Macro calendar: for past releases, hold the mouse over the row to see Previous, Forecast and Actual. Forecasts from earlier weeks are now kept, so they can still be shown.
- Macro calendar: more space inside each row, so the time and the value columns no longer sit against the edge of the violet box.
- Calendar header: "US calendar" and the refresh, full-screen and close buttons stay in the same place when you switch between Macro and Earnings.
- List and portfolio buttons: the highlight's corners now follow the curve of the grey box around it (the same for every switch of this kind).

## 1.75.0 beta

- Changes in softer pills: a light tint of green or red with coloured text, instead of a solid block. In the light theme the text is a darker shade so it stays readable. "No pill" in the settings works as before.
- Same corner radius across the panel and the featured tickers box, and the same line thickness for the header and toolbar icons.
- While prices are loading, the price and change show as softly pulsing grey blocks instead of "…".
- The ticker whose chart or news is open is marked by a thin violet bar on the left of its row.
- The data note at the bottom of the list is now one line, "Unofficial data, may be delayed."; the "i" button next to it shows the full text, with the TradingView credit (the TradingView logo stays on the chart).
- Opening another ticker's chart, the news, or going back to the chart now fades in briefly instead of switching at once (off when the system asks for reduced motion).

## 1.74.2 beta

- News view: "Notify me" is vertically centred with the list/portfolio buttons on its right.
- Featured tickers: switching between one row and the column now animates smoothly, and the panel slides up or down with it instead of jumping.

## 1.74.1 beta

- News view: same scrollbar as the panel; "Notify me" moved up into the header, in place of the chart controls.
- Featured tickers box: the light sheen at the top now continues over the whole box, as on the panel, so it no longer looks darker than the panel.

## 1.74.0 beta

- News: important stories only. Sources: Yahoo Finance search and RSS, kept only from major agencies and outlets (Reuters, AP, Bloomberg, WSJ, CNBC, Barron's, MarketWatch…) and official press-release wires (Business Wire, GlobeNewswire, PR Newswire…), plus Form 8-K filings from the SEC for US companies. Rankings, buy tips, opinion pieces and clickbait titles are filtered out.
- News view: each story has an importance grade (three orange dots) and a tag (Results, Outlook, Deal, Management…), with "News grade" and "News tag" column labels; a note at the bottom explains what is shown. The "Notify me" button sits a little higher.
- Featured tickers: same look as the panel, slightly more compact rows; from the fourth to the sixth ticker they go below the third and you scroll the box with the mouse wheel or touchpad. A new button in the right column puts all tickers (2 to 6) on one row; the panel then moves up to fill the space.
- Panel header: the calendar button comes first; "Hide" is shorter, so the restore-position button (shown when you move the panel) fits without pushing the other buttons.

## 1.73.1 beta

- Market closed: today's change no longer goes back to 0,00% after a while. Yahoo's live stream repeats old regular-session prices when the market is closed; Owlook used to treat them as new (marking them "now"), which hid the after-hours price and blocked later updates. Old repeated prices are now ignored.
- Lists: the price-history and news buttons stay in their fixed columns but appear only when the mouse is on the row. A ticker with unread stories (alerts on) keeps its news button visible, with the violet dot at the top right; it goes away when you read the news.
- Earnings calendar: the note at the bottom is 1 px smaller. News view: removed the note at the bottom.

## 1.73.0 beta

- Today's change (Trend) with the market closed: it now keeps the last after-hours change from Yahoo Finance in the evening, at night and at the weekend, instead of showing 0,00%. It shows 0,00% only when the price really didn't move.
- Lists: each row has two fixed columns with always-visible buttons, price history (or candlesticks) and news; a violet dot on the news button marks unread stories for tickers with alerts on. The news button left the chart header, and the logo is no longer a button. The "Last close" column is a little closer to "Trend".
- Lists and portfolio show only the ticker (with or without logo); the full company name is shown at the top left of the charts. Settings keep only the logo option.
- Charts: ticker, name, price and change stay in exactly the same place in the candlestick chart and in the price history.
- News: "‹ Chart" in the news view goes back to the chart; the refresh button of the panel also refreshes the open news and checks the alerts.
- News alerts are checked every 2 minutes (was 10).

## 1.72.0 beta

- News: a newspaper button next to the clock (candlestick chart and price history) shows the latest headlines about the open ticker from the Yahoo Finance RSS feed (fallback: Yahoo Finance search). Headlines are shown unchanged, with source and time, and open the article in a new tab.
- News alerts: **Notify me** in the news view turns on alerts for that ticker. Every 10 minutes Owlook checks for new stories and shows a browser notification (click: opens the article). In the lists, the logo of a ticker with unread stories gets a violet ring and dot and becomes a button that opens its news. New permissions: `alarms` and `notifications`.
- Candlestick chart: ticker logo and price are the same size as in the price history, and the chart starts at the same height.
- Price history: the change label uses the period buttons' short names ("in 1M", "in YTD", "all time"); the period buttons have a fixed size.
- Settings: the theme (violet) color can no longer be changed, to keep the Owlook look; up and down colors can still be customized.

## 1.71.1 beta

- Settings → General: removed the "Support Owlook" section.

## 1.71.0 beta

- Code cleanup for the Chrome Web Store, with no change in features or look: removed about 110 lines of code that was never called (old earnings detail view and calendar tooltip, unused helpers), 58 style rules for elements that no longer exist and 231 style declarations that were always overridden later. Checked by comparing screenshots of 24 views before and after.
- Manifest: removed host permissions already covered by the general ones (Yahoo, Nasdaq); added the website link.
- Transparency: each release now includes the SHA-256 fingerprint of `Owlook-Chrome.zip` and a GitHub build attestation; the zip is reproducible from the code. `lib/NOTICE-lightweight-charts.txt` states the exact version and fingerprint of the chart library (identical to the npm file).
- Website: new "What it does and doesn't do" section (permissions and why, data sources, how to verify the file) and a privacy policy page.

## 1.70.4 beta

- The desktop app for Windows and macOS is discontinued: Owlook is now only the browser extension. Downloads, the website and the README talk only about the extension.
- Releases are published automatically when the extension version changes (tag `v…`, file `Owlook-Chrome.zip`).
- New installs start with the dark theme (you can still pick Light or Auto in the settings).

## 1.70.3 beta

- Macro calendar: the subtitle ("Times in your time zone · ET = New York. Updated at…") fits on one line in the compact panel; the colour legend at the bottom is smaller so each sentence fits on one line.
- Macro calendar: the "Census unreachable" message no longer appears under the title (it is in the subtitle tooltip).
- Windows installer: the Owlook-Windows.exe file now shows the Owlook icon.

## 1.70.2 beta

- New icon everywhere (browser toolbar, extension pages, desktop app, README): the barn owl in theme violet with an empty face that shows the background behind it.

## 1.70.1 beta

- Earnings note: the source now reads "Nasdaq (dates) and Yahoo Finance (estimates, EPS and surprise)".
- README: screenshots updated to the current version (English, demo tickers); "Formerly Tickwave" removed. Desktop app identifier is now app.owlook.desktop.

## 1.70.0 beta

- Charts stay sharp when you pinch-zoom (touchpad or touch screen): the canvas is redrawn at the zoomed resolution (up to 3×) once the pinch stops. Browser zoom (Ctrl +) was already sharp.
- Price history: clicking a period no longer makes the buttons shrink and grow back (their width is kept and only adjusted when the free space changes).
- Macro calendar: "Times in your chosen time zone · ET = New York. Updated at …" now sits under the "US calendar" title (sources in its tooltip); the colour legend moved to the bottom of the panel, one sentence per line.
- Calendar and panel scrollbars: thin, rounded, inside the box, no arrow buttons.
- Portfolio: column labels no longer overlap when the portfolio is empty. Portfolio (wallet) icon drawn with a thinner line.
- Earnings: estimate, actual EPS and surprise now come from Yahoo Finance when available (Nasdaq uses a different analyst consensus and rounded EPS, so the surprise differed from Yahoo's); surprise shown with two decimals. Cached days are refreshed once.

## 1.68.0 beta

- Liquid-glass button effect removed (CSS glass, SVG refraction filter and press animation): buttons are back to the previous style. The calendar LEDs stay side by side at the top-right of the button.
- Price history: the period buttons widen to use the free space next to the price (without cutting the % texts).

## 1.67.1 beta

- Widget header logo: only the owl's outline and features in the theme violet; the inside of the face is empty and shows the panel background (light or dark).

## 1.67.0 beta

- New logo: a stylised barn owl face. In the widget header it has a dark face with outline and features in the theme violet, followed by the "owlook" wordmark (the old wordmark with green eyebrows is gone; live status stays on the dot in the ticker bar).
- New extension and desktop-app icons: white owl face with dark outline on a violet rounded square, with the face enlarged at small sizes.

## 1.66.0 beta

- Real liquid-glass buttons (Chrome/Chromium), following kube.io's "Liquid Glass in the Browser": each button bends what is behind it like a lens. The bezel follows a convex-squircle profile, refraction is computed with Snell's law (air 1 → glass 1.5) into a displacement map, and a rim-highlight map (strong on the light side, weaker on the opposite side) is blended on top. Both feed an SVG filter used as `backdrop-filter`, generated once per button size.
- Where SVG backdrop filters aren't supported, the previous CSS glass is used.

## 1.65.2 beta

- Chart logo appears/disappears immediately when you change the setting with a chart open.
- Price history: the % next to the price is 1 px smaller; the period buttons sit on the price row again (more compact in the widget; below only in very narrow charts).
- Selected period and Macro/Utili: the selection is theme-tinted glass instead of a solid colour.
- Glass buttons: no more light following the pointer or rotating highlights; only the press effect remains (swells and lights up from the touched point).
- Earnings: the week selector has a fixed width (doesn't resize when the label changes) and its arrows are centred.
- List/Portfolio switch is larger; the Portfolio icon is now a stylised wallet.

## 1.65.1 beta

- Liquid-glass buttons redone in the iOS 26 style: almost transparent body, 1 px light rim with two opposite highlights, inner edge glow (glass thickness) and soft shadow; segmented controls have a recessed track with a glass "drop" as selection.
- Live glass: the rim highlights of nearby buttons turn towards the pointer, a light spot follows the pointer inside the hovered button, and pressing a button makes it swell with a small bounce and light up.
- Price history: period buttons are shown in full again (right-aligned under clock and buttons; on a narrow chart on their own row); line 1 px thinner.
- Calendar LEDs are now real elements (no longer pseudo-elements) so they don't clash with the glass effect.

## 1.65.0 beta

- Portfolio: returns, today's gain, value and invested amount are shown in the portfolio currency ("Holdings currency" renamed "Portfolio currency"). The purchase-currency menu is gone: the purchase price is in the currency the ticker trades in, and the total value is shown in the portfolio currency.
- Portfolio form: new purchase-date field you can type (dd/mm/yyyy) or pick from a built-in calendar; price and quantity accept both dot and comma as decimal separator and are rewritten in the chosen language's format; shorter quantity error; "Edit purchase" title.
- Portfolio: prices refresh every 0.5 s; the right-hand box cycles price → today → quantity × average cost → value.
- Panel: the top row now holds List/Portfolio (icons), search, +, edit and refresh; lists (or holdings total) sit below it. Adding a list no longer shifts anything. + and settings stay lit in the theme colour while their screen is open. Scrollbar moved slightly away from the buttons.
- Sorting: "Ticker" goes A–Z, Z–A, then your order.
- Search results: row click opens the chart (or price history, per settings), a button next to the ticker opens the other one, "+ Add" is a button, and × closes the search.
- Charts: interval/indicator/type/template buttons (or the history periods) moved to the right under clock, full screen and ×; the header is one row shorter; the company logo (if enabled) sits top-left. On narrow charts the history periods become a menu.
- The widget reopens the same way in every tab (same chart or calendar, full screen or not).
- Liquid-glass buttons with a glossy rim; the price-history line gets a glossy highlight on its highest stretches.
- Strong transparency over a page of opposite brightness: grey texts become lighter (dark theme) or darker (light theme) with a soft halo.
- Calendar button: the two status LEDs sit side by side at the top-right corner, slightly outside the button.

## 1.64.1 beta

- Indicators: the edit bar (period, colour, ×) opens only when the pointer is on the indicator's name, and it is as long as its contents (it used to stretch very wide and open when hovering the chart near the legend).
- Price history: today's % sits just above the % of the selected period, both next to the price; the title row shows only the name again. The chart has a background grid like the candlestick chart.
- Lists: the close price in the "Last close" column is white (regular weight).
- Candlestick chart: after stretching the price axis (drag or wheel on the axis) the chart moves freely in every direction; double-click on the axis goes back to automatic scale with left/right movement only.

## 1.64.0 beta

- Candlestick chart: the volume of the bar in progress no longer jumps when the source switches between stream and HTTP (each keeps its own reference, impossible jumps are discarded); volume bars are taller.
- Candlestick chart: after a wheel zoom, dragging moves freely without rescaling; double-click on the price axis goes back to automatic scale (dragging then moves only left/right). The remembered view is kept only while you stay on the same ticker.
- Indicators: the current value sits in a compact capsule of the indicator's colour on the price axis (stacked when close); click an indicator's name to hide/show its capsule; the legend values appear only while pointing at a bar.
- Lists: the "Last close" column shows the close price above the %.
- Price history: the big price follows the pointer; crosshair lines snap to the curve; outside regular hours the last point stays on the official close (no more pre/after-market price); today's % moves to the title row and the % of the selected period sits next to the price.

## 1.63.0 beta

- Macro: values shown directly under each release (no more hover panel), in three columns: Previous, Forecast (bold) and Actual ("–" until published, then bold with a green/red arrow or "="). A three-line legend explains =, green and red.
- Macro: from one minute before a release the list updates every second (countdown in seconds), and right after it asks for the actual value every few seconds (BLS within its daily limit), so the figure appears as soon as the official source has it.
- Macro: "Press release" link in electric violet; the subtitle under "US calendar" moved into the note at the bottom.
- Earnings: green dot also on the "Earnings" tab; in the calendar grid the green dot (left) and the star (right) sit above the logos; round week arrows; shorter note (two lines).

## 1.62.1 beta

- Chart header: ticker name and price sit in the same place in the candlestick chart and in the price history; clock and full-screen/close buttons are aligned at the top in both.

## 1.62.0 beta

- Logos no longer flash: when lists are redrawn (any button, refresh) a logo that has already arrived is shown straight away, without the initial underneath.
- Earnings calendar: today's row stays at the top while you change filters, even if the days before get shorter; it stops only if you scroll yourself, and the refresh button brings you back to today.
- Price-history box: fixed square size (the same height as before), pixel-aligned so the text stays sharp while you move the mouse.
- Minimum font size 11 px everywhere (except the data disclaimer at the bottom of the panel).
- Candlestick chart: interval, ƒx, chart type and templates move up to the title row; the row they used is gone and the chart is taller.

## 1.61.0 beta

- Darker company logos: Brandfetch is asked first for the icon on a dark background, then for the light symbol (shown on a dark tile), only then for the light icon; the version that works is remembered.
- Selected lists, periods and tabs: soft violet with white text and icons; the price-history line and area are soft violet too. The chart button next to the tickers uses the theme colour (and follows it if you change it).
- Eyedropper in every colour picker: pick a colour anywhere on the screen; while picking, the colour box and the settings panel step aside.
- Settings always open on "General", scrolled to the top.
- Header: with real-time data the eyebrows stay solid green and only a soft halo around them pulses.
- 5-year price history: one point per week (it was one per month, the same as "All").
- Opening and closing a chart no longer shifts the list column by a few pixels.
- Reordering lists by dragging works across any number of rows, including dropping after the last list.

## 1.60.0 beta

- Company logos: for US stocks, the brand's official icon from Brandfetch (full tile, dark version), loaded directly from Brandfetch; if it is missing or the page blocks external images, the tile built from the other sources as before.
- Logos are bigger (28 px in the lists) and cut with a vector "squircle" mask: clean edges, no more thin light border.
- Softer violet: selected lists, periods and calendar tabs use a translucent violet with violet text; main buttons stay solid.

## 1.59.0 beta

- Owlook colours: electric violet for buttons, selected lists and tabs, and for the price-history line; the owl's green for gains (candles included). Losses keep the current orange. Colours you chose yourself in the settings stay as they are.
- Header: the "owlook" logo with the owl's eyes in place of the two "o"s. The eyebrows are green and pulse gently with real-time data, dark green when no live tick is arriving.
- Fix: with the panel closed and only the featured tickers visible, the shortcut now hides everything at once instead of opening the panel first.

## 1.58.0 beta

- Tickwave is now **Owlook**: new name, new owl icon and new logo in the panel header.
- The owl's eyebrows in the header show the data status: green with real-time streaming, grey when no live tick is arriving (it replaces the green dot).
- Lists exported with Tickwave can still be imported.

## 1.57.0 beta

- Logos as app-style tiles: rounded squares instead of circles. Single-colour logos are drawn in white (or black on light colours) on their brand colour, multi-colour logos sit on white, round crypto icons and flags fill the whole tile. Wordmarks are no longer cut off.
- Earnings calendar: square logo tiles, like the lists.

## 1.56.1 beta

- New: Tickwave desktop app for Windows and macOS (beta, folder `desktop/`): the same panel in its own window, with a system tray / menu bar icon (left click shows or hides it, right click: always on top, quit). Built for free by GitHub Actions ("App desktop" workflow).
- Desktop app: automatic updates from the GitHub releases (check at startup and every 6 hours, or from the tray menu), signed with the project key.
- Narrow chart (side panel, desktop app): price and buttons on top, tools below, no longer overlapping.

## 1.56.0 beta

- Settings → Appearance → "% change": choose between colored pills and colored text only, applied everywhere (watchlist, portfolio, featured tickers, earnings surprise).

## 1.55.1 beta

- Earnings: same-day actual EPS now also comes from each company's Yahoo Finance earnings summary (for your own tickers and the largest companies reporting, once their report time has passed), in case the Yahoo calendar is late; if Yahoo can't be reached, the note at the bottom says so.
- Reordering lists: the dragged name takes the place of the one under the mouse as soon as you reach it.

## 1.55.0 beta

- Calendar header on two rows: title, week selector, Macro/Earnings, refresh, full screen and close on the first; in Earnings, view, market cap (short labels), session and "Mine" on the second; in Macro, the description. Shared buttons stay in the same place when switching sections, at any width.
- Economic calendar: arrows in fixed green and red (no longer the custom up/down colors); importance dots removed.
- List names use the same font as the other selectors.

## 1.54.1 beta

- Earnings: fixed the same-day actual EPS from Yahoo Finance, which never arrived (the request asked for more rows than Yahoo allows and was rejected); the Yahoo fallback calendar is fixed too.
- Lists in edit mode: the dragged list name lifts and follows the mouse while the others slide out of the way, like tickers in the list.

## 1.54.0 beta

- Price history: the values (close, open, high, low, volume) appear in a translucent grey box next to the mouse, on the right or left depending on where you point, centered on the pointer.
- Portfolio: today's gain follows the same change as the pill, so after the close it is the move since the last close (header "Today" included).
- Dropdown menus close when the button that opened them disappears (for example when leaving portfolio edit mode) or when you click elsewhere.
- Settings: "General" and "Appearance" next to the title, with narrower buttons.
- "% Last close" column in full up/down colors.

## 1.53.0 beta

- Calendar header: title on top; Calendar/Results, week selector, Macro/Earnings, refresh, full screen and close on one row below it (slightly more compact buttons). "Estimates & results" is now just "Results".
- Earnings calendar: smaller logos and at most two rows per day (companies without an announced time go into the "+N" of the second row); companies sorted by market cap, after your own tickers in the calendar and by market cap in Results.
- Live LEDs on company logos and on the calendar button without the dark ring.

## 1.52.1 beta

- Calendar header on a single row: title, week selector, Macro/Earnings, then refresh, full screen and close on the right (the subtitle is hidden when the panel is not wide).
- Earnings filters on two rows: view on the first; market cap on the second, with session and "Mine" on the right.

## 1.52.0 beta

- Watchlist after the US close: the "% Last close" column comes back as soon as Wall Street closes (not at midnight) and shows the change of the session just ended; "Trend" shows the current price (after-hours or pre-market, if any) against that close, i.e. the change the next session will start from. The same applies to any market that is closed while the column is shown (24-hour markets such as crypto and currencies are unchanged).
- Calendar header: refresh and full screen next to the close button; Macro/Earnings (same width) and the week selector at the top, in the same place in every view.
- Earnings filters: view, session and "Mine" on the first row, market cap below; slightly smaller company logos for more compact day rows.

## 1.51.1 beta

- Color picker: the most recently chosen colors appear next to "More colors…", on the same row (only as many as fit).

## 1.51.0 beta

- Portfolio: the "Today" view shows today's gain or loss with the usual % pill below; the total return % is now a pill like in the watchlist, with the amounts in bold.
- Fixed the List/Portfolio selector that could stay stuck on "Portfolio".
- Line and area charts: the color option in the chart type menu is now for the line or area (with a reset to the theme color).
- Featured tickers: price-history button next to the name, same font sizes and pills as the watchlist.
- Candlestick chart: the volume of the current candle is estimated from the day's volume as soon as the chart opens (instead of 0), then updated live.
- Economic calendar: the "unreachable" note is a normal line of text again.
- Earnings: the whole day row opens "Estimates & results"; filters rearranged (view and session on top, market cap below); shorter week selector; today highlighted in "Estimates & results"; sortable by surprise (high to low, low to high, default); "Macro/Earnings" selector in the theme color.
- Narrow panels: the calendar header wraps neatly instead of overlapping the list; the chart and calendar keep a minimum width.

## 1.50.0 beta

- Touchpad pinch zooms the charts in and out decisively, around the fingers.
- Portfolio: new first view in the price box with today's gain or loss (amount and %); the row height no longer changes when switching; pills identical to the watchlist; total and returns refresh at most once a second.
- Earnings: today's and yesterday's actual EPS and surprise are taken from Yahoo Finance as soon as they are out (Nasdaq adds them only the next day), with the time announced by the company for the live LED; clicking a day opens "Estimates & results" on that day (the old details panel was removed).
- Price history: weekly bars for 5Y and monthly for All, with the hover label showing the week or month.
- Smoother list switching; subtler TradingView logo on charts; fixed the layout of the economic calendar note.

## 1.49.1 beta

- Settings: "General" and "Appearance" are two panels switched with a selector at the top; "General" opens by default.

## 1.49.0 beta

- Settings split into "General" and "Appearance".
- Dropdown menus (currencies, time zone, list to download) now have the widget's own style.
- Lists: names on a single row (the others scroll under the + and pencil buttons); in edit mode all lists are shown and can be reordered by dragging them.
- Dragging a ticker near the top or bottom edge scrolls the list.
- Panel corners light up while resizing, like the edges.
- Purchase date can be typed or picked from the calendar; input fields use the widget font; labels no longer activate the field.
- Minimum font size 10 px; smaller transparency slider; no "Done" button in the color picker; "Trend" sorting: down, up, unsorted.

## 1.48.0 beta

- Tickwave in the browser side panel: where the widget cannot appear (no Internet connection, new tab, browser pages, extension stores, error pages) the extension icon and the shortcut open Tickwave in the side panel. Lists, portfolio and settings are always there; without a connection it shows the last values received.

## 1.47.1 beta

- Earnings: surprise pills all have the same width, with one or two digits before the decimal point.

## 1.47.0 beta

- Earnings: the pulsing green LED now sits on the corner of the company logo, in the calendar, in the day list and in "Estimates & results"; the weekly summary was removed.
- Calendar button LED: green when companies you follow or own are reporting now, red when an important macro release is due, both side by side when both happen.

## 1.46.0 beta

- Earnings: new "Estimates & results" view with estimate, actual EPS and surprise for each company, and a weekly summary (reported, beat, missed).
- Earnings: a pulsing green LED marks the companies whose results are due right now (typical release window before the open or after the close).
- Earnings: "Refresh" goes back to the current week and today; nicer week selector; logos keep their size in full screen (more logos per row).
- Full screen stays on when moving between chart, economic calendar and earnings.
- Featured tickers: back to the panel width, prices in bold, currency next to stock prices (indices such as the S&P 500 or the VIX are points, so they have none).

## 1.45.0 beta

- Featured tickers: more compact bar, sized to its content, with aligned columns and the same change pills as the lists.
- The panel can be resized from its corners too.
- Portfolio: light box around price and change, to show that it can be clicked.
- Price history: values appear only while pointing at the chart; slightly lighter shading under the line.
- Narrower change pills; readable text on the candle volume label; pulsing live LED.

## 1.44.0 beta

- Full screen also for the economic and earnings calendars.
- Portfolio rows: return in its own column between holding and price; price and today's change look like the watchlist; more compact rows.
- Featured tickers: today's change in small colored pills, as in the watchlist.
- Price history chart: the line uses the theme color (thin line, larger shaded area), grey volume bars, stacked close/open/high/low/volume on hover, and the marker stays on the first/last day at the edges.
- Candle colors chosen in the chart menu now only change the candles.
- "Trend" sorts only by today's change, up or down.
- Chart zoom memory is more reliable (also saved when the chart closes); the extension now uses unlimited local storage, so the logo cache can no longer fill it up.
- Closing the widget hides everything at once; restyled currency menus; clearer form messages; no "move" cursor on draggable areas.

## 1.43.0 beta

- Theme color: the accent color (selected list, buttons, selections) can now be chosen in the settings, next to the up and down colors.
- Price history chart: dedicated button for the line color and width; more history is loaded, so zooming out keeps showing the chart (the period button is deselected while you zoom or scroll).
- Chart zoom and position are remembered for each ticker, chart type and interval.
- Saved chart setups: save indicators (with their colors), chart type, volumes and interval under a name and reapply them with one click.
- Rounded last-value labels on the price axis.
- Smoother transitions for panels, menus, full screen and tab changes.
- Portfolio: the add form shows the resulting total value.
- List: "Trend" column, sorted by today's change; fixed sorting done before all prices had arrived.
- Fixes and polish: list edit mode layout, featured tickers spacing, minimum font size, segmented controls, contrast of the text in green and red pills.

## 1.42.0 beta — first public release

First public beta. Main features:

- watchlists with live prices, change since the last close and today's change, logos, sorting and drag to reorder;
- up to six featured tickers at the top of every page, which can be hidden with one click;
- portfolio with quantity, average cost, return, value and share of the total, with currency conversion;
- candlestick charts with indicators and several chart types, plus a long-term price-history chart;
- US economic calendar with analysts' forecasts;
- US earnings calendar: weekly grid with company logos, market-cap and session filters, estimates, actual EPS and surprise;
- light and dark themes, adjustable glass effect, custom up/down/line colors, Italian and English.
