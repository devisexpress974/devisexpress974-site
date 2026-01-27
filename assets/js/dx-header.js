(function () {
  let bound = false;

  window.__dxInitHeader = function (scopeEl) {
    const root = scopeEl || document;

    const burger = root.querySelector("[data-dx-burger]");
    const nav = root.querySelector("[data-dx-nav]");
    const moreBtn = root.querySelector("[data-dx-more-btn]");
    const moreMenu = root.querySelector("[data-dx-more-menu]");

    const closeMore = () => {
      if (moreBtn) moreBtn.setAttribute("aria-expanded", "false");
      if (moreMenu) moreMenu.classList.remove("open");
    };

    const closeNav = () => {
      document.body.classList.remove("navOpen");
      if (burger) burger.setAttribute("aria-expanded", "false");
      closeMore();
    };

    if (burger && nav) {
      burger.addEventListener("click", () => {
        const open = !document.body.classList.contains("navOpen");
        document.body.classList.toggle("navOpen", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        if (!open) closeMore();
      });
    }

    if (moreBtn && moreMenu) {
      moreBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const open = !moreMenu.classList.contains("open");
        moreMenu.classList.toggle("open", open);
        moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });

      moreMenu.addEventListener("click", (e) => e.stopPropagation());
    }

    // Évite de binder 50 fois si tu réinjectes (sécurité)
    if (!bound) {
      bound = true;

      document.addEventListener("click", () => {
        closeNav();
      });

      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") closeNav();
      });

      // Empêche le clic dans le header de fermer tout
      document.addEventListener("click", (e) => {
        const header = document.querySelector(".dx-header");
        if (header && header.contains(e.target)) {
          // si clic dans header, on ne ferme pas le menu global automatiquement
          e.stopPropagation();
        }
      }, true);
    }
  };
})();
