// retirer-demande.js (Patch16)
(async () => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || params.get("demandeId") || "";
  const k = params.get("k") || params.get("key") || params.get("token") || "";

  $("did").textContent = id || "—";

  function show(el, text){
    if(!el) return;
    el.style.display = "block";
    el.textContent = String(text || "");
  }
  function hide(el){
    if(!el) return;
    el.style.display = "none";
    el.textContent = "";
  }

  const btn = $("btnWithdraw");
  btn?.addEventListener("click", async () => {
    hide($("msg")); hide($("err"));

    if(!id || !k){
      show($("err"), "Lien invalide. Vérifie que tu as bien ouvert le lien complet.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Traitement...";
    try{
      const r = await window.DX_API.post("withdrawDemande", { id, k });
      if(!r || !r.ok){
        show($("err"), (r && r.error) ? r.error : "Erreur inconnue");
        return;
      }
      show($("msg"), "✅ Ta demande est retirée du mur.");
      btn.style.display = "none";
    }catch(e){
      show($("err"), "Erreur réseau. Réessaie.");
    }finally{
      btn.disabled = false;
      btn.textContent = "Retirer maintenant";
    }
  });
})();
