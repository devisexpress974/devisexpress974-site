// DX INCLUDE HEADER v38
(function () {
  const V = "38";
  const HEADER_PARTIAL = "./partials/header.html?v=" + V;
  const CSS_FILE = "./assets/css/dx-header.css?v=" + V;
  const JS_FILE = "./assets/js/dx-header.js?v=" + V;

  function ensureMount() {
  // priorité : slot présent dans les pages
  let mount = document.getElementById("dx-header-slot");
  let replaceOuter = false;

  // fallback : anciennes pages (paiement) qui ont <header id="siteHeader"></header>
  if (!mount) {
    const old = document.getElementById("siteHeader");
    if (old) {
      mount = old;
      replaceOuter = (old.tagName === "HEADER");
    }
  }

  // fallback : mount auto
  if (!mount) mount = document.getElementById("dxHeader");

  if (!mount) {
    mount = document.createElement("div");
    mount.id = "dxHeader";
    document.body.insertAdjacentElement("afterbegin", mount);
  }

  mount.dataset.dxReplaceOuter = replaceOuter ? "1" : "0";
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

  
function fallbackInit(rootDoc) {
  const header = rootDoc.querySelector(".dxTopbar[data-dx-header]");
  if (!header) return;

  // évite doubles init
  if (header.dataset.dxInit === "1") return;
  header.dataset.dxInit = "1";

  const burger = header.querySelector(".dxBurger");
  const panel = header.querySelector(".dxMobilePanel");

  if (panel) panel.hidden = true;

  function openMenu() {
    header.classList.add("dx-open");
    if (panel) panel.hidden = false;
    if (burger) burger.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    header.classList.remove("dx-open");
    if (panel) panel.hidden = true;
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  function toggleMenu() {
    const isOpen = header.classList.contains("dx-open");
    if (isOpen) closeMenu(); else openMenu();
  }

  if (burger) {
    burger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });
  }

  document.addEventListener("click", (e) => {
    if (!header.classList.contains("dx-open")) return;
    if (!header.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) closeMenu();
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
      if (mount.dataset.dxReplaceOuter === "1") {
        mount.outerHTML = html;
      } else {
        mount.innerHTML = html;
      }

      await ensureScript();

      if (window.DXHeader && typeof window.DXHeader.init === "function") {
        window.DXHeader.init(document);
      }
      // fallback si dx-header.js n'est pas chargé / exécuté
      fallbackInit(document);

      try {
        if (window.DX_AUTH && typeof window.DX_AUTH.initHeader === "function") {
          window.DX_AUTH.initHeader();
        } else if (window.DX_AUTH && typeof window.DX_AUTH.refreshHeader === "function") {
          window.DX_AUTH.refreshHeader();
        }
      } catch (e) {}

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
