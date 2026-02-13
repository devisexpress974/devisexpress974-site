/* DX Patch8 — zones -> communes (La Réunion 974)
   - Remplit automatiquement #commune en fonction de #zone
   - Fonctionne sur demande.html et offreur-register.html (si les IDs existent)
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
    "La Plaine-des-Palmistes",
    "Salazie",
    "Le Port",
    "La Possession",
    "Saint-Paul",
    "Trois-Bassins",
    "Saint-Leu",
    "Les Avirons",
    "Saint-Louis",
    "L'Étang-Salé",
    "Saint-Pierre",
    "Le Tampon",
    "Entre-Deux",
    "Saint-Joseph",
    "Petite-Île",
    "Saint-Philippe",
    "Cilaos"
  ];

  // Mapping simple (ajustable si tu veux) — micro-régions 974
  const ZONES = {
    "Nord": ["Saint-Denis", "Sainte-Marie", "Sainte-Suzanne"],
    "Est": ["Saint-André", "Bras-Panon", "Saint-Benoît", "Sainte-Rose", "La Plaine-des-Palmistes", "Salazie"],
    "Ouest": ["Le Port", "La Possession", "Saint-Paul", "Trois-Bassins", "Saint-Leu"],
    "Sud": ["Les Avirons", "Saint-Louis", "L'Étang-Salé", "Saint-Pierre", "Le Tampon", "Entre-Deux", "Saint-Joseph", "Petite-Île", "Saint-Philippe", "Cilaos"]
  };

  // Exports (référentiel zones/communes unique)
  try {
    window.DX_ZONES = ZONES;
    window.DX_COMMUNES_ALL = COMMUNES_ALL;
  } catch(e) {}


  function normalizeZone(v) {
    return (v || "").toString().trim();
  }

  function buildOptions(selectEl, communes, keepValue) {
    // placeholder
    selectEl.innerHTML = "";
    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "Choisir…";
    selectEl.appendChild(o0);

    communes.forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      selectEl.appendChild(o);
    });

    if (keepValue && communes.indexOf(keepValue) !== -1) {
      selectEl.value = keepValue;
    }

    // PATCH22: refresh du mode "recherche" après re-remplissage
    if (window.DXSearchSelect) window.DXSearchSelect.refresh(selectEl);
  }

  function getListForZone(zoneValue) {
    const z = normalizeZone(zoneValue);

    if (!z) return COMMUNES_ALL;
    if (z === "Sur toute l'île" || z === "Toute l'île" || z === "Toute l’ile") return COMMUNES_ALL;

    return ZONES[z] || COMMUNES_ALL;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const zoneEl = document.getElementById("zone");
    const communeEl = document.getElementById("commune");
    if (!zoneEl || !communeEl) return;

    // 1) remplissage initial
    buildOptions(communeEl, getListForZone(zoneEl.value), communeEl.value);

    // PATCH22: recherche dans les communes (optionnel)
    if (window.DXSearchSelect) {
      window.DXSearchSelect.enhance(communeEl, { placeholder: "Rechercher une commune…" });
      window.DXSearchSelect.refresh(communeEl);
    }

    // 2) mise à jour quand la zone change
    zoneEl.addEventListener("change", function () {
      const keep = communeEl.value; // si l'ancien choix est encore possible, on le garde
      buildOptions(communeEl, getListForZone(zoneEl.value), keep);
    });
  });
})();
