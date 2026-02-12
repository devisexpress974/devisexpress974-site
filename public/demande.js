// demande.js (v14)
document.addEventListener("DOMContentLoaded", async () => {
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

const ZONES = ["Sur toute l'île","Nord","Sud","Est","Ouest"];
  const COMMUNES = [
    "Saint-Denis","Sainte-Marie","Sainte-Suzanne","Saint-André","Bras-Panon","Saint-Benoît",
    "Sainte-Rose","Saint-Philippe","Saint-Joseph","Petite-Île","Saint-Pierre","Le Tampon",
    "Entre-Deux","Saint-Louis","Les Avirons","L’Étang-Salé","Saint-Leu","Trois-Bassins",
    "Saint-Paul","La Possession","Le Port","Cilaos","Salazie","La Plaine-des-Palmistes"
  ];

  const $ = (id) => document.getElementById(id);

  const form = $("demandeForm");
  const msg = $("msg");
  const btn = $("btnPublish");

  const service = $("service");
  const serviceAutre = $("serviceAutre");
  const zone = $("zone");
  const commune = $("commune");
  const description = $("description");
  const budget = $("budget");
  const nom = $("nom");
  const tel = $("tel");
  const email = $("email");

  function fillSelect(select, items){
    const first = select.querySelector("option");
    select.innerHTML = "";
    select.appendChild(first);
    items.forEach(v=>{
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
    select.disabled = false;
  }

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type || "");
    msg.textContent = text;
  }

  function cleanPhone(p){
    return (p||"").toString().replace(/[^\d+]/g,"").trim();
  }

  function isEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
  }


  // -------- Pièces jointes (max 3) --------
  const ATT_MAX_FILES = 3;
  const ATT_MAX_BYTES = 1500 * 1024; // 1,5 Mo conseillé

  function fileToBase64_(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Lecture fichier impossible"));
      r.onload = () => {
        const s = String(r.result || "");
        // r.result renvoie un dataURL -> on garde uniquement la partie base64
        const comma = s.indexOf(",");
        resolve(comma !== -1 ? s.slice(comma+1) : s);
      };
      r.readAsDataURL(file);
    });
  }

  async function readAttachments_(inputEl){
    try{
      const files = Array.from((inputEl && inputEl.files) ? inputEl.files : []);
      if(!files.length) return [];
      const kept = files.slice(0, ATT_MAX_FILES);

      // validations légères
      for(const f of kept){
        if(ATT_MAX_BYTES && f.size > ATT_MAX_BYTES){
          throw new Error("Fichier trop volumineux (1,5 Mo max conseillé) : " + (f.name || "fichier"));
        }
      }

      const out = [];
      for(const f of kept){
        const dataBase64 = await fileToBase64_(f);
        out.push({ name: f.name, type: f.type || "application/octet-stream", dataBase64 });
      }
      return out;
    }catch(err){
      throw err;
    }
  }

  fillServiceSelect(service);
  fillSelect(zone, ZONES);
  fillSelect(commune, COMMUNES);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.style.display = "none";

    const payload = {
      service: service.value,
      serviceAutre: serviceAutre.value.trim(),
      zone: zone.value,
      commune: commune.value,
      description: description.value.trim(),
      budget: budget.value ? Number(budget.value) : "",
      nom: nom.value.trim(),
      tel: cleanPhone(tel.value),
      email: email.value.trim()
    };

    if(!payload.service || !payload.zone || !payload.commune || !payload.description || !payload.nom || !payload.tel || !payload.email){
      return show("err", "Merci de remplir tous les champs obligatoires (*).");
    }
    if(!isEmail(payload.email)){
      return show("err", "Email invalide.");
    }
    if(payload.description.length < 12){
      return show("err", "Décris un peu plus ton besoin (au moins 12 caractères).");
    }

    // pièces jointes (optionnel)
    try{
      payload.attachments = await readAttachments_(document.getElementById("attachments"));
    }catch(err){
      return show("err", err.message || "Pièces jointes invalides.");
    }


    btn.disabled = true;
    btn.textContent = "Publication…";
    show("muted", "Envoi en cours…");

    const actions = ["addDemande", "createDemande", "addDemandePublic"];
    const res = await window.DX_API.postAny(actions, { payload });

    btn.disabled = false;
    btn.textContent = "Publier";

    if(res && res.ok){
      show("ok", "Demande publiée. Tu peux maintenant voir le mur.");
      form.reset();
      fillServiceSelect(service);
      fillSelect(zone, ZONES);
      fillSelect(commune, COMMUNES);
      return;
    }

    const err = (res && (res.error || res.message)) ? (res.error || res.message) : "Erreur inconnue.";
    show("err", "Impossible de publier pour le moment : " + err);
  });
});
