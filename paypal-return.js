// paypal-return.js (PATCH55)
// Point de retour PayPal (Auto Return).
// - Récupère ?tx=... (ou txn_id)
// - Lit localStorage.dx_last_payment pour savoir vers quelle page renvoyer
// - Redirige vers paiement-ponctuel / paiement-pack en pré-remplissant tx

document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");
  const params = new URLSearchParams(location.search);

  function show(type, text) {
    if (!msg) return;
    msg.className = "notice " + (type || "");
    msg.textContent = text || "";
  }

  const tx = (params.get("tx") || params.get("txn_id") || "").trim();
  const st = (params.get("st") || params.get("payment_status") || "").trim();

  if (!tx) {
    show("err", "Aucune transaction PayPal détectée dans l’URL.");
    setTimeout(() => (location.href = "index.html"), 1200);
    return;
  }

  // (Optionnel) si PayPal renvoie un statut explicite de type "Canceled"
  if (st && /cancell?ed|annul/i.test(st)) {
    show("err", "Paiement annulé.");
    setTimeout(() => (location.href = "index.html"), 900);
    return;
  }

  let last = null;
  try {
    last = JSON.parse(localStorage.getItem("dx_last_payment") || "null");
  } catch (e) {}

  const type = last && last.type ? String(last.type) : "";
  const id = last && last.id ? String(last.id) : "";

  let target = "";
  if (type === "ponctuel") {
    if (id) target = "paiement-ponctuel.html?id=" + encodeURIComponent(id) + "&tx=" + encodeURIComponent(tx);
    else target = "paiement-ponctuel.html?tx=" + encodeURIComponent(tx);
  } else if (type === "pack") {
    if (id) target = "paiement-pack.html?id=" + encodeURIComponent(id) + "&tx=" + encodeURIComponent(tx);
    else target = "paiement-pack.html?tx=" + encodeURIComponent(tx);
  } else {
    // Fallback : on laisse l’utilisateur aller sur la page de mur (il pourra utiliser le bouton "J’ai payé" manuellement)
    target = "mur-demandes.html";
  }

  show("muted", "Redirection…");
  setTimeout(() => (location.href = target), 400);
});
