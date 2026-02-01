// DX INCLUDE HEADER v31
(function () {
  const HEADER_PARTIAL = "./partials/header.html?v=31";
  const CSS_FILE = "./assets/css/dx-header.css?v=31";
  const JS_FILE = "./assets/js/dx-header.js?v=31";

  function ensureMount() {
    let mount = document.getElementById("dxHeader");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "dxHeader";
      // on l'insère au tout début du body
      document.body.insertAdjacentElement("afterbegin", mount);
    }
    return mount;
  }

  function ensureCss() {
    const exists = !!document.querySelector('link[href*="dx-header.css"]');
    if (exists) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_FILE;
    document.head.appendChild(link);
  }

  function ensureScript() {
    return new Promise((resolve, reject) => {
      const exists = !!document.querySelector('script[src*="dx-header.js"]');
      if (exists) return resolve();

      const s = document.createElement("script");
      s.src = JS_FILE;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Impossible de charger dx-header.js"));
      document.head.appendChild(s);
    });
  }

  async function inject() {
    const mount = ensureMount();
    if (mount.dataset.dxReady === "1") return;
    mount.dataset.dxReady = "1";

    ensureCss();

    try {
      const res = await fetch(HEADER_PARTIAL, { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch header failed: " + res.status);
      const html = await res.text();
      mount.innerHTML = html;

      await ensureScript();

      if (window.DXHeader && typeof window.DXHeader.init === "function") {
        window.DXHeader.init(document);
      }
    } catch (e) {
      console.error("[DX] Header injection error:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
