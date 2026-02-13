// offreurs.js (v49)
document.addEventListener("DOMContentLoaded", () => {
  const SERVICES_BY_CAT = {
  "BTP / Rénovation": [
    "Rénovation intérieure",
    "Maçonnerie",
    "Peinture",
    "Carrelage",
    "Parquet / sol",
    "Sol souple (PVC/Lino)",
    "Plaquiste / plâtre",
    "Cloisons / isolation",
    "Faux plafond",
    "Enduit / ravalement façade",
    "Démolition",
    "Terrassement",
    "VRD / raccordements",
    "Étanchéité",
    "Béton / dalle",
    "Escalier / garde-corps"
  ],
  "Toiture / Menuiserie / Fermetures": [
    "Charpente",
    "Couverture / toiture",
    "Gouttières",
    "Nettoyage toiture",
    "Zinguerie",
    "Menuiserie bois",
    "Menuiserie alu/PVC",
    "Pose fenêtres/portes",
    "Volets roulants",
    "Portail / clôture",
    "Serrurerie",
    "Vitrier",
    "Stores / pergola",
    "Rideaux métalliques"
  ],
  "Électricité / Plomberie / Clim": [
    "Électricité",
    "Mise aux normes électrique",
    "Tableau électrique",
    "Éclairage",
    "Plomberie",
    "Recherche de fuite",
    "Débouchage",
    "Chauffe-eau",
    "Salle de bain",
    "Climatisation",
    "Entretien clim",
    "Ventilation",
    "Chauffage",
    "Domotique",
    "Interphone / visiophone"
  ],
  "Extérieur / Jardin / Piscine": [
    "Jardinage",
    "Paysagisme",
    "Débroussaillage",
    "Élagage",
    "Abattage",
    "Arrosage / irrigation",
    "Terrasse bois",
    "Terrasse béton",
    "Allée / pavés",
    "Mur extérieur / clôture",
    "Piscine (entretien)",
    "Piscine (construction)",
    "Nettoyage façade",
    "Nettoyage haute pression",
    "Traitement anti-termites"
  ],
  "Maison / Nettoyage": [
    "Ménage",
    "Nettoyage fin de chantier",
    "Nettoyage vitres",
    "Nettoyage canapé / tapis",
    "Désinfection",
    "Lutte nuisibles (entreprise)",
    "Débarras",
    "Montage meubles",
    "Petits travaux"
  ],
  "Déménagement / Transport": [
    "Déménagement",
    "Manutention",
    "Livraison",
    "Monte-meubles"
  ],
  "Auto / Dépannage": [
    "Mécanique auto",
    "Carrosserie",
    "Pare-brise",
    "Pneus",
    "Dépannage / remorquage",
    "Nettoyage auto"
  ],
  "Informatique / Digital": [
    "Dépannage PC",
    "Installation / Wi‑Fi",
    "Sauvegarde / sécurité",
    "Création site web",
    "Graphisme / logos",
    "Montage vidéo",
    "Réseaux sociaux"
  ],
  "Événementiel": [
    "Photographe",
    "Vidéaste",
    "DJ",
    "Traiteur",
    "Décoration événement",
    "Location sono/lumière"
  ],
  "Cours / Services": [
    "Soutien scolaire",
    "Cours de musique",
    "Coaching",
    "Traduction",
    "Aide administrative"
  ]
};

  const ALL_SERVICES = Object.values(SERVICES_BY_CAT).flat();

  function fillServiceSelect(select, { includeAll = false } = {}) {
    if (!select) return;
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = includeAll ? "Tous" : "Choisir un domaine…";
    select.appendChild(first);

    for (const [cat, items] of Object.entries(SERVICES_BY_CAT)) {
      const og = document.createElement("optgroup");
      og.label = cat;
      items.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        og.appendChild(opt);
      });
      select.appendChild(og);
    }

    const other = document.createElement("option");
    other.value = "Autre";
    other.textContent = "Autre (préciser)";
    select.appendChild(other);
  }

  const ZONES = ["Nord","Sud","Est","Ouest"];
  const COMMUNES = [
    "Saint-Denis","Sainte-Marie","Sainte-Suzanne","Saint-André","Bras-Panon","Saint-Benoît",
    "Sainte-Rose","Saint-Philippe","Saint-Joseph","Petite-Île","Saint-Pierre","Le Tampon",
    "Entre-Deux","Saint-Louis","Les Avirons","L’Étang-Salé","Saint-Leu","Trois-Bassins",
    "Saint-Paul","La Possession","Le Port","Cilaos","Salazie","La Plaine-des-Palmistes"
  ];

  const $ = (id) => document.getElementById(id);
  const q = $("q");
  const serviceFilter = $("serviceFilter");
  const zoneFilter = $("zoneFilter");
  const communeFilter = $("communeFilter");
  const sort = $("sort");
  const btnReload = $("btnReload");
  const list = $("list");
  const empty = $("empty");
  const countBox = $("countBox");

  // PATCH22: recherche dans les filtres (métier/commune)
  if (window.DXSearchSelect) {
    if (serviceFilter) window.DXSearchSelect.enhance(serviceFilter, { placeholder: "Rechercher un métier…" });
    if (communeFilter) window.DXSearchSelect.enhance(communeFilter, { placeholder: "Rechercher une commune…" });
  }

  // état initial: filtres secondaires désactivés tant que le métier n’est pas choisi
  try{ zoneFilter.disabled = true; communeFilter.disabled = true; q.disabled = true; if(sort) sort.disabled = true; }catch(e){}
  if(empty){ empty.style.display = "block"; empty.textContent = "Sélectionne un domaine d’activité pour afficher les offreurs."; }
  if(countBox){ countBox.textContent = "0"; }


  
function fillServiceSelectGrouped(sel){
  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Choisir un métier…";
  sel.appendChild(optAll);

  const cats = SERVICES_BY_CAT || {};
  Object.keys(cats).forEach(cat=>{
    const group = document.createElement("optgroup");
    group.label = cat;
    (cats[cat] || []).forEach(s=>{
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      group.appendChild(o);
    });
    sel.appendChild(group);
  });
}

function fillSelect(select, items){
    const first = select.querySelector("option");
    select.innerHTML = "";
    select.appendChild(first);
    items.forEach(v=>{
      const opt = document.createElement("option");
      opt.value=v; opt.textContent=v;
      select.appendChild(opt);
    });
  }

  function normalize(s){
    return (s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"");
  }

  function esc(s){
    return (s??"").toString()
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  // =========================
  // Pagination / filtres (DX46)
  // =========================
  const STATE = {
    items: [],
    total: 0,
    offset: 0,
    limit: 24,
    loading: false
  };

  function stars(n){
    const v = Math.max(0, Math.min(5, Number(n||0)));
    const full = "★★★★★".slice(0, Math.round(v));
    const empty = "☆☆☆☆☆".slice(0, 5 - Math.round(v));
    return full + empty;
  }

  function sortItems(items){
    const mode = (sort && sort.value) ? sort.value : "note_desc";
    const arr = (items || []).slice();

    const nameOf = (o) => String(o.publicName || o.nom || o.Nom || o.Pseudo || "Offreur");
    const showOf = (o) => String(o.showNote || "OUI").toUpperCase() === "OUI";
    const noteOf = (o) => {
      if(!showOf(o)) return -1;
      const n = Number(o.noteMoyenne !== undefined ? o.noteMoyenne : (o.NoteMoyenne !== undefined ? o.NoteMoyenne : -1));
      return (isFinite(n) ? n : -1);
    };
    const avisOf = (o) => {
      if(!showOf(o)) return 0;
      const n = Number(o.nombreAvis !== undefined ? o.nombreAvis : (o.NombreAvis !== undefined ? o.NombreAvis : 0));
      return (isFinite(n) ? n : 0);
    };

    if(mode === "alpha_asc"){
      arr.sort((a,b) => nameOf(a).localeCompare(nameOf(b), "fr", { sensitivity:"base" }));
      return arr;
    }

    // défaut: note desc, puis nombre d'avis, puis nom
    arr.sort((a,b) => {
      const dn = noteOf(b) - noteOf(a);
      if(dn) return dn;
      const da = avisOf(b) - avisOf(a);
      if(da) return da;
      return nameOf(a).localeCompare(nameOf(b), "fr", { sensitivity:"base" });
    });
    return arr;
  }

  function render(items){
    list.innerHTML = "";

    if(!items.length){
      empty.style.display = "block";
      empty.textContent = (serviceFilter && serviceFilter.value) ? "Aucun offreur trouvé pour ces critères." : "Sélectionne un domaine d’activité pour afficher les offreurs.";
      return;
    }
    empty.style.display = "none";

    items = sortItems(items);

    items.forEach(o=>{
      const id = o.id || o.OffreurID || o.offreurId || "";
      const nom = o.publicName || o.nom || o.Nom || o.Pseudo || "Offreur";
      const service = o.service || o.Service || "";
      const zone = o.zone || o.Zone || "";
      const commune = o.commune || o.Commune || "";
      const desc = o.description || o.Description || "";

      // Note uniquement si showNote=OUI (Patch21) et champs présents
      const showNote = String(o.showNote || "OUI").toUpperCase() === "OUI";
      const note = Number(o.noteMoyenne || o.NoteMoyenne || 0);
      const nb = Number(o.nombreAvis || o.NombreAvis || 0);

      let badge = `<span class="badge">—</span>`;
      if(!showNote){
        badge = `<span class="badge badgeMuted">Note masquée</span>`;
      }else if(isFinite(note) && isFinite(nb) && nb > 0){
        badge = `<span class="badge">${stars(note)} <span style="opacity:.75;font-weight:800;">(${nb})</span></span>`;
      }

      const card = document.createElement("div");
      card.className = "itemCard";
      card.innerHTML = `
        <div class="itemTop">
          <div>
            <h3 class="itemTitle">${esc(nom)}</h3>
            <p class="itemMeta">${esc(service)}${commune ? " • " + esc(commune) : ""}${zone ? " • " + esc(zone) : ""}</p>
          </div>
          ${badge}
        </div>
        <p class="itemMeta" style="margin-top:10px;">${esc(desc).slice(0, 180)}${desc.length>180 ? "…" : ""}</p>
        <div class="btnRow" style="margin-top:12px;">
          <a class="btn" href="offreur-profil.html?id=${encodeURIComponent(id)}">Voir profil</a>
          <a class="btn btnPrimary" href="offreur-login.html">Contacter</a>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function ensurePager(){
    let pager = document.getElementById("offreursPager");
    if(pager) return pager;

    pager = document.createElement("div");
    pager.id = "offreursPager";
    pager.style.cssText = "display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0 6px 0;flex-wrap:wrap;";
    pager.innerHTML = `
      <div id="offreursPagerCount" style="font-weight:900;color:#1f2329;"></div>
      <button id="offreursMoreBtn" class="btn btnPrimary" type="button">Voir plus</button>
    `;
    list.insertAdjacentElement("afterend", pager);

    const btn = document.getElementById("offreursMoreBtn");
    if(btn){
      btn.addEventListener("click", () => {
        if(STATE.loading) return;
        fetchMore();
      });
    }
    return pager;
  }

  function setControlsDisabled(disabled){
    try{ zoneFilter.disabled = disabled; communeFilter.disabled = disabled; q.disabled = disabled; if(sort) sort.disabled = disabled; }catch(e){}
  }

  function updateCount(){
    const shown = STATE.items.length;
    const total = STATE.total || shown;
    if(countBox) countBox.textContent = `Affichés : ${shown} / ${total}`;
    const c = document.getElementById("offreursPagerCount");
    if(c) c.textContent = `Affichés : ${shown} / ${total}`;
  }

  function updatePager(){
    const pager = ensurePager();
    const btn = document.getElementById("offreursMoreBtn");

    const hasService = !!serviceFilter.value;
    if(!hasService){
      pager.style.display = "none";
      setControlsDisabled(true);
      if(empty){
        empty.style.display = "block";
        empty.textContent = "Sélectionne un domaine d’activité pour afficher les offreurs.";
      }
      STATE.items = [];
      STATE.total = 0;
      STATE.offset = 0;
      updateCount();
      return;
    }

    setControlsDisabled(false);

    const canMore = (STATE.items.length < (STATE.total || STATE.items.length));
    if(btn){
      btn.style.display = canMore ? "inline-block" : "none";
      btn.disabled = STATE.loading;
      btn.textContent = STATE.loading ? "Chargement…" : "Voir plus";
    }
    pager.style.display = "flex";
    updateCount();
  }

  function currentParams(){
    return {
      service: serviceFilter.value,
      zone: zoneFilter.value,
      commune: communeFilter.value,
      q: q.value.trim(),
      sort: (sort && sort.value) ? sort.value : "note_desc"
    };
  }

  async function fetchFirst(){
    const p = currentParams();
    if(!p.service){
      updatePager();
      return;
    }

    STATE.loading = true;
    STATE.items = [];
    STATE.offset = 0;
    STATE.total = 0;
    empty.style.display = "none";
    list.innerHTML = "";
    updatePager();

    const res = await window.DX_API.getAny(
      ["listOffreursPublic","getOffreursPublic","listOffreurs"],
      { ...p, offset: 0, limit: STATE.limit }
    );

    const data = res && res.ok ? (res.data || res.items || res.offreurs || []) : [];
    const items = Array.isArray(data) ? data : [];

    const t = (res && res.total !== undefined && res.total !== null) ? Number(res.total) : null;
    STATE.total = (isFinite(t) && t >= 0) ? t : items.length;

    STATE.items = items;
    STATE.offset = items.length;
    STATE.loading = false;

    render(STATE.items);
    updatePager();
  }

  async function fetchMore(){
    const p = currentParams();
    if(!p.service) return;

    STATE.loading = true;
    updatePager();

    const res = await window.DX_API.getAny(
      ["listOffreursPublic","getOffreursPublic","listOffreurs"],
      { ...p, offset: STATE.offset, limit: STATE.limit }
    );

    const data = res && res.ok ? (res.data || res.items || res.offreurs || []) : [];
    const items = Array.isArray(data) ? data : [];

    const t = (res && res.total !== undefined && res.total !== null) ? Number(res.total) : null;
    if(isFinite(t) && t >= 0) STATE.total = t;

    STATE.items = STATE.items.concat(items);
    STATE.offset += items.length;

    STATE.loading = false;
    render(STATE.items);
    updatePager();
  }

  // Debounce recherche texte
  let tmr = null;
  function scheduleFetch(){
    if(tmr) clearTimeout(tmr);
    tmr = setTimeout(fetchFirst, 250);
  }

  fillServiceSelect(serviceFilter, { includeAll: false });
  fillSelect(zoneFilter, ZONES);
  fillSelect(communeFilter, COMMUNES);
  btnReload.addEventListener("click", fetchFirst);
  serviceFilter.addEventListener("change", fetchFirst);
  zoneFilter.addEventListener("change", fetchFirst);
  communeFilter.addEventListener("change", fetchFirst);
  if(sort) sort.addEventListener("change", fetchFirst);
  q.addEventListener("input", scheduleFetch);
  q.addEventListener("change", fetchFirst);

  // Init
  updatePager();
});
