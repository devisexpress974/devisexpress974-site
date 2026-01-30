(() => {
  function setActiveTab() {
    const path = (location.pathname || "").toLowerCase();
    const file = path.endsWith("/") ? "/index.html" : path;

    document.querySelectorAll(".dx-tabs a[data-path]").forEach(a => {
      const target = (a.getAttribute("data-path") || "").toLowerCase();
      // target est du style "/mur-demandes.html"
      const isActive =
        file.endsWith(target) ||
        (target === "/index.html" && (file === "/" || file.endsWith("/index.html")));

      a.classList.toggle("active", !!isActive);
    });
  }

  function setupMoreMenu() {
    const wrap = document.querySelector("[data-more]");
    if (!wrap) return;

    const btn = wrap.querySelector(".dx-more-btn");
    const menu = wrap.querySelector(".dx-more-menu");
    if (!btn || !menu) return;

    function close() {
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }

    function toggle() {
      const open = !wrap.classList.contains("open");
      wrap.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });

    // clic dehors = ferme
    document.addEventListener("click", () => close());

    // ESC = ferme
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    // clic dans le menu = laisse naviguer, mais ferme visuellement
    menu.addEventListener("click", () => close());
  }

  function init() {
    setActiveTab();
    setupMoreMenu();
  }

  window.addEventListener("dx:headerReady", init);
  // au cas où le header serait déjà là
  document.addEventListener("DOMContentLoaded", () => {
    // si le header est déjà injecté, init direct
    if (document.querySelector(".dx-header")) init();
  });
})();
