/* Injecte /partials/header.html dans <header id="siteHeader"> (pages sans header statique). */
(async () => {
  const host = document.getElementById("siteHeader");
  if (!host) return;

  try {
    const res = await fetch("/partials/header.html", { cache: "no-store" });
    if (!res.ok) throw new Error("header fetch failed");
    host.innerHTML = await res.text();

    // Toggle mobile menu (si présent)
    const nav = document.getElementById("dxNav");
    const btn = document.getElementById("dxNavToggle");
    if (nav && btn) {
      btn.addEventListener("click", () => {
        nav.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", nav.classList.contains("is-open") ? "true" : "false");
      });
    }
  } catch (e) {
    // En dernier recours: ne pas casser la page si le header n'est pas chargé.
    console.warn("DX header not loaded:", e);
  }
})();
