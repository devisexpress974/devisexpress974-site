// DX HEADER v40.1 — stable init (post-inject) + burger via [hidden]
(function () {
  "use strict";

  function q(root, sel){ try { return root.querySelector(sel); } catch(e){ return null; } }
  function qa(root, sel){ try { return Array.prototype.slice.call(root.querySelectorAll(sel)); } catch(e){ return []; } }

  function normPath(href){
    if(!href) return "";
    // remove query/hash
    href = href.split("#")[0].split("?")[0];
    // keep last segment
    var parts = href.split("/");
    return (parts[parts.length-1] || "").toLowerCase();
  }

  function setActiveLinks(header) {
    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var links = qa(header, "a.dx-navLink, a.dxMobileLink");
    links.forEach(function(a){ a.classList.remove("is-active"); });
    links.forEach(function(a){
      var dp = (a.getAttribute("data-path") || "").toLowerCase();
      var href = normPath(a.getAttribute("href") || "");
      // match by data-path (preferred) or by filename
      if ((dp && dp.endsWith("/"+path)) || (href && href === path)) {
        a.classList.add("is-active");
      }
    });
  }

  function getToken(){
    try { return localStorage.getItem("dx_token") || ""; } catch(e){ return ""; }
  }
  function clearToken(){
    try { localStorage.removeItem("dx_token"); } catch(e){}
  }

  function renderAuthState(header){
    var authBtn = q(header, "#authBtn");
    var authBtnMobile = q(header, "#authBtnMobile");
    var profileMenu = q(header, "#dxProfileMenu");
    var profileMenuMobile = q(header, "#dxProfileMenuMobile");

    function applyState(isAuthed){
      if(profileMenu) profileMenu.style.display = isAuthed ? "" : "none";
      if(profileMenuMobile) profileMenuMobile.style.display = isAuthed ? "" : "none";

      function setup(btn){
        if(!btn) return;
        if(isAuthed){
          btn.textContent = "Se déconnecter";
          btn.setAttribute("href", "#");
          btn.onclick = function(ev){
            if(ev && ev.preventDefault) ev.preventDefault();
            clearToken();
            try { location.href = "./index.html"; } catch(e){ location.reload(); }
            return false;
          };
        } else {
          btn.textContent = "Se connecter";
          btn.setAttribute("href", "./offreur-login.html");
          btn.onclick = null;
        }
      }
      setup(authBtn);
      setup(authBtnMobile);
    }

    var token = getToken();
    applyState(!!token);

    if(token && window.DX_AUTH && typeof window.DX_AUTH.whoami === "function"){
      window.DX_AUTH.whoami().then(function(res){
        if(!res || !res.ok){
          clearToken();
          applyState(false);
        }
      }).catch(function(){});
    }
  }

  function initBurger(header){
    var burger = q(header, ".dxBurger");
    var panel = q(header, ".dxMobilePanel");
    if(!burger || !panel) return;

    function syncTopbarH(){
      try {
        var h = Math.round(header.getBoundingClientRect().height);
        header.style.setProperty("--dxTopbarH", h + "px");
      } catch(e){}
    }
    syncTopbarH();
    window.addEventListener("resize", syncTopbarH);

    function close(){
      if(!panel.hasAttribute("hidden")){
        panel.setAttribute("hidden","");
        burger.setAttribute("aria-expanded","false");
        header.classList.remove("dx-open"); // backward compat
      }
    }
    function open(){
      if(panel.hasAttribute("hidden")){
        panel.removeAttribute("hidden");
        burger.setAttribute("aria-expanded","true");
        header.classList.add("dx-open"); // backward compat
      }
    }

    burger.addEventListener("click", function(e){
      if(e && e.preventDefault) e.preventDefault();
      var isOpen = !panel.hasAttribute("hidden");
      if(isOpen) close(); else open();
    });

    document.addEventListener("click", function(e){
      if(panel.hasAttribute("hidden")) return;
      if(header.contains(e.target)) return;
      close();
    });

    panel.addEventListener("click", function(e){
      var t = e.target;
      if(!t) return;
      var a = t.closest ? t.closest("a") : null;
      if(a) close();
    });
  }

  function initHeader(header){
    if(!header || header.dataset.dxInit === "1") return;
    header.dataset.dxInit = "1";
    setActiveLinks(header);
    renderAuthState(header);
    initBurger(header);
  }

  function boot(){
    var header = document.querySelector('header[data-dx-header]');
    if(header) initHeader(header);

    // Observe injected header changes (dx-include-header replaces innerHTML)
    var mount = document.getElementById("dx-header-slot");
    if(!mount) return;
    try {
      var obs = new MutationObserver(function(){
        var h = mount.querySelector('header[data-dx-header]');
        if(h) initHeader(h);
      });
      obs.observe(mount, { childList: true, subtree: true });
    } catch(e){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();