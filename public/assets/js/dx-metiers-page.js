// dx-metiers-page.js (PRO) — Index Métiers A→Z + recherche instantanée + pop-up 3 actions
(function(){
  "use strict";

  const DATA_URL = "./assets/data/lexique-metiers.json"; // source unique
  const azNav = document.getElementById("azNav");
  const azList = document.getElementById("azList");
  const q = document.getElementById("q");
  const hint = document.getElementById("hint");

  // Modal
  const modal = document.getElementById("metierModal");
  const modalTitle = document.getElementById("metierModalTitle");
  const modalCount = document.getElementById("metierModalCount");
  const actDemande = document.getElementById("metierActionDemande");
  const actDemandes = document.getElementById("metierActionDemandes");
  const actOffreurs = document.getElementById("metierActionOffreurs");

  function norm(s){
    return (s||"").toString().trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function openModal(label, count){
    if(!modal) return;
    modalTitle.textContent = label;
    if(typeof count === "number" && count > 0){
      modalCount.textContent = count + " offreur(s) disponible(s) pour ce métier.";
    }else{
      modalCount.textContent = "";
    }

    // 3 actions imposées
    if(actDemande) actDemande.href = "./faire-une-demande.html?service=" + encodeURIComponent(label);
    if(actDemandes) actDemandes.href = "./mur-demandes.html?service=" + encodeURIComponent(label);
    if(actOffreurs) actOffreurs.href = "./offreur-register.html?service=" + encodeURIComponent(label);

    modal.style.display = "block";
    modal.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(){
    if(!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  }

  if(modal){
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if(t && (t.hasAttribute("data-close") || t.classList.contains("dxModalOverlay"))){
        closeModal();
      }
    });
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });
  }

  async function loadLexique(){
    const res = await fetch(DATA_URL, { cache:"no-store" });
    if(!res.ok) throw new Error("lexique_load_failed");
    const data = await res.json();
    // data can be array of strings or array of objects
    const list = Array.isArray(data) ? data : (data.metiers || data.services || []);
    const names = list.map(x => (typeof x === "string" ? x : (x.nom || x.label || x.service || ""))).filter(Boolean);
    // unique + sort
    return Array.from(new Set(names)).sort((a,b)=>a.localeCompare(b,"fr"));
  }

  async function loadOffreursCounts(){
    // Optionnel : calcule le nombre d’offreurs par métier (si API dispo)
    const counts = new Map();
    if(!window.DX_API || !DX_API.post) return counts;

    try{
      const r = await DX_API.post("listOffreursPublic", {});
      const rows = (r && r.data) ? r.data : (r && r.offreurs ? r.offreurs : []);
      (rows||[]).forEach(o=>{
        const svc = String(o.service||o.Service||"").trim();
        if(!svc) return;
        counts.set(svc, (counts.get(svc)||0)+1);
      });
    }catch(e){
      // silencieux
    }
    return counts;
  }

  function buildAZNav(letters){
    if(!azNav) return;
    azNav.innerHTML = "";
    letters.forEach(L=>{
      const a = document.createElement("a");
      a.href = "#az_" + L;
      a.textContent = L;
      a.className = "dxBtn dxBtnGhost";
      a.style.padding = "6px 8px";
      a.style.fontSize = "14px";
      azNav.appendChild(a);
    });
  }

  function render(list, counts, query){
    if(!azList) return;
    azList.innerHTML = "";

    const nq = norm(query||"");
    const filtered = nq ? list.filter(x=>norm(x).includes(nq)) : list;

    if(hint){
      hint.textContent = filtered.length ? (filtered.length + " métier(s)") : "Aucun résultat";
    }

    // Group A→Z
    const groups = {};
    filtered.forEach(name=>{
      const first = norm(name).charAt(0).toUpperCase();
      const L = (first >= "A" && first <= "Z") ? first : "#";
      if(!groups[L]) groups[L]=[];
      groups[L].push(name);
    });

    const letters = Object.keys(groups).sort((a,b)=>a.localeCompare(b));
    buildAZNav(letters);

    letters.forEach(L=>{
      const section = document.createElement("section");
      section.id = "az_" + L;
      section.style.margin = "14px 0";

      const h3 = document.createElement("h3");
      h3.textContent = L;
      h3.style.margin = "10px 0";
      section.appendChild(h3);

      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
      grid.style.gap = "10px";

      (groups[L]||[]).forEach(label=>{
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card";
        btn.style.padding = "10px 12px";
        btn.style.textAlign = "left";
        btn.style.cursor = "pointer";
        btn.style.border = "1px solid #eee";
        btn.style.borderRadius = "14px";
        btn.style.background = "#fff";

        const top = document.createElement("div");
        top.style.display = "flex";
        top.style.alignItems = "center";
        top.style.justifyContent = "space-between";
        top.style.gap = "10px";

        const nameEl = document.createElement("div");
        nameEl.textContent = label;
        nameEl.style.fontWeight = "700";
        top.appendChild(nameEl);

        const c = counts.get(label) || 0;
        if(c > 0){
          const badge = document.createElement("span");
          badge.textContent = String(c);
          badge.className = "badge";
          badge.style.background = "#f3f4f6";
          badge.style.color = "#111827";
          top.appendChild(badge);
        }

        btn.appendChild(top);

        btn.addEventListener("click", ()=>openModal(label, counts.get(label)||0));
        grid.appendChild(btn);
      });

      section.appendChild(grid);
      azList.appendChild(section);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try{
      const [metiers, counts] = await Promise.all([loadLexique(), loadOffreursCounts()]);
      render(metiers, counts, "");
      if(q){
        q.addEventListener("input", () => render(metiers, counts, q.value));
      }
    }catch(e){
      if(hint) hint.textContent = "Erreur de chargement du lexique.";
      console.warn(e);
    }
  });
})();
