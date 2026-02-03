// dx.js — helpers DevisExpress974 (Patch2 Option B)
(() => {
  window.DX_PAYPAL = window.DX_PAYPAL || {};
  if (typeof window.DX_PAYPAL.getLink !== "function") {
    window.DX_PAYPAL.getLink = function (key) {
      key = (key || "").toString().toLowerCase().trim();
      if (key === "pack") key = "pack10";
      if (key === "abo") key = "abonnement";
      const cfg = window.DX_PAYPAL[key];
      if (!cfg) return "";
      return cfg.directLink || cfg.subscribeUrl || "";
    };
  }
  window.DX_UTIL = window.DX_UTIL || {};
  window.DX_UTIL.getDemandeId = function () {
    try {
      const q = new URLSearchParams(location.search);
      return q.get("id") || q.get("demandeId") || "";
    } catch { return ""; }
  };
})();
