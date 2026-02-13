// assets/js/dx-metiers.js (v3)
// Lexique métiers (A→Z)
// - affiche index A→Z + métiers triés
// - clic sur un métier => popup 3 actions : Faire une demande / Voir les demandes / Devenir offreur
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function norm(s){ return String(s||"").trim(); }

  function byAlpha(a,b){
    a = norm(a).toLowerCase(); b = norm(b).toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function loadLexique(){
    // Source unique
    // 1) essaye window.SERVICES_BY_CAT (si présent)
    // 2) sinon charge assets/data/lexique-metiers.json
    if (window.SERVICES_BY_CAT && typeof window.SERVICES_BY_CAT === "object") {
      return Promise.resolve(window.SERVICES_BY_CAT);
    }
    return fetch("./assets/data/lexique-metiers.json?v=19", { cache: "no-store" })
      .then(r => r.json());
  }

  function flattenLexique(lex){
    // lex = { "Catégorie": ["Métier", ...], ... } OU { categories:[{name, jobs:[]}] }
    const out = [];
    if (Array.isArray(lex.categories)) {
      lex.categories.forEach(cat=>{
        const cname = cat.name || cat.title || "Autres";
        const jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
        jobs.forEach(j=> out.push({ cat: cname, job: j }));
      });
      return out;
    }
    Object.keys(lex||{}).forEach(cat=>{
      const jobs = Array.isArray(lex[cat]) ? lex[cat] : [];
      jobs.forEach(j=> out.push({ cat, job: j }));
    });
    return out;
  }

  function buildIndex(items){
    const letters = {};
    items.forEach(it=>{
      const L = norm(it.job).charAt(0).toUpperCase();
      if(!letters[L]) letters[L]=true;
    });
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(L=>letters[L]);
    const wrap = $("dxAlpha");
    if(!wrap) return;
    wrap.innerHTML = alpha.map(L=>`<button class="dxAlphaBtn" data-letter="${L}">${L}</button>`).join("");
    wrap.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-letter]");
      if(!btn) return;
      const L = btn.getAttribute("data-letter");
      const target = document.querySelector(`[data-letter-anchor="${L}"]`);
      if(target) target.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  }

  function render(items){
    const list = $("dxList");
    if(!list) return;

    // Tri A→Z global, puis groupe par lettre
    const sorted = items.slice().sort((a,b)=>byAlpha(a.job,b.job));
    buildIndex(sorted);

    let html = "";
    let currentL = "";
    sorted.forEach(it=>{
      const L = norm(it.job).charAt(0).toUpperCase();
      if(L !== currentL){
        currentL = L;
        html += `<h2 class="dxLetter" data-letter-anchor="${L}">${L}</h2>`;
      }
      html += `
        <button class="dxJob" type="button"
          data-job="${escapeHtml(it.job)}"
          data-cat="${escapeHtml(it.cat)}">
          <span class="dxJobName">${escapeHtml(it.job)}</span>
          <span class="dxJobCat">${escapeHtml(it.cat)}</span>
        </button>`;
    });
    list.innerHTML = html;
  }

  function ensureModal(){
    if(document.getElementById("dxJobModal")) return;
    const modal = document.createElement("div");
    modal.id = "dxJobModal";
    modal.className = "dxModal";
    modal.innerHTML = `
      <div class="dxModalBackdrop" data-close></div>
      <div class="dxModalCard" role="dialog" aria-modal="true" aria-label="Choisir une action">
        <button class="dxModalClose" type="button" aria-label="Fermer" data-close>×</button>
        <h3 class="dxModalTitle" id="dxModalTitle"></h3>
        <p class="dxModalSub" id="dxModalSub"></p>
        <div class="dxModalActions">
          <a class="dxBtn dxBtnPrimary" id="dxActDemande" href="#">Faire une demande</a>
          <a class="dxBtn" id="dxActMur" href="#">Voir les demandes</a>
          <a class="dxBtn" id="dxActOffreur" href="#">Devenir offreur</a>
        </div>
        <p class="dxModalHint">Astuce : le métier sera pré-sélectionné automatiquement.</p>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e)=>{
      if(e.target && e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", (e)=>{
      if(e.key === "Escape") closeModal();
    });
  }

  function openModal(job, cat){
    ensureModal();
    const modal = document.getElementById("dxJobModal");
    const title = document.getElementById("dxModalTitle");
    const sub = document.getElementById("dxModalSub");
    title.textContent = job;
    sub.textContent = cat ? `Catégorie : ${cat}` : "";

    // routes
    const q = encodeURIComponent(job);
    document.getElementById("dxActDemande").href = `./demande.html?service=${q}`;
    document.getElementById("dxActMur").href = `./mur-demandes.html?service=${q}`;
    document.getElementById("dxActOffreur").href = `./register-offreur.html?service=${q}`;

    modal.classList.add("is-open");
    document.body.classList.add("dxModalOpen");
  }

  function closeModal(){
    const modal = document.getElementById("dxJobModal");
    if(!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("dxModalOpen");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try{
      const lex = await loadLexique();
      const items = flattenLexique(lex);
      render(items);

      const list = $("dxList");
      if(list){
        list.addEventListener("click", (e)=>{
          const btn = e.target.closest("button.dxJob");
          if(!btn) return;
          const job = btn.getAttribute("data-job") || "";
          const cat = btn.getAttribute("data-cat") || "";
          openModal(job, cat);
        });
      }
    }catch(err){
      const list = $("dxList");
      if(list) list.innerHTML = `<div class="dxError">Impossible de charger le lexique métiers.</div>`;
      console.error(err);
    }
  });
})();