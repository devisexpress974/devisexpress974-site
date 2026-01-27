(async function () {
  const slot = document.getElementById("dx-header-slot");
  if (!slot) return;

  try {
    const res = await fetch("/partials/header.html", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    slot.innerHTML = await res.text();
  } catch (e) {
    console.error("DX header load failed:", e);
    return;
  }

  // Active link (surbrillance de la page courante)
  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  slot.querySelectorAll("a.dx-link[href]").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === current) a.classList.add("active");
  });

  // Init comportements (burger + dropdown)
  if (typeof window.__dxInitHeader === "function") {
    window.__dxInitHeader(slot);
  }
})();
