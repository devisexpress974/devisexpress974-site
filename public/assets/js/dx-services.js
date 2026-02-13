/*!
 * DevisExpress974 — DX Services Loader
 * - Popule les <select> services depuis window.DX_SERVICES (fallback: fetch JSON)
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
      opt0.textContent = "Choisir un service…";
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

  async function loadServices_() {
    // 1) window.DX_SERVICES (compatible file://)
    if (Array.isArray(window.DX_SERVICES) && window.DX_SERVICES.length) return window.DX_SERVICES;

    // 2) fetch JSON (Netlify / serveur)
    try {
      const res = await fetch("./assets/data/lexique-metiers.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const out = [];
      const cats = Array.isArray(data.categories) ? data.categories : [];
      cats.forEach(cat => {
        const catLabel = String(cat.label || "").trim();
        const jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
        jobs.forEach(job => {
          const label = String(job.label || "").trim();
          if (!label) return;
          out.push({ category: catLabel || "Autres", label });
        });
      });
      if (out.length) return out;
    } catch (e) {
      console.warn("[DX] Impossible de charger services_devisexpress974.json:", e);
    }
    return [];
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Services
    const services = await loadServices_();
    if (services && services.length) {
      fillServiceSelect_($("typeService"), services);   // demande.html
      fillServiceSelect_($("service"), services);       // offreur-register.html

      // PATCH22: recherche dans les listes (métier)
      if (window.DXSearchSelect) {
        const a = $("typeService");
        const b = $("service");
        if (a) window.DXSearchSelect.enhance(a, { placeholder: "Rechercher un métier…" });
        if (b) window.DXSearchSelect.enhance(b, { placeholder: "Rechercher un métier…" });
        if (a) window.DXSearchSelect.refresh(a);
        if (b) window.DXSearchSelect.refresh(b);
      }
    }
    // Zone/commune
    setupZoneCommune_();
  });
})();
