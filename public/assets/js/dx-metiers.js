// assets/js/dx-metiers.js (v21) — Lexique métiers (A→Z) + recherche + popup 3 actions
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    search: $("metierSearch"),
    count: $("metierCount"),
    azNav: $("azNav"),
    host: $("metiersHost"),
  };

  function norm(s){ return String(s||"").trim(); }
  function esc(s){
    return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function byFR(a,b){
    return norm(a).localeCompare(norm(b), "fr", { sensitivity:"base" });
  }

  async function loadLexique(){
    const res = await fetch("./assets/data/lexique-metiers.json?v=22", { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function flatten(lex){
    const out = [];
    const cats = Array.isArray(lex && lex.categories) ? lex.categories : [];
    cats.forEach(cat=>{
      const catLabel = norm(cat.label || cat.name || cat.title || "Autres") || "Autres";
      const jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
      jobs.forEach(j=>{
        const job = norm(j.label || j.name || j.title || "");
        if(!job) return;
        out.push({ cat: catLabel, job });
      });
    });
    // tri global A→Z
    out.sort((a,b)=>byFR(a.job,b.job));
    return out;
  }

  function buildAZ(items){
    const letters = new Set(items.map(it => norm(it.job).charAt(0).toUpperCase()).filter(Boolean));
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(L => letters.has(L));
    if(!els.azNav) return;

    els.azNav.innerHTML = alpha.map(L => `<a href="#dx-${L}" data-letter="${L}">${L}</a>`).join("");
    els.azNav.addEventListener("click", (e)=>{
      const a = e.target.closest("a[data-letter]");
      if(!a) return;
      e.preventDefault();
      const L = a.getAttribute("data-letter");
      const target = document.getElementById(`dx-${L}`);
      if(target) target.scrollIntoView({ behavior:"smooth", block:"start" });
    });
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

    const q = encodeURIComponent(job);
    document.getElementById("dxActDemande").href = `./demande.html?service=${q}`;
    document.getElementById("dxActMur").href = `./mur-demandes.html?service=${q}`;
    document.getElementById("dxActOffreur").href = `./offreur-register.html?service=${q}`;

    modal.classList.add("is-open");
    document.body.classList.add("dxModalOpen");
  }

  function closeModal(){
    const modal = document.getElementById("dxJobModal");
    if(!modal) return;
    modal.classList.remove("is-open");
    document.body.classList.remove("dxModalOpen");
  }

  function render(items){
    if(!els.host) return;

    buildAZ(items);

    let currentL = "";
    let html = '<div class="metiersCols">';
    items.forEach(it=>{
      const L = norm(it.job).charAt(0).toUpperCase();
      if(L && L !== currentL){
        currentL = L;
        html += `</div><div class="azSection"><h2 class="azLetter" id="dx-${esc(L)}">${esc(L)}</h2><div class="azDivider"></div></div><div class="metiersCols">`;
      }
      html += `<div class="metierItem"><a href="#" class="metierLink" data-job="${esc(it.job)}" data-cat="${esc(it.cat)}">${esc(it.job)}</a></div>`;
    });
    html += "</div>";
    els.host.innerHTML = html;

    // click -> modal
    els.host.addEventListener("click", (e)=>{
      const a = e.target.closest("a.metierLink");
      if(!a) return;
      e.preventDefault();
      openModal(a.getAttribute("data-job") || "", a.getAttribute("data-cat") || "");
    });
  }

  function applySearch(items, query){
    const q = norm(query).toLowerCase();
    if(!q) return items;
    return items.filter(it => it.job.toLowerCase().includes(q) || it.cat.toLowerCase().includes(q));
  }

  function setCount(n){
    if(!els.count) return;
    els.count.textContent = `${n} métier(s)`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if(!els.host) return;
    try{
      const lex = await loadLexique();
      const all = flatten(lex);

      const refresh = () => {
        const filtered = applySearch(all, els.search ? els.search.value : "");
        render(filtered);
        setCount(filtered.length);
      };

      if(els.search){
        els.search.addEventListener("input", refresh);
      }

      // pre-open via ?open=... (optional)
      refresh();
    }catch(e){
      console.error(e);
      if(els.host) els.host.innerHTML = '<div class="notice err">Impossible de charger le lexique métiers.</div>';
      if(els.count) els.count.textContent = "—";
    }
  });
})();
