document.addEventListener("DOMContentLoaded", async () => {
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnPaid");
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || params.get("demandeId") || "";
  const nextUrl = "paiement-abonnement.html" + (location.search || "");

  const token = localStorage.getItem("dx_token") || "";
  if(!token){
    location.href = "offreur-login.html?next=" + encodeURIComponent(nextUrl);
    return;
  }

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Activation…";

    const act = await DX_API.post("activateAbonnement", {});
    if(!act || !act.ok){
      btn.disabled = false; btn.textContent = old;
      return show("err", act?.error || "Activation impossible");
    }

    if(id){
      const res = await DX_API.postAny(["grantAccess","unlockDemande"], { demandeId:id, type:"abonnement" });
      if(res?.ok){
        show("ok","Abonnement activé + accès OK");
        setTimeout(()=> location.href="demande-detail.html?id="+encodeURIComponent(id), 450);
        return;
      }
      btn.disabled = false; btn.textContent = old;
      return show("err", res?.error || "Abonnement OK mais déblocage KO");
    }

    show("ok","Abonnement activé");
    setTimeout(()=> location.href="mur-demandes.html", 450);
  });
});
