// assets/js/dx-metiers.js (v9)
// Lexique métiers (A→Z) — clic métier => popup (Demande / Voir demandes / Devenir offreur)
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function norm(s){
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function firstLetter(label){
    const n = norm(label);
    for(let i=0;i<n.length;i++){
      const ch = n[i];
      if(/[a-z0-9]/i.test(ch)) return ch.toUpperCase();
    }
    return "AUTRES";
  }

  async function loadLexique(){
    // Prefer lexique-metiers.json (categories + jobs + synonyms)
    try{
      const res = await fetch("./assets/data/lexique-metiers.json", { cache: "no-store" });
      if(res.ok){
        const data = await res.json();
        if(data && Array.isArray(data.categories)) return data;
      }
    }catch(e){}
    return { categories: [] };
  }

  function flattenJobs(lexique){
    const jobs = [];
    const seen = new Set();
    (lexique.categories || []).forEach(cat => {
      const catLabel = cat.label || "";
      const arr = cat.jobs || cat.metiers || [];
      arr.forEach(j => {
        const label = (j && j.label) ? String(j.label) : "";
        if(!label) return;
        const key = norm(label);
        if(!key || seen.has(key)) return;
        seen.add(key);
        jobs.push({ label, key, cat: catLabel });
      });
    });
    jobs.sort((a,b) => a.label.localeCompare(b.label, "fr", { sensitivity:"base" }));
    return jobs;
  }

  function buildAzNav(letters){
    const host = $("azNav");
    if(!host) return;
    host.innerHTML = "";
    letters.forEach(L => {
      const a = document.createElement("a");
      a.href = "#L_" + encodeURIComponent(L);
      a.className = "azItem";
      a.textContent = L;
      host.appendChild(a);
    });
  }

  function openModal(serviceLabel){
    const modal = $("metierModal");
    const title = $("metierModalTitle");
    const btnDemande = $("metierBtnDemande");
    const btnMur = $("metierBtnMur");
    const btnOffreur = $("metierBtnOffreur");

    if(!modal || !title || !btnDemande || !btnMur || !btnOffreur) return;

    title.textContent = serviceLabel;

    const q = encodeURIComponent(serviceLabel);
    btnDemande.href = "./demande.html?service=" + q;
    btnMur.href = "./mur-demandes.html?service=" + q;
    btnOffreur.href = "./offreur-register.html?service=" + q;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(){
    const modal = $("metierModal");
    if(!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function wireModal(){
    const modal = $("metierModal");
    if(!modal) return;

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if(t && (t.id === "metierModal" || t.closest(".dxModalClose"))) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") closeModal();
    });
  }

  function renderList(jobs){
    const host = $("metiersList");
    if(!host) return;

    // group by first letter
    const groups = {};
    jobs.forEach(j => {
      const L = firstLetter(j.label);
      (groups[L] ||= []).push(j);
    });

    const letters = Object.keys(groups).sort((a,b)=> a.localeCompare(b, "fr", { sensitivity:"base" }));
    buildAzNav(letters);

    host.innerHTML = "";
    letters.forEach(L => {
      const section = document.createElement("section");
      section.className = "letterBlock";
      section.id = "L_" + L;

      const h = document.createElement("h2");
      h.className = "letterTitle";
      h.textContent = L;
      section.appendChild(h);

      const grid = document.createElement("div");
      grid.className = "metiersGrid";

      groups[L].forEach(j => {
        const a = document.createElement("a");
        a.href = "./demande.html?service=" + encodeURIComponent(j.label);
        a.className = "metierLink";
        a.textContent = j.label;
        a.title = (j.cat ? (j.cat + " • ") : "") + j.label;
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          openModal(j.label);
        });
        grid.appendChild(a);
      });

      section.appendChild(grid);
      host.appendChild(section);
    });
  }

  async function init(){
    wireModal();

    const lexique = await loadLexique();
    const jobs = flattenJobs(lexique);

    // search
    const search = $("metiersSearch");
    let all = jobs;

    function apply(){
      const q = norm(search ? search.value : "");
      if(!q){
        renderList(all);
        return;
      }
      const filtered = all.filter(j => j.key.includes(q));
      renderList(filtered);
    }

    if(search){
      search.addEventListener("input", apply);
    }

    renderList(all);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
