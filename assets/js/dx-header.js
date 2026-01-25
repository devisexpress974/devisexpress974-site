(function () {
  function currentFileName() {
    const p = window.location.pathname || "";
    let file = p.split("/").pop() || "";
    if (!file) file = "index.html";
    return file;
  }

  function setActiveLinks(root) {
    const file = currentFileName();

    const links = root.querySelectorAll("[data-path]");
    links.forEach((a) => a.classList.remove("is-active"));

    // active sur lien direct ou item menu
    links.forEach((a) => {
      const path = (a.getAttribute("data-path") || "").trim();
      if (path && path === file) a.classList.add("is-active");
    });

    // si un item du menu "Plus" est actif, on peut aussi marquer le bouton "Plus"
    const more = root.querySelector("[data-more]");
    if (more) {
      const activeInMore = more.querySelector(".dx-more-menu .is-active");
      const btn = more.querySelector(".dx-more-btn");
      if (btn) {
        if (activeInMore) btn.classList.add("is-active");
        else btn.classList.remove("is-active");
      }
    }
  }

  function closeMore(more) {
    if (!more) return;
    more.dataset.open = "0";
    const btn = more.querySelector(".dx-more-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function openMore(more) {
    if (!more) return;
    more.dataset.open = "1";
    const btn = more.querySelector(".dx-more-btn");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function toggleMore(more) {
    if (!more) return;
    const isOpen = more.dataset.open === "1";
    if (isOpen) closeMore(more);
    else openMore(more);
  }

  function setupDropdown(root) {
    const more = root.querySelector("[data-more]");
    if (!more) return;

    // état initial
    closeMore(more);

    const btn = more.querySelector(".dx-more-btn");
    const menu = more.querySelector(".dx-more-menu");

    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMore(more);
      });
    }

    // click sur un item => ferme
    if (menu) {
      menu.addEventListener("click", () => closeMore(more));
    }

    // click dehors => ferme
    document.addEventListener("click", (e) => {
      if (!more.contains(e.target)) closeMore(more);
    });

    // escape => ferme
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMore(more);
    });
  }

  function init() {
    const header = document.querySelector("[data-dx-header]");
    if (!header) return;

    setActiveLinks(header);
    setupDropdown(header);
  }

  // 1) si header déjà là
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 2) quand le header est injecté
  window.addEventListener("dx:headerReady", init);
})();
