// retirer-demande.js (Patch52)
(async () => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const id = (params.get("id") || params.get("demandeId") || "").trim();
  const k  = (params.get("k") || params.get("key") || params.get("token") || "").trim();

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

  function explainMissingApi(){
    show($("err"),
      "Erreur technique : DX_API non chargé. " +
      "Recharge la page. Si le problème persiste, ouvre la page via le site (Netlify) et non en fichier local."
    );
  }

  async function callWithdraw(payload){
    // voie normale
    if (window.DX_API && typeof window.DX_API.post === "function") {
      return await window.DX_API.post("withdrawDemande", payload);
    }
    // fallback minimal (si DX_API absent) : netlify function
    try{
      const res = await fetch("/.netlify/functions/gas?action=withdrawDemande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      return data || { ok:false, error:"Réponse non JSON" };
    }catch(e){
      return { ok:false, error:"Erreur réseau" };
    }
  }

  btn.addEventListener("click", async () => {
    hide($("msg")); hide($("err"));

    if(!id || !k){
      show($("err"), "Lien invalide. Vérifie que tu as bien ouvert le lien complet (id + k).");
      return;
    }

    if(!(window.DX_API && typeof window.DX_API.post === "function")){
      // On tente quand même le fallback, mais on affiche une alerte claire en cas d'échec.
      // (Certains environnements n'ont pas /.netlify/functions/gas en local)
    }

    btn.disabled = true;
    btn.textContent = "Traitement...";
    try{
      const r = await callWithdraw({ id, k });
      if(!r || !r.ok){
        if(!(window.DX_API && typeof window.DX_API.post === "function") && (r && r.error === "Erreur réseau")){
          explainMissingApi();
          return;
        }
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
