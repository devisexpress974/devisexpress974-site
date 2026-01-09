// mur-demandes.js (v14)
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
const COMMUNES = [
    "Saint-Denis","Sainte-Marie","Sainte-Suzanne","Saint-André","Bras-Panon","Saint-Benoît",
    "Sainte-Rose","Saint-Philippe","Saint-Joseph","Petite-Île","Saint-Pierre","Le Tampon",
    "Entre-Deux","Saint-Louis","Les Avirons","L’Étang-Salé","Saint-Leu","Trois-Bassins",
    "Saint-Paul","La Possession","Le Port","Cilaos","Salazie","La Plaine-des-Palmistes"
  ];

  const $ = (id) => document.getElementById(id);
  const q = $("q");
  const serviceFilter = $("serviceFilter");
  const communeFilter = $("communeFilter");
  const btnReload = $("btnReload");
  const list = $("list");
  const empty = $("empty");
  const countBox = $("countBox");

  
function fillServiceSelectGrouped(sel){
  sel.innerHTML = "";
  // Default "Tous"
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


function norm_(s){
  s = (s === undefined || s === null) ? "" : String(s);
  try{ s = s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){}
  return s.trim().toLowerCase();
}
function splitServices_(s){
  s = (s===undefined||s===null) ? "" : String(s);
  return s.split(/[,;\/|]+/).map(function(x){return x.trim();}).filter(Boolean);
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

  function render(items){
    list.innerHTML = "";
    countBox.textContent = `${items.length} demande(s)`;

    if(!items.length){
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    items.forEach(d=>{
      const id = d.id || d.DemandeID || d.demandeId || "";
      const service = d.service || d.Service || "Service";
      const commune = d.commune || d.Commune || "Commune";
      const zone = d.zone || d.Zone || "";
      const desc = d.description || d.Description || "";

      const card = document.createElement("div");
      card.className = "itemCard";
      card.innerHTML = `
        <div class="itemTop">
          <div>
            <h3 class="itemTitle">${esc(service)}</h3>
            <p class="itemMeta">${esc(commune)}${zone ? " • " + esc(zone) : ""}</p>
          </div>
          <span class="badge">Coordonnées masquées</span>
        </div>
        <p class="itemMeta" style="margin-top:10px;">${esc(desc).slice(0, 180)}${desc.length>180 ? "…" : ""}</p>
        <div class="btnRow" style="margin-top:12px;">
          <a class="btn" href="demande-detail.html?id=${encodeURIComponent(id)}">Voir détail</a>
          <a class="btn btnPrimary" href="paiement-ponctuel.html?id=${encodeURIComponent(id)}">Débloquer / Contacter</a>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function apply(){
    const nq = normalize(q.value.trim());
    const s = serviceFilter.value;
    const c = communeFilter.value;

    let out = ALL.slice();
    if(s) out = out.filter(d => (d.service||d.Service) === s);
    if(c) out = out.filter(d => (d.commune||d.Commune) === c);

    if(nq){
      out = out.filter(d => {
        const blob = normalize([
          d.service||d.Service, d.commune||d.Commune, d.zone||d.Zone, d.description||d.Description
        ].join(" "));
        return blob.includes(nq);
      });
    }
    render(out);
  }

  async function load(){
    countBox.textContent = "Chargement…";
    const res = await window.DX_API.getAny(
      ["listDemandesPublic","listDemandes","getDemandesPublic"],
      {}
    );
    const data = res && res.ok ? (res.data || res.items || res.demandes || []) : [];
    ALL = Array.isArray(data) ? data : [];
    apply();
  }

  fillServiceSelectGrouped(serviceFilter);
  fillSelect(communeFilter, COMMUNES);

  btnReload.addEventListener("click", load);
  if(btnReset){
    btnReset.addEventListener("click", function(){
      q.value=""; serviceFilter.value=""; communeFilter.value="";
      applyFilters();
    });
  }
  // Avoid sticky filters from browser
  serviceFilter.value="";
  communeFilter.value="";

  [q, serviceFilter, communeFilter].forEach(el=>{
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });

  load();
});
