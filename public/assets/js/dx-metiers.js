// assets/js/dx-metiers.js (v22) — Index métiers (A→Z) + recherche + popup 3 actions
// Source unique : services_devisexpress974.json (mêmes libellés que les filtres / formulaires)
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
  function nlow(s){ return norm(s).toLowerCase(); }

  async function loadServices(){
    const res = await fetch("./assets/data/services_devisexpress974.json?v=1", { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function flatten(list){
    const out = [];
    (Array.isArray(list) ? list : []).forEach(x=>{
      if(!x) return;
      const catRaw = norm(x.category || "Autres") || "Autres";
      const parts = catRaw.split("•").map(s=>norm(s)).filter(Boolean);
      const main = parts[0] || "Autres";
      const sub = parts[1] || "";
      const cat = sub ? `${main} • ${sub}` : main;
      const raw = norm(x.label || x.name || x.title || "");
      if(!raw) return;

      // Harmonisation "Autre"
      const isAutre = nlow(raw).startsWith("autre");
      out.push({
        cat,
        job: isAutre ? "Autre (préciser)" : raw,
        value: isAutre ? "Autre" : raw
      });
    });

    // unique par value
    const seen = new Set();
    const uniq = [];
    out.forEach(it=>{
      if(seen.has(it.value)) return;
      seen.add(it.value);
      uniq.push(it);
    });

    // tri global A→Z
    uniq.sort((a,b)=>byFR(a.job,b.job));
    return uniq;
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

  function openModal(displayJob, cat, value){
    ensureModal();
    const modal = document.getElementById("dxJobModal");
    const title = document.getElementById("dxModalTitle");
    const sub = document.getElementById("dxModalSub");
    title.textContent = displayJob;
    sub.textContent = cat ? `Catégorie : ${cat}` : "";

    const q = encodeURIComponent(value || displayJob);
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
      html += `<div class="metierItem"><a href="#" class="metierLink" data-job="${esc(it.job)}" data-cat="${esc(it.cat)}" data-value="${esc(it.value)}">${esc(it.job)}</a></div>`;
    });
    html += "</div>";
    els.host.innerHTML = html;

    // click -> modal
    els.host.addEventListener("click", (e)=>{
      const a = e.target.closest("a.metierLink");
      if(!a) return;
      e.preventDefault();
      openModal(
        a.getAttribute("data-job") || "",
        a.getAttribute("data-cat") || "",
        a.getAttribute("data-value") || ""
      );
    });
  }

  function applySearch(items, query){
    const q = nlow(query);
    if(!q) return items;
    return items.filter(it => nlow(it.job).includes(q) || nlow(it.cat).includes(q));
  }

  function setCount(n){
    if(!els.count) return;
    els.count.textContent = `${n} métier(s)`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if(!els.host) return;
    try{
      const list = await loadServices();
      const all = flatten(list);

      const refresh = () => {
        const filtered = applySearch(all, els.search ? els.search.value : "");
        render(filtered);
        setCount(filtered.length);
      };

      if(els.search){
        els.search.addEventListener("input", refresh);
      }

      refresh();
    }catch(e){
      console.error(e);
      if(els.host) els.host.innerHTML = '<div class="notice err">Impossible de charger la liste des métiers.</div>';
      if(els.count) els.count.textContent = "—";
    }
  });
})();