// assets/js/dx-metiers.js (v2)
// Lexique métiers (A→Z) — compact, clic métier => pré-remplit la demande
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
    for(let i=0;i<n.length;i++){
      const ch = n[i];
      if(/[a-z0-9]/i.test(ch)) return ch.toUpperCase();
    }
    return "AUTRES"; // plus de '#'
  }

  async function loadServices(){
    try{
      const res = await fetch("./services_devisexpress974.json", { cache: "no-store" });
      if(res.ok){
        const data = await res.json();
        if(Array.isArray(data) && data.length) return data;
      }
    }catch(e){}
    if(Array.isArray(window.DX_SERVICES) && window.DX_SERVICES.length){
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
    const others = [];
    items.forEach(it => {
      const L = firstLetter(it.label || it.name || "");
      if(!L){ others.push(it); return; }
      if(!groups.has(L)) groups.set(L, []);
      groups.get(L).push(it);
    });

    const letters = Array.from(groups.keys()).sort((a,b)=>a.localeCompare(b,"fr"));
    buildAzNav(letters);

    host.innerHTML = "";

    function renderSection(title, arr){
      const sec = document.createElement("section");
      sec.className = "azSection";
      sec.id = "az-" + title;

      const h = document.createElement("h2");
      h.className = "azLetter";
      h.textContent = title;
      sec.appendChild(h);

      const div = document.createElement("div");
      div.className = "azDivider";
      sec.appendChild(div);

      const ul = document.createElement("div");
      ul.className = "metiersCols";

      const sorted = arr.slice().sort((a,b)=>String(a.label).localeCompare(String(b.label),"fr"));
      sorted.forEach(it => {
        const label = String(it.label || "").trim();
        const item = document.createElement("div");
        item.className = "metierItem";

        const a = document.createElement("a");
        a.className = "metierLink";
        a.href = "./demande.html?service=" + encodeURIComponent(label);
        a.textContent = label;
        item.appendChild(a);
        ul.appendChild(item);
      });

      sec.appendChild(ul);
      host.appendChild(sec);
    }

    letters.forEach(L => renderSection(L, groups.get(L) || []));

    if(others.length){
      renderSection("Autres", others);
    }
  }

  function applySearch(all, q){
    const nq = norm(q);
    if(!nq) return all;
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
      input.addEventListener("input", refresh);
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
