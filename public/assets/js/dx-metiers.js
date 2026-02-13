// assets/js/dx-metiers.js (v4) — Lexique métiers (A→Z) conforme CDC
// - source unique: ./assets/data/lexique-metiers.json
// - recherche instantanée
// - navigation A→Z
// - clic métier => modal 3 actions (demande / mur / devenir offreur)

(() => {
  "use strict";

  const LEX_URL = "./assets/data/lexique-metiers.json?v=1";

  const $ = (id) => document.getElementById(id);

  const els = {
    search: $("metierSearch"),
    count: $("metierCount"),
    az: $("azNav"),
    host: $("metiersHost"),
    modal: $("dxJobModal"),
    modalTitle: $("dxModalTitle"),
    modalSub: $("dxModalSub"),
    actDemande: $("dxActDemande"),
    actMur: $("dxActMur"),
    actOffreur: $("dxActOffreur"),
  };

  function norm(s){
    return (s || "")
      .toString()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getAllJobs(lex){
    const out = [];
    (lex.categories || []).forEach(cat => {
      (cat.jobs || []).forEach(j => {
        out.push({ category: cat.label, label: j.label, id: j.id });
      });
    });
    // tri alpha FR
    out.sort((a,b)=>a.label.localeCompare(b.label,"fr",{sensitivity:"base"}));
    return out;
  }

  function buildAZNav(items){
    if(!els.az) return;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    els.az.innerHTML = letters.map(L => `<button type="button" class="dxAzBtn" data-letter="${L}">${L}</button>`).join("");
    els.az.addEventListener("click", (e)=>{
      const btn = e.target.closest("[data-letter]");
      if(!btn) return;
      const L = btn.getAttribute("data-letter");
      const target = document.querySelector(`[data-letter-anchor="${L}"]`);
      if(target) target.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  }

  function openModal(jobLabel){
    if(!els.modal) return;
    els.modalTitle.textContent = jobLabel;
    els.modalSub.textContent = "Choisis une action pour ce métier.";
    const q = encodeURIComponent(jobLabel);
    if(els.actDemande) els.actDemande.href = `./demande.html?service=${q}`;
    if(els.actMur) els.actMur.href = `./mur-demandes.html?service=${q}`;
    if(els.actOffreur) els.actOffreur.href = `./offreur-register.html?service=${q}`;
    els.modal.setAttribute("aria-hidden","false");
  }

  function closeModal(){
    if(!els.modal) return;
    els.modal.setAttribute("aria-hidden","true");
  }

  function wireModal(){
    if(!els.modal) return;
    els.modal.addEventListener("click",(e)=>{
      if(e.target.matches("[data-dx-close]")) closeModal();
      if(e.target.closest("[data-dx-close]")) closeModal();
    });
    document.addEventListener("keydown",(e)=>{
      if(e.key==="Escape") closeModal();
    });
  }

  function render(items){
    if(!els.host) return;

    // group by first letter for anchors
    const grouped = new Map();
    items.forEach(it=>{
      const L = (it.label || "").trim().charAt(0).toUpperCase();
      if(!grouped.has(L)) grouped.set(L, []);
      grouped.get(L).push(it);
    });

    const letters = Array.from(grouped.keys()).sort();
    const html = letters.map(L=>{
      const jobs = grouped.get(L)
        .sort((a,b)=>a.label.localeCompare(b.label,"fr",{sensitivity:"base"}))
        .map(j=>`<button type="button" class="dxJobBtn" data-job="${encodeURIComponent(j.label)}">${j.label}</button>`)
        .join("");
      return `
        <section class="dxLetterBlock">
          <h3 class="dxLetterTitle" data-letter-anchor="${L}">${L}</h3>
          <div class="dxJobGrid">${jobs}</div>
        </section>
      `;
    }).join("");

    els.host.innerHTML = html;

    if(els.count){
      els.count.textContent = `${items.length} métier${items.length>1?"s":""}`;
    }

    els.host.addEventListener("click",(e)=>{
      const btn = e.target.closest(".dxJobBtn");
      if(!btn) return;
      const jobLabel = decodeURIComponent(btn.getAttribute("data-job") || "");
      openModal(jobLabel);
    }, { once:true });
  }

  function wireSearch(allItems){
    if(!els.search) return;
    els.search.addEventListener("input", ()=>{
      const q = norm(els.search.value);
      if(!q){
        render(allItems);
        return;
      }
      const filtered = allItems.filter(it => norm(it.label).includes(q));
      render(filtered);
    });
  }

  async function boot(){
    try{
      const res = await fetch(LEX_URL, { cache:"no-store" });
      if(!res.ok) throw new Error("HTTP "+res.status);
      const lex = await res.json();
      const items = getAllJobs(lex);

      buildAZNav(items);
      wireModal();
      render(items);
      wireSearch(items);
    }catch(err){
      console.error("[DX] Lexique métiers introuvable:", err);
      if(els.host) els.host.innerHTML = "<p>Impossible de charger la liste des métiers.</p>";
    }
  }

  boot();
})();
