// paiement-ponctuel.js (v14)
document.addEventListener("DOMContentLoaded", () => {
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnUnlock");
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }

  if(!id){
    btn.disabled = true;
    return show("err", "ID de demande manquant.");
  }

  btn.addEventListener("click", async () => {
    msg.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Déblocage…";
    show("muted", "Enregistrement de l’accès…");

    const res = await window.DX_API.postAny(["grantAccess","unlockDemande"], { demandeId: id, type: "ponctuel" });

    btn.disabled = false;
    btn.textContent = "J’ai payé, débloquer ma demande";

    if(res && res.ok){
      show("ok", "Accès enregistré. Ouverture de la demande…");
      setTimeout(()=> location.href = "demande-detail.html?id=" + encodeURIComponent(id), 450);
      return;
    }
    show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Impossible.");
  });
});
