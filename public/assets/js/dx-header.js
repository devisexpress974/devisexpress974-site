// DX HEADER v38
(function () {
  function setActiveLinks(root) {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    const allLinks = root.querySelectorAll("a.dx-navLink, a.dxMobileLink");
    allLinks.forEach(a => a.classList.remove("is-active"));

    allLinks.forEach(a => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      const file = href.split("/").pop();
      if (!file) return;
      if (file === path) a.classList.add("is-active");
      if (path === "" && file === "index.html") a.classList.add("is-active");
    });
  }

  function init(rootDoc) {
    const header = rootDoc.querySelector(".dxTopbar[data-dx-header]");
    if (!header) return;

    // évite les doubles init (dx-include-header + auto init)
    if (header.dataset.dxInit === "1") return;
    header.dataset.dxInit = "1";

    // expose la hauteur du header pour positionner le menu mobile
    try {
      document.documentElement.style.setProperty("--dxTopbarH", header.getBoundingClientRect().height + "px");
    } catch(e) {}

    const burger = header.querySelector(".dxBurger");
    const panel = header.querySelector(".dxMobilePanel");

    // safety
    if (panel) panel.hidden = true;

    setActiveLinks(rootDoc);

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
      if (isOpen) closeMenu();
      else openMenu();
    }

    if (burger) {
      burger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      });
    }

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!header.classList.contains("dx-open")) return;
      if (!header.contains(e.target)) closeMenu();
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // If resizing to desktop, close panel
    window.addEventListener("resize", () => {
      try { document.documentElement.style.setProperty("--dxTopbarH", header.getBoundingClientRect().height + "px"); } catch(e) {}
      if (window.innerWidth > 980) closeMenu();
    });


    // Close dropdowns when clicking outside
    document.addEventListener("click", (ev) => {
      const t = ev.target;
      const d1 = header.querySelector(".dxPlus");
      const d2 = header.querySelector(".dxMobilePlus");
      if (d1 && d1.open && !d1.contains(t)) d1.open = false;
      if (d2 && d2.open && !d2.contains(t)) d2.open = false;
    });

    // Make <details> dropdown nicer: close on link click
    header.querySelectorAll(".dxPlusMenu a, .dxMobilePlusMenu a").forEach(a => {
      a.addEventListener("click", () => {
        closeMenu();
        const d1 = header.querySelector(".dxPlus");
        const d2 = header.querySelector(".dxMobilePlus");
        if (d1) d1.open = false;
        if (d2) d2.open = false;
      });
    });
  }

  window.DXHeader = { init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(document));
  } else {
    init(document);
  }
})();

// DX HEADER AUTH LITE v1 — affiche l'état connecté + bouton déconnexion même sans auth.js
    (function(){
      function safeGetToken(){
        try { return localStorage.getItem("dx_token") || ""; } catch(e){ return ""; }
      }
      function clearToken(){
        try { localStorage.removeItem("dx_token"); } catch(e){}
      }
      function $(id){ return document.getElementById(id); }
      function truncateEmail(email){
        email = String(email||"").trim();
        if(!email) return "Offreur";
        if(email.length <= 22) return email;
        const at = email.indexOf("@");
        if(at > 2){
          const left = email.slice(0, Math.min(6, at));
          const right = email.slice(at);
          return left + "…" + right;
        }
        return email.slice(0, 10) + "…";
      }

      function removePill(){
        const pill = $("userPill");
        if(pill) pill.remove();
      }

      function setLoggedOut(){
        const loginCta = $("loginCta");
        const logoutBtn = $("logoutBtn");
        const accountLink = $("accountLink");
        const loginCtaMobile = $("loginCtaMobile");
        const accountLinkMobile = $("accountLinkMobile");
        const logoutMobileBtn = $("logoutMobileBtn");

        if(loginCta){ loginCta.style.display = ""; loginCta.textContent = "Se connecter"; }
        if(logoutBtn) logoutBtn.style.display = "none";
        if(accountLink) accountLink.style.display = "none";

        if(loginCtaMobile){ loginCtaMobile.style.display = ""; loginCtaMobile.textContent = "Se connecter"; }
        if(accountLinkMobile) accountLinkMobile.style.display = "none";
        if(logoutMobileBtn) logoutMobileBtn.style.display = "none";

        removePill();
      }

      function setLoggedIn(info){
        const loginCta = $("loginCta");
        const logoutBtn = $("logoutBtn");
        const accountLink = $("accountLink");
        const headerRight = $("headerRight");
        const loginCtaMobile = $("loginCtaMobile");
        const accountLinkMobile = $("accountLinkMobile");
        const logoutMobileBtn = $("logoutMobileBtn");

        if(loginCta) loginCta.style.display = "none";
        if(logoutBtn) logoutBtn.style.display = "";
        if(accountLink) accountLink.style.display = "";
        if(loginCtaMobile) loginCtaMobile.style.display = "none";
        if(accountLinkMobile) accountLinkMobile.style.display = "";
        if(logoutMobileBtn) logoutMobileBtn.style.display = "";

        // pill
        if(headerRight && !$("userPill")){
          const pill = document.createElement("div");
          pill.className = "userPill";
          pill.id = "userPill";
          const label = truncateEmail(info && (info.email || info.userEmail));
          const credits = (info && (info.credits !== undefined)) ? Number(info.credits) : null;
          pill.innerHTML = '<span class="userDot"></span><span></span><span class="userMeta"></span>';
          pill.querySelector("span:nth-child(2)").textContent = label;
          pill.querySelector(".userMeta").textContent = (credits !== null && isFinite(credits)) ? (credits + " crédit(s)") : "Connecté";
          headerRight.insertBefore(pill, headerRight.firstChild);
        }
      }

      function bindLogout(){
        const btns = [ $("logoutBtn"), $("logoutMobileBtn") ].filter(Boolean);
        btns.forEach(btn => {
          if(btn.__dxBound) return;
          btn.__dxBound = true;
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            const original = btn.textContent;
            btn.textContent = "Déconnexion…";
            // informe backend si possible (sinon on clear local)
            try{
              const token = safeGetToken();
              if(token && window.DX_API && typeof window.DX_API.postAny === "function"){
                await window.DX_API.postAny(["logout","logoutOffreur"], {});
              }
            }catch(e){}
            clearToken();
            setLoggedOut();
            try{ window.location.reload(); }catch(e){}
            btn.disabled = false;
            btn.textContent = original;
          });
        });
      }

      async function refresh(){
        const token = safeGetToken();
        if(!token){ setLoggedOut(); return; }
        // show logged-in quickly
        setLoggedIn({ email:"", credits:null });

        // fetch whoami if possible
        const start = Date.now();
        while(!(window.DX_API && typeof window.DX_API.getAny === "function") && (Date.now()-start) < 2500){
          await new Promise(r => setTimeout(r, 80));
        }
        if(window.DX_API && typeof window.DX_API.getAny === "function"){
          try{
            const res = await window.DX_API.getAny(["whoami","me"], { token });
            if(res && res.ok && res.data){
              setLoggedIn(res.data);
              return;
            }
          }catch(e){}
        }
        // if whoami fails, keep token-based state
        setLoggedIn({ email:"", credits:null });
      }

      function waitForHeader(){
        // header injected by dx-include-header.js
        if(!$("headerRight") || (!$("loginCta") && !$("logoutBtn"))){
          setTimeout(waitForHeader, 60);
          return;
        }
        bindLogout();
        refresh();
      }

      if(document.readyState === "loading"){
        document.addEventListener("DOMContentLoaded", waitForHeader);
      } else {
        waitForHeader();
      }
    })();
