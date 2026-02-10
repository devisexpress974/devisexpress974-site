// paiement-ponctuel.js (PATCH55 - retour PayPal + auto-confirm si tx présent)
// - Enregistre le contexte avant départ PayPal (localStorage dx_last_payment)
// - Si PayPal renvoie ?tx=..., on confirme automatiquement (sans prompt) tout en gardant le bouton "J’ai payé"

document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");
  const params = new URLSearchParams(location.search);
  const nextRaw = String(params.get("next") || "").trim();
  const safeNext = (n) => {
    n = String(n||"").trim();
    if(!n) return "";
    if(/^https?:/i.test(n) || n.includes('://')) return "";
    return n;
  };
  const next = safeNext(nextRaw);


  const btnUnlock = document.getElementById("btnPaid") || document.getElementById("btnUnlock");
  const id = (params.get("id") || params.get("demandeId") || "").trim();
  const txFromUrl = (params.get("tx") || params.get("txn_id") || "").trim();

  const btnPay = document.getElementById("btnPay");
  const paypalLink = document.getElementById("paypalLink");
  const ppMissing = document.getElementById("ppMissing");

  function show(type, text) {
    if (!msg) return;
    msg.style.display = "block";
    msg.className = "notice " + (type || "");
    msg.textContent = text || "";
  }

  function rememberPaymentContext() {
    try {
      localStorage.setItem("dx_last_payment", JSON.stringify({
        type: "ponctuel",
        id: id || "",
        ts: Date.now()
      }));
    } catch (e) {}
  }

  // Connexion requise (offreur)
  const token = localStorage.getItem("dx_token") || "";
  if (!token) {
    const next = "paiement-ponctuel.html?id=" + encodeURIComponent(id);
    location.href = "offreur-login.html?next=" + encodeURIComponent(next);
    return;
  }

  // Lien PayPal (0,99)
  const link =
    window.DX_PAYPAL && typeof window.DX_PAYPAL.getLink === "function"
      ? (window.DX_PAYPAL.getLink("ponctuel") || "")
      : "";

  if (!link) {
    if (ppMissing) ppMissing.style.display = "block";
    if (btnPay) btnPay.style.display = "none";
    if (paypalLink) paypalLink.style.display = "none";
  } else {
    if (ppMissing) ppMissing.style.display = "none";
    if (btnPay) {
      btnPay.style.display = "";
      btnPay.href = link;
      btnPay.addEventListener("click", rememberPaymentContext);
    }
    if (paypalLink) {
      paypalLink.style.display = "";
      paypalLink.href = link;
      paypalLink.addEventListener("click", rememberPaymentContext);
    }
  }

  if (!btnUnlock) {
    show("err", "Bouton de déblocage introuvable sur la page.");
    return;
  }

  const originalBtnText = btnUnlock.textContent || "J’ai payé, débloque";

  let inProgress = false;

  async function confirmWithTx(tx) {
    if (inProgress) return;
    inProgress = true;

    btnUnlock.disabled = true;
    btnUnlock.textContent = "Déblocage…";
    show("muted", "Vérification du paiement…");

    try {
      const cleanTx = String(tx || "").trim();
      if (!cleanTx) {
        btnUnlock.disabled = false;
        btnUnlock.textContent = originalBtnText;
        inProgress = false;
        return show("err", "Transaction PayPal manquante.");
      }
      if (!id) {
        btnUnlock.disabled = false;
        btnUnlock.textContent = originalBtnText;
        inProgress = false;
        return show("err", "Identifiant de demande manquant.");
      }

      const res = await window.DX_API.post("confirmPayPalPayment", {
        tx: cleanTx,
        product: "ponctuel",
        demandeId: id
      });

      if (res && res.ok) {
        show("ok", "Paiement confirmé ✅ Accès débloqué.");
        try { localStorage.removeItem("dx_last_payment"); } catch (e) {}
        setTimeout(() => (location.href = "demande-detail.html?id=" + encodeURIComponent(id)), 450);
        return;
      }

      btnUnlock.disabled = false;
      btnUnlock.textContent = originalBtnText;
      inProgress = false;
      var errMsg = (res && (res.error || res.message)) ? (res.error || res.message) : "Impossible.";
      // Si le PDT token n'est pas configuré, on peut (optionnel) confirmer en mode manuel.
      if(/Paiement non configuré|PDT_TOKEN|RECEIVER/i.test(String(errMsg))){
        show("warn", errMsg);
        var go = window.confirm("Validation PayPal automatique non configurée.\n\nSi tu as BIEN payé, tu peux tenter une confirmation MANUELLE (moins sécurisée).\n\nContinuer ?");
        if(go){
          try{
            var res2 = await window.DX_API.post("confirmPayPalPayment", { tx: cleanTx, product: "ponctuel", demandeId: id, force: true });
            if(res2 && res2.ok){
              show("ok", "Paiement confirmé (manuel).");
              setTimeout(function(){ location.href = (next || ("mur-demandes.html?open=" + encodeURIComponent(id) + "&paid=1")); }, 800);
              return;
            }
            show("err", (res2 && (res2.error || res2.message)) ? (res2.error || res2.message) : "Confirmation manuelle impossible.");
          }catch(e2){
            show("err", "Erreur réseau (confirmation manuelle).");
          }
        }
        return;
      }
      show("err", errMsg);
    } catch (e) {
      btnUnlock.disabled = false;
      btnUnlock.textContent = originalBtnText;
      inProgress = false;
      show("err", e && e.message ? e.message : String(e));
    }
  }

  btnUnlock.addEventListener("click", async () => {
    const tx = (txFromUrl || window.prompt("Colle l’ID de transaction PayPal (tx) puis OK :") || "").trim();
    await confirmWithTx(tx);
  });

  // Auto-confirm si PayPal a renvoyé tx dans l'URL
  if (txFromUrl) {
    // Petit délai pour laisser la page afficher son état
    setTimeout(() => { confirmWithTx(txFromUrl); }, 250);
  }
});
