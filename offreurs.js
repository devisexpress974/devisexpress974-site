// offreurs.js (v14)
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
    "Lutte nuisibles (pro)",
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
    first.textContent = includeAll ? "Tous" : "Choisir un service…";
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
  const btnReload = $("btnReload");
  const list = $("list");
  const empty = $("empty");
  const countBox = $("countBox");

  
function fillServiceSelectGrouped(sel){
  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Tous";
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

  let ALL = [];

  function stars(n){
    const v = Math.max(0, Math.min(5, Number(n||0)));
    const full = "★★★★★".slice(0, Math.round(v));
    const empty = "☆☆☆☆☆".slice(0, 5 - Math.round(v));
    return full + empty;
  }

  function render(items){
    list.innerHTML = "";
    countBox.textContent = `${items.length} offreur(s)`;

    if(!items.length){
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    items.forEach(o=>{
      const id = o.id || o.OffreurID || o.offreurId || "";
      const nom = o.nom || o.Nom || o.name || "Offreur";
      const service = o.service || o.Service || "Service";
      const zone = o.zone || o.Zone || "";
      const commune = o.commune || o.Commune || "";
      const desc = o.description || o.Description || "";
      const note = o.noteMoyenne || o.NoteMoyenne || o.note || "";
      const nb = o.nombreAvis || o.NombreAvis || o.nbAvis || "";

      const badge = (note && Number(nb||0)>0)
        ? `<span class="badge">${stars(note)} • ${esc(String(note))}/5 (${esc(String(nb))})</span>`
        : `<span class="badge">Pas d’avis</span>`;

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

  function apply(){
    const nq = normalize(q.value.trim());
    const s = serviceFilter.value;
    const z = zoneFilter.value;
    const c = communeFilter.value;

    let out = ALL.slice();
    if(s) out = out.filter(o => (o.service||o.Service) === s);
    if(z) out = out.filter(o => (o.zone||o.Zone) === z);
    if(c) out = out.filter(o => (o.commune||o.Commune) === c);

    if(nq){
      out = out.filter(o => {
        const blob = normalize([
          o.nom||o.Nom||o.name, o.service||o.Service, o.commune||o.Commune, o.zone||o.Zone,
          o.description||o.Description
        ].join(" "));
        return blob.includes(nq);
      });
    }
    render(out);
  }

  async function load(){
    countBox.textContent = "Chargement…";
    const res = await window.DX_API.getAny(
      ["listOffreursPublic","listOffreurs","getOffreursPublic"],
      {}
    );
    const data = res && res.ok ? (res.data || res.items || res.offreurs || []) : [];
    ALL = Array.isArray(data) ? data : [];
    apply();
  }

  fillServiceSelect(serviceFilter, { includeAll: true });
  fillSelect(zoneFilter, ZONES);
  fillSelect(communeFilter, COMMUNES);

  btnReload.addEventListener("click", load);
  [q, serviceFilter, zoneFilter, communeFilter].forEach(el=>{
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });

  load();
});
