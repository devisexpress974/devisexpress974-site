(function () {
  function initHeader() {
    const burger = document.querySelector("[data-dx-burger]");
    const nav = document.querySelector("[data-dx-nav]");

    if (!burger || !nav) return;

    const html = document.documentElement;

    function closeNav() {
      nav.classList.remove("isOpen");
      burger.setAttribute("aria-expanded", "false");
      html.classList.remove("dxNavOpen");
    }

    function openNav() {
      nav.classList.add("isOpen");
      burger.setAttribute("aria-expanded", "true");
      html.classList.add("dxNavOpen");
    }

    function toggleNav() {
      if (nav.classList.contains("isOpen")) closeNav();
      else openNav();
    }

    burger.addEventListener("click", (e) => {
      e.preventDefault();
      toggleNav();
    });

    // clique sur un lien => ferme
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) closeNav();
    });

    // clic dehors => ferme
    document.addEventListener(
      "click",
      (e) => {
        if (nav.classList.contains("isOpen") && !nav.contains(e.target) && !burger.contains(e.target)) {
          closeNav();
        }
      },
      true
    );

    // ESC => ferme
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    // si on repasse en grand écran => ferme (menu mobile)
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 980) closeNav();
    });
  }

  // exposé pour dx-include-header.js (après injection)
  window.__dxInitHeader = initHeader;
})();
