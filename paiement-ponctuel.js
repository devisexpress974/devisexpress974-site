// paiement-ponctuel.js (PATCH1)
document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnUnlock");
  const btnPay = document.getElementById("btnPay");
  const paypalLink = document.getElementById("paypalLink");
  const ppMissing = document.getElementById("ppMissing");

  const params = new URLSearchParams(location.search);
  const demandeId = params.get("id") || params.get("demandeId") || "";

  function show(type, text){
    if(!msg) return;
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text || "";
  }

  if(!btn){
    show("err", "Bouton de déblocage introuvable sur la page.");
    return;
  }

  if(!demandeId){
    btn.disabled = true;
    show("err", "ID de demande manquant.");
    return;
  }

  // Exiger connexion (compte offreur)
  const token = (() => { try { return localStorage.getItem("dx_token") || ""; } catch { return ""; } })();
  if(!token){
    const next = "paiement-ponctuel.html?id=" + encodeURIComponent(demandeId);
    location.href = "offreur-login.html?next=" + encodeURIComponent(next);
    return;
  }

  // Lien PayPal
  const link = (window.DX_PAYPAL && window.DX_PAYPAL.getLink) ? window.DX_PAYPAL.getLink("ponctuel") : "";
  if(!link){
    if(ppMissing) ppMissing.style.display = "block";
    if(btnPay) btnPay.style.display = "none";
    if(paypalLink) paypalLink.style.display = "none";
  } else {
    if(ppMissing) ppMissing.style.display = "none";
    if(btnPay){ btnPay.style.display = ""; btnPay.href = link; }
    if(paypalLink){ paypalLink.style.display = ""; paypalLink.href = link; }
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Déblocage…";
    show("muted", "Enregistrement de l’accès…");

    try{
      const res = await window.DX_API.postAny(["grantAccess","unlockDemande"], { demandeId, type: "ponctuel" });

      if(res && res.ok){
        show("ok", "Accès enregistré. Ouverture de la demande…");
        setTimeout(()=> location.href = "demande-detail.html?id=" + encodeURIComponent(demandeId), 450);
        return;
      }

      btn.disabled = false;
      btn.textContent = "J’ai payé, débloquer ma demande";
      show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Impossible.");
    }catch(e){
      btn.disabled = false;
      btn.textContent = "J’ai payé, débloquer ma demande";
      show("err", e && e.message ? e.message : String(e));
    }
  });
});
