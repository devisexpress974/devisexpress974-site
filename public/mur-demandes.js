// mur-demandes.js (v100) — 1 colonne + pagination 10
document.addEventListener("DOMContentLoaded", async () => {
  const serviceFilter = document.getElementById("serviceFilter");
  const zoneFilter = document.getElementById("zoneFilter");
  const communeFilter = document.getElementById("communeFilter");
  const communeField = document.getElementById("communeField");
  const q = document.getElementById("q");
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const countBox = document.getElementById("countBox");
  const btnReload = document.getElementById("btnReload");
  const pager = document.getElementById("pager");
  const moreBtn = document.getElementById("moreBtn");

  const COMMUNES_BY_ZONE = {
    "Nord": ["Saint-Denis","Sainte-Marie","Sainte-Suzanne"],
    "Est": ["Bras-Panon","La Plaine-des-Palmistes","Salazie","Saint-André","Saint-Benoît","Sainte-Rose"],
    "Ouest": ["La Possession","Le Port","Saint-Leu","Saint-Paul","Trois-Bassins"],
    "Sud": ["Cilaos","Entre-Deux","L'Étang-Salé","Le Tampon","Les Avirons","Petite-Île","Saint-Joseph","Saint-Louis","Saint-Philippe","Saint-Pierre"]
  };

  const STATE = { items: [], offset: 0, total: 0, limit: 10, loading: false };

  function setCommunesForZone(zone){
    const isAll = !zone || zone === "Sur toute l'île" || zone === "Toute l'île" || zone === "Toute l’ile";
    if(isAll){
      if(communeField) communeField.classList.add("isHidden");
      communeFilter.innerHTML = '<option value="">Toutes</option>';
      communeFilter.value = "";
      communeFilter.disabled = true;
      return;
    }
    if(communeField) communeField.classList.remove("isHidden");
    communeFilter.disabled = false;

    const list = (COMMUNES_BY_ZONE[zone] || []).slice().sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"}));
    communeFilter.innerHTML = '<option value="">Toutes les communes</option>' + list.map(c=>`<option>${c}</option>`).join("");
    communeFilter.value = "";
  }

  function norm(s){ return String(s||"").trim().toLowerCase(); }

  function parseDateMaybe(s){
    if(!s) return null;
    // ISO
    let d = new Date(s);
    if(!isNaN(d.getTime())) return d;
    // dd/mm/yyyy
    const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if(m){
      const dd = Number(m[1]), mm = Number(m[2])-1, yy = Number(m[3]);
      const hh = m[4] ? Number(m[4]) : 0;
      const mi = m[5] ? Number(m[5]) : 0;
      d = new Date(yy,mm,dd,hh,mi);
      if(!isNaN(d.getTime())) return d;
    }
    return null;
  }

  function fmtDate(d){
    try{
      return d.toLocaleDateString("fr-FR", { year:"numeric", month:"2-digit", day:"2-digit" });
    }catch(e){ return ""; }
  }

  function fmtRel(d){
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff/60000);
    if(mins < 1) return "à l’instant";
    if(mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins/60);
    if(hrs < 48) return `il y a ${hrs} h`;
    const days = Math.floor(hrs/24);
    if(days < 30) return `il y a ${days} jour${days>1?"s":""}`;
    const months = Math.floor(days/30);
    return `il y a ${months} mois`;
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  function short(s, n){
    const t = String(s||"").trim();
    if(t.length <= n) return t;
    return t.slice(0, n-1) + "…";
  }

  function updateUI(){
    const shown = STATE.items.length;
    const total = STATE.total || shown;
    countBox.textContent = `Affichées : ${shown} / ${total}`;

    if(shown === 0 && !STATE.loading){
      empty.style.display = "block";
    }else{
      empty.style.display = "none";
    }

    const canMore = shown < total;
    pager.style.display = canMore ? "flex" : "none";
    moreBtn.disabled = STATE.loading;
  }

  function render(){
    list.innerHTML = "";
    const items = STATE.items || [];

    items.forEach(d => {
      const id = d.id || d.DemandeID || d.demandeId || "";
      const service = d.service || d.Service || "Demande";
      const commune = d.commune || d.Commune || "";
      const zone = d.zone || d.Zone || "";
      const desc = d.description || d.Description || "";
      const budget = d.budget || d.Budget || "";
      const created = parseDateMaybe(d.createdAt || d.Date || d.created || "");

      const metaParts = [];
      if(zone) metaParts.push(zone);
      if(commune) metaParts.push(commune);

      const when = created ? `Publié le ${fmtDate(created)} · ${fmtRel(created)}` : "Publié récemment";

      const a = document.createElement("a");
      a.className = "demandeRow";
      a.href = `demande-detail.html?id=${encodeURIComponent(id)}`;

      a.innerHTML = `
        <div class="demandeTop">
          <div>
            <h3 class="demandeTitle">${escapeHtml(service)}</h3>
            <div class="demandeMeta">${escapeHtml(metaParts.join(" · "))}</div>
            <div class="demandeMeta">${escapeHtml(when)}</div>
          </div>
          <div class="demandePills">
            ${budget ? `<span class="pill pillAccent">${escapeHtml(String(budget))}</span>` : `<span class="pill pillMuted">Budget non précisé</span>`}
          </div>
        </div>
        <div class="demandeDesc">${escapeHtml(short(desc, 220))}</div>
      `;
      list.appendChild(a);
    });

    updateUI();
  }

  function currentParams(){
    const service = serviceFilter.value;
    const zone = zoneFilter.value;
    const isAll = !zone || zone === "Sur toute l'île" || zone === "Toute l'île" || zone === "Toute l’ile";
    const commune = isAll ? "" : (communeFilter.value || "");
    return {
      service,
      zone: isAll ? "" : zone,
      commune,
      q: q ? q.value.trim() : ""
    };
  }

  async function fetchFirst(){
    const p = currentParams();
    STATE.loading = true;
    STATE.items = [];
    STATE.offset = 0;
    STATE.total = 0;
    render();

    const res = await window.DX_API.getAny(
      ["listDemandesPublic","listDemandes","getDemandesPublic"],
      { ...p, offset: 0, limit: STATE.limit }
    );

    const data = res && res.ok ? (res.data || res.items || res.demandes || []) : [];
    const items = Array.isArray(data) ? data : [];
    const t = (res && res.total !== undefined && res.total !== null) ? Number(res.total) : null;
    STATE.total = (isFinite(t) && t >= 0) ? t : items.length;

    STATE.items = items;
    STATE.offset = items.length;
    STATE.loading = false;

    render();
  }

  async function fetchMore(){
    if(STATE.loading) return;
    const p = currentParams();
    STATE.loading = true;
    updateUI();

    const res = await window.DX_API.getAny(
      ["listDemandesPublic","listDemandes","getDemandesPublic"],
      { ...p, offset: STATE.offset, limit: STATE.limit }
    );

    const data = res && res.ok ? (res.data || res.items || res.demandes || []) : [];
    const more = Array.isArray(data) ? data : [];
    const t = (res && res.total !== undefined && res.total !== null) ? Number(res.total) : null;
    if(isFinite(t) && t >= 0) STATE.total = t;

    STATE.items = STATE.items.concat(more);
    STATE.offset += more.length;
    STATE.loading = false;

    render();
  }

  async function initServices(){
    try{
      const res = await fetch("./assets/data/services_devisexpress974.json?v=1", { cache:"no-store" });
      const rows = await res.json();
      const cats = new Map();
      (Array.isArray(rows) ? rows : []).forEach(r=>{
        const cat = String(r.category || "Autres").trim() || "Autres";
        const label = String(r.label || "").trim();
        if(!label) return;
        if(!cats.has(cat)) cats.set(cat, []);
        cats.get(cat).push(label);
      });

      const catNames = Array.from(cats.keys()).sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"}));
      serviceFilter.innerHTML = '<option value="">Tous les métiers</option>';
      catNames.forEach(cat=>{
        const labels = cats.get(cat).slice().sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"}));
        const og = document.createElement("optgroup");
        og.label = cat;
        labels.forEach(l=>{
          const opt = document.createElement("option");
          opt.value = l;
          opt.textContent = l;
          og.appendChild(opt);
        });
        serviceFilter.appendChild(og);
      });
    }catch(e){
      console.error("services json error", e);
    }
  }

  // Events
  btnReload.addEventListener("click", fetchFirst);
  moreBtn.addEventListener("click", fetchMore);

  serviceFilter.addEventListener("change", fetchFirst);
  zoneFilter.addEventListener("change", () => {
    setCommunesForZone(zoneFilter.value);
    fetchFirst();
  });
  communeFilter.addEventListener("change", fetchFirst);

  let tmr = null;
  q.addEventListener("input", () => {
    if(tmr) clearTimeout(tmr);
    tmr = setTimeout(fetchFirst, 250);
  });

  // init
  await initServices();
  setCommunesForZone(zoneFilter.value || "Sur toute l'île");
  fetchFirst();
});
