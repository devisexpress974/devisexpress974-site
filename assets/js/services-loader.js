// assets/js/services-loader.js
async function DX_loadServices() {
  const res = await fetch("./assets/data/services_devisexpress974.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger services_devisexpress974.json");
  return res.json(); // [{service_id,label,category}, ...]
}

function DX_fillServiceSelect(selectEl, services, placeholder = "Choisir un métier…") {
  selectEl.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  // regroupe par catégorie
  const groups = new Map();
  for (const s of services) {
    const cat = s.category || "Autres";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(s);
  }

  // ordre stable
  for (const [cat, items] of [...groups.entries()]) {
    const og = document.createElement("optgroup");
    og.label = cat;

    for (const s of items) {
      const opt = document.createElement("option");
      // ✅ ZÉRO CASSE : on met la valeur = label (comme avant),
      // et on garde service_id en data pour plus tard.
      opt.value = s.label;
      opt.textContent = s.label;
      opt.dataset.serviceId = s.service_id;

      og.appendChild(opt);
    }
    selectEl.appendChild(og);
  }

  // PATCH22: rendre la liste "recherchable"
  if (window.DXSearchSelect) {
    window.DXSearchSelect.enhance(selectEl, { placeholder: "Rechercher un métier…" });
    window.DXSearchSelect.refresh(selectEl);
  }
}

// Utilitaire pour afficher/cacher "Autre"
function DX_bindAutre(selectEl, autreWrapEl) {
  function refresh() {
    const v = (selectEl.value || "").toLowerCase();
    const isAutre = v.startsWith("autre");
    autreWrapEl.style.display = isAutre ? "" : "none";
  }
  selectEl.addEventListener("change", refresh);
  refresh();
}
