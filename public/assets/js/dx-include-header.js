// DX INCLUDE HEADER v40
(function () {
  // "assumed" : on force un cache-bust cohérent sur tout le site
  const V = "assumed1";
  const B = "assumed1";
  const HEADER_PARTIAL = "./partials/header.html?v=" + V + "&b=" + B;
  const CSS_FILE = "./assets/css/dx-header.css?v=" + V + "&b=" + B;
  const JS_FILE = "./assets/js/dx-header.js?v=" + V;

  function ensureMount() {
    let mount = document.getElementById("dx-header-slot");
    if (!mount) {
      // fallback ancien système
      const old = document.getElementById("siteHeader");
      if (old) mount = old;
    }
    if (!mount) {
      mount = document.getElementById("dxHeader");
    }
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "dx-header-slot";
      document.body.insertAdjacentElement("afterbegin", mount);
    }
    return mount;
  }

  function ensureCss() {
    // On charge toujours NOTRE version en dernier (pour écraser les anciennes v=5/v33)
    if (document.getElementById("dx-header-css")) return;
    const link = document.createElement("link");
    link.id = "dx-header-css";
    link.rel = "stylesheet";
    link.href = CSS_FILE;
    document.head.appendChild(link);
  }

  function ensureScript() {
    return new Promise((resolve) => {
      if (document.getElementById("dx-header-js")) return resolve();
      const s = document.createElement("script");
      s.id = "dx-header-js";
      s.src = JS_FILE;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => resolve(); // on ne bloque pas
      document.head.appendChild(s);
    });
  }

  function fallbackHeaderHtml() {
    // Version embarquée : si fetch partials/header.html échoue, on injecte quand même un header utilisable.
    return `
<header class="dxTopbar" data-dx-header>
  <div class="dx-header-inner">
    <a class="dx-brand" href="./index.html" aria-label="DevisExpress974 - Accueil">
      <img class="dx-logo" src="./assets/img/logo-eclair-orange.png" alt="Logo DevisExpress974" />
      <span class="dx-brandText">
        <span class="dx-title">DevisExpress974</span>
        <span class="dx-tagline">1 clic - plusieurs devis - 100% 974</span>
      </span>
    </a>

    <nav class="dx-navWrap" aria-label="Navigation principale">
      <div class="dx-navPills">
        <a class="dx-navLink" href="./index.html">Accueil</a>
        <a class="dx-navLink" href="./demande.html">Faire une demande</a>
        <a class="dx-navLink" href="./metiers.html">Métiers</a>
        <a class="dx-navLink" href="./mur-demandes.html">Mur des demandes</a>
        <a class="dx-navLink" href="./offreurs.html">Les offreurs</a>

        <details class="dxPlus" role="list">
          <summary class="dx-navLink dx-navLink--summary" role="listitem" aria-haspopup="menu">
            Plus <span class="dx-caret" aria-hidden="true">▾</span>
          </summary>
          <div class="dxPlusMenu" role="menu">
            <a role="menuitem" href="./info-tarifs.html">Infos &amp; tarifs</a>
            <a role="menuitem" href="./contact.html">Contact</a>
            <a role="menuitem" href="./cgv.html">CGV</a>
            <a role="menuitem" href="./politique-confidentialite.html">Confidentialité</a>
          </div>
        </details>
      </div>
    </nav>

    <div class="dx-actions" id="headerRight">
      <a class="dxBtn dxBtnPrimary" id="loginCta" href="./offreur-login.html">S'identifier</a>
      <a class="dxBtn dxBtnGhost" id="accountLink" href="./offreur-compte.html" style="display:none;">Mon compte</a>
      <button class="dxBtn dxBtnGhost" id="logoutBtn" type="button" style="display:none;">Déconnexion</button>

      <button class="dxBurger" type="button" aria-label="Menu" aria-expanded="false">
        <span class="dxBurgerIcon" aria-hidden="true"></span>
        <span class="dxBurgerLabel" aria-hidden="true">MENU</span>
      </button>
    </div>
  </div>

  <div class="dxMobilePanel" hidden>
    <a class="dxMobileLink" href="./index.html">Accueil</a>
    <a class="dxMobileLink" href="./demande.html">Faire une demande</a>
    <a class="dxMobileLink" href="./mur-demandes.html">Mur des demandes</a>
    <a class="dxMobileLink" href="./offreurs.html">Les offreurs</a>

    <details class="dxMobilePlus">
      <summary class="dxMobileLink">Plus <span class="dx-caret" aria-hidden="true">▾</span></summary>
      <div class="dxMobilePlusMenu">
        <a class="dxMobileSubLink" href="./info-tarifs.html">Infos &amp; tarifs</a>
        <a class="dxMobileSubLink" href="./contact.html">Contact</a>
        <a class="dxMobileSubLink" href="./cgv.html">CGV</a>
        <a class="dxMobileSubLink" href="./politique-confidentialite.html">Confidentialité</a>
      </div>
    </details>

    <a class="dxBtn dxBtnPrimary dxBtnMobile" id="loginCtaMobile" href="./offreur-login.html">S'identifier</a>
    <a class="dxBtn dxBtnGhost dxBtnMobile" id="accountLinkMobile" href="./offreur-compte.html" style="display:none;">Mon compte</a>
    <button class="dxBtn dxBtnGhost dxBtnMobile" id="logoutMobileBtn" type="button" style="display:none;">Déconnexion</button>
  </div>
</header>`;
  }

  function fallbackInit(rootDoc) {
    const header = rootDoc.querySelector(".dxTopbar[data-dx-header]");
    if (!header) return;
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
      if (header.classList.contains("dx-open")) closeMenu(); else openMenu();
    }

    if (burger) burger.addEventListener("click", (e) => {
      e.preventDefault();
      toggleMenu();
    });

    // click dehors
    document.addEventListener("click", (e) => {
      if (!header.classList.contains("dx-open")) return;
      if (header.contains(e.target)) return;
      closeMenu();
    });

    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // fermeture après clic sur lien
    header.querySelectorAll(".dxMobilePanel a, .dxPlusMenu a").forEach(a => {
      a.addEventListener("click", () => {
        closeMenu();
        const d1 = header.querySelector(".dxPlus");
        const d2 = header.querySelector(".dxMobilePlus");
        if (d1) d1.open = false;
        if (d2) d2.open = false;
      });
    });
  }

  async function inject() {
    try {
      const mount = ensureMount();
      ensureCss();

      let html = "";
      try {
        const res = await fetch(HEADER_PARTIAL, { cache: "no-store" });
        if (res.ok) {
          html = await res.text();
          // si Netlify renvoie une page complète (doctype), on ignore et on fallback
          if (/<!doctype/i.test(html) || !/<header\s/i.test(html)) html = "";
        }
      } catch (e) {
        html = "";
      }

      if (!html) html = fallbackHeaderHtml();

      mount.innerHTML = html;

      await ensureScript();
      try {
        if (window.DXHeader && typeof window.DXHeader.init === "function") {
          window.DXHeader.init(document);
        }
      } catch (e) {}

      fallbackInit(document);

      // Auth header (si présent)
      // On préfère initHeader (bind logout + pill), sinon refreshHeader.
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