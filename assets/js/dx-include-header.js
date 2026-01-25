// Injecte partials/header.html dans <div id="dx-header"></div>
(async function () {
  try {
    const target = document.getElementById("dx-header");
    if (!target) return;

    // évite double injection
    if (target.dataset.dxInjected === "1") return;
    target.dataset.dxInjected = "1";

    // Chemin robuste (marche sur toutes les pages du site)
    const res = await fetch("/partials/header.html", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    target.innerHTML = await res.text();

    // signal "header prêt"
    window.dispatchEvent(new Event("dx:headerReady"));
  } catch (err) {
    console.error("[DX] Header inject error:", err);
    alert("DX Header : erreur d’injection. Vérifie /partials/header.html");
  }
})();
