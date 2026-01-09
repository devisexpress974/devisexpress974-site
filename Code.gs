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
  RESETS: "Resets"
};

var HEADERS = {
  Demandes: ["Date","DemandeID","Service","ServiceAutre","Zone","Commune","Description","Budget","Nom","Tel","Email","Status"],
  Offreurs: ["Date","OffreurID","Nom","Email","Tel","Service","Zone","Commune","Description","PasswordHash","Salt","NoteMoyenne","NombreAvis","Actif"],
  Access:   ["Date","EmailOffreur","OffreurID","DemandeID","Type","ExpireAt"],
  Avis:     ["Date","AvisID","OffreurID","Note","Commentaire","AuteurNom"],
  Sessions: ["Date","Token","EmailOffreur","OffreurID","ExpiresAt"],
  Resets:   ["Date","ResetToken","EmailOffreur","ExpiresAt"]
};


// ======================
// PIECES JOINTES (Drive)
// ======================
var ATTACHMENTS_ROOT_FOLDER = "DX_Attachments";
var ATTACHMENTS_MAX_FILES = 3;
var ATTACHMENTS_MAX_BYTES = 1500 * 1024; // 1,5 Mo conseillé

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

  // si la feuille existe mais headers pas bons => on renomme l'ancienne et on recrée propre
  var existing = sheetHeaders_(sh);
  // On considère "OK" si tous les headers attendus existent EXACTEMENT au début.
  var ok = arraysEqual_(existing.slice(0, headers.length), headers);

  if(!ok){
    renameOld_(ss, name);
    var fresh = ss.insertSheet(name);
    fresh.getRange(1,1,1,headers.length).setValues([headers]);
    fresh.setFrozenRows(1);
    return fresh;
  }
  return sh;
}

function ensureAll_(){
  ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureSheetStrict_(SHEETS.ACCESS,  HEADERS.Access);
  ensureSheetStrict_(SHEETS.AVIS,    HEADERS.Avis);
  ensureSheetStrict_(SHEETS.SESSIONS,HEADERS.Sessions);
  ensureSheetStrict_(SHEETS.RESETS,  HEADERS.Resets);
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
  var action = (e.parameter.action || "").trim();
  return route_(action, e, {});
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

  // pièces jointes (optionnel) : liens ajoutés dans la description (sans toucher aux colonnes)
  var pjUrls = saveAttachments_(p.attachments, "dem", id);
  if(pjUrls && pjUrls.length){
    description = description + "

Pièces jointes :
- " + pjUrls.join("
- ");
  }
  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  sh.appendRow([nowIso_(), id, service, serviceAutre, zone, commune, description, budget, nom, tel, email, "PUBLIÉ"]);

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
  var nom = String(p.nom||"").trim();
  var email = String(p.email||"").trim().toLowerCase();
  var tel = String(p.tel||"").trim();
  var password = String(p.password||"");
  var service = String(p.service||"").trim();
  var zone = String(p.zone||"").trim();
  var commune = String(p.commune||"").trim();
  var description = String(p.description||"").trim();

  if(!nom || !email || !tel || !password || !service || !zone || !commune || !description){
    return { ok:false, error:"Champs obligatoires manquants" };
  }
  if(password.length < 8) return { ok:false, error:"Mot de passe trop court" };

  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var rows = sheetToObjects_(sh);
  for(var i=0;i<rows.length;i++) if(String(rows[i].Email||"").toLowerCase() === email) return { ok:false, error:"Email déjà utilisé" };

  var offreurId = uid_("off");
  var salt = randomSalt_();
  var hash = sha256_(salt + "|" + password);

  sh.appendRow([nowIso_(), offreurId, nom, email, tel, service, zone, commune, description, hash, salt, "", "", "OUI"]);
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
  var rows = sheetToObjects_(sh);
  var data = [];
  for(var i=0;i<rows.length;i++){ 
    if(String(rows[i].Actif||"OUI") !== "OUI") continue;
    data.push({
      id: rows[i].OffreurID,
      nom: rows[i].Nom,
      service: rows[i].Service,
      zone: rows[i].Zone,
      commune: rows[i].Commune,
      description: rows[i].Description,
      noteMoyenne: rows[i].NoteMoyenne,
      nombreAvis: rows[i].NombreAvis
    });
  }
  data.sort(function(a,b){ return String(a.nom).localeCompare(String(b.nom)); });
  return { ok:true, data:data };
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
    var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
    var rows = sheetToObjects_(sh);

    var sNeed = norm_(service);
    var zNeed = norm_(zone);
    var cNeed = norm_(commune);

    var sent = 0;
    for(var i=0;i<rows.length;i++){ 
      if(String(rows[i].Actif||"OUI") !== "OUI") continue;
      var to = String(rows[i].Email||"").trim();
      if(!to) continue;

      var services = splitServices_(rows[i].Service || "");
      var okS = false;
      for(var j=0;j<services.length;j++) if(norm_(services[j]) === sNeed){ okS = true; break; }
      if(!okS && norm_(rows[i].Service||"") !== sNeed) continue;

      var zOff = norm_(rows[i].Zone||"");
      var cOff = norm_(rows[i].Commune||"");
      var okZ = (!zOff || zOff === "toutes" || zOff === "tout" || zOff === zNeed);
      var okC = (!cOff || cOff === "toutes" || cOff === "tout" || cOff === cNeed);
      if(!okZ || !okC) continue;

      var subj = "Nouvelle demande: " + service + " — " + commune;
      var safeDesc = String(description||"").replace(/</g,"&lt;");
      var html = "<p>Bonjour,</p>"
        + "<p>Une nouvelle demande correspond à ton service.</p>"
        + "<p><strong>Service :</strong> " + service + "<br>"
        + "<strong>Zone :</strong> " + zone + "<br>"
        + "<strong>Commune :</strong> " + commune + "</p>"
        + (budget ? ("<p><strong>Budget :</strong> " + budget + "</p>") : "")
        + "<p><strong>Description :</strong><br>" + safeDesc + "</p>"
        + "<p>Coordonnées masquées. Connecte-toi pour débloquer selon ta formule.</p>"
        + (site ? ("<p>Lien: " + site + "/mur-demandes.html</p>") : "")
        + "<p>ID demande: " + demandeId + "</p>"
        + "<p>DevisExpress974</p>";

      sendMailSafe_(to, subj, html);
      sent++;
      if(sent >= 50) break;
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
