// Code.gs (DevisExpress974) - Backend Google Apps Script (v24-es5)
// ✅ Fix: si tes onglets ont de "mauvais" en-têtes, on les répare automatiquement.
//    (Sinon les champs deviennent undefined => le mur ne peut pas filtrer/service/mail offreur impossible.)

var VERSION = "v26-es5";

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

// ======================
// DEMANDEUR : lien retrait sécurisé (id + k)
// ======================
function getOrCreateSecret_(propName){
  var v = PROP.getProperty(propName);
  if(v) return v;
  // 32 caractères pseudo-aléatoires
  var seed = Utilities.getUuid().replace(/-/g,"") + Utilities.getUuid().replace(/-/g,"");
  v = seed.slice(0,32);
  PROP.setProperty(propName, v);
  return v;
}

function withdrawKey_(demandeId){
  var secret = getOrCreateSecret_("DX_DEMANDE_WITHDRAW_SECRET");
  var bytes = Utilities.computeHmacSha256Signature(String(demandeId||""), secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,"");
}

function verifyWithdrawKey_(demandeId, k){
  if(!demandeId || !k) return false;
  var expect = withdrawKey_(demandeId);
  return String(k).trim() === String(expect).trim();
}

function findDemandeRowIndexById_(sh, demandeId){
  var values = sh.getDataRange().getValues();
  if(!values || values.length < 2) return -1;
  var headers = values[0].map(function(x){ return String(x||"").trim(); });
  var idxId = headers.indexOf("DemandeID");
  if(idxId < 0) idxId = headers.indexOf("id");
  if(idxId < 0) return -1;

  for(var r=1;r<values.length;r++){
    if(String(values[r][idxId]||"") === String(demandeId)) return r+1; // 1-indexed
  }
  return -1;
}

function withdrawDemande_(p){
  p = p || {};
  var id = String(p.id||"").trim();
  var k = String(p.k||"").trim();
  if(!id || !k) return { ok:false, error:"Lien invalide (paramètres manquants)" };
  if(!verifyWithdrawKey_(id, k)) return { ok:false, error:"Lien invalide ou expiré" };

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rowIndex = findDemandeRowIndexById_(sh, id);
  if(rowIndex < 2) return { ok:false, error:"Demande introuvable" };

  var headers = sh.getDataRange().getValues()[0].map(function(x){ return String(x||"").trim(); });
  var idxStatus = headers.indexOf("Status");
  if(idxStatus < 0) idxStatus = headers.indexOf("Statut");
  if(idxStatus < 0) return { ok:false, error:"Colonne Status introuvable" };

  var cur = String(sh.getRange(rowIndex, idxStatus+1).getValue()||"").trim();
  if(cur && String(cur).toUpperCase().indexOf("SUPPRIM") === 0) return { ok:true, removed:true };

  // Marque comme supprimée => sort du mur (public + connecté)
  sh.getRange(rowIndex, idxStatus+1).setValue("SUPPRIMÉ");
  return { ok:true, removed:true };
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
  Demandes: ["Date","DemandeID","Service","ServiceAutre","Zone","Commune","Description","Budget","Nom","Tel","Email","Photo1","Photo2","Photo3","Status","OptInContact"],
  Offreurs: ["Date","OffreurID","Nom","Email","Tel","Service","ServiceAutre","Zone","Commune","Description","TypeOffreur","Siren","Entreprise","Pseudo","DisplayMode","ShowNote","PasswordHash","Salt","NoteMoyenne","NombreAvis","Actif"],
  Access:   ["Date","EmailOffreur","OffreurID","DemandeID","Type","ExpireAt"],
  Avis:     ["Date","AvisID","OffreurID","Note","Commentaire","AuteurNom"],
  Sessions: ["Date","Token","EmailOffreur","OffreurID","ExpiresAt"],
  Resets:   ["Date","ResetToken","EmailOffreur","ExpiresAt","UsedAt","EmailSentAt","EmailError"],
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

// Génère un token aléatoire (utilisé pour reset password)
function randomToken_(len){
  len = Number(len || 32);
  var out = "";
  while(out.length < len){
    out += Utilities.getUuid().replace(/-/g, "");
  }
  return out.slice(0, len);
}

/** Secret privé (script properties) pour hasher les tokens de reset (ne jamais exposer). */
function resetSecret_(){
  return getOrCreateSecret_("DX_RESET_SECRET");
}

/** Stockage sûr du token: on ne garde JAMAIS le token brut en sheet (on stocke un hash). */
function hashResetToken_(token){
  token = String(token || "");
  var secret = resetSecret_();
  return "h:" + sha256_(secret + "|" + token);
}

/** Retourne "" si OK, sinon un message d'erreur. */
function passwordPolicyError_(pw){
  pw = String(pw || "");
  if(pw.length < 8) return "Mot de passe : 8 caractères minimum.";
  if(!/[a-z]/.test(pw)) return "Mot de passe : ajoute au moins 1 minuscule.";
  if(!/[A-Z]/.test(pw)) return "Mot de passe : ajoute au moins 1 majuscule.";
  if(!/[0-9]/.test(pw)) return "Mot de passe : ajoute au moins 1 chiffre.";
  if(!/[^A-Za-z0-9]/.test(pw)) return "Mot de passe : ajoute au moins 1 symbole.";
  return "";
}

/** À exécuter 1 fois dans Apps Script (UI) pour autoriser l'envoi d'emails (MailApp). */
function dxAuthorizeMail_(){
  var to = "";
  try{ to = Session.getEffectiveUser().getEmail(); }catch(e){}
  if(!to) to = cfg_().OWNER_EMAIL || "";
  if(!to) throw new Error("Impossible de déterminer l'email d'envoi. Renseigne OWNER_EMAIL (Script Properties).");
  MailApp.sendEmail(to, "DevisExpress974 — test email", "Autorisation MailApp OK.");
  return { ok:true, to:to };
}






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
function isYes_(v){
  v = String(v||"").trim().toUpperCase();
  return (v === "OUI" || v === "YES" || v === "TRUE" || v === "1");
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
  try{ ensureCronTriggers_(); }catch(e){}

}


function ensureCronTriggers_(){
  // Installe un trigger quotidien pour gérer :
  // - mail d'alerte J-5 avant fin de mois offert
  // - désactivation automatique après TrialEnd si non payé
  //
  // Désactivation possible : ScriptProperties => DX_DISABLE_CRON=OUI
  try{
    var props = PropertiesService.getScriptProperties();
    var disable = String(props.getProperty("DX_DISABLE_CRON")||"").toUpperCase();
    if(disable === "OUI" || disable === "YES" || disable === "TRUE") return;

    // Anti-spam : ne check pas à chaque requête
    try{
      var cache = CacheService.getScriptCache();
      if(cache && cache.get("dx_cron_trials_checked")) return;
    }catch(e){}

    var triggers = ScriptApp.getProjectTriggers();
    var has = false;
    for(var i=0;i<triggers.length;i++){
      var t = triggers[i];
      try{
        if(t.getHandlerFunction && t.getHandlerFunction() === "cronTrials_"){ has = true; break; }
      }catch(e){}
    }
    if(!has){
      // Horaire basé sur le timezone du script Apps Script
      ScriptApp.newTrigger("cronTrials_").timeBased().everyDays(1).atHour(6).create();
    }

    try{
      var cache2 = CacheService.getScriptCache();
      if(cache2) cache2.put("dx_cron_trials_checked", "1", 6*60*60); // 6h
    }catch(e){}
  }catch(e){}
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
        return json_(listDemandesForOffreur_(tokenFrom_(e, body), body));

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

      case "withdrawDemande":
        return json_(withdrawDemande_(body.payload || body));


      case "listDemandesPublic":
      case "getDemandesPublic":
      case "listDemandes":
        return json_(listDemandesPublic_(body || {}));

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
        return json_(listOffreursPublic_(body || {}));

      case "getOffreurProfile":
      case "getOffreurProfilePublic":
        return json_(getOffreurProfile_(tokenFrom_(e, body), body));

      case "updateOffreurProfile":
        return json_(updateOffreurProfile_(tokenFrom_(e, body), body.payload || body));

      case "getMyPlan":
        return json_(getMyPlan_(tokenFrom_(e, body)));


      case "getOffreurPrefs":
        return json_(getOffreurPrefs_(tokenFrom_(e, body)));

      case "setOffreurPrefs":
        return json_(setOffreurPrefs_(tokenFrom_(e, body), body.payload || body));

      case "unsubscribeEmail":
        return json_(unsubscribeEmail_(body || {}));

      case "resubscribeEmail":
        return json_(resubscribeEmail_(body || {}));

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

  var acceptCgv = (p.acceptCGV !== undefined) ? p.acceptCGV : (p.acceptCgv !== undefined ? p.acceptCgv : "");
  var optInContact = (p.optInContact !== undefined) ? p.optInContact : (p.optIn || p.consentContact || p.acceptContact || "");

  if(!service || !zone || !commune || !description || !nom){
    return { ok:false, error:"Champs obligatoires manquants" };
  }
  if(description.length < 50){
    return { ok:false, error:"Description trop courte (min 50 caractères)" };
  }
  if(!tel && !email){
    return { ok:false, error:"Contact manquant (téléphone ou email)" };
  }
  if(!isYes_(acceptCgv)){
    return { ok:false, error:"Acceptation CGV requise" };
  }
  if(!isYes_(optInContact)){
    return { ok:false, error:"Consentement contact requis" };
  }

  var id = uid_("dem");

  // pièces jointes (optionnel) : stocke jusqu'à 3 liens (Photo1..3) dans la feuille
  var pjUrls = saveAttachments_(p.attachments, "dem", id);
  var photo1 = (pjUrls && pjUrls.length > 0) ? String(pjUrls[0]||"") : "";
  var photo2 = (pjUrls && pjUrls.length > 1) ? String(pjUrls[1]||"") : "";
  var photo3 = (pjUrls && pjUrls.length > 2) ? String(pjUrls[2]||"") : "";

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var optInVal = isYes_(optInContact) ? "OUI" : "NON";
  sh.appendRow([nowIso_(), id, service, serviceAutre, zone, commune, description, budget, nom, tel, email, photo1, photo2, photo3, "PUBLIÉ", optInVal]);

  // Mail demandeur (si email fourni)
  if(email){
    var cMail = cfg_();
    var site = cMail.SITE_URL ? String(cMail.SITE_URL).replace(/\/+$/,"") : "";
    var viewHtml = "";
    if(site){
      var viewUrl = site + "/demande-detail.html?id=" + encodeURIComponent(id);
      viewHtml = '<p><strong>Voir ma demande :</strong> <a href="' + viewUrl + '">clique ici</a></p>';
    }
    var withdrawHtml = "";
    if(site){
      var withdrawUrl = site + "/retirer-demande.html?id=" + encodeURIComponent(id) + "&k=" + encodeURIComponent(withdrawKey_(id));
      withdrawHtml = '<p><strong>Retirer ma demande :</strong> <a href="' + withdrawUrl + '">clique ici</a></p>';
    }
    var bodyHtml = "<p>Bonjour " + nom + ",</p>" +
      "<p>Ta demande a bien été publiée. Elle restera visible 30 jours.</p>" +
      viewHtml +
      withdrawHtml +
      "<p>DevisExpress974</p>";
    sendMailSafe_(email, "DevisExpress974 — Demande publiée", bodyHtml);
  }

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
  // Statut : seules les demandes PUBLIÉ/ACTIVE (ou vide) restent visibles
  var st = String(row.Status||row.Statut||"").trim().toUpperCase();
  if(st && st !== "PUBLIÉ" && st !== "PUBLIE" && st !== "ACTIVE") return false;

  // Expiration : priorité au champ ExpiresAt/ExpireAt si présent, sinon Date + 30 jours
  try{
    var expRaw = row.ExpiresAt || row.ExpireAt || row.Expire || row.Expiration;
    if(expRaw){
      var expD = new Date(expRaw);
      if(expD && expD.getTime && !isNaN(expD.getTime())){
        if(new Date().getTime() > expD.getTime()) return false;
        return true;
      }
    }
  }catch(e){}

  try{
    var d = new Date(row.Date);
    if(d && d.getTime && !isNaN(d.getTime())){
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

function matchAutreKeywords_(offreurServiceAutre, demandeServiceAutre, demandeDescription){
  // Matching "Autre" par mots clés : offreur(ServiceAutre) doit apparaître dans (demande ServiceAutre + description)
  var o = norm_(offreurServiceAutre||"");
  var blob = [
    demandeServiceAutre||"", demandeDescription||""
  ].map(function(x){ return norm_(x); }).join(" | ");

  if(!o) return true; // si l'offreur n'a rien précisé, on ne bloque pas
  // tokens >=3, retire petits mots fréquents
  var toks = o.split(/[^a-z0-9]+/).filter(function(t){ return t && t.length >= 3; });
  if(toks.length === 0) return true;

  var stop = { "les":1,"des":1,"une":1,"un":1,"aux":1,"pour":1,"avec":1,"sans":1,"sur":1,"dans":1,"chez":1,"par":1,"de":1,"du":1,"la":1,"le":1,"et":1,"ou":1,"a":1,"au":1,"d":1 };
  var hit = 0;
  for(var i=0;i<toks.length;i++){
    var t = toks[i];
    if(stop[t]) continue;
    if(blob.indexOf(t) !== -1) hit++;
  }
  // 1 hit suffit (strict mais pas bloquant)
  return hit > 0;
}

function matchOffreurDemandeService_(offreurObj, demandeObj){
  var os = String((offreurObj && offreurObj.Service) || "").trim();
  var ds = String((demandeObj && demandeObj.Service) || "").trim();
  if(!matchService_(os, ds)) return false;

  // Cas "Autre" : matching mots clés
  if(norm_(os) === norm_("autre") && norm_(ds) === norm_("autre")){
    var oAutre = String((offreurObj && offreurObj.ServiceAutre) || "").trim();
    var dAutre = String((demandeObj && demandeObj.ServiceAutre) || "").trim();
    var dDesc  = String((demandeObj && demandeObj.Description) || "").trim();
    return matchAutreKeywords_(oAutre, dAutre, dDesc);
  }
  return true;
}


function matchGeo_(offreurZone, offreurCommunes, demandeZone, demandeCommune){
  var oz = norm_(offreurZone);
  var dz = norm_(demandeZone);
  var dc = norm_(demandeCommune);

  // Toute l'île côté offreur
  if(oz === norm_("toute l'île") || oz === norm_("toute l ile") || oz === norm_("toute l'ile") || oz === norm_("toute l’île")){
    return true;
  }

  // Si la commune demandée est vide, on filtre par zone si elle est fournie.
  // (Permet : "toutes les communes d'une zone" sur le mur des demandes, et évite un filtre trop strict.)
  if(!dc){
    if(dz){
      return (!!oz && oz === dz);
    }
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

function listDemandesForOffreur_(token, params){
  params = params || {};

  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  var oService = String(r.obj.Service||"").trim();
  var oZone = String(r.obj.Zone||"").trim();
  var oCommunes = String(r.obj.Commune||"").trim();
  var extra = getOffreurExtra_(r);
  var aboOk = isAboOk_(extra);

  // Pagination (compat rétro : si aucun offset/limit fournis => renvoyer tout)
  var hasPaging = (params.offset !== undefined && params.offset !== null) || (params.limit !== undefined && params.limit !== null);

  var offset = Number(params.offset || 0);
  var limit = Number(params.limit || 0);
  if(!isFinite(offset) || offset < 0) offset = 0;

  if(!hasPaging){
    offset = 0;
    limit = 1000000000;
  }else{
    if(!isFinite(limit) || limit <= 0) limit = 50;
    if(limit > 200) limit = 200;
  }

  var q = String(params.q || "").trim();
  var nq = q ? norm_(q) : "";

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rows = sheetToObjects_(sh);

  var data = [];
  for(var i=0;i<rows.length;i++){
    var d = rows[i];
    if(!isDemandeActive_(d)) continue;

    // Matching strict service (+ "Autre" par mots clés)
    if(!matchOffreurDemandeService_(r.obj, d)) continue;

    // FREE/PACK/PONCTUEL => géo strict ; ABO => pas de contrainte géographique sur le mur
    if(!aboOk){
      if(!matchGeo_(oZone, oCommunes, d.Zone, d.Commune)) continue;
    }

    if(nq){
      var blob = [
        d.Service, d.ServiceAutre, d.Zone, d.Commune, d.Description, d.Budget
      ].map(function(x){ return norm_(x); }).join(" | ");
      if(blob.indexOf(nq) === -1) continue;
    }

    var photos = [d.Photo1, d.Photo2, d.Photo3].filter(function(x){ return x && String(x).trim(); });

    data.push({
      id: d.DemandeID || d.id,
      service: d.Service,
      serviceAutre: d.ServiceAutre,
      zone: d.Zone,
      commune: d.Commune,
      description: d.Description,
      budget: d.Budget,
      photos: photos,
      status: d.Status || "PUBLIÉ",
      createdAt: d.Date,
      expiresAt: d.ExpiresAt
    });
  }

  // Tri : plus récentes d'abord
  data.sort(function(a,b){
    return String(b.createdAt||"").localeCompare(String(a.createdAt||""));
  });

  var total = data.length;
  var page = data.slice(offset, offset + limit);

  return { ok:true, data:page, total: total, aboOk: aboOk };
}



function listDemandesPublic_(params){
  params = params || {};

  // Si l'appel ne fournit pas offset/limit (ancien comportement), on renvoie tout
  var hasPaging = (params.offset !== undefined && params.offset !== null) || (params.limit !== undefined && params.limit !== null);

  var offset = Number(params.offset || 0);
  var limit = Number(params.limit || 0);

  if(!isFinite(offset) || offset < 0) offset = 0;

  if(!hasPaging){
    offset = 0;
    limit = 1000000000; // "illimité" (volume géré côté client)
  }else{
    if(!isFinite(limit) || limit <= 0) limit = 50;
    if(limit > 200) limit = 200;
  }

  var q = String(params.q || "").trim();
  var nq = q ? norm_(q) : "";

  var sh = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rows = sheetToObjects_(sh);

  var data = [];
  for(var i=0;i<rows.length;i++){
    var r = rows[i];
    var st = String(r.Status||"").trim().toUpperCase();
    if(st === "SUPPRIMÉ" || st === "SUPPRIME") continue;
    if(!isDemandeActive_(r)) continue;

    // Filtre recherche (q) : service, commune, zone, description
    if(nq){
      var blob = [
        r.Service, r.ServiceAutre, r.Zone, r.Commune, r.Description, r.Budget
      ].map(function(x){ return norm_(x); }).join(" | ");
      if(blob.indexOf(nq) === -1) continue;
    }

    var photos = [r.Photo1, r.Photo2, r.Photo3].filter(function(x){ return x && String(x).trim(); });

    data.push({
      id: r.DemandeID,
      service: r.Service,
      serviceAutre: r.ServiceAutre,
      zone: r.Zone,
      commune: r.Commune,
      description: r.Description,
      budget: r.Budget,
      photos: photos,
      status: r.Status || "PUBLIÉ",
      createdAt: r.Date,
      expiresAt: r.ExpiresAt
    });
  }

  // Tri : plus récentes d'abord
  data.sort(function(a,b){
    return String(b.createdAt||"").localeCompare(String(a.createdAt||""));
  });

  var total = data.length;
  var page = data.slice(offset, offset + limit);

  return { ok:true, data:page, total: total };
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

  // Anti-bruteforce : 5 tentatives / 20 min, puis blocage 15 min (par email)
  var nowMs = new Date().getTime();
  var cache = null;
  var cacheKey = "dx_login_fail_" + email;

  try{ cache = CacheService.getScriptCache(); }catch(e){ cache = null; }

  function isBlocked_(){
    if(!cache) return false;
    try{
      var raw = cache.get(cacheKey);
      if(!raw) return false;
      var p = String(raw).split("|");
      var blockedUntil = Number(p[2]||"0") || 0;
      return blockedUntil && blockedUntil > nowMs;
    }catch(e2){ return false; }
  }

  function recordFail_(){
    if(!cache) return;
    try{
      var raw = cache.get(cacheKey);
      var n = 0, firstMs = nowMs, blockedUntil = 0;
      if(raw){
        var p = String(raw).split("|");
        n = Number(p[0]||"0") || 0;
        firstMs = Number(p[1]||String(nowMs)) || nowMs;
        blockedUntil = Number(p[2]||"0") || 0;
      }
      // fenêtre 20 minutes
      if(!firstMs || (nowMs - firstMs) > 20*60*1000){
        n = 0;
        firstMs = nowMs;
        blockedUntil = 0;
      }
      n = n + 1;
      if(n >= 5){
        blockedUntil = nowMs + 15*60*1000; // 15 min
      }
      cache.put(cacheKey, String(n) + "|" + String(firstMs) + "|" + String(blockedUntil), 60*60); // 1h
    }catch(e3){}
  }

  function clearFail_(){
    if(!cache) return;
    try{ cache.remove(cacheKey); }catch(e4){}
  }

  if(isBlocked_()){
    return { ok:false, error:"Trop de tentatives. Réessaie dans 15 minutes." };
  }

  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var rows = sheetToObjects_(sh);
  var r = null;
  for(var i=0;i<rows.length;i++){
    if(String(rows[i].Email||"").toLowerCase() === email){ r = rows[i]; break; }
  }

  if(!r){ recordFail_(); return { ok:false, error:"Identifiants invalides" }; }
  if(String(r.Actif||"OUI") !== "OUI"){ recordFail_(); return { ok:false, error:"Compte désactivé" }; }

  var salt = String(r.Salt||"");
  var hash = String(r.PasswordHash||"");
  var check = sha256_(salt + "|" + password);
  if(check !== hash){ recordFail_(); return { ok:false, error:"Identifiants invalides" }; }

  clearFail_();

  var sess = sessionCreate_(email, r.OffreurID);
  return { ok:true, token:sess.token, offreurId:r.OffreurID };
}

function listOffreursPublic_(params){
  params = params || {};

  // Si l'appel ne fournit pas offset/limit (ancien comportement), on renvoie tout
  var hasPaging = (params.offset !== undefined && params.offset !== null) || (params.limit !== undefined && params.limit !== null);

  var offset = Number(params.offset || 0);
  var limit = Number(params.limit || 0);

  if(!isFinite(offset) || offset < 0) offset = 0;

  if(!hasPaging){
    offset = 0;
    limit = 1000000000; // "illimité" (ex: noter-offreur.js cherche un ID)
  }else{
    if(!isFinite(limit) || limit <= 0) limit = 50;
    if(limit > 200) limit = 200;
  }

  var service = String(params.service || "").trim();
  var zone = String(params.zone || "").trim();
  var commune = String(params.commune || "").trim();
  var q = String(params.q || "").trim();
  var sort = String(params.sort || "").trim() || "note_desc";

  var nq = q ? norm_(q) : "";

  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureExtraOffreursCols_();
  var rows = sheetToObjects_(sh);

  var data = [];
  for(var i=0;i<rows.length;i++){
    var r = rows[i];
    if(String(r.Actif||"OUI").trim().toUpperCase() !== "OUI") continue;

    // Filtre service (obligatoire côté UI, mais tolérant)
    if(service){
      if(!matchService_(r.Service, service)) continue;
    }

    // Filtre zone/commune (si fourni)
    if(zone || commune){
      if(!matchGeo_(r.Zone, r.Commune, zone, commune)) continue;
    }

    var showNote = String(r.ShowNote||"OUI").toUpperCase();
    if(showNote !== "OUI" && showNote !== "NON") showNote = "OUI";

    var publicName = computePublicName_(r);

    // q : nom public, description, service, zone/commune
    if(nq){
      var blob = [
        publicName, r.Service, r.Zone, r.Commune, r.Description, r.Pseudo
      ].map(function(x){ return norm_(x); }).join(" | ");
      if(blob.indexOf(nq) === -1) continue;
    }

    data.push({
      id: r.OffreurID,
      publicName: publicName,
      service: r.Service,
      zone: r.Zone,
      commune: r.Commune,
      description: r.Description,
      pseudo: r.Pseudo || "",
      displayMode: r.DisplayMode || "NOM",
      showNote: showNote,
      noteMoyenne: r.NoteMoyenne,
      nombreAvis: r.NombreAvis
    });
  }

  // Tri : par note desc (par défaut) ou alpha A→Z
  if(norm_(sort) === norm_("alpha_asc")){
    data.sort(function(a,b){
      return String(a.publicName||"").localeCompare(String(b.publicName||""), "fr", { sensitivity:"base" });
    });
  }else{
    data.sort(function(a,b){
      var sa = String(a.showNote||"OUI").toUpperCase() === "OUI";
      var sb = String(b.showNote||"OUI").toUpperCase() === "OUI";
      var na = sa ? Number(a.noteMoyenne||-1) : -1;
      var nb = sb ? Number(b.noteMoyenne||-1) : -1;
      if(!isFinite(na)) na = -1;
      if(!isFinite(nb)) nb = -1;
      if(nb !== na) return nb - na;
      return String(a.publicName||"").localeCompare(String(b.publicName||""), "fr", { sensitivity:"base" });
    });
  }

  var total = data.length;
  var page = data.slice(offset, offset + limit);

  return { ok:true, data:page, total: total };
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

      var pref = String(o.NotifEmail||"").trim().toUpperCase();
      if(pref === "NON") continue;

      // Matching strict service (+ "Autre" par mots clés) + geo
      var dObj = demandeRow || { Service: service, ServiceAutre: "", Description: description };
      if(!matchOffreurDemandeService_(o, dObj)) continue;
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

      if(site){
        var unsubUrl = site + "/offreur-unsubscribe.html?email=" + encodeURIComponent(to) + "&sig=" + encodeURIComponent(unsubSig_(to));
        html += '<p style="margin-top:14px;font-size:12px;color:#666;">Notifications : <a href="' + unsubUrl + '">se désinscrire</a></p>';
      }

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
// PREFS NOTIFICATIONS (Patch44)
// ======================
function unsubSig_(email){
  email = String(email||"").trim().toLowerCase();
  var secret = getOrCreateSecret_("DX_UNSUB_SECRET");
  var bytes = Utilities.computeHmacSha256Signature(email, secret);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,"");
}

function verifyUnsubSig_(email, sig){
  email = String(email||"").trim().toLowerCase();
  sig = String(sig||"").trim();
  if(!email || !sig) return false;
  return String(unsubSig_(email)) === sig;
}

function setOffreurNotifByEmail_(email, value){
  email = String(email||"").trim().toLowerCase();
  value = String(value||"").trim().toUpperCase();
  if(value !== "OUI" && value !== "NON") value = "OUI";

  var sh = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  ensureExtraOffreursCols_();

  var values = sh.getDataRange().getValues();
  if(!values || values.length < 2) return { ok:true, notifEmail:value };

  var h = values[0];
  var iEmail = h.indexOf("Email");
  var iNotif = h.indexOf("NotifEmail");
  if(iEmail < 0) return { ok:true, notifEmail:value };

  if(iNotif < 0){
    iNotif = ensureExtraHeader_(sh, "NotifEmail");
    h = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    iNotif = h.indexOf("NotifEmail");
  }

  // Ne pas révéler si l'email existe : on applique si trouvé, sinon OK quand même
  for(var r=1;r<values.length;r++){
    if(String(values[r][iEmail]||"").trim().toLowerCase() === email){
      sh.getRange(r+1, iNotif+1).setValue(value);
      break;
    }
  }

  return { ok:true, notifEmail:value };
}

function unsubscribeEmail_(p){
  p = p || {};
  var email = String(p.email||"").trim().toLowerCase();
  var sig = String(p.sig||"").trim();
  if(!email || !sig) return { ok:false, error:"Paramètres manquants" };
  if(!verifyUnsubSig_(email, sig)) return { ok:false, error:"Signature invalide" };
  return setOffreurNotifByEmail_(email, "NON");
}

function resubscribeEmail_(p){
  p = p || {};
  var email = String(p.email||"").trim().toLowerCase();
  var sig = String(p.sig||"").trim();
  if(!email || !sig) return { ok:false, error:"Paramètres manquants" };
  if(!verifyUnsubSig_(email, sig)) return { ok:false, error:"Signature invalide" };
  return setOffreurNotifByEmail_(email, "OUI");
}

function getOffreurPrefs_(token){
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  ensureExtraOffreursCols_();
  var v = String(r.obj.NotifEmail||"").trim().toUpperCase();
  if(v !== "NON") v = "OUI";

  return { ok:true, prefs:{ notifEmail: (v === "OUI") }, notifEmail: v };
}

function setOffreurPrefs_(token, p){
  p = p || {};
  var sess = sessionGet_(token);
  if(!sess) return { ok:false, error:"Connexion requise" };

  var r = getOffreurRowById_(sess.offreurId);
  if(!r) return { ok:false, error:"Compte introuvable" };

  var v = String(p.notifEmail||"").trim().toUpperCase();
  if(v !== "OUI" && v !== "NON") return { ok:false, error:"Valeur invalide" };

  setOffreurExtra_(r, { NotifEmail: v });
  return { ok:true, notifEmail: v };
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
  ensureExtraHeader_(sh, "NotifEmail");
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
    trialWarned: String(g("TrialWarned")||""),
    notifEmail: String(g("NotifEmail")||"OUI")
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
  if(patch.hasOwnProperty("NotifEmail")) set("NotifEmail", patch.NotifEmail);
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

  var siren = String(r.obj.Siren||"").trim();
  if(siren) siren = siren.replace(/\D/g,"").slice(0,14);
  for(var i=0;i<rows.length;i++){
    var e = String(rows[i].Email||"").trim().toLowerCase();
    var t = String(rows[i].Tel||"").trim();
    var s = String(rows[i].Siren||"").trim();
    if(s) s = s.replace(/\D/g,"").slice(0,14);
    var trialUsed = String(rows[i].TrialUsed||"NON").toUpperCase();
    if(trialUsed === "OUI"){
      if(e && email && e === email) return { ok:false, error:"Mois offert déjà utilisé pour cet email" };
      if(t && tel && t === tel) return { ok:false, error:"Mois offert déjà utilisé pour ce téléphone" };
      if(s && siren && s === siren) return { ok:false, error:"Mois offert déjà utilisé pour ce SIREN/SIRET" };
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
  if(!matchOffreurDemandeService_(r.obj, dRow)) return { ok:true, has:false };

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
  if(!matchOffreurDemandeService_(r.obj, dRow)) return { ok:false, error:"Cette demande ne correspond pas à votre métier" };

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

  var active = true;
  try { active = isDemandeActive_(row); } catch(err){ active = true; }

  // Masqué par défaut
  var photos = [row.Photo1, row.Photo2, row.Photo3].filter(function(x){ return x && String(x).trim(); });
  var item = {
    id: row.DemandeID,
    DemandeID: row.DemandeID,
    service: row.Service,
    Service: row.Service,
    serviceAutre: row.ServiceAutre,
    ServiceAutre: row.ServiceAutre,
    zone: row.Zone,
    Zone: row.Zone,
    commune: row.Commune,
    Commune: row.Commune,
    description: row.Description,
    Description: row.Description,
    budget: row.Budget,
    Budget: row.Budget,
    photos: photos,
    Photos: photos,
    attachments: photos,
    Attachments: photos,
    createdAt: row.Date,
    CreatedAt: row.Date,
    status: row.Status,
    Status: row.Status,
    expiresAt: row.ExpiresAt,
    ExpiresAt: row.ExpiresAt,
    isActive: active
  };

  // Si accès => coordonnées (et PJ)
  var token = tokenFrom_(e, body);
  var sess = sessionGet_(token);

  var canSee = false;
  var reason = "";

  if(!active){
    canSee = false;
    reason = "DEMANDE_INACTIVE";
  } else if(!sess){
    canSee = false;
    reason = "NOT_LOGGED";
  } else {
    var r = getOffreurRowById_(sess.offreurId);
    if(!r){
      canSee = false;
      reason = "NO_ACCOUNT";
    } else {
      var extra = getOffreurExtra_(r);
      var osvc = String(r.obj.Service||"").trim();
      var match = matchOffreurDemandeService_(r.obj, row);

      if(!match){
        canSee = false;
        reason = "NOT_MATCH_SERVICE";
      } else if(isAboOk_(extra)){
        canSee = true;
        reason = "";
      } else {
        var ha = hasAccess_(e, { token: token, demandeId: id });
        if(ha && ha.ok && ha.has){
          canSee = true;
          reason = "";
        } else {
          // abonnement non actif (essai terminé / non payé) ou paiement requis
          if(String(extra.plan||"").toUpperCase() === "ABO"){
            reason = "ABO_INACTIVE";
          } else {
            reason = "PAY_REQUIRED";
          }
        }
      }

      // Infos utiles pour l'UI
      item.plan = String(extra.plan||"FREE");
      item.Plan = String(extra.plan||"FREE");
      item.credits = Number(extra.credits||0) || 0;
      item.Credits = Number(extra.credits||0) || 0;
      item.aboActive = String(extra.aboActive||"NON");
      item.AboActive = String(extra.aboActive||"NON");
      item.trialUsed = String(extra.trialUsed||"NON");
      item.TrialUsed = String(extra.trialUsed||"NON");
      item.trialEnd = String(extra.trialEnd||"");
      item.TrialEnd = String(extra.trialEnd||"");
      item.offreurService = osvc;
      item.OffreurService = osvc;
    }
  }

  if(canSee){
    item.nom = row.Nom;
    item.Nom = row.Nom;
    item.tel = row.Tel;
    item.Tel = row.Tel;
    item.telephone = row.Tel;
    item.Telephone = row.Tel;
    item.email = row.Email;
    item.Email = row.Email;
  }

  item.canSeeContact = canSee;
  item.CanSeeContact = canSee;
  item.accessReason = reason;
  item.AccessReason = reason;

  return { ok:true, data:item };
}


function requestResetOffreur_(e, body){
  var email = String(
    (body && (body.email || body.Email)) ||
    (body && body.payload && (body.payload.email || body.payload.Email)) ||
    (e && e.parameter && (e.parameter.email || e.parameter.Email)) ||
    ""
  ).trim().toLowerCase();

  if(!email) return { ok:false, error:"Email manquant" };

  // Rate limit (par email) : 3 demandes / heure (réponse neutre)
  try{
    var cache = CacheService.getScriptCache();
    var key = "dx_reset_req_" + email;
    var n = Number(cache.get(key) || "0") + 1;
    cache.put(key, String(n), 60*60);
    if(n > 3){
      // Réponse neutre (on ne révèle rien)
      return { ok:true };
    }
  }catch(e0){}

  // Vérifie existence offreur (sans révéler au client)
  var shOff = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var vals = shOff.getDataRange().getValues();
  if(vals.length < 2) return { ok:true };

  var h = vals[0];
  var iEmail = h.indexOf("Email");
  var iActif = h.indexOf("Actif");
  if(iEmail < 0) return { ok:true };

  var exists = false;
  for(var r=1; r<vals.length; r++){
    var row = vals[r];
    var em = String(row[iEmail] || "").trim().toLowerCase();
    if(em === email){
      var actifOk = true;
      if(iActif >= 0){
        var a = String(row[iActif] || "").trim().toLowerCase();
        if(a === "non" || a === "0" || a === "false") actifOk = false;
      }
      if(actifOk){ exists = true; }
      break;
    }
  }
  if(!exists) return { ok:true };

  // Crée token + hash (on stocke le hash uniquement)
  var token = randomToken_(32);
  var tokenHash = hashResetToken_(token);

  var sh = ensureSheetStrict_(SHEETS.RESETS, HEADERS.Resets);
  var values = sh.getDataRange().getValues();
  var hh = values[0];
  var iTok = hh.indexOf("ResetToken");
  var iEm  = hh.indexOf("EmailOffreur");
  var iExp = hh.indexOf("ExpiresAt");
  var iUsed = hh.indexOf("UsedAt");
  var iSent = hh.indexOf("EmailSentAt");
  var iErr  = hh.indexOf("EmailError");

  // Invalide d'anciens tokens (même email) — best effort
  try{
    for(var i=values.length-1; i>=1; i--){
      var row2 = values[i];
      var em2 = String(row2[iEm] || "").trim().toLowerCase();
      if(em2 === email){
        // marque comme utilisé/expiré
        var rr = i+1;
        if(iUsed >= 0) sh.getRange(rr, iUsed+1).setValue(nowIso_());
        if(iExp  >= 0) sh.getRange(rr, iExp+1).setValue(nowIso_());
        if(iTok  >= 0) sh.getRange(rr, iTok+1).setValue("");
      }
    }
  }catch(e1){}

  var now = new Date();
  var expires = new Date(now.getTime() + 30*60*1000); // 30 min
  var nowIso = now.toISOString();
  var expIso = expires.toISOString();

  // Ajoute la ligne reset (EmailSentAt/EmailError vides au départ)
  sh.appendRow([
    nowIso,
    tokenHash,
    email,
    expIso,
    "", // UsedAt
    "", // EmailSentAt
    ""  // EmailError
  ]);

  // Envoi email (IMPORTANT : lien + code) — si l'envoi échoue, on invalide le token
  try{
    var cfg = cfg_();
    var base = String(cfg.SITE_URL || "https://devisexpress974.netlify.app").replace(/\/$/,"");
    var link = base + "/offreur-reset?token=" + encodeURIComponent(token);

    var bodyTxt =
      "Bonjour,\n\n" +
      "Voici ton lien sécurisé pour réinitialiser ton mot de passe (valable 30 minutes) :\n\n" +
      link + "\n\n" +
      "Si le lien ne fonctionne pas, tu peux aussi saisir ce code sur la page 'Mot de passe oublié' :\n\n" +
      token + "\n\n" +
      "Si tu n'es pas à l'origine de cette demande, ignore cet email.\n";

    MailApp.sendEmail({
      to: email,
      subject: "DevisExpress974 — Réinitialisation du mot de passe",
      body: bodyTxt
    });

    // marque EmailSentAt sur la DERNIÈRE ligne ajoutée
    try{
      var lastRow = sh.getLastRow();
      if(iSent >= 0) sh.getRange(lastRow, iSent+1).setValue(nowIso_());
      if(iErr  >= 0) sh.getRange(lastRow, iErr+1).setValue("");
    }catch(e2){}
  }catch(err){
    // invalide le token si email non envoyé (sécurité)
    try{
      var lastRow2 = sh.getLastRow();
      if(iErr >= 0) sh.getRange(lastRow2, iErr+1).setValue(String(err && err.message ? err.message : err).slice(0,180));
      if(iExp >= 0) sh.getRange(lastRow2, iExp+1).setValue(nowIso_());
      if(iTok >= 0) sh.getRange(lastRow2, iTok+1).setValue("");
    }catch(e3){}
  }

  // Réponse neutre (ne révèle pas l'existence)
  return { ok:true };
}



function confirmResetOffreur_(p){
  var token = String(p.token || p.resetToken || "").trim();
  var password = String(p.password || p.newPassword || "").trim();
  if(!token) return { ok:false, error:"Token manquant" };

  var perr = passwordPolicyError_(password);
  if(perr) return { ok:false, error: perr };

  var sh = ensureSheetStrict_(SHEETS.RESETS, HEADERS.Resets);
  var values = sh.getDataRange().getValues();
  if(values.length < 2) return { ok:false, error:"Token invalide" };

  var h = values[0];
  var iTok = h.indexOf("ResetToken");
  var iEmail = h.indexOf("EmailOffreur");
  var iExp = h.indexOf("ExpiresAt");
  var iUsed = h.indexOf("UsedAt");
  var iSent = h.indexOf("EmailSentAt");

  if(iTok < 0 || iEmail < 0 || iExp < 0) return { ok:false, error:"Config Resets invalide" };

  var now = new Date();
  var tokenHash = hashResetToken_(token);

  // Concurrency guard
  var lock = LockService.getScriptLock();
  try{ lock.waitLock(8000); }catch(eLock){}

  try{
    // Re-read fresh after lock
    values = sh.getDataRange().getValues();
    if(values.length < 2) return { ok:false, error:"Token invalide" };
    h = values[0];

    var rowIndex = -1;
    var email = "";

    for(var i=1; i<values.length; i++){
      var row = values[i];
      var stored = String(row[iTok] || "").trim();
      if(!stored) continue;

      var match = false;
      if(stored.indexOf("h:") === 0){
        match = (stored === tokenHash);
      }else{
        // compat legacy (ancien format où on stockait le token brut)
        match = (stored === token);
      }
      if(match){
        rowIndex = i+1;
        email = String(row[iEmail] || "").trim().toLowerCase();
        break;
      }
    }

    if(rowIndex < 0) return { ok:false, error:"Token invalide" };

    // Sécurité : on accepte uniquement si l'email a été envoyé (sinon token invalide)
    if(iSent >= 0){
      var sentAt = String(values[rowIndex-1][iSent] || "").trim();
      if(!sentAt){
        return { ok:false, error:"Lien non envoyé. Refais une demande de réinitialisation." };
      }
    }

    // Expiration
    var exp = new Date(String(values[rowIndex-1][iExp] || ""));
    if(!exp || isNaN(exp.getTime()) || exp.getTime() < now.getTime()){
      return { ok:false, error:"Lien expiré. Refais une demande." };
    }

    // Déjà utilisé ?
    if(iUsed >= 0){
      var usedAt = String(values[rowIndex-1][iUsed] || "").trim();
      if(usedAt) return { ok:false, error:"Lien déjà utilisé." };
    }

    // Update offreur password
    var shOff = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
    var valsOff = shOff.getDataRange().getValues();
    if(valsOff.length < 2) return { ok:false, error:"Offreur introuvable" };

    var ho = valsOff[0];
    var iE = ho.indexOf("Email");
    var iHash = ho.indexOf("PasswordHash");
    var iSalt = ho.indexOf("Salt");
    if(iE < 0 || iHash < 0 || iSalt < 0) return { ok:false, error:"Config Offreurs invalide" };

    var foundRow = -1;
    for(var r=1; r<valsOff.length; r++){
      var em = String(valsOff[r][iE] || "").trim().toLowerCase();
      if(em === email){ foundRow = r+1; break; }
    }
    if(foundRow < 0) return { ok:false, error:"Offreur introuvable" };

    var salt = randomSalt_();
    var hash = sha256_(salt + "|" + password);

    shOff.getRange(foundRow, iHash+1).setValue(hash);
    shOff.getRange(foundRow, iSalt+1).setValue(salt);

    // Invalidate token (single-use, audit)
    try{
      var nowS = nowIso_();
      if(iUsed >= 0) sh.getRange(rowIndex, iUsed+1).setValue(nowS);
      sh.getRange(rowIndex, iExp+1).setValue(nowS);
      sh.getRange(rowIndex, iTok+1).setValue(""); // supprime le token hash
    }catch(eInv){}

    return { ok:true };
  }finally{
    try{ lock.releaseLock(); }catch(eRel){}
  }
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