/*!
 * DevisExpress974 — DX Services Loader
 * - Popule les <select> métiers depuis le lexique unique assets/data/lexique-metiers.json
 *   (fallback: window.DX_SERVICES / services JSON legacy)
 * - Normalise les communes + filtre selon la zone
 * Safe: si rien n'existe, ne casse rien.
 */
(function () {
  "use strict";

  const COMMUNES_ALL = [
    "Saint-Denis",
    "Sainte-Marie",
    "Sainte-Suzanne",
    "Saint-André",
    "Bras-Panon",
    "Saint-Benoît",
    "Sainte-Rose",
    "Salazie",
    "La Plaine-des-Palmistes",
    "Saint-Philippe",
    "Saint-Joseph",
    "Petite-Île",
    "Saint-Pierre",
    "Le Tampon",
    "Entre-Deux",
    "Saint-Louis",
    "Les Avirons",
    "L’Étang-Salé",
    "Cilaos",
    "Saint-Leu",
    "Trois-Bassins",
    "Saint-Paul",
    "Le Port",
    "La Possession"
  ];

  const COMMUNES_BY_ZONE = {
    "Nord": ["Saint-Denis", "Sainte-Marie", "Sainte-Suzanne"],
    "Est": ["Saint-André", "Bras-Panon", "Saint-Benoît", "Sainte-Rose", "Salazie", "La Plaine-des-Palmistes", "Saint-Philippe"],
    "Sud": ["Saint-Joseph", "Petite-Île", "Saint-Pierre", "Le Tampon", "Entre-Deux", "Saint-Louis", "Les Avirons", "L’Étang-Salé", "Cilaos"],
    "Ouest": ["Saint-Leu", "Trois-Bassins", "Saint-Paul", "Le Port", "La Possession"]
  };

  function $(id) { return document.getElementById(id); }

  function groupByCategory_(items) {
    const m = new Map();
    (items || []).forEach(s => {
      const cat = String(s.category || "Autres").trim() || "Autres";
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat).push(s);
    });
    // tri des categories + tri des labels
    const cats = Array.from(m.keys()).sort((a,b)=>a.localeCompare(b,"fr"));
    const out = [];
    cats.forEach(cat => {
      const arr = m.get(cat).slice().sort((a,b)=>String(a.label).localeCompare(String(b.label),"fr"));
      out.push([cat, arr]);
    });
    return out;
  }

  function fillServiceSelect_(selectEl, services) {
    if (!selectEl) return;

    // garder le 1er option "placeholder" si présent
    const keepFirst = selectEl.querySelector("option") ? selectEl.querySelector("option").cloneNode(true) : null;

    // clear
    selectEl.innerHTML = "";
    if (keepFirst) selectEl.appendChild(keepFirst);
    else {
      const opt0 = document.createElement("option");
      opt0.value = "";
      // placeholder contextuel
      if (selectEl.id === "serviceFilter") opt0.textContent = "Tous les métiers";
      else opt0.textContent = "Choisir un métier…";
      selectEl.appendChild(opt0);
    }

    const groups = groupByCategory_(services);
    groups.forEach(([cat, arr]) => {
      const og = document.createElement("optgroup");
      og.label = cat;
      arr.forEach(s => {
        const opt = document.createElement("option");
        // IMPORTANT: on garde le label en value pour rester compatible avec le backend actuel (colonne "Service")
        opt.value = String(s.label || "").trim();
        opt.textContent = String(s.label || "").trim();
        og.appendChild(opt);
      });
      selectEl.appendChild(og);
    });

    // Ajouter "Autre" à la fin (utile)
    const optAutre = document.createElement("option");
    optAutre.value = "Autre";
    optAutre.textContent = "Autre (préciser)";
    selectEl.appendChild(optAutre);
  }

  function fillCommuneSelect_(communeEl, list, currentValue) {
    if (!communeEl) return;
    const placeholder = communeEl.querySelector("option") ? communeEl.querySelector("option").cloneNode(true) : null;

    communeEl.innerHTML = "";
    if (placeholder) communeEl.appendChild(placeholder);
    else {
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Choisir une commune…";
      communeEl.appendChild(opt0);
    }

    (list || []).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      communeEl.appendChild(opt);
    });

    if (currentValue && list.includes(currentValue)) {
      communeEl.value = currentValue;
    } else {
      // si currentValue était déjà dans placeholder, ok
      if (currentValue && currentValue !== "" && communeEl.querySelector(`option[value="${CSS.escape(currentValue)}"]`)) {
        communeEl.value = currentValue;
      }
    }
  }

  function setupZoneCommune_() {
    const zoneEl = $("zone");
    const communeEl = $("commune");
    if (!zoneEl || !communeEl) return;

    // normalise une 1ere fois (si tu avais une liste partielle, on met la liste complète)
    fillCommuneSelect_(communeEl, COMMUNES_ALL, communeEl.value);

    zoneEl.addEventListener("change", () => {
      const z = zoneEl.value;
      const current = communeEl.value;
      if (!z || z === "Sur toute l'île") {
        fillCommuneSelect_(communeEl, COMMUNES_ALL, current);
        return;
      }
      const list = COMMUNES_BY_ZONE[z] || COMMUNES_ALL;
      fillCommuneSelect_(communeEl, list, current);
    });
  }

  function flattenLexiqueToServices_(lex){
  // lexique-metiers.json: { categories:[{label, jobs:[{label}]}] }
  const out = [];
  try{
    const cats = Array.isArray(lex && lex.categories) ? lex.categories : [];
    cats.forEach(cat=>{
      const catLabel = String(cat.label || cat.name || cat.title || "Autres").trim() || "Autres";
      const jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
      jobs.forEach(j=>{
        const jobLabel = String(j.label || j.name || j.title || "").trim();
        if(!jobLabel) return;
        out.push({ label: jobLabel, category: catLabel });
      });
    });
  }catch(e){}
  return out;
}

async function loadServices_() {
  // Source unique (prioritaire) : lexique-metiers.json
  try {
    const res = await fetch("./assets/data/lexique-metiers.json?v=1", { cache: "no-store" });
    if (res.ok) {
      const lex = await res.json();
      const flat = flattenLexiqueToServices_(lex);
      if (flat && flat.length) return flat;
    }
  } catch (e) {
    console.warn("[DX] Impossible de charger lexique-metiers.json:", e);
  }

  // Back-compat: window.DX_SERVICES
  if (Array.isArray(window.DX_SERVICES) && window.DX_SERVICES.length) return window.DX_SERVICES;

  // Back-compat: JSON legacy
  try {
    const res = await fetch("./assets/data/services_devisexpress974.json?v=1", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data.services || []);
    if (Array.isArray(arr) && arr.length) return arr;
  } catch (e) {
    console.warn("[DX] Impossible de charger services_devisexpress974.json:", e);
  }

  return [];
}
    return [];
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Services
    const services = await loadServices_();
    if (services && services.length) {
      fillServiceSelect_($("typeService"), services);   // demande.html
      fillServiceSelect_($("service"), services);       // offreur-register.html / offreur-compte.html
      fillServiceSelect_($("serviceFilter"), services); // mur-demandes.html / offreurs.html
// Pré-sélection via URL (?service=...)
try{
  const sp = new URLSearchParams(location.search);
  const wanted = (sp.get("service") || "").trim();
  if(wanted){
    const selA = $("typeService");
    const selB = $("service");
    const selC = $("serviceFilter");
    [selA, selB, selC].forEach(sel=>{
      if(!sel) return;
      // si l'option existe, on la sélectionne
      const opt = sel.querySelector(`option[value="${CSS.escape(wanted)}"]`);
      if(opt) sel.value = wanted;
    });
    // déclenchement change pour que les pages recalculent si besoin
    const selC = $("serviceFilter");
    if(selC) selC.dispatchEvent(new Event("change", { bubbles:true }));
  }
}catch(e){}


      // PATCH22: recherche dans les listes (métier)
      if (window.DXSearchSelect) {
        const a = $("typeService");
        const b = $("service");
        const c = $("serviceFilter");
        if (a) window.DXSearchSelect.enhance(a, { placeholder: "Rechercher un métier…" });
        if (b) window.DXSearchSelect.enhance(b, { placeholder: "Rechercher un métier…" });
        if (c) window.DXSearchSelect.enhance(c, { placeholder: "Rechercher un métier…" });
        if (a) window.DXSearchSelect.refresh(a);
        if (b) window.DXSearchSelect.refresh(b);
        if (c) window.DXSearchSelect.refresh(c);
      }
    }
    // Zone/commune
    setupZoneCommune_();
  });
})();
