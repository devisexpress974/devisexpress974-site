// Code.gs (DevisExpress974) - Backend Google Apps Script (v24-es5)
// ✅ Fix: si tes onglets ont de "mauvais" en-têtes, on les répare automatiquement.
//    (Sinon les champs deviennent undefined => le mur ne peut pas filtrer/service/mail offreur impossible.)

var VERSION = "v24-es5";

// ======================
// CONFIG (Script Properties)
// ======================
var DEFAULT_SHEET_ID = "1iJlfs-X4hY1NYkFrw_LBt5BLsWL3C6ZOZi8-zUxKrts";
var PROP = PropertiesService.getScriptProperties();

function cfg_(){
  return {
    SHEET_ID: PROP.getProperty("SHEET_ID") || DEFAULT_SHEET_ID,
    OWNER_EMAIL: PROP.getProperty("OWNER_EMAIL") || "",
    SITE_URL: PROP.getProperty("SITE_URL") || "" // ex: https://devisexpress974.netlify.app
  };
}

var SHEETS = {
  DEMANDES: "Demandes",
  OFFREURS: "Offreurs",
  CONTACTS: "Contacts",
  ACCESS: "AccesDemandes",
  AVIS: "Avis",
  SESSIONS: "Sessions",
  RESETS: "Resets",
  NOTIFS: "Notifications"
};

var HEADERS = {
  Demandes: ["Date","DemandeID","Service","ServiceAutre","Zone","Commune","Description","Budget","Nom","Tel","Email","Photo1","Photo2","Photo3","Status"],
  Offreurs: ["Date","OffreurID","Nom","Email","Tel","Service","ServiceAutre","Zone","Commune","Description","TypeOffreur","Siren","Entreprise","Pseudo","DisplayMode","ShowNote","PasswordHash","Salt","NoteMoyenne","NombreAvis","Actif"],
  Access:   ["Date","EmailOffreur","OffreurID","DemandeID","Type","ExpireAt"],
  Avis:     ["Date","AvisID","OffreurID","Note","Commentaire","AuteurNom"],
  Sessions: ["Date","Token","EmailOffreur","OffreurID","ExpiresAt"],
  Resets:   ["Date","ResetToken","EmailOffreur","ExpiresAt"],
  Notifs:   ["Date","DemandeID","OffreurID","EmailOffreur","Mode","Service","Zone","Commune"]
};


// ======================
// PIECES JOINTES (Drive)
// ======================
var ATTACHMENTS_ROOT_FOLDER = "DX_Attachments";
var ATTACHMENTS_MAX_FILES = 3;
var ATTACHMENTS_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo max / fichier (aligné front)

function getOrCreateFolder_(parent, name){
  parent = parent || DriveApp.getRootFolder();
  var it = parent.getFoldersByName(String(name));
  if(it.hasNext()) return it.next();
  return parent.createFolder(String(name));
}

function sanitizeFilename_(name){
  name = String(name || "fichier");
  name = name.replace(/[\\\/\?%\*:|"<>]/g, "-").replace(/\s+/g, " ").trim();
  if(!name) name = "fichier";
  if(name.length > 80) name = name.slice(0, 80);
  return name;
}

function saveAttachments_(items, prefix, id){
  try{
    items = items || [];
    if(!items.length) return [];
    if(items.length > ATTACHMENTS_MAX_FILES) items = items.slice(0, ATTACHMENTS_MAX_FILES);

    var root = getOrCreateFolder_(DriveApp.getRootFolder(), ATTACHMENTS_ROOT_FOLDER);
    var ctx = getOrCreateFolder_(root, String(prefix || "ctx") + "_" + String(id || uid_("ctx")));

    var urls = [];
    for(var i=0;i<items.length;i++){
      var it = items[i] || {};
      var name = sanitizeFilename_(it.name || ("pj_" + (i+1)));
      var mime = String(it.type || "application/octet-stream");
      var b64 = String(it.dataBase64 || it.data || "");
      if(!b64) continue;

      // retire l'entête dataURL si présent
      if(b64.slice(0,5) === "data:"){
        var comma = b64.indexOf(",");
        if(comma !== -1) b64 = b64.slice(comma+1);
      }

      var bytes = Utilities.base64Decode(b64);
      if(ATTACHMENTS_MAX_BYTES && bytes && bytes.length > ATTACHMENTS_MAX_BYTES){
        continue; // ignore sans faire planter
      }
      var blob = Utilities.newBlob(bytes, mime, name);
      var f = ctx.createFile(blob);

      // lien partageable (lecture seule)
      try{
        f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }catch(e){}

      urls.push(f.getUrl());
    }
    return urls;
  }catch(err){
    return [];
  }
}

// ======================
// Helpers
// ======================
function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
function nowIso_(){ return new Date().toISOString(); }
function uid_(prefix){
  var u = Utilities.getUuid().replace(/-/g,"");
  return (prefix?prefix+"_":"") + u.slice(0,16);
}
function sha256_(s){
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var out = [];
  for(var i=0;i<bytes.length;i++){ var b = bytes[i] & 0xFF; out.push(("0"+b.toString(16)).slice(-2)); }
  return out.join("");
}
function randomSalt_(){ return Utilities.getUuid(); }

function norm_(s){
  s = (s===undefined||s===null) ? "" : String(s);
  s = s.toLowerCase().trim();
  try{ s = s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){}
  return s;
}
function splitServices_(s){
  s = (s===undefined||s===null) ? "" : String(s);
  var parts = s.split(/[,;\/|]+/);
  var out = [];
  for(var i=0;i<parts.length;i++){ var p = String(parts[i]).trim(); if(p) out.push(p); }
  return out;
}

function getSS_(){
  var c = cfg_();
  return SpreadsheetApp.openById(c.SHEET_ID);
}

function sheetHeaders_(sh){
  var lastCol = Math.max(1, sh.getLastColumn());
  var row1 = sh.getRange(1,1,1,lastCol).getValues()[0];
  var headers = [];
  for(var i=0;i<row1.length;i++){ 
    var v = String(row1[i]||"").trim();
    if(v) headers.push(v);
  }
  return headers;
}

function arraysEqual_(a,b){
  if(!a||!b) return false;
  if(a.length !== b.length) return false;
  for(var i=0;i<a.length;i++) if(String(a[i]) !== String(b[i])) return false;
  return true;
}

function renameOld_(ss, name){
  var sh = ss.getSheetByName(name);
  if(!sh) return;
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  sh.setName(name + "_OLD_" + stamp);
}

function ensureSheetStrict_(name, headers){
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }

  // PATCH1 (sécurité) : normalise les en-têtes SANS renommer / recréer la feuille.
  // On ne touche qu'à la ligne 1 (en-têtes) et on ajoute des colonnes si besoin.
  try{
    var need = headers || [];
    var lastCol = sh.getLastColumn();
    if(lastCol < need.length){
      sh.insertColumnsAfter(lastCol, need.length - lastCol);
    }
    if(need.length){
      sh.getRange(1,1,1,need.length).setValues([need]);
    }
    sh.setFrozenRows(1);
  }catch(e){}
  return sh;
}

function ensureAll_(){
  ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureSheetStrict_(SHEETS.ACCESS,  HEADERS.Access);
  ensureSheetStrict_(SHEETS.AVIS,    HEADERS.Avis);
  ensureSheetStrict_(SHEETS.SESSIONS,HEADERS.Sessions);
  ensureSheetStrict_(SHEETS.RESETS,  HEADERS.Resets);
  ensureSheetStrict_(SHEETS.NOTIFS,  HEADERS.Notifs);
  ensureExtraOffreursCols_();
}


function sheetToObjects_(sh){
  var values = sh.getDataRange().getValues();
  if(values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for(var r=1;r<values.length;r++){ 
    var row = values[r];
    var o = {};
    for(var c=0;c<headers.length;c++){ o[String(headers[c])] = row[c]; }
    out.push(o);
  }
  return out;
}

function findRowBy_(sh, colIndex1, value){
  var lr = sh.getLastRow();
  if(lr < 2) return -1;
  var col = sh.getRange(2, colIndex1, lr-1, 1).getValues();
  var target = String(value).toLowerCase();
  for(var i=0;i<col.length;i++) if(String(col[i][0]).toLowerCase() === target) return i+2;
  return -1;
}

function parse_(e){
  if(e && e.postData && e.postData.contents){
    try{ return JSON.parse(e.postData.contents); }catch(err){}
  }
  return {};
}

function sendMailSafe_(to, subject, html){
  try{
    if(!to) return;
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: html });
  }catch(e){}
}

// ======================
// Sessions (minimal)
// ======================
function sessionCreate_(email, offreurId){
  var sh = ensureSheetStrict_(SHEETS.SESSIONS, HEADERS.Sessions);
  var token = uid_("tok");
  var exp = new Date(Date.now() + 1000*60*60*24*14);
  sh.appendRow([nowIso_(), token, String(email||"").toLowerCase(), offreurId, exp.toISOString()]);
  return { token: token, expiresAt: exp.toISOString() };
}
function sessionDelete_(token){
  if(!token) return;
  var sh = ensureSheetStrict_(SHEETS.SESSIONS, HEADERS.Sessions);
  var row = findRowBy_(sh, 2, token);
  if(row !== -1) sh.deleteRow(row);
}

// ======================
// WebApp
// ======================
function doGet(e){
  ensureAll_();
  e = e || {};
  e.parameter = e.parameter || {};
  var action = String(e.parameter.action || "").trim();
  // ✅ doGet passe e.parameter pour supporter token/id en GET
  return route_(action, e, e.parameter);
}
function doPost(e){
  ensureAll_();
  var body = parse_(e);
  var action = String(body.action || "").trim();
  return route_(action, e, body);
}

function route_(action, e, body){
  try{
    switch(action){
      case "ping":
        return json_({ ok:true, version: VERSION, time: nowIso_() });

            case "whoami":
      case "me":
        return json_(whoami_(tokenFrom_(e, body)));

      case "listDemandesForOffreur":
      case "listDemandesOffreur":
        return json_(listDemandesForOffreur_(tokenFrom_(e, body)));

            case "requestResetOffreur":
      case "resetOffreur":
        return json_(requestResetOffreur_(e, body));

      case "confirmResetOffreur":
      case "confirmReset":
        return json_(confirmResetOffreur_(body.payload || body));

case "getDemande":
      case "getDemandePublic":
      case "getDemandeByIdPublic":
        return json_(getDemande_(e, body));

      case "hasAccess":
        return json_(hasAccess_(e, body));

      case "grantAccess":
      case "unlockDemande":
        return json_(grantAccess_(e, body));

      case "activatePack":
      case "buyPack10":
      case "activatePack10":
        return json_(activatePack_(tokenFrom_(e, body)));

      case "activateAbonnement":
      case "activateSubscription":
      case "activateAbo":
        return json_(activateAbonnement_(tokenFrom_(e, body)));

case "addDemande":
      case "createDemande":
      case "addDemandePublic":
        return json_(addDemande_(body.payload || body));

      case "listDemandesPublic":
      case "getDemandesPublic":
      case "listDemandes":
        return json_(listDemandesPublic_());

      case "registerOffreur":
      case "createOffreur":
        return json_(registerOffreur_(body.payload || body));

      case "loginOffreur":
      case "login":
        return json_(loginOffreur_(body.email, body.password));

      case "logout":
      case "logoutOffreur":
        sessionDelete_(String(body.token||""));
        return json_({ ok:true });

      case "listOffreursPublic":
      case "getOffreursPublic":
        return json_(listOffreursPublic_());

      case "getOffreurProfile":
      case "getOffreurProfilePublic":
        return json_(getOffreurProfile_(tokenFrom_(e, body), body));

      case "updateOffreurProfile":
        return json_(updateOffreurProfile_(tokenFrom_(e, body), body.payload || body));

      case "getMyPlan":
        return json_(getMyPlan_(tokenFrom_(e, body)));

      case "addAvisOffreur":
      case "addAvis":
        return json_(addAvisOffreur_(body.payload || body));

      default:
        return json_({ ok:false, error:"Action inconnue : " + action, action: action });
    }
  }catch(err){
    return json_({ ok:false, error:String(err && err.message ? err.message : err) });
  }
}

// ======================
// DEMANDES
// ======================
function addDemande_(p){
  var service = String(p.service||"").trim();
  var zone = String(p.zone||"").trim();
  var commune = String(p.commune||"").trim();
  var description = String(p.description||"").trim();
  var nom = String(p.nom||"").trim();
  var tel = String(p.tel||"").trim();
  var email = String(p.email||"").trim();
  var serviceAutre = String(p.serviceAutre||"").trim();
  var budget = (p.budget !== undefined && p.budget !== null && p.budget !== "") ? String(p.budget) : "";

  if(!service || !zone || !commune || !description || !nom || !tel || !email){
    return { ok:false, error:"Champs obligatoires manquants" };
  }

  var id = uid_("dem");

  // pièces jointes (optionnel) : stocke jusqu'à 3 liens (Photo1..3) dans la feuille
  var pjUrls = saveAttachments_(p.attachments, "dem", id);
  var photo1 = (pjUrls && pjUrls.length > 0) ? String(pjUrls[0]||"") : "";
  var photo2 = (pjUrls && pjUrls.length > 1) ? String(pjUrls[1]||"") : "";
  var photo3 = (pjUrls && pjUrls.length > 2) ? String(pjUrls[2]||"") : "";

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  sh.appendRow([nowIso_(), id, service, serviceAutre, zone, commune, description, budget, nom, tel, email, photo1, photo2, photo3, "PUBLIÉ"]);

  // Mail demandeur
  sendMailSafe_(email, "DevisExpress974 — Demande publiée",
    "<p>Bonjour " + nom + ",</p><p>Ta demande a bien été publiée sur le mur (coordonnées masquées).</p><p><strong>ID :</strong> " + id + "</p><p>DevisExpress974</p>");

  // Mail admin (optionnel)
  var c = cfg_();
  if(c.OWNER_EMAIL){
    sendMailSafe_(c.OWNER_EMAIL, "Nouvelle demande (DevisExpress974)",
      "<p>Nouvelle demande publiée.</p><p><strong>ID :</strong> " + id + "<br><strong>Service :</strong> " + service + "<br><strong>Commune :</strong> " + commune + "</p>");
  }

  // Mail offreurs (sans coordonnées)
  notifyOffreursNewDemande_(id, service, zone, commune, description, budget);

  return { ok:true, id:id };
}


// ======================
// MATCHING strict (service + geo)
// ======================
function splitList_(s){
  s = String(s||"").trim();
  if(!s) return [];
  // accepte virgules, points-virgules, slash, pipe
  var parts = s.split(/[,;|\/]+/);
  var out = [];
  for(var i=0;i<parts.length;i++){
    var p = String(parts[i]||"").trim();
    if(p) out.push(p);
  }
  return out;
}

function isDemandeActive_(row){
  var st = String(row.Status||row.Statut||"").trim().toUpperCase();
  if(st && st !== "PUBLIÉ" && st !== "PUBLIE" && st !== "ACTIVE") return false;

  // expiration 30 jours depuis Date si pas de champ ExpireAt
  try{
    var d = new Date(row.Date);
    if(d && d.getTime){
      var exp = new Date(d.getTime() + 1000*60*60*24*30);
      if(new Date().getTime() > exp.getTime()) return false;
    }
  }catch(e){}
  return true;
}

function matchService_(offreurService, demandeService){
  var o = norm_(offreurService);
  var d = norm_(demandeService);
  if(!o || !d) return false;

  // support listes côté offreur (Service = "Plombier, Electricien")
  var list = splitList_(offreurService);
  if(list.length <= 1) return o === d;

  for(var i=0;i<list.length;i++){
    if(norm_(list[i]) === d) return true;
  }
  return false;
}

function matchGeo_(offreurZone, offreurCommunes, demandeZone, demandeCommune){
  var oz = norm_(offreurZone);
  var dz = norm_(demandeZone);
  var dc = norm_(demandeCommune);

  // Toute l'île
  if(oz === norm_("toute l'île") || oz === norm_("toute l ile") || oz === norm_("toute l'île / toute l ile") || oz === norm_("toute l'ile") || oz === norm_("toute l’île")){
    return true;
  }

  // Communes listées => matching strict commune
  var communes = splitList_(offreurCommunes);
  if(communes.length > 0){
    for(var i=0;i<communes.length;i++){
      if(norm_(communes[i]) === dc) return true;
    }
    return false;
  }

  // fallback: zone stricte
  if(oz && dz) return oz === dz;
  return false;
}

function listDemandesForOffreur_(token){
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  var service = String(r.obj.Service||"").trim();
  var zone = String(r.obj.Zone||"").trim();
  var communes = String(r.obj.Commune||"").trim();
  var extra = getOffreurExtra_(r);
  var aboOk = isAboOk_(extra);

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rows = sheetToObjects_(sh);

  var out = [];
  for(var i=0;i<rows.length;i++){
    var row = rows[i];
    if(!isDemandeActive_(row)) continue;

    if(!matchService_(service, row.Service)) continue;

    // Mur : abonnement = pas de contrainte géographique ; FREE/PACK/PONCTUEL = zones/communes strictes
    if(!aboOk){
      if(!matchGeo_(zone, communes, row.Zone, row.Commune)) continue;
    }

    out.push({
      id: row.DemandeID || row.id,
      date: row.Date,
      service: row.Service,
      zone: row.Zone,
      commune: row.Commune,
      description: row.Description,
      budget: row.Budget,
      status: row.Status || "PUBLIÉ"
    });
    if(out.length >= 80) break;
  }

  return { ok:true, items: out, aboOk: aboOk };
}


function listDemandesPublic_(){
  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rows = sheetToObjects_(sh);
  var data = [];
  for(var i=0;i<rows.length;i++){ 
    if(String(rows[i].Status||"") === "SUPPRIMÉ") continue;
    data.push({
      id: rows[i].DemandeID,
      service: rows[i].Service,
      serviceAutre: rows[i].ServiceAutre,
      zone: rows[i].Zone,
      commune: rows[i].Commune,
      description: rows[i].Description,
      budget: rows[i].Budget,
      photos: [rows[i].Photo1, rows[i].Photo2, rows[i].Photo3].filter(function(x){ return x && String(x).trim(); }),
      status: rows[i].Status,
      createdAt: rows[i].Date
    });
  }
  data.sort(function(a,b){ return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return { ok:true, data:data };
}

// ======================
// OFFREURS
// ======================
function registerOffreur_(p){
  p = p || {};
  var nom = String(p.nom||"").trim();
  var email = String(p.email||"").trim().toLowerCase();
  var tel = String(p.tel||"").trim();
  var password = String(p.password||"");

  var service = String(p.service||"").trim();
  var serviceAutre = String(p.serviceAutre||"").trim();

  var zone = String(p.zone||"").trim();
  var commune = String(p.commune||"").trim();
  var description = String(p.description||"").trim();

  // extras profil (Patch21+)
  var typeOffreur = String(p.typeOffreur||"PRO").trim().toUpperCase();
  if(typeOffreur !== "PRO" && typeOffreur !== "PART") typeOffreur = "PRO";

  var siren = String(p.siren||p.siret||"").trim();
  // Siren/Siret optionnel — si rempli, on garde seulement chiffres
  if(siren) siren = siren.replace(/\D/g,"").slice(0,14);

  var entreprise = String(p.entreprise||"").trim();
  var pseudo = String(p.pseudo||"").trim();
  var displayMode = String(p.displayMode||"NOM").trim().toUpperCase();
  if(["NOM","PSEUDO","ENTREPRISE"].indexOf(displayMode) < 0) displayMode = "NOM";

  var showNote = String(p.showNote||"OUI").trim().toUpperCase();
  if(showNote !== "OUI" && showNote !== "NON") showNote = "OUI";

  // validations minimales
  if(!nom || !email || !tel || !password || !service || !zone || !commune || !description){
    return { ok:false, error:"Champs obligatoires manquants" };
  }
  if(password.length < 8) return { ok:false, error:"Mot de passe trop court" };

  // si service = Autre, exiger précision
  var sNorm = String(service||"").toLowerCase();
  if(sNorm.indexOf("autre") === 0 && !serviceAutre){
    return { ok:false, error:"Précise ton métier (Autre)" };
  }

  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureExtraOffreursCols_();

  var rows = sheetToObjects_(sh);
  for(var i=0;i<rows.length;i++){
    if(String(rows[i].Email||"").toLowerCase() === email) return { ok:false, error:"Email déjà utilisé" };
  }

  var offreurId = uid_("off");
  var salt = randomSalt_();
  var hash = sha256_(salt + "|" + password);

  // valeurs défaut
  if(!entreprise && typeOffreur === "PRO") entreprise = "";
  if(!pseudo) pseudo = "";

  sh.appendRow([
    nowIso_(), offreurId, nom, email, tel,
    service, serviceAutre, zone, commune, description,
    typeOffreur, siren, entreprise, pseudo, displayMode, showNote,
    hash, salt,
    "", "", // NoteMoyenne, NombreAvis
    "OUI"   // Actif
  ]);

  var sess = sessionCreate_(email, offreurId);
  return { ok:true, offreurId:offreurId, token:sess.token };
}

function loginOffreur_(email, password){
  email = String(email||"").trim().toLowerCase();
  password = String(password||"");
  if(!email || !password) return { ok:false, error:"Email et mot de passe obligatoires" };

  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var rows = sheetToObjects_(sh);
  var r = null;
  for(var i=0;i<rows.length;i++) if(String(rows[i].Email||"").toLowerCase() === email){ r = rows[i]; break; }
  if(!r) return { ok:false, error:"Identifiants invalides" };
  if(String(r.Actif||"OUI") !== "OUI") return { ok:false, error:"Compte désactivé" };

  var salt = String(r.Salt||"");
  var hash = String(r.PasswordHash||"");
  var check = sha256_(salt + "|" + password);
  if(check !== hash) return { ok:false, error:"Identifiants invalides" };

  var sess = sessionCreate_(email, r.OffreurID);
  return { ok:true, token:sess.token, offreurId:r.OffreurID };
}

function listOffreursPublic_(){
  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureExtraOffreursCols_();
  var rows = sheetToObjects_(sh);

  var data = [];
  for(var i=0;i<rows.length;i++){
    var r = rows[i];
    if(String(r.Actif||"OUI") !== "OUI") continue;

    var showNote = String(r.ShowNote||"OUI").toUpperCase();
    if(showNote !== "OUI" && showNote !== "NON") showNote = "OUI";

    var publicName = computePublicName_(r);

    data.push({
      id: r.OffreurID,
      publicName: publicName,
      nom: r.Nom,
      service: r.Service,
      serviceAutre: r.ServiceAutre || "",
      zone: r.Zone,
      commune: r.Commune,
      description: r.Description,
      typeOffreur: r.TypeOffreur || "PRO",
      entreprise: r.Entreprise || "",
      pseudo: r.Pseudo || "",
      displayMode: r.DisplayMode || "NOM",
      showNote: showNote,
      noteMoyenne: r.NoteMoyenne,
      nombreAvis: r.NombreAvis
    });
  }

  // tri alpha par nom public
  data.sort(function(a,b){
    return String(a.publicName||"").localeCompare(String(b.publicName||""), "fr", { sensitivity:"base" });
  });

  return { ok:true, data:data };
}

function computePublicName_(row){
  row = row || {};
  var mode = String(row.DisplayMode||"NOM").toUpperCase();
  var nom = String(row.Nom||"").trim();
  var pseudo = String(row.Pseudo||"").trim();
  var ent = String(row.Entreprise||"").trim();

  if(mode === "PSEUDO" && pseudo) return pseudo;
  if(mode === "ENTREPRISE" && ent) return ent;
  // fallback
  if(nom) return nom;
  if(pseudo) return pseudo;
  if(ent) return ent;
  return "Offreur";
}



function getMyPlan_(token){
  // compat front : renvoie plan/crédits + état abonnement
  var me = whoami_(token);
  if(!me || !me.ok) return me || { ok:false, error:"Non connecté" };
  return { ok:true, data: me.data };
}

// getOffreurProfile :
// - si body.id est fourni => profil public (sans coordonnées)
// - sinon => profil privé (nécessite session)
function getOffreurProfile_(token, body){
  body = body || {};
  var id = String(body.id||body.offreurId||"").trim();

  if(id){
    var r = getOffreurRowById_(id);
    if(!r) return { ok:false, error:"Offreur introuvable" };
    var o = r.obj || {};
    var showNote = String(o.ShowNote||"OUI").toUpperCase();
    if(showNote !== "OUI" && showNote !== "NON") showNote = "OUI";
    return {
      ok:true,
      data:{
        id: o.OffreurID,
        publicName: computePublicName_(o),
        service: o.Service,
        serviceAutre: o.ServiceAutre || "",
        zone: o.Zone,
        commune: o.Commune,
        description: o.Description,
        typeOffreur: o.TypeOffreur || "PRO",
        entreprise: o.Entreprise || "",
        pseudo: o.Pseudo || "",
        displayMode: o.DisplayMode || "NOM",
        showNote: showNote,
        noteMoyenne: o.NoteMoyenne,
        nombreAvis: o.NombreAvis
      }
    };
  }

  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Non connecté" };

  var row = getOffreurRowById_(sess.offreurId);
  if(!row) return { ok:false, error:"Compte introuvable" };

  var o2 = row.obj || {};
  var extra = getOffreurExtra_(row);

  var sN = String(o2.ShowNote||"OUI").toUpperCase();
  if(sN !== "OUI" && sN !== "NON") sN = "OUI";

  return {
    ok:true,
    user:{
      offreurId: o2.OffreurID,
      nom: o2.Nom,
      email: o2.Email,
      tel: o2.Tel,
      service: o2.Service,
      serviceAutre: o2.ServiceAutre || "",
      zone: o2.Zone,
      commune: o2.Commune,
      description: o2.Description,
      typeOffreur: (o2.TypeOffreur || "PRO"),
      siren: (o2.Siren || ""),
      entreprise: (o2.Entreprise || ""),
      pseudo: (o2.Pseudo || ""),
      displayMode: (o2.DisplayMode || "NOM"),
      showNote: sN,

      credits: extra.credits,
      plan: extra.plan,
      aboActive: extra.aboActive,
      aboPaid: extra.aboPaid,
      trialUsed: extra.trialUsed,
      trialEnd: extra.trialEnd
    }
  };
}

function updateOffreurProfile_(token, p){
  p = p || {};
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Non connecté" };

  var row = getOffreurRowById_(sess.offreurId);
  if(!row) return { ok:false, error:"Compte introuvable" };

  var extra = getOffreurExtra_(row);
  var isAbo = (String(extra.plan||"").toUpperCase()==="ABO" || String(extra.aboActive||"").toUpperCase()==="OUI");

  // champs modifiables
  var patch = {};
  if(p.nom !== undefined) patch.Nom = String(p.nom||"").trim();
  if(p.tel !== undefined) patch.Tel = String(p.tel||"").trim();
  if(p.zone !== undefined) patch.Zone = String(p.zone||"").trim();
  if(p.commune !== undefined) patch.Commune = String(p.commune||"").trim();
  if(p.description !== undefined) patch.Description = String(p.description||"").trim();

  // extras profil
  if(p.serviceAutre !== undefined) patch.ServiceAutre = String(p.serviceAutre||"").trim();

  if(p.typeOffreur !== undefined){
    var t = String(p.typeOffreur||"PRO").trim().toUpperCase();
    patch.TypeOffreur = (t==="PART" ? "PART" : "PRO");
  }
  if(p.siren !== undefined){
    var s = String(p.siren||"").trim();
    if(s) s = s.replace(/\D/g,"").slice(0,14);
    patch.Siren = s;
  }
  if(p.entreprise !== undefined) patch.Entreprise = String(p.entreprise||"").trim();
  if(p.pseudo !== undefined) patch.Pseudo = String(p.pseudo||"").trim();

  if(p.displayMode !== undefined){
    var dm = String(p.displayMode||"NOM").trim().toUpperCase();
    if(["NOM","PSEUDO","ENTREPRISE"].indexOf(dm) < 0) dm = "NOM";
    patch.DisplayMode = dm;
  }

  if(p.showNote !== undefined){
    var sn = String(p.showNote||"OUI").trim().toUpperCase();
    patch.ShowNote = (sn==="NON" ? "NON" : "OUI");
  }

  // métier modifiable seulement si PAS abonné
  if(!isAbo && p.service !== undefined){
    patch.Service = String(p.service||"").trim();
  }

  // validations minimales : ne pas vider les champs critiques
  if(patch.Nom !== undefined && !patch.Nom) return { ok:false, error:"Nom invalide" };
  if(patch.Tel !== undefined && !patch.Tel) return { ok:false, error:"Téléphone invalide" };
  if(patch.Description !== undefined && !patch.Description) return { ok:false, error:"Description invalide" };

  // si service = Autre, exige serviceAutre
  if(patch.Service){
    var sNorm = String(patch.Service||"").toLowerCase();
    if(sNorm.indexOf("autre") === 0){
      var sa = (patch.ServiceAutre !== undefined) ? patch.ServiceAutre : String(row.obj.ServiceAutre||"");
      if(!String(sa||"").trim()) return { ok:false, error:"Précise ton métier (Autre)" };
    }
  }

  // apply patch sur la ligne
  var sh = row.sh;
  var headers = row.headers;
  function setCell(header, value){
    var idx = headers.indexOf(header);
    if(idx < 0){
      // on ajoute la colonne si elle n'existe pas
      idx = ensureExtraHeader_(sh, header);
      headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      row.headers = headers;
      idx = headers.indexOf(header);
    }
    sh.getRange(row.row, idx+1).setValue(value);
  }

  Object.keys(patch).forEach(function(k){
    setCell(k, patch[k]);
  });

  return getOffreurProfile_(token, {}); // renvoie le profil à jour
}


function addAvisOffreur_(p){
  var offreurId = String(p.offreurId||p.offreurID||"").trim();
  var note = Number(p.note||0);
  var commentaire = String(p.commentaire||"").trim();
  var auteurNom = String(p.auteurNom||"").trim();

  if(!offreurId) return { ok:false, error:"OffreurID manquant" };
  if(!note || note < 1 || note > 5) return { ok:false, error:"Note invalide (1 à 5)" };

  var avisId = uid_("avi");

  // pièces jointes (optionnel) : liens ajoutés dans le commentaire (sans toucher aux colonnes)
  var pjUrls = saveAttachments_(p.attachments, "avi", avisId);
  if(pjUrls && pjUrls.length){
    commentaire = (commentaire ? commentaire : "") + "\n\nPièces jointes :\n- " + pjUrls.join("\n- ");
  }

  // Enregistre l'avis
  var shA = ensureSheetStrict_(SHEETS.AVIS, HEADERS.Avis);
  shA.appendRow([nowIso_(), avisId, offreurId, note, commentaire, auteurNom]);

  // Recalcule et met à jour la note moyenne de l'offreur
  var shO = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var hO = sheetHeaders_(shO);
  var colId = hO.indexOf("OffreurID") + 1;
  var colNoteM = hO.indexOf("NoteMoyenne") + 1;
  var colNb = hO.indexOf("NombreAvis") + 1;

  if(colId > 0){
    var rowO = findRowBy_(shO, colId, offreurId);
    if(rowO > 0 && colNoteM > 0 && colNb > 0){
      var vals = shA.getDataRange().getValues(); // inclut en-têtes
      var sum = 0, count = 0;
      for(var i=1;i<vals.length;i++){
        if(String(vals[i][2]).trim() === offreurId){
          var n = Number(vals[i][3] || 0);
          if(n){ sum += n; count++; }
        }
      }
      var avg = count ? Math.round((sum / count) * 10) / 10 : 0;
      shO.getRange(rowO, colNoteM).setValue(avg);
      shO.getRange(rowO, colNb).setValue(count);
    }
  }

  return { ok:true, avisId: avisId };
}

// ======================
// NOTIF OFFREURS
// ======================
function notifyOffreursNewDemande_(demandeId, service, zone, commune, description, budget){
  try{
    var c = cfg_();
    var site = c.SITE_URL ? String(c.SITE_URL).replace(/\/$/,"") : "";

    var shOff = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
    var offreurs = sheetToObjects_(shOff);

    // On charge la demande (ligne brute) pour récupérer les coordonnées si abonnement actif
    var shDem = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
    var dRows = sheetToObjects_(shDem);
    var demandeRow = null;
    for(var di=0; di<dRows.length; di++){
      if(String(dRows[di].DemandeID||dRows[di].id||"") === String(demandeId)) { demandeRow = dRows[di]; break; }
    }

    var shNotif = ensureSheetStrict_(SHEETS.NOTIFS, HEADERS.Notifs);

    var sent = 0;
    for(var i=0;i<offreurs.length;i++){
      var o = offreurs[i];
      if(String(o.Actif||"OUI") !== "OUI") continue;
      var to = String(o.Email||"").trim();
      if(!to) continue;

      // Matching strict service + geo
      if(!matchService_(String(o.Service||""), service)) continue;
      if(!matchGeo_(String(o.Zone||""), String(o.Commune||""), zone, commune)) continue;

      // Mode : coords seulement si abonnement actif
      var mode = "masked";
      var extra = {
        plan: String(o.Plan||""),
        aboActive: String(o.AboActive||""),
        aboPaid: String(o.AboPaid||""),
        trialEnd: String(o.TrialEnd||"")
      };

      var aboOk = false;
      if(String(extra.plan||"").toUpperCase()==="ABO" || String(extra.aboActive||"").toUpperCase()==="OUI"){
        aboOk = true;
        // si trial expiré et non payé => pas de coordonnées
        try{
          if(extra.trialEnd){
            var te = new Date(extra.trialEnd);
            if(te && te.getTime && new Date().getTime() > te.getTime()){
              if(String(extra.aboPaid||"").toUpperCase() !== "OUI") aboOk = false;
            }
          }
        }catch(e){}
      }

      if(aboOk) mode = "with_contact";

      var subj = "Nouvelle demande — " + service + " (" + commune + ")";
      var html = ""
        + "<h2>Nouvelle demande</h2>"
        + "<p><strong>Métier :</strong> " + service + "<br>"
        + "<strong>Zone :</strong> " + zone + "<br>"
        + "<strong>Commune :</strong> " + commune + "<br>"
        + "<strong>Budget :</strong> " + budget + "</p>"
       + "<p><strong>Description :</strong><br>" + String(description||"").replace(/\n/g, "<br>") + "</p>";

      if(mode === "with_contact" && demandeRow){
        html += "<hr><h3>Coordonnées</h3>"
          + "<p><strong>Nom :</strong> " + (demandeRow.Nom||"") + "<br>"
          + "<strong>Téléphone :</strong> " + (demandeRow.Tel||"") + "<br>"
          + "<strong>Email :</strong> " + (demandeRow.Email||"") + "</p>";
      } else {
        html += "<p><em>Coordonnées masquées.</em> Connecte-toi pour débloquer selon ta formule.</p>";
      }

      if(site){
        html += "<p>Lien mur : " + site + "/mur-demandes.html</p>";
      }
      html += "<p><strong>ID demande :</strong> " + demandeId + "</p>";

      sendMailSafe_(to, subj, html);

      // Audit Notifications
      try{
        shNotif.appendRow([nowIso_(), demandeId, String(o.OffreurID||""), to, mode, service, zone, commune]);
      }catch(e){}

      sent++;
      if(sent >= 80) break;
    }
  }catch(e){}
}

// ======================
// (Optionnel) nettoyage tests

// ======================
function resetAllTestData(){
  // ⚠️ Efface toutes les lignes (garde les en-têtes) sur les feuilles principales
  var ss = getSS_();
  var names = [SHEETS.DEMANDES, SHEETS.OFFREURS, SHEETS.ACCESS, SHEETS.AVIS, SHEETS.SESSIONS, SHEETS.RESETS];
  for(var i=0;i<names.length;i++){ 
    var sh = ss.getSheetByName(names[i]);
    if(!sh) continue;
    var last = sh.getLastRow();
    if(last > 1) sh.getRange(2,1,last-1, sh.getLastColumn()).clearContent();
  }
  return "OK";
}


// ======================
// AUTH + STATUT OFFREUR (PATCH1)
// ======================
function tokenFrom_(e, body){
  try{
    if(body && body.token) return String(body.token||"");
    if(e && e.parameter && e.parameter.token) return String(e.parameter.token||"");
  }catch(err){}
  return "";
}

function sessionGet_(token){
  token = String(token||"").trim();
  if(!token) return null;

  var sh = ensureSheetStrict_(SHEETS.SESSIONS, HEADERS.Sessions);
  var values = sh.getDataRange().getValues();
  if(values.length < 2) return null;

  var h = values[0];
  var iTok = h.indexOf("Token");
  var iEmail = h.indexOf("EmailOffreur");
  var iOffId = h.indexOf("OffreurID");
  var iExp = h.indexOf("ExpiresAt");
  if(iTok < 0) return null;

  var now = new Date();
  for(var r=1;r<values.length;r++){
    if(String(values[r][iTok]||"") === token){
      var exp = null;
      try{ exp = new Date(values[r][iExp]); }catch(e){}
      if(exp && exp.getTime && exp.getTime() < now.getTime()){
        // Token expiré => on supprime la session
        try{ sh.deleteRow(r+1); }catch(e){}
        return null;
      }
      return {
        token: token,
        email: String(values[r][iEmail]||"").toLowerCase(),
        offreurId: String(values[r][iOffId]||"")
      };
    }
  }
  return null;
}

function ensureExtraOffreursCols_(){
  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureExtraHeader_(sh, "Credits");
  ensureExtraHeader_(sh, "Plan");
  ensureExtraHeader_(sh, "AboActive");
  ensureExtraHeader_(sh, "AboPaid");
  ensureExtraHeader_(sh, "TrialUsed");
  ensureExtraHeader_(sh, "TrialEnd");
  ensureExtraHeader_(sh, "TrialWarned");
}

function ensureExtraHeader_(sh, headerName){
  headerName = String(headerName||"").trim();
  if(!headerName) return -1;
  var lastCol = Math.max(1, sh.getLastColumn());
  var hdr = sh.getRange(1,1,1,lastCol).getValues()[0];
  var idx = hdr.indexOf(headerName);
  if(idx >= 0) return idx;
  sh.getRange(1, lastCol+1).setValue(headerName);
  return lastCol;
}

function getOffreurRowById_(offreurId){
  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var values = sh.getDataRange().getValues();
  if(values.length < 2) return null;

  var h = values[0];
  var iId = h.indexOf("OffreurID");
  if(iId < 0) return null;

  for(var r=1;r<values.length;r++){
    if(String(values[r][iId]||"") === String(offreurId||"")){
      var rowVals = values[r];
      var obj = {};
      for(var c=0;c<h.length;c++){
        var key = String(h[c]||"").trim();
        if(!key) continue;
        obj[key] = rowVals[c];
      }
      return { sh: sh, headers: h, row: r+1, values: rowVals, obj: obj };
    }
  }
  return null;
}

function getOffreurExtra_(rowObj){
  var h = rowObj.headers;
  var v = rowObj.values;
  function g(name){
    var i = h.indexOf(name);
    return i>=0 ? v[i] : "";
  }
  return {
    credits: Number(g("Credits")||0) || 0,
    plan: String(g("Plan")||"FREE"),
    aboActive: String(g("AboActive")||"NON"),
    aboPaid: String(g("AboPaid")||"NON"),
    trialUsed: String(g("TrialUsed")||"NON"),
    trialEnd: String(g("TrialEnd")||""),
    trialWarned: String(g("TrialWarned")||"")
  };
}

function isAboOk_(extra){
  if(!extra) return false;
  var plan = String(extra.plan||"").toUpperCase();
  var aboActive = String(extra.aboActive||"").toUpperCase();
  if(plan !== "ABO" && aboActive !== "OUI") return false;

  // Trial expiré + non payé => pas d'accès coordonnées via abo
  try{
    var teStr = String(extra.trialEnd||"").trim();
    if(teStr){
      var te = new Date(teStr);
      if(te && te.getTime && new Date().getTime() > te.getTime()){
        if(String(extra.aboPaid||"").toUpperCase() !== "OUI") return false;
      }
    }
  }catch(e){}
  return true;
}


function setOffreurExtra_(rowObj, patch){
  var sh = rowObj.sh;
  var h = rowObj.headers;
  function set(name, value){
    var idx = h.indexOf(name);
    if(idx < 0){
      // si pas là, on tente de l'ajouter
      idx = ensureExtraHeader_(sh, name);
      h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      rowObj.headers = h;
      idx = h.indexOf(name);
    }
    sh.getRange(rowObj.row, idx+1).setValue(value);
  }
  if(patch.hasOwnProperty("Credits")) set("Credits", patch.Credits);
  if(patch.hasOwnProperty("Plan")) set("Plan", patch.Plan);
  if(patch.hasOwnProperty("AboActive")) set("AboActive", patch.AboActive);
  if(patch.hasOwnProperty("TrialUsed")) set("TrialUsed", patch.TrialUsed);
  if(patch.hasOwnProperty("TrialEnd")) set("TrialEnd", patch.TrialEnd);
  if(patch.hasOwnProperty("AboPaid")) set("AboPaid", patch.AboPaid);
  if(patch.hasOwnProperty("TrialWarned")) set("TrialWarned", patch.TrialWarned);
}

function whoami_(token){
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Non connecté" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  var extra = getOffreurExtra_(r);
  return {
    ok:true,
    data:{
      email: sess.email,
      offreurId: sess.offreurId,
      credits: extra.credits,
      plan: extra.plan,
      aboActive: extra.aboActive,
      trialUsed: extra.trialUsed,
      trialEnd: extra.trialEnd
    }
  };
}

function activatePack_(token){
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  var extra = getOffreurExtra_(r);
  var credits = Number(extra.credits||0) || 0;
  credits = credits + 10;

  setOffreurExtra_(r, { Credits: credits, Plan: "PACK" });

  return { ok:true, credits: credits, plan:"PACK" };
}

function activateAbonnement_(token){
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  var extra = getOffreurExtra_(r);

  // Déjà activé
  if(String(extra.plan||"").toUpperCase()==="ABO" || String(extra.aboActive||"").toUpperCase()==="OUI"){
    return { ok:true, already:true, plan:"ABO", aboActive:"OUI", trialEnd: extra.trialEnd || "" };
  }

  // Anti-abus : un seul mois offert par email OU téléphone
  // - on bloque si le compte (ou un autre compte) a déjà TrialUsed=OUI avec même email ou tel
  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var rows = sheetToObjects_(sh);

  var email = String(sess.email||"").trim().toLowerCase();
  var tel = String(r.obj.Tel||"").trim();

  for(var i=0;i<rows.length;i++){
    var e = String(rows[i].Email||"").trim().toLowerCase();
    var t = String(rows[i].Tel||"").trim();
    var trialUsed = String(rows[i].TrialUsed||"NON").toUpperCase();
    if(trialUsed === "OUI"){
      if(e && email && e === email) return { ok:false, error:"Mois offert déjà utilisé pour cet email" };
      if(t && tel && t === tel) return { ok:false, error:"Mois offert déjà utilisé pour ce téléphone" };
    }
  }

  var now = new Date();
  var trialEnd = new Date(now.getTime() + 1000*60*60*24*30);

  setOffreurExtra_(r, {
    Plan: "ABO",
    AboActive: "OUI",
    AboPaid: "NON",
    TrialUsed: "OUI",
    TrialEnd: trialEnd.toISOString(),
    TrialWarned: ""
  });

  return { ok:true, plan:"ABO", aboActive:"OUI", trialEnd: trialEnd.toISOString() };
}

function hasAccess_(e, body){
  var token = tokenFrom_(e, body);
  var sess = sessionGet_(token);
  if(!sess) return { ok:true, has:false };

  var demandeId = String((body && (body.demandeId || body.id)) || (e && e.parameter && e.parameter.id) || "").trim();
  if(!demandeId) return { ok:true, has:false };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:true, has:false };

  // Demande + métier (sécurité : empêche accès hors domaine)
  var shD = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var dRows = sheetToObjects_(shD);
  var dRow = null;
  for(var i=0;i<dRows.length;i++){
    var rid = dRows[i].DemandeID || dRows[i].id || "";
    if(String(rid) === demandeId){ dRow = dRows[i]; break; }
  }
  if(!dRow) return { ok:true, has:false };

  var osvc = String(r.obj.Service||"").trim();
  if(!matchService_(osvc, dRow.Service)) return { ok:true, has:false };

  // Abonné actif => accès (respect trialEnd / aboPaid)
  var extra = getOffreurExtra_(r);
  if(isAboOk_(extra)){
    return { ok:true, has:true, via:"abonnement" };
  }

  // Accès ponctuel / pack
  var sh = ensureSheetStrict_(SHEETS.ACCESS, HEADERS.Access);
  var rows = sheetToObjects_(sh);
  for(var j=0;j<rows.length;j++){
    if(String(rows[j].OffreurID||"") === sess.offreurId && String(rows[j].DemandeID||"") === demandeId){
      return { ok:true, has:true, via: String(rows[j].Type||"") };
    }
  }
  return { ok:true, has:false };
}


function grantAccess_(e, body){
  var token = tokenFrom_(e, body);
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var demandeId = String((body && (body.demandeId || body.id)) || (e && e.parameter && e.parameter.id) || "").trim();
  var type = String((body && body.type) || "auto").trim().toLowerCase();
  if(!demandeId) return { ok:false, error:"ID de demande manquant" };

  // déjà accès ?
  var has = hasAccess_(e, { token: token, demandeId: demandeId });
  if(has && has.ok && has.has) return { ok:true, already:true, via: has.via || "" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  // Sécurité : demande existante + active + métier ok
  var shD = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var dRows = sheetToObjects_(shD);
  var dRow = null;
  for(var i=0;i<dRows.length;i++){
    var rid = dRows[i].DemandeID || dRows[i].id || "";
    if(String(rid) === demandeId){ dRow = dRows[i]; break; }
  }
  if(!dRow) return { ok:false, error:"Demande introuvable" };
  if(!isDemandeActive_(dRow)) return { ok:false, error:"Demande expirée ou clôturée" };

  var osvc = String(r.obj.Service||"").trim();
  if(!matchService_(osvc, dRow.Service)) return { ok:false, error:"Cette demande ne correspond pas à votre métier" };

  var extra = getOffreurExtra_(r);

  // déterminer type auto
  if(type === "auto"){
    if(isAboOk_(extra)) type = "abonnement";
    else if(Number(extra.credits||0) > 0) type = "credit";
    else type = "ponctuel";
  }

  // règles
  if(type === "credit"){
    var credits = Number(extra.credits||0) || 0;
    if(credits <= 0) return { ok:false, error:"Plus de crédits pack disponibles" };
    credits = credits - 1;
    setOffreurExtra_(r, { Credits: credits, Plan: String(extra.plan||"PACK") || "PACK" });
    extra.credits = credits;
  }

  if(type === "abonnement"){
    if(!isAboOk_(extra)){
      return { ok:false, error:"Abonnement requis" };
    }
  }

  // enregistre accès
  var sh = ensureSheetStrict_(SHEETS.ACCESS, HEADERS.Access);
  var exp = "";
  sh.appendRow([nowIso_(), sess.email, sess.offreurId, demandeId, type, exp]);

  return { ok:true, demandeId: demandeId, type: type, credits: Number(extra.credits||0) || 0 };
}


function getDemande_(e, body){
  var id = String((e && e.parameter && e.parameter.id) || (body && (body.id || body.demandeId)) || "").trim();
  if(!id) return { ok:false, error:"ID manquant" };

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rows = sheetToObjects_(sh);

  var row = null;
  for(var i=0;i<rows.length;i++){
    var rid = rows[i].DemandeID || rows[i].id || "";
    if(String(rid) === id){ row = rows[i]; break; }
  }
  if(!row) return { ok:false, error:"Demande introuvable" };

  // Masqué par défaut
  var item = {
    id: row.DemandeID,
    service: row.Service,
    serviceAutre: row.ServiceAutre,
    zone: row.Zone,
    commune: row.Commune,
    description: row.Description,
    budget: row.Budget,
    photos: [row.Photo1, row.Photo2, row.Photo3].filter(function(x){ return x && String(x).trim(); }),
    createdAt: row.Date
  };

  // Si accès => coordonnées
  var token = tokenFrom_(e, body);
  var sess = sessionGet_(token);
  var canSee = false;

  if(sess){
    var r = getOffreurRowById_(sess.offreurId);
    if(r){
      var extra = getOffreurExtra_(r);
      var osvc = String(r.obj.Service||"").trim();
      if(isAboOk_(extra) && matchService_(osvc, row.Service)){
        canSee = true;
      }
    }
    if(!canSee){
      var ha = hasAccess_(e, { token: token, demandeId: id });
      if(ha && ha.ok && ha.has) canSee = true;
    }
  }

  if(canSee){
    item.nom = row.Nom;
    item.tel = row.Tel;
    item.email = row.Email;
  }
  item.canSeeContact = canSee;

  return { ok:true, data:item };
}


function requestResetOffreur_(e, body){
  var email = String((body && body.email) || (body && body.payload && body.payload.email) || (e && e.parameter && e.parameter.email) || "").trim().toLowerCase();
  if(!email) return { ok:false, error:"Email manquant" };

  var token = randomToken_(32);
  var now = new Date();
  var exp = new Date(now.getTime() + 1000*60*30); // 30 minutes

  var sh = ensureSheetStrict_(SHEETS.RESETS, HEADERS.Resets);
  sh.appendRow([nowIso_(), token, email, exp.toISOString()]);

  // Email (best effort)
  try{
    MailApp.sendEmail({
      to: email,
      subject: "DevisExpress974 — Réinitialisation du mot de passe",
      body:
        "Voici ton code de réinitialisation (valable 30 min):\n\n" +
        token + "\n\n" +
        "Si tu n'es pas à l'origine de cette demande, ignore cet email."
    });
  }catch(err){}

  return { ok:true };
}


function confirmResetOffreur_(p){
  var token = String(p.token || p.resetToken || "").trim();
  var password = String(p.password || p.newPassword || "").trim();
  if(!token) return { ok:false, error:"Token manquant" };
  if(!password || password.length < 8) return { ok:false, error:"Mot de passe : 8 caractères minimum" };

  var sh = ensureSheetStrict_(SHEETS.RESETS, HEADERS.Resets);
  var values = sh.getDataRange().getValues();
  if(values.length < 2) return { ok:false, error:"Token invalide" };

  var h = values[0];
  var iTok = h.indexOf("ResetToken");
  var iEmail = h.indexOf("EmailOffreur");
  var iExp = h.indexOf("ExpiresAt");
  if(iTok < 0 || iEmail < 0 || iExp < 0) return { ok:false, error:"Config Resets invalide" };

  var email = "";
  var exp = null;
  var rowIndex = -1;
  for(var r=1;r<values.length;r++){
    if(String(values[r][iTok]||"") === token){
      email = String(values[r][iEmail]||"").trim().toLowerCase();
      try{ exp = new Date(values[r][iExp]); }catch(e){}
      rowIndex = r+1; // 1-indexed for sheet range
      break;
    }
  }
  if(!email) return { ok:false, error:"Token invalide" };
  if(exp && exp.getTime && exp.getTime() < new Date().getTime()) return { ok:false, error:"Token expiré" };

  // Update password on Offreurs
  var shOff = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var data = shOff.getDataRange().getValues();
  if(data.length < 2) return { ok:false, error:"Aucun compte" };
  var hh = data[0];
  var iEmail2 = hh.indexOf("Email");
  var iHash = hh.indexOf("PasswordHash");
  var iSalt = hh.indexOf("Salt");
  if(iEmail2 < 0 || iHash < 0 || iSalt < 0) return { ok:false, error:"Colonnes sécurité manquantes" };

  var foundRow = -1;
  for(var i=1;i<data.length;i++){
    if(String(data[i][iEmail2]||"").trim().toLowerCase() === email){
      foundRow = i+1;
      break;
    }
  }
  if(foundRow < 0) return { ok:false, error:"Compte introuvable" };

  var salt = randomSalt_();
  var hash = sha256_(password + "|" + salt);

  shOff.getRange(foundRow, iHash+1).setValue(hash);
  shOff.getRange(foundRow, iSalt+1).setValue(salt);

  // Invalidate token (best effort: delete row)
  try{
    sh.deleteRow(rowIndex);
  }catch(e){}

  return { ok:true };
}

function cronTrials_(){
  // Optionnel : alerte J-5 et désactivation après TrialEnd si non payé
  try{
    var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
    ensureExtraOffreursCols_();
    var rows = sheetToObjects_(sh);
    var now = new Date();
    var in5 = new Date(now.getTime() + 1000*60*60*24*5);

    for(var i=0;i<rows.length;i++){
      var o = rows[i];
      var plan = String(o.Plan||"").toUpperCase();
      var aboActive = String(o.AboActive||"").toUpperCase();
      if(plan !== "ABO" && aboActive !== "OUI") continue;

      var trialEndStr = String(o.TrialEnd||"");
      if(!trialEndStr) continue;

      var paid = String(o.AboPaid||"NON").toUpperCase();
      var warned = String(o.TrialWarned||"");

      var te = null;
      try{ te = new Date(trialEndStr); }catch(e){ te = null; }
      if(!te || !te.getTime) continue;

      // J-5 warning
      if(!warned && te.getTime() <= in5.getTime() && te.getTime() > now.getTime()){
        var to = String(o.Email||"").trim();
        if(to){
          sendMailSafe_(to, "DevisExpress974 — Fin du mois offert",
            "<p>Ton mois offert se termine le " + trialEndStr + ".</p><p>Pour garder l’abonnement, valide le paiement.</p><p>DevisExpress974</p>"
          );
        }
        // mark warned
        try{
          var rowObj = getOffreurRowById_(String(o.OffreurID||""));
          if(rowObj) setOffreurExtra_(rowObj, { TrialWarned: "OUI" });
        }catch(e){}
      }

      // After trial end: deactivate if not paid
      if(te.getTime() <= now.getTime() && paid !== "OUI"){
        try{
          var rowObj2 = getOffreurRowById_(String(o.OffreurID||""));
          if(rowObj2){
            setOffreurExtra_(rowObj2, { AboActive: "NON", Plan: "FREE" });
          }
        }catch(e){}
      }
    }
  }catch(e){}
}
