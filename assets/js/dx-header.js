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
