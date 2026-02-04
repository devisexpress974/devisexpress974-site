// offreur-abonnement.js (Patch13)
(async () => {
  const $ = (id) => document.getElementById(id);

  const msg = $("msg");
  const danger = $("danger");
  const btnCancel = $("btnCancel");
  const btnRefresh = $("btnRefresh");

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
  function fmtDate(iso){
    if(!iso) return "—";
    const d = new Date(iso);
    if(String(d) === "Invalid Date") return String(iso);
    return d.toLocaleString("fr-FR");
  }
  function normPlan(p){
    p = String(p || "").toUpperCase();
    if(p === "ABO") return "ABONNEMENT";
    if(p === "PACK") return "PACK";
    if(p === "FREE" || !p) return "GRATUIT";
    return p;
  }

  // Require login
  const me = await (window.DX_AUTH?.whoami?.() || Promise.resolve({ ok:false }));
  if(!me || !me.ok){
    const next = encodeURIComponent("offreur-abonnement.html");
    location.href = "offreur-login.html?next=" + next;
    return;
  }

  async function load(){
    hide(msg); hide(danger);
    $("kPlan").textContent = "…";
    $("kCredits").textContent = "…";
    $("kAbo").textContent = "…";
    $("kTrialEnd").textContent = "…";

    const r = await window.DX_API.postAny?.(["getMyPlan","myPlan","getPlan"], {}) 
      || await window.DX_API.post("getMyPlan", {});

    if(!r || !r.ok){
      show(danger, (r && r.error) ? r.error : "Erreur inconnue");
      return;
    }

    const plan = normPlan(r.plan);
    const credits = Number(r.credits || 0) || 0;
    const aboActive = String(r.aboActive || "NON").toUpperCase() === "OUI" ? "OUI" : "NON";

    $("kPlan").textContent = plan;
    $("kCredits").textContent = String(credits);
    $("kAbo").textContent = aboActive;
    $("kTrialEnd").textContent = r.trialEnd ? fmtDate(r.trialEnd) : "—";

    // cancel button only if abo is active
    btnCancel.style.display = (aboActive === "OUI") ? "inline-flex" : "none";

    // Make payment links return here
    const returnTo = encodeURIComponent("offreur-abonnement.html");
    $("btnBuy099").href = "./paiement-ponctuel.html?next=" + returnTo;
    $("btnBuyPack").href = "./paiement-pack.html?next=" + returnTo;
    $("btnBuyAbo").href = "./paiement-abonnement.html?next=" + returnTo;
  }

  btnRefresh?.addEventListener("click", load);

  btnCancel?.addEventListener("click", async () => {
    hide(msg); hide(danger);
    const reason = prompt("Pourquoi tu arrêtes l’abonnement ? (optionnel)", "") || "";
    const ok = confirm("Confirmer : arrêter l’abonnement sur la plateforme maintenant ?");
    if(!ok) return;

    const r = await window.DX_API.postAny?.(["cancelAbonnement","cancelSubscription","unsubscribePlan"], { reason })
      || await window.DX_API.post("cancelAbonnement", { reason });

    if(!r || !r.ok){
      show(danger, (r && r.error) ? r.error : "Erreur lors de l’annulation");
      return;
    }
    show(msg, "Abonnement arrêté. (Accès premium coupé)");
    await load();
  });

  await load();
})();
