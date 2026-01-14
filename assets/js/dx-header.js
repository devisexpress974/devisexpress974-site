(function(){
  function initHeader(){
    const burger = document.querySelector("[data-dx-burger]");
    const nav = document.querySelector("[data-dx-nav]");
    if(!burger || !nav) return;

    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      const clickedInside = nav.contains(e.target) || burger.contains(e.target);
      if (!clickedInside) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  window.__dxInitHeader = initHeader;
})();
