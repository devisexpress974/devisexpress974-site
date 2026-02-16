// DX HEADER v39 (auth single button)
(function () {
  function q(root, sel){ try { return root.querySelector(sel); } catch(e){ return null; } }
  function qa(root, sel){ try { return root.querySelectorAll(sel); } catch(e){ return []; } }

  function setActiveLinks(root) {
    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var links = qa(root, "a.dx-navLink, a.dxMobileLink");
    for (var i=0;i<links.length;i++){ links[i].classList.remove("is-active"); }
    for (var j=0;j<links.length;j++){
      var a = links[j];
      var href = (a.getAttribute("href") || "").toLowerCase();
      var file = href.split("/").pop();
      if(!file) continue;
      if(file === path) a.classList.add("is-active");
      if(path === "" && file === "index.html") a.classList.add("is-active");
    }
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
      // Profile link visible only if authed
      if(profileMenu) profileMenu.style.display = isAuthed ? "" : "none";
      if(profileMenuMobile) profileMenuMobile.style.display = isAuthed ? "" : "none";

      // Single button toggles between login/logout
      function setup(btn){
        if(!btn) return;
        if(isAuthed){
          btn.textContent = "Se déconnecter";
          btn.setAttribute("href", "#");
          btn.onclick = function(ev){
            if(ev && ev.preventDefault) ev.preventDefault();
            clearToken();
            // reload to update UI
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

    // Optional server verification (doesn't change UI if API absent)
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
        header.classList.remove("dx-open"); // compat ancienne CSS
      }
    }
    function open(){
      if(panel.hasAttribute("hidden")){
        panel.removeAttribute("hidden");
        burger.setAttribute("aria-expanded","true");
        header.classList.add("dx-open"); // compat ancienne CSS
      }
    }

    burger.addEventListener("click", function(){
      var isOpen = !panel.hasAttribute("hidden");
      if(isOpen) close(); else open();
    });

    // Close when clicking outside header
    document.addEventListener("click", function(e){
      if(panel.hasAttribute("hidden")) return;
      if(header.contains(e.target)) return;
      close();
    });

    // Close after clicking a link inside the panel (mobile UX)
    panel.addEventListener("click", function(e){
      var t = e.target;
      if(!t) return;
      // if click on link or inside link
      var a = t.closest ? t.closest("a") : null;
      if(a) close();
    });
  }

    });
    document.addEventListener("click", function(e){
      if(panel.hasAttribute("hidden")) return;
      if(header.contains(e.target)) return;
      panel.setAttribute("hidden","");
      burger.setAttribute("aria-expanded","false");
    });
  }

  function init(){
    var header = document.querySelector("[data-dx-header]");
    if(!header) return;
    setActiveLinks(header);
    initBurger(header);
    renderAuthState(header);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
