// Pagina di benvenuto: si apre dopo l'installazione (e dalle impostazioni, "Su ogni pagina").
// Spiega il permesso prima che Chrome lo chieda: la richiesta può partire solo da qui, dopo un clic.
(() => {
  const ALL = ["http://*/*", "https://*/*"];
  const TX = {
    it: {
      askH: "Vuoi Owlook su ogni pagina?",
      askP: "Per mostrare il widget sopra i siti che visiti, Chrome ti chiederà un permesso.",
      askQ: "Chrome scriverà <em>«Leggere e modificare tutti i tuoi dati su tutti i siti web»</em>. È la frase standard per ogni estensione che si mostra sopra le pagine.",
      li1: "Owlook disegna solo il widget: non legge le pagine né quello che scrivi",
      li2: "Nessun account, nessun server: non raccoglie nulla",
      li3: "Codice sorgente pubblico su GitHub, verificabile da chiunque",
      go: "Continua", click: "Solo quando clicco l'icona",
      later: "Puoi cambiare idea quando vuoi nelle impostazioni di Owlook.",
      doneH: "Fatto!",
      doneP: "Da adesso Owlook compare in alto a destra su ogni sito. Puoi nasconderlo quando vuoi con «Nascondi» e riportarlo cliccando la sua icona.",
      closeTab: "Chiudi questa scheda",
      altH: "Nessun problema",
      altP: (k) => `Quando vuoi vedere le quotazioni, clicca l'icona di Owlook nella barra di Chrome${k ? ` o premi ${k}` : ""}: il widget compare solo in quella scheda.`,
      altQ: "Se l'icona non c'è, aprila da <em>Estensioni</em> (il pezzo di puzzle) e premi la puntina per fissarla.<br>Per mostrarlo su ogni pagina: <em>Impostazioni › Dove compare il widget</em>.",
      gotIt: "Ho capito", tip: "L'icona di Owlook è qui in alto"
    },
    en: {
      askH: "Show Owlook on every page?",
      askP: "To show the widget on top of the sites you visit, Chrome will ask you for a permission.",
      askQ: "Chrome will say <em>“Read and change all your data on all websites”</em>. It's the standard wording for any extension that appears on top of pages.",
      li1: "Owlook only draws the widget: it doesn't read pages or what you type",
      li2: "No account, no servers: nothing is collected",
      li3: "Public source code on GitHub, anyone can check it",
      go: "Continue", click: "Only when I click the icon",
      later: "You can change your mind anytime in Owlook's settings.",
      doneH: "Done!",
      doneP: "From now on Owlook appears at the top right of every site. Hide it anytime with “Hide” and bring it back by clicking its icon.",
      closeTab: "Close this tab",
      altH: "No problem",
      altP: (k) => `When you want to see quotes, click the Owlook icon in Chrome's toolbar${k ? ` or press ${k}` : ""}: the widget appears on that tab only.`,
      altQ: "If the icon isn't there, open it from <em>Extensions</em> (the puzzle piece) and click the pin to keep it.<br>To show it on every page: <em>Settings › Where the widget appears</em>.",
      gotIt: "Got it", tip: "The Owlook icon is up here"
    }
  };
  const $ = (s) => document.querySelector(s);
  let tx = TX.it, key = "";
  const show = (id) => {
    for (const c of document.querySelectorAll(".card")) c.hidden = c.id !== id;
    $("#tip").hidden = id !== "alt";
    const f = $(`#${id} .b1`); if (f) f.focus({ preventDefault: true });
  };
  const close = () => chrome.tabs.getCurrent((t) => (t ? chrome.tabs.remove(t.id) : window.close()));

  chrome.storage.local.get("lang").then(async ({ lang }) => {
    const l = lang === "en" || lang === "it" ? lang : /^it\b/i.test(navigator.language || "") ? "it" : "en";
    tx = TX[l];
    document.documentElement.lang = l;
    for (const el of document.querySelectorAll("[data-t]")) el.textContent = tx[el.dataset.t];
    for (const el of document.querySelectorAll("[data-h]")) el.innerHTML = tx[el.dataset.h]; // testi fissi di questa pagina
    try { key = ((await chrome.commands.getAll()).find((c) => c.name === "toggle-widget") || {}).shortcut || ""; } catch (_) {}
    $("#altP").textContent = tx.altP(key);
  });

  $("#go").addEventListener("click", async () => {
    let ok = false;
    try { ok = await chrome.permissions.request({ origins: ALL }); } catch (_) {}
    if (ok) {
      // il service worker registra il widget su ogni pagina e lo aggiunge alle schede già aperte
      await chrome.runtime.sendMessage({ type: "everyon" }).catch(() => {});
      show("done");
    } else {
      await chrome.runtime.sendMessage({ type: "everyoff" }).catch(() => {});
      show("alt");
    }
  });
  $("#click").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "everyoff" }).catch(() => {});
    show("alt");
  });
  for (const b of document.querySelectorAll("[data-close]")) b.addEventListener("click", close);
})();
