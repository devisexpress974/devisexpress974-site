// offreur-abonnement.js — Patch 57
// Page "Mon abonnement" : affiche statut + mois offert + renouvellement + arrêt

(function(){
  function $(id){ return document.getElementById(id); }
  function setText(id, v){ var el=$(id); if(el) el.textContent = (v==null ? "" : String(v)); }
  function setMsg(v){ var el=$("msg"); if(el) el.textContent = v || ""; }

  function upper(v){ return String(v||"").trim().toUpperCase(); }
  function normPlan(v){ v = upper(v); return v || "FREE"; }

  async function post(action, payload){
    if(!window.DX_API || typeof window.DX_API.post !== "function"){
      throw new Error("DX_API indisponible");
    }
    return await window.DX_API.post(action, payload || {});
  }

  function isLogged(){
    return !!(localStorage.getItem("dx_token") || localStorage.getItem("DX_TOKEN"));
  }
  function redirectToLogin(){
    window.location.href = "offreur-login.html?next=" + encodeURIComponent("offreur-abonnement.html");
  }

  function isoToLocal(iso){
    if(!iso) return "";
    try{
      var d = new Date(iso);
      if(!d || !d.getTime) return iso;
      return d.toLocaleString();
    }catch(e){ return iso; }
  }

  function setPayLink(){
    var a = $("btnBuyAbo");
    if(!a) return;
    a.href = "paiement-abonnement.html?next=" + encodeURIComponent("offreur-abonnement.html");
  }

  async function refresh(){
    setMsg("Chargement…");
    var r = await post("getMyPlan", {});
    if(!r || !r.ok){
      setMsg((r && (r.error || r.message)) ? (r.error || r.message) : "Erreur.");
      return;
    }
    var d = r.data || r;

    var plan = normPlan(d.plan);
    var credits = Number(d.credits||0) || 0;

    var aboActive = upper(d.aboActive) === "OUI";
    var aboPaid = upper(d.aboPaid) === "OUI";
    var trialUsed = upper(d.trialUsed) === "OUI";
    var trialEnd = String(d.trialEnd||"");
    var paidUntil = String(d.aboPaidUntil||"");

    setText("kPlan", plan);
    setText("kCredits", credits);
    setText("kAbo", aboActive ? "OUI" : "NON");
    setText("kAboPaid", aboPaid ? "OUI" : "NON");
    setText("kTrialEnd", trialEnd ? isoToLocal(trialEnd) : (trialUsed ? "—" : "Non utilisé"));
    setText("kPaidUntil", paidUntil ? isoToLocal(paidUntil) : "—");

    // Visibilité boutons
    var btnTrial = $("btnStartTrial");
    var btnCancel = $("btnCancel");
    var boxDanger = $("danger");

    if(btnTrial){
      // Mois offert uniquement si jamais utilisé
      btnTrial.style.display = trialUsed ? "none" : "inline-flex";
    }
    if(btnCancel){
      btnCancel.style.display = aboActive ? "inline-flex" : "none";
    }
    if(boxDanger){
      boxDanger.style.display = "none";
    }

    // Alerte si abo actif mais plus payé/plus valide
    try{
      var now = new Date().getTime();
      if(aboActive){
        if(paidUntil){
          var pu = new Date(paidUntil).getTime();
          if(pu && pu <= now){
            if(boxDanger){
              boxDanger.style.display = "block";
              boxDanger.textContent = "Ton abonnement a expiré. Renouvelle-le pour retrouver l'accès complet.";
            }
          }
        }else if(trialEnd){
          var te = new Date(trialEnd).getTime();
          if(te && te <= now && !aboPaid){
            if(boxDanger){
              boxDanger.style.display = "block";
              boxDanger.textContent = "Ton mois offert est terminé. Renouvelle (4,99€) pour garder l’accès.";
            }
          }
        }
      }
    }catch(e){}

    setPayLink();
    setMsg("");
  }

  document.addEventListener("DOMContentLoaded", function(){
    if(!isLogged()){
      redirectToLogin();
      return;
    }

    var btnTrial = $("btnStartTrial");
    var btnCancel = $("btnCancel");

    if(btnTrial){
      btnTrial.addEventListener("click", async function(){
        try{
          setMsg("Activation du mois offert…");
          var r = await post("activateAbonnement", {});
          if(!r || !r.ok){
            setMsg((r && (r.error || r.message)) ? (r.error || r.message) : "Erreur.");
            return;
          }
          setMsg("Mois offert activé.");
          await refresh();
        }catch(err){
          setMsg(err && err.message ? err.message : "Erreur.");
        }
      });
    }

    if(btnCancel){
      btnCancel.addEventListener("click", async function(){
        if(!confirm("Arrêter l’abonnement ? (tu repasseras en FREE)")) return;
        try{
          setMsg("Arrêt…");
          var r = await post("cancelAbonnement", {});
          if(!r || !r.ok){
            setMsg((r && (r.error || r.message)) ? (r.error || r.message) : "Erreur.");
            return;
          }
          setMsg("Abonnement arrêté.");
          await refresh();
        }catch(err){
          setMsg(err && err.message ? err.message : "Erreur.");
        }
      });
    }

    refresh().catch(function(e){
      setMsg(e && e.message ? e.message : "Erreur.");
    });
  });
})();