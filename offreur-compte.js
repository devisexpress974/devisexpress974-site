// offreur-profil.js (Patch3) — Profil + statut + logout (safe)
(() => {
  const $ = (id) => document.getElementById(id);

  // PATCH22: activer la recherche sur les selects (si présents)
  document.addEventListener("DOMContentLoaded", () => {
    if (!window.DXSearchSelect) return;
    const s = $("service");
    const c = $("commune");
    if (s) window.DXSearchSelect.enhance(s, { placeholder: "Rechercher un métier…" });
    if (c) window.DXSearchSelect.enhance(c, { placeholder: "Rechercher une commune…" });
  });

  const COMMUNES = {
    Nord: ["Saint-Denis","Sainte-Marie","Sainte-Suzanne"],
    Est: ["Saint-André","Bras-Panon","Saint-Benoît","Sainte-Rose","Saint-Philippe","Salazie","La Plaine-des-Palmistes"],
    Ouest: ["Le Port","La Possession","Saint-Paul","Trois-Bassins","Saint-Leu"],
    Sud: ["Les Avirons","L’Étang-Salé","Saint-Louis","Entre-Deux","Le Tampon","Cilaos","Saint-Pierre","Petite-Île","Saint-Joseph"]
  };

  function allCommunes(){
    const out = [];
    Object.keys(COMMUNES).forEach(z => COMMUNES[z].forEach(c => out.push(c)));
    return out;
  }

  function setNotice(text, kind){
    const el = $("msg");
    if(!el) return;
    el.className = "notice " + (kind === "ok" ? "ok" : kind === "bad" ? "bad" : "");
    el.textContent = text || "";
    el.style.display = text ? "block" : "none";
  }

  function pill(label, value, state){
    const dot = state === "ok" ? "ok" : state === "warn" ? "warn" : state === "off" ? "off" : "";
    return `<span class="pill"><span class="dot ${dot}"></span><span>${label}</span><span style="opacity:.75">•</span><span>${value}</span></span>`;
  }

  async function loadServices(){
    const sel = $("service");
    if(!sel) return;

    // fallback minimal
    sel.innerHTML = `<option value="">Choisir…</option>`;

    try{
      const res = await fetch("./services_devisexpress974.json?v=1", { cache:"no-store" });
      const list = await res.json();

      // group by category
      const groups = {};
      (list || []).forEach(it => {
        const cat = String(it.category || "Autres").trim();
        if(!groups[cat]) groups[cat] = [];
        groups[cat].push(it);
      });

      const cats = Object.keys(groups).sort((a,b)=>a.localeCompare(b, "fr"));
      cats.forEach(cat => {
        const og = document.createElement("optgroup");
        og.label = cat;
        groups[cat].sort((a,b)=>String(a.label).localeCompare(String(b.label), "fr")).forEach(it => {
          const opt = document.createElement("option");
          opt.value = String(it.label || "").trim();   // IMPORTANT : on garde le label (compat avec données actuelles)
          opt.textContent = String(it.label || "").trim();
          og.appendChild(opt);
        });
        sel.appendChild(og);
      });

      // add "Autre"
      const opt = document.createElement("option");
      opt.value = "Autre (à préciser)";
      opt.textContent = "Autre (à préciser)";
      sel.appendChild(opt);

    }catch(e){
      // si le JSON n'est pas encore en place, on laisse juste le fallback
      sel.innerHTML = `<option value="">Choisir…</option>
        <option>Plomberie</option>
        <option>Électricité</option>
        <option>Maçonnerie</option>
        <option>Peinture</option>
        <option>Jardinage</option>
        <option>Ménage</option>
        <option>Informatique</option>
        <option>Autre (à préciser)</option>`;
    }
  }

  function refreshCommuneOptions(zone, selected){
    const sel = $("commune");
    if(!sel) return;

    const z = String(zone||"").trim();
    let list = [];
    if(!z || z === "Sur toute l'île"){
      list = allCommunes().slice().sort((a,b)=>a.localeCompare(b,"fr"));
    }else{
      list = (COMMUNES[z] || []).slice();
    }

    sel.innerHTML = `<option value="">Choisir…</option>`;
    list.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });

    if(selected) sel.value = selected;

    // PATCH22: recherche dans les communes
    if (window.DXSearchSelect) window.DXSearchSelect.refresh(sel);
  }

  function toggleServiceAutre(){
    const s = ($("service")?.value || "").toLowerCase();
    const wrap = $("serviceAutreWrap");
    if(!wrap) return;
    if(s.indexOf("autre") === 0){
      wrap.style.display = "";
    }else{
      wrap.style.display = "none";
      const input = $("serviceAutre");
      if(input) input.value = "";
    }
  }

  async function requireLogin(){
    // DX_AUTH présent ? sinon on fait direct via API
    let me = null;
    try{
      if(window.DX_AUTH && typeof window.DX_AUTH.whoami === "function"){
        me = await window.DX_AUTH.whoami();
      }else{
        me = await window.DX_API.getAny(["whoami","me"], {});
      }
    }catch(e){}

    if(!me || !me.ok){
      const next = encodeURIComponent("offreur-compte.html");
      location.href = `offreur-login.html?next=${next}`;
      return null;
    }
    return me;
  }

  function renderStatus(me){
    const el = $("statusPills");
    if(!el) return;

    const user = (me && me.user) ? me.user : (me && me.data ? me.data : {});
    const plan = String((user && user.plan) || (me && me.data && me.data.plan) || "FREE");
    const credits = String((user && user.credits) || (me && me.data && me.data.credits) || "0");
    const abo = String((user && user.aboActive) || (me && me.data && me.data.aboActive) || "NON");
    const trialEnd = String((user && user.trialEnd) || (me && me.data && me.data.trialEnd) || "");

    const pills = [];
    if(plan === "ABO" || abo === "OUI"){
      pills.push(pill("Abonnement", "Actif", "ok"));
    }else{
      pills.push(pill("Abonnement", "Inactif", "off"));
    }

    if(plan === "PACK"){
      pills.push(pill("Crédits", credits, credits !== "0" ? "ok" : "warn"));
    }

    if(trialEnd){
      pills.push(pill("Fin essai", trialEnd, "warn"));
    }

    el.innerHTML = pills.join("");
  }


  function isAboActive(me){
    const user = (me && me.user) ? me.user : (me && me.data ? me.data : {});
    const plan = String((user && user.plan) || "").toUpperCase();
    const abo = String((user && user.aboActive) || "").toUpperCase();
    return plan === "ABO" || abo === "OUI" || abo === "TRUE" || abo === "1";
  }

  function lockServiceUI(isLocked){
    const sel = $("service");
    if(!sel) return;
    const wrapAutre = $("serviceAutreWrap");
    const hint = $("serviceLockHint");

    sel.disabled = !!isLocked;
    if(isLocked){
      if(hint) hint.style.display = "block";
      // on ne veut pas permettre de modifier "Autre" non plus
      if(wrapAutre) wrapAutre.style.display = "none";
      const input = $("serviceAutre");
      if(input) input.value = (input.value || "");
    }else{
      if(hint) hint.style.display = "none";
      toggleServiceAutre();
    }
  }

  async function loadProfile(){
    const res = await window.DX_API.get("getOffreurProfile", {});
    if(res && res.ok && res.user) return res.user;

    // fallback : au moins email/offreurId
    return null;
  }

  function fillForm(u){
    if(!u) return;

    $("nom").value = u.nom || "";
    $("email").value = u.email || "";
    $("tel").value = u.tel || "";
    const typeEl = $("typeOffreur"); if(typeEl) typeEl.value = (u.typeOffreur || "PRO").toUpperCase();
    const sirenEl = $("siren"); if(sirenEl) sirenEl.value = u.siren || "";
    $("entreprise").value = u.entreprise || "";
    $("pseudo").value = u.pseudo || "";
    $("displayMode").value = (u.displayMode || "NOM").toUpperCase();
    $("showNote").value = (u.showNote || "OUI").toUpperCase();

    $("zone").value = u.zone || "";
    refreshCommuneOptions(u.zone, u.commune || "");

    $("description").value = u.description || "";
    $("serviceAutre").value = u.serviceAutre || "";
  }

  async function setServiceValue(value){
    const sel = $("service");
    if(!sel) return;

    // sometimes options load async
    const v = String(value||"").trim();
    if(!v) return;

    // try set now
    sel.value = v;

    // if not found yet, retry a bit
    if(sel.value !== v){
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        sel.value = v;
        if(sel.value === v || tries > 20){
          clearInterval(t);
          toggleServiceAutre();
        }
      }, 100);
    }else{
      toggleServiceAutre();
    }
  }

  async function boot(){
    // year in footer if present
    try{ const y = document.getElementById("y"); if(y) y.textContent = String(new Date().getFullYear()); }catch(e){}

    const me = await requireLogin();
    if(!me) return;

    renderStatus(me);

    const locked = isAboActive(me);

    await loadServices();
    lockServiceUI(locked);

    // load profile from backend
    const u = await loadProfile();
    if(u){
      fillForm(u);
      await setServiceValue(u.service);
      toggleServiceAutre();
      return;
    }

    // fallback: fill with whoami
    const user = me.user || me.data || {};
    $("email").value = user.email || "";
    $("nom").value = user.nom || "";
    $("tel").value = user.tel || "";
  }

  document.addEventListener("change", (e) => {
    if(e.target && e.target.id === "zone"){
      refreshCommuneOptions(e.target.value, "");
    }
    if(e.target && e.target.id === "service"){
      toggleServiceAutre();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const form = $("profileForm");
    if(form){
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        setNotice("", "");

        const payload = {
          nom: $("nom").value,
          tel: $("tel").value,
          entreprise: $("entreprise").value,
          pseudo: $("pseudo").value,
          displayMode: $("displayMode").value,
          showNote: $("showNote").value,
          service: $("service").value,
          serviceAutre: $("serviceAutre").value,
          zone: $("zone").value,
          commune: $("commune").value,
          description: $("description").value,
          typeOffreur: $("typeOffreur") ? $("typeOffreur").value : "PRO",
          siren: $("siren") ? String($("siren").value||"").replace(/[^0-9]/g,"").trim() : ""
        };


        // validate SIREN/SIRET if filled
        if(payload.siren && !(payload.siren.length === 9 || payload.siren.length === 14)){
          setNotice("❌ SIREN/SIRET : 9 ou 14 chiffres (ou laisse vide).", "bad");
          return;
        }

        try{
          const res = await window.DX_API.post("updateOffreurProfile", payload);
          if(res && res.ok){
            setNotice("✅ Profil enregistré.", "ok");
            // refresh pills using fresh whoami
            try{
              const me = await window.DX_API.getAny(["whoami","me"], {});
              if(me && me.ok) renderStatus(me);
            }catch(e){}
          }else{
            setNotice("❌ " + (res && res.error ? res.error : "Erreur lors de l’enregistrement."), "bad");
          }
        }catch(e){
          setNotice("❌ Erreur réseau.", "bad");
        }
      });
    }

    const btnLogout = $("btnLogout");
    if(btnLogout){
      btnLogout.addEventListener("click", async () => {
        try{
          if(window.DX_AUTH && typeof window.DX_AUTH.logout === "function"){
            await window.DX_AUTH.logout();
          }else{
            await window.DX_API.postAny(["logout","logoutOffreur"], {});
          }
        }catch(e){}
        try{ localStorage.removeItem("dx_token"); }catch(e){}
        location.href = "offreur-login.html";
      });
    }

    boot();
  });
})();
