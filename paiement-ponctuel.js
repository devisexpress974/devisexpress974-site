// paiement-ponctuel.js (PATCH2 - compatible btnPaid + btnUnlock)
document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");

  // ✅ Remplacement demandé (btnPaid + id/demandeId)
  const params = new URLSearchParams(location.search);
  const btn = document.getElementById("btnPaid") || document.getElementById("btnUnlock");
  const id = params.get("id") || params.get("demandeId") || "";
  const txFromUrl = params.get("tx") || params.get("txn_id") || "";

  const btnPay = document.getElementById("btnPay");
  const paypalLink = document.getElementById("paypalLink");
  const ppMissing = document.getElementById("ppMissing");

  function show(type, text) {
    if (!msg) return;
    msg.style.display = "block";
    msg.className = "notice " + (type || "");
    msg.textContent = text || "";
  }

  if (!btn) {
    show("err", "Bouton de déblocage introuvable sur la page.");
    return;
  }

  const originalBtnText = btn.textContent || "J’ai payé, débloquer ma demande";

  if (!id) {
    btn.disabled = true;
    show("err", "ID de demande manquant.");
    return;
  }

  // Exiger connexion (compte offreur)
  const token = (() => {
    try {
      return localStorage.getItem("dx_token") || "";
    } catch {
      return "";
    }
  })();

  if (!token) {
    const next = "paiement-ponctuel.html?id=" + encodeURIComponent(id);
    location.href = "offreur-login.html?next=" + encodeURIComponent(next);
    return;
  }

  // Lien PayPal
  const link =
    window.DX_PAYPAL && typeof window.DX_PAYPAL.getLink === "function"
      ? window.DX_PAYPAL.getLink("ponctuel")
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
    }
    if (paypalLink) {
      paypalLink.style.display = "";
      paypalLink.href = link;
    }
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Déblocage…";
    show("muted", "Enregistrement de l’accès…");

    try {
      const tx = (txFromUrl || window.prompt("Colle l\'ID de transaction PayPal (tx) puis OK :") || "").trim();

      if(!tx){
        btn.disabled = false;
        btn.textContent = originalBtnText;
        return show("err","Transaction PayPal manquante.");
      }

      const res = await window.DX_API.post("confirmPayPalPayment", { tx: tx, product: "ponctuel", demandeId: id });

      if (res && res.ok) {
        show("ok", "Paiement confirmé ✅");
        setTimeout(() => {
          location.href = "demande-detail.html?id=" + encodeURIComponent(id);
        }, 450);
        return;
      }

      btn.disabled = false;
      btn.textContent = originalBtnText;
      show(
        "err",
        res && (res.error || res.message)
          ? (res.error || res.message)
          : "Impossible."
      );
    } catch (e) {
      btn.disabled = false;
      btn.textContent = originalBtnText;
      show("err", e && e.message ? e.message : String(e));
    }
  });
});
