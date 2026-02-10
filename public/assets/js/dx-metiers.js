// assets/js/dx-metiers.js (v3)
// Lexique métiers (A→Z) — compact, clic métier => popup 3 actions (demande / proposer / voir offreurs)
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function norm(s){
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function firstLetter(label){
    const n = norm(label);
    const m = n.match(/[a-z0-9]/i);
    return m ? m[0].toUpperCase() : "#";
  }

  async function loadServices(){
    // services_devisexpress974.js should expose SERVICES_DEVISEXPRESS974 or similar
    if (window.SERVICES_DEVISEXPRESS974 && Array.isArray(window.SERVICES_DEVISEXPRESS974)){
      return window.SERVICES_DEVISEXPRESS974;
    }
    // fallback: try fetch json if exists
    try{
      const r = await fetch("./services_devisexpress974.json", { cache:"no-store" });
      if (r.ok) return await r.json();
    }catch(e){}
    return [];
  }

  function buildIndex(items){
    const byLetter = new Map();
    for (const it of items){
      const L = firstLetter(it.label);
      if(!byLetter.has(L)) byLetter.set(L, []);
      byLetter.get(L).push(it);
    }
    // sort letters, keep # at end if any
    const letters = Array.from(byLetter.keys()).sort((a,b)=>{
      if(a === "#") return 1;
      if(b === "#") return -1;
      return a.localeCompare(b, "fr");
    });
    for (const L of letters){
      byLetter.get(L).sort((a,b)=> (a.label||"").localeCompare(b.label||"", "fr"));
    }
    return { letters, byLetter };
  }

  async function loadCounts(){
    // Best effort: backend action returns { ok:true, counts:{ "plombier":12, ... } } or { ok:true, data:{...} }
    try{
      if(!window.DX_API) return {};
      const r = await window.DX_API.postAny(["getOffreursCountByService","getOfferersCountByService","getOffreursCount"], {});
      if(!r || !r.ok) return {};
      return r.counts || r.data || r.result || {};
    }catch(e){
      return {};
    }
  }

  function openMetierModal(label){
    const modal = $("dxMetierModal");
    const title = $("dxMetierTitle");
    const aDem = $("dxMetierDoDemande");
    const aOff = $("dxMetierDoOffer");
    const aView = $("dxMetierDoView");

    if(title) title.textContent = label;

    const qs = encodeURIComponent(label);
    if(aDem) aDem.href = "./demande.html?service=" + qs;
    if(aOff) aOff.href = "./offreur-register.html?service=" + qs;
    if(aView) aView.href = "./offreurs.html?service=" + qs;

    modal?.classList.add("isOpen");
    modal?.setAttribute("aria-hidden","false");
  }

  function closeMetierModal(){
    const modal = $("dxMetierModal");
    modal?.classList.remove("isOpen");
    modal?.setAttribute("aria-hidden","true");
  }

  function getCountForLabel(counts, label){
    // try multiple keys
    const keys = [
      label,
      norm(label),
      norm(label).replace(/\s+/g,"-"),
      norm(label).replace(/\s+/g,"_"),
    ];
    for (const k of keys){
      if(counts && typeof counts[k] === "number") return counts[k];
    }
    return null;
  }

  function formatCount(c){
    if(c === null || c === undefined) return "";
    if(c <= 0) return ""; // avoid showing 0 (site "vide")
    if(c === 1) return "1 offreur";
    return `${c} offreurs`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const input = $("metierSearch");
    const countEl = $("metierCount");
    const list = $("metierList");

    const sp = new URLSearchParams(location.search);
    const q0 = (sp.get("q") || "").trim();
    if(input && q0) input.value = q0;

    const all = await loadServices();
    const clean = (all || []).map(s => ({
      service_id: s.service_id || "",
      label: s.label || s.name || "",
      category: s.category || s.cat || "Autres"
    })).filter(x => x.label);

    // filter by search
    function filterItems(q){
      const nq = norm(q);
      if(!nq) return clean;
      return clean.filter(it => {
        const label = norm(it.label);
        const cat = norm(it.category);
        const sid = norm(it.service_id);
        return label.includes(nq) || cat.includes(nq) || sid.includes(nq);
      });
    }

    // modal close handlers
    const modal = $("dxMetierModal");
    modal?.addEventListener("click", (e)=>{
      const t = e.target;
      if(t && t.getAttribute && t.getAttribute("data-close")==="1") closeMetierModal();
    });
    document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && modal?.classList.contains("isOpen")) closeMetierModal(); });

    const counts = await loadCounts();

    function render(items){
      if(!list) return;
      list.innerHTML = "";

      const { letters, byLetter } = buildIndex(items);

      let total = items.length;
      if(countEl) countEl.textContent = `${total} métiers`;

      for (const L of letters){
        const section = document.createElement("section");
        section.className = "metierSection";

        const h = document.createElement("h3");
        h.className = "metierLetter";
        h.textContent = L;
        section.appendChild(h);

        const ul = document.createElement("div");
        ul.className = "metierGrid";

        for (const it of byLetter.get(L)){
          const item = document.createElement("button");
          item.type = "button";
          item.className = "metierItemBtn";

          const left = document.createElement("span");
          left.className = "metierLabel";
          left.textContent = it.label;

          const c = getCountForLabel(counts, it.label);
          const right = document.createElement("span");
          right.className = "metierCountPill";
          right.textContent = formatCount(c);

          if(!right.textContent) right.style.display = "none";

          item.appendChild(left);
          item.appendChild(right);

          item.addEventListener("click", ()=> openMetierModal(it.label));
          ul.appendChild(item);
        }

        section.appendChild(ul);
        list.appendChild(section);
      }
    }

    render(filterItems(q0));

    input?.addEventListener("input", ()=>{
      render(filterItems(input.value || ""));
    });
  });
})();
