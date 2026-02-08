// assets/js/dx-metiers.js
// Page "Tous les métiers (A→Z)" — compatible avec services_devisexpress974.json ou window.DX_SERVICES
(() => {
  "use strict";

  function $(id){ return document.getElementById(id); }

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
    // 1) JSON (Netlify / serveur)
    try{
      const res = await fetch("./services_devisexpress974.json", { cache: "no-store" });
      if(res.ok){
        const data = await res.json();
        if(Array.isArray(data) && data.length) return data;
      }
    }catch(e){ /* ignore */ }

    // 2) fallback JS
    if (Array.isArray(window.DX_SERVICES) && window.DX_SERVICES.length){
      return window.DX_SERVICES;
    }

    return [];
  }

  function buildAzNav(letters){
    const host = $("azNav");
    if(!host) return;
    host.innerHTML = "";
    letters.forEach(L => {
      const a = document.createElement("a");
      a.href = "#az-" + encodeURIComponent(L);
      a.textContent = L;
      host.appendChild(a);
    });
  }

  function renderGroups(items){
    const host = $("metiersHost");
    if(!host) return;

    const groups = new Map();
    items.forEach(it => {
      const L = firstLetter(it.label || it.name || "");
      if(!groups.has(L)) groups.set(L, []);
      groups.get(L).push(it);
    });

    const letters = Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b,"fr"));
    buildAzNav(letters);

    host.innerHTML = "";

    letters.forEach(L => {
      const sec = document.createElement("section");
      sec.className = "azSection";
      sec.id = "az-" + L;

      const h = document.createElement("h2");
      h.className = "azLetter";
      h.textContent = L;
      sec.appendChild(h);

      const div = document.createElement("div");
      div.className = "azDivider";
      sec.appendChild(div);

      const list = document.createElement("div");
      list.className = "metiersList";

      const arr = groups.get(L).slice().sort((a,b)=>String(a.label).localeCompare(String(b.label),"fr"));
      arr.forEach(it => {
        const label = String(it.label || "").trim();
        const cat = String(it.category || "Autres").trim();

        const card = document.createElement("div");
        card.className = "metierCard";

        const t = document.createElement("p");
        t.className = "metierLabel";
        t.textContent = label || "—";
        card.appendChild(t);

        const c = document.createElement("p");
        c.className = "metierCat";
        c.textContent = cat;
        card.appendChild(c);

        const btns = document.createElement("div");
        btns.className = "metierBtns";

        const a1 = document.createElement("a");
        a1.className = "primary";
        a1.href = "./mur-demandes.html?service=" + encodeURIComponent(label);
        a1.textContent = "Voir les demandes";
        btns.appendChild(a1);

        const a2 = document.createElement("a");
        a2.href = "./demande.html?service=" + encodeURIComponent(label);
        a2.textContent = "Faire une demande";
        btns.appendChild(a2);

        card.appendChild(btns);
        list.appendChild(card);
      });

      sec.appendChild(list);
      host.appendChild(sec);
    });
  }

  function applySearch(all, q){
    const nq = norm(q);
    if(!nq) return all;

    // recherche simple: label + category + service_id
    return all.filter(it => {
      const label = norm(it.label);
      const cat = norm(it.category);
      const sid = norm(it.service_id);
      return label.includes(nq) || cat.includes(nq) || sid.includes(nq);
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const input = $("metierSearch");
    const count = $("metierCount");

    const sp = new URLSearchParams(location.search);
    const q0 = (sp.get("q") || "").trim();
    if(input && q0) input.value = q0;

    const all = await loadServices();
    // sécurité: normaliser structure
    const clean = (all || []).map(s => ({
      service_id: s.service_id || "",
      label: s.label || s.name || "",
      category: s.category || "Autres"
    })).filter(s => s.label);

    function refresh(){
      const q = input ? input.value : "";
      const items = applySearch(clean, q);
      if(count) count.textContent = items.length + " métiers";
      renderGroups(items);
    }

    if(input){
      input.addEventListener("input", () => refresh());
      input.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
          input.value = "";
          refresh();
        }
      });
    }

    refresh();
  });
})();
