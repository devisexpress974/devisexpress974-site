// paiement-pack.js (PATCH55 - retour PayPal + auto-confirm si tx présent)
// - Enregistre le contexte avant départ PayPal (localStorage dx_last_payment)
// - Si PayPal renvoie ?tx=..., on confirme automatiquement (sans prompt) tout en gardant le bouton "J’ai payé"

document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");
  const params = new URLSearchParams(location.search);

  const id = (params.get("id") || params.get("demandeId") || "").trim();
  const txFromUrl = (params.get("tx") || params.get("txn_id") || "").trim();

  const btnPaid = document.getElementById("btnPaid");
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
        type: "pack",
        id: id || "",
        ts: Date.now()
      }));
    } catch (e) {}
  }

  // Connexion requise (offreur)
  const token = localStorage.getItem("dx_token") || "";
  const nextUrl = "paiement-pack.html" + (location.search || "");
  if (!token) {
    location.href = "offreur-login.html?next=" + encodeURIComponent(nextUrl);
    return;
  }

  // Lien PayPal (Pack 10 déblocages)
  const link =
    window.DX_PAYPAL && typeof window.DX_PAYPAL.getLink === "function"
      ? (window.DX_PAYPAL.getLink("pack") || "")
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

  if (!btnPaid) {
    show("err", "Bouton de confirmation (btnPaid) introuvable sur la page.");
    return;
  }

  const originalBtnText = btnPaid.textContent || "J’ai payé, activer le pack";
  let inProgress = false;

  async function confirmWithTx(tx) {
    if (inProgress) return;
    inProgress = true;

    btnPaid.disabled = true;
    btnPaid.textContent = "Activation…";
    show("muted", "Vérification du paiement…");

    try {
      const cleanTx = String(tx || "").trim();
      if (!cleanTx) {
        btnPaid.disabled = false;
        btnPaid.textContent = originalBtnText;
        inProgress = false;
        return show("err", "Transaction PayPal manquante.");
      }

      const payload = { tx: cleanTx, product: "pack" };
      if (id) payload.demandeId = id;

      const res = await window.DX_API.post("confirmPayPalPayment", payload);

      if (res && res.ok) {
        show("ok", "Paiement confirmé ✅ Pack activé.");
        try { localStorage.removeItem("dx_last_payment"); } catch (e) {}

        // Si on venait d'une demande, on retourne au détail (l'offreur pourra débloquer avec ses crédits)
        if (id) setTimeout(() => (location.href = "demande-detail.html?id=" + encodeURIComponent(id)), 450);
        else setTimeout(() => (location.href = "mur-demandes.html"), 450);
        return;
      }

      btnPaid.disabled = false;
      btnPaid.textContent = originalBtnText;
      inProgress = false;
      show("err", (res && (res.error || res.message)) ? (res.error || res.message) : "Impossible.");
    } catch (e) {
      btnPaid.disabled = false;
      btnPaid.textContent = originalBtnText;
      inProgress = false;
      show("err", e && e.message ? e.message : String(e));
    }
  }

  btnPaid.addEventListener("click", async () => {
    const tx = (txFromUrl || window.prompt("Colle l’ID de transaction PayPal (tx) puis OK :") || "").trim();
    await confirmWithTx(tx);
  });

  // Auto-confirm si PayPal a renvoyé tx dans l'URL
  if (txFromUrl) {
    setTimeout(() => { confirmWithTx(txFromUrl); }, 250);
  }
});
