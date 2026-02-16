// DX INCLUDE HEADER v41 (cache-bust + header partial)
(function () {
  // cache-bust cohérent
  var V = "assumed23";
  var B = "assumed23";
  var HEADER_PARTIAL = "./partials/header.html?v=" + V + "&b=" + B;
  var CSS_FILE = "./assets/css/dx-header.css?v=" + V + "&b=" + B;
  var JS_FILE = "./assets/js/dx-header.js?v=" + V + "&b=" + B;

  function ensureMount() {
    var mount = document.getElementById("dx-header-slot") ||
                document.getElementById("siteHeader") ||
                document.getElementById("dxHeader");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "dx-header-slot";
      document.body.insertAdjacentElement("afterbegin", mount);
    }
    return mount;
  }

  function ensureCss() {
    if (document.getElementById("dx-header-css")) return;
    var link = document.createElement("link");
    link.id = "dx-header-css";
    link.rel = "stylesheet";
    link.href = CSS_FILE;
    document.head.appendChild(link);
  }

  function ensureScript(cb) {
    if (document.getElementById("dx-header-js")) return cb();
    var s = document.createElement("script");
    s.id = "dx-header-js";
    s.src = JS_FILE;
    s.defer = true;
    s.onload = function () { cb(); };
    s.onerror = function () { cb(); };
    document.head.appendChild(s);
  }

  function fallbackHeaderHtml() {
    return '' +
'<header class="dxTopbar" data-dx-header>' +
'  <div class="dx-header-inner">' +
'    <a class="dx-brand" href="./index.html" aria-label="DevisExpress974 - Accueil">' +
'      <img class="dx-logo" src="./assets/img/logo-eclair-orange.png" alt="Logo DevisExpress974" />' +
'      <span class="dx-brandText">' +
'        <span class="dx-title">DevisExpress974</span>' +
'        <span class="dx-tagline">1 demande • plusieurs réponses • 100% 974</span>' +
'      </span>' +
'    </a>' +
'    <nav class="dx-navWrap" aria-label="Navigation principale">' +
'      <div class="dx-navPills">' +
'        <a class="dx-navLink" href="./index.html">Accueil</a>' +
'        <a class="dx-navLink" href="./demande.html">Publier une demande</a>' +
'        <a class="dx-navLink" href="./mur-demandes.html">Demandes</a>' +
'        <a class="dx-navLink" href="./offreurs.html">Offreurs</a>' +
'        <details class="dxPlus" role="list">' +
'          <summary class="dx-navLink dx-navLink--summary" role="listitem" aria-haspopup="menu">Plus <span class="dx-caret" aria-hidden="true">▾</span></summary>' +
'          <div class="dxPlusMenu" role="menu">' +
'            <a role="menuitem" href="./metiers.html">Métiers (A→Z)</a>' +
'            <a role="menuitem" href="./offreur-compte.html" id="dxProfileMenu" style="display:none;">Mon profil</a>' +
'            <a role="menuitem" href="./info-tarifs.html">Tarifs & abonnements</a>' +
'            <a role="menuitem" href="./contact.html">Contact</a>' +
'          </div>' +
'        </details>' +
'      </div>' +
'    </nav>' +
'    <div class="dx-actions" id="headerRight">' +
'      <a class="dxBtn dxBtnPrimary" id="authBtn" href="./offreur-login.html">Se connecter</a>' +
'      <button class="dxBurger" type="button" aria-label="Menu" aria-expanded="false">' +
'        <span class="dxBurgerIcon" aria-hidden="true"></span>' +
'        <span class="dxBurgerLabel" aria-hidden="true">MENU</span>' +
'      </button>' +
'    </div>' +
'  </div>' +
'  <div class="dxMobilePanel" hidden>' +
'    <a class="dxMobileLink" href="./index.html">Accueil</a>' +
'    <a class="dxMobileLink" href="./demande.html">Publier une demande</a>' +
'    <a class="dxMobileLink" href="./mur-demandes.html">Demandes</a>' +
'    <a class="dxMobileLink" href="./offreurs.html">Offreurs</a>' +
'    <details class="dxMobilePlus">' +
'      <summary class="dxMobileLink">Plus <span class="dx-caret" aria-hidden="true">▾</span></summary>' +
'      <div class="dxMobilePlusMenu">' +
'        <a class="dxMobileSubLink" href="./repondre-demandes.html">Répondre à des demandes</a>' +
'        <a class="dxMobileSubLink" href="./metiers.html">Lexique métiers (A→Z)</a>' +
'        <a class="dxMobileSubLink" href="./info-tarifs.html">Infos &amp; tarifs</a>' +
'        <a class="dxMobileSubLink" href="./mentions-legales.html">Mentions légales</a>' +
'        <a class="dxMobileSubLink" href="./cgv.html">CGV</a>' +
'        <a class="dxMobileSubLink" href="./politique-confidentialite.html">Confidentialité</a>' +
'        <a class="dxMobileSubLink" href="./contact.html">Contact</a>' +
'      </div>' +
'    </details>' +
'    <a class="dxBtn dxBtnPrimary dxBtnMobile" id="authBtnMobile" href="./offreur-login.html">Se connecter</a>' +
'  </div>' +
'</header>';
  }

  function inject(html) {
    var mount = ensureMount();
    mount.innerHTML = html;
    ensureCss();
    ensureScript(function(){});
  }

  function start() {
    ensureCss();
    var mount = ensureMount();
    fetch(HEADER_PARTIAL, { cache: "no-store" })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then(function (html) { inject(html); })
      .catch(function () { inject(fallbackHeaderHtml()); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
