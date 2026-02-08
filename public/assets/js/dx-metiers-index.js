// assets/js/dx-metiers-index.js
// Barre de recherche métier sur la page d'accueil.
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

  async function loadServices(){
    try{
      const res = await fetch("./services_devisexpress974.json", { cache: "no-store" });
      if(res.ok){
        const data = await res.json();
        if(Array.isArray(data) && data.length) return data;
      }
    }catch(e){}
    return Array.isArray(window.DX_SERVICES) ? window.DX_SERVICES : [];
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const input = $("indexMetierSearch");
    const dl = $("dxMetiersDatalist");
    const btn = $("btnMetierGo");
    if(!input || !btn) return;

    const list = await loadServices();
    const labels = (list || [])
      .map(s => String(s.label || "").trim())
      .filter(Boolean)
      .sort((a,b)=>a.localeCompare(b,"fr"));

    if(dl){
      dl.innerHTML = "";
      labels.forEach(lab => {
        const opt = document.createElement("option");
        opt.value = lab;
        dl.appendChild(opt);
      });
    }

    const labelsNorm = new Map();
    labels.forEach(lab => labelsNorm.set(norm(lab), lab));

    function go(){
      const v = (input.value || "").trim();
      if(!v){ location.href = "./metiers.html"; return; }

      const exact = labelsNorm.get(norm(v));
      if(exact){
        location.href = "./mur-demandes.html?service=" + encodeURIComponent(exact);
      }else{
        location.href = "./metiers.html?q=" + encodeURIComponent(v);
      }
    }

    btn.addEventListener("click", (e) => { e.preventDefault(); go(); });
    input.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){ e.preventDefault(); go(); }
      if(e.key === "Escape"){ input.value = ""; }
    });
  });
})();
