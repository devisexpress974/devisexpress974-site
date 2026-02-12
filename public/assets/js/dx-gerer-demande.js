(function(){
  function qs(name){
    try{ return (new URL(location.href)).searchParams.get(name) || ""; }catch(e){ return ""; }
  }
  const id = (qs("id")||qs("demandeId")||"").trim();
  const k = (qs("k")||qs("key")||"").trim();

  const box = document.getElementById("demandeBox");
  const msg = document.getElementById("msg");
  const withdrawBtn = document.getElementById("withdrawBtn");
  const viewBtn = document.getElementById("viewBtn");

  function show(type, text){
    msg.style.display = "block";
    msg.className = "alert " + (type==="ok" ? "success" : "danger");
    msg.textContent = text;
  }

  async function load(){
    if(!id){
      box.textContent = "ID manquant. Ouvre ce lien depuis ton email.";
      withdrawBtn.disabled = true;
      return;
    }
    try{
      const res = await window.DX_API.getAny(["getDemandePublic","getDemande"], { id });
      if(res && res.ok && res.demande){
        const d = res.demande;
        box.innerHTML = "<strong>Métier :</strong> " + (d.Service||d.service||"") + "<br>"
          + "<strong>Commune :</strong> " + (d.Commune||d.commune||"") + "<br>"
          + "<strong>Statut :</strong> " + (d.Statut||d.statut||"") + "<br>"
          + "<strong>Publié :</strong> " + (d.CreatedAt||d.createdAt||"");
        viewBtn.href = "./demande-detail.html?id=" + encodeURIComponent(id);
      }else{
        box.textContent = (res && res.error) ? res.error : "Demande introuvable.";
      }
    }catch(e){
      box.textContent = "Erreur de chargement.";
    }
  }

  withdrawBtn.addEventListener("click", async ()=>{
    if(!id || !k) return show("err","Clé de retrait manquante. Ouvre ce lien depuis l'email.");
    withdrawBtn.disabled = true;
    try{
      const res = await window.DX_API.postAny(["withdrawDemande"], { id, k });
      if(res && res.ok){
        show("ok","✅ Ta demande a été supprimée.");
      }else{
        show("err", (res && res.error) ? res.error : "Impossible de supprimer.");
      }
    }catch(e){
      show("err","Erreur réseau.");
    }finally{
      withdrawBtn.disabled = false;
    }
  });

  document.addEventListener("DOMContentLoaded", load);
})();
