// paiement-abonnement.js (PATCH1)
document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");
  const btnPay = document.getElementById("btnPay");
  const paypalLink = document.getElementById("paypalLink");
  const ppMissing = document.getElementById("ppMissing");
  const btnPaid = document.getElementById("btnPaid");

  const params = new URLSearchParams(location.search);
  const demandeId = params.get("id") || params.get("demandeId") || "";

  function show(text){
    if(!msg) return;
    msg.textContent = text || "";
  }

  // Exiger connexion (compte offreur)
  const token = (() => { try { return localStorage.getItem("dx_token") || ""; } catch { return ""; } })();
  if(!token){
    const next = "paiement-abonnement.html" + (demandeId ? ("?id=" + encodeURIComponent(demandeId)) : "");
    location.href = "offreur-login.html?next=" + encodeURIComponent(next);
    return;
  }

  // Lien PayPal
  const cfg = window.DX_PAYPAL && window.DX_PAYPAL.abonnement ? window.DX_PAYPAL.abonnement : null;
  const url = cfg && cfg.subscribeUrl ? cfg.subscribeUrl : "";
  if(!url){
    if(ppMissing) ppMissing.style.display = "block";
    if(btnPay) btnPay.setAttribute("aria-disabled","true");
    if(btnPay) btnPay.href = "#";
    if(paypalLink) paypalLink.href = "#";
  }else{
    if(ppMissing) ppMissing.style.display = "none";
    if(btnPay) btnPay.href = url;
    if(paypalLink) paypalLink.href = url;
  }

  if(btnPaid){
    btnPaid.addEventListener("click", async () => {
      btnPaid.disabled = true;
      show("Activation de l’abonnement en cours…");

      try{
        const res = await window.DX_API.postAny(["activateAbonnement","activateSubscription","activateAbo"], { });

        if(!(res && res.ok)){
          btnPaid.disabled = false;
          return show((res && (res.error||res.message)) ? (res.error||res.message) : "Impossible.");
        }

        // Optionnel : si on vient d'une demande, on la débloque de suite
        if(demandeId){
          show("Abonnement activé. Déblocage de la demande…");
          const res2 = await window.DX_API.postAny(["grantAccess","unlockDemande"], { demandeId, type: "abonnement" });
          if(res2 && res2.ok){
            show("Accès enregistré. Ouverture…");
            setTimeout(()=> location.href = "demande-detail.html?id=" + encodeURIComponent(demandeId), 450);
            return;
          }
          show("Abonnement activé. Va sur le mur pour débloquer cette demande.");
          setTimeout(()=> location.href = "mur-demandes.html?unlock=" + encodeURIComponent(demandeId), 900);
          return;
        }

        show("Abonnement activé. Tu peux débloquer toutes les demandes de ton secteur.");
        setTimeout(()=> location.href = "mur-demandes.html", 900);
      }catch(e){
        btnPaid.disabled = false;
        show(e && e.message ? e.message : String(e));
      }
    });
  }
});
