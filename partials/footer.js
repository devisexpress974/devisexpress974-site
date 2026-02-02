/* Injecte /partials/footer.html dans <footer id="siteFooter"> */
(async () => {
  const host = document.getElementById("siteFooter");
  if (!host) return;

  try {
    const res = await fetch("/partials/footer.html", { cache: "no-store" });
    if (!res.ok) throw new Error("footer fetch failed");
    host.innerHTML = await res.text();
  } catch (e) {
    console.warn("DX footer not loaded:", e);
  }
})();
