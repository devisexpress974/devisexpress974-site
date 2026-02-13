// main.js — comportements globaux (menu, année footer, lien actif)

(function () {
  // Année dans le footer
  try {
    var y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  } catch (e) {}

  // Lien actif dans le menu
  try {
    var path = (location.pathname || "").split("/").pop() || "index.html";
    document.querySelectorAll(".topNav .navLink").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (!href) return;
      if (href === path) a.classList.add("active");
    });
  } catch (e) {}

  // Menu mobile (3 traits)
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");

  if (toggle && nav) {
    var openClass = "navOpen";

    function setExpanded(isOpen) {
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function isOpen() {
      return document.body.classList.contains(openClass);
    }

    function open() {
      document.body.classList.add(openClass);
      setExpanded(true);
    }

    function close() {
      document.body.classList.remove(openClass);
      setExpanded(false);
    }

    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (isOpen()) close();
      else open();
    });

    // Fermer au clic sur un lien
    nav.addEventListener("click", function (e) {
      var t = e.target;
      if (!t) return;
      if (t.closest && t.closest("a")) close();
    });

    // Fermer clic à l'extérieur
    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      var t = e.target;
      if (toggle.contains(t)) return;
      if (nav.contains(t)) return;
      close();
    });

    // Fermer ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    // Si on repasse en desktop, on ferme
    window.addEventListener("resize", function () {
      if (window.innerWidth > 980) close();
    });

    // Valeur initiale
    setExpanded(false);
  }
})();

// Password show/hide (eye) — compatible mobile
(function () {
  function init(){
    document.querySelectorAll('[data-pw-toggle="1"]').forEach(function(btn){
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      var targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      var input = document.getElementById(targetId);
      if (!input) return;

      btn.addEventListener('click', function(){
        var on = (input.type === 'text');
        input.type = on ? 'password' : 'text';
        btn.setAttribute('data-state', on ? 'off' : 'on');
        btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
