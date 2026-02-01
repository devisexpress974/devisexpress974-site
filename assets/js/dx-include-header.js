/* assets/js/dx-include-header.js (v32)
   Injecte /partials/header.html dans <div id="dx-header-slot"></div>
   et charge automatiquement le CSS + JS du header.
*/
(function () {
  const V = "32";
  const SLOT_ID = "dx-header-slot";
  const HEADER_URL = `./partials/header.html?v=${V}`;
  const CSS_URL = `/assets/css/dx-header.css?v=${V}`;
  const JS_URL = `/assets/js/dx-header.js?v=${V}`;

  function ensureSlot() {
    let slot = document.getElementById(SLOT_ID);
    if (slot) return slot;

    slot = document.createElement("div");
    slot.id = SLOT_ID;

    // Toujours en tout premier dans le <body>
    if (document.body.firstChild) document.body.insertBefore(slot, document.body.firstChild);
    else document.body.appendChild(slot);

    return slot;
  }

  function ensureCss(href) {
    const existing = document.querySelector(`link[rel="stylesheet"][href*="dx-header.css"]`);
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src, cb) {
    const existing = document.querySelector(`script[src*="dx-header.js"]`);
    if (existing) {
      if (typeof cb === "function") cb();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    s.onload = () => { if (typeof cb === "function") cb(); };
    document.head.appendChild(s);
  }

  async function injectHeader() {
    const slot = ensureSlot();
    if (slot.dataset.dxHeader === "1") return;
    slot.dataset.dxHeader = "1";

    ensureCss(CSS_URL);

    const res = await fetch(HEADER_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Header fetch failed: " + res.status);
    const html = await res.text();

    slot.innerHTML = html;

    ensureScript(JS_URL, () => {
      if (typeof window.__dxInitHeader === "function") {
        window.__dxInitHeader();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectHeader);
  } else {
    injectHeader();
  }
})();
