
// ======================
// AVIS / NOTATION (demandeur-only)
// ======================

function colIndexAny_(headers, names){
  headers = headers || [];
  names = names || [];
  var map = {};
  for(var i=0;i<headers.length;i++){
    var h = String(headers[i]||"").trim();
    if(!h) continue;
    map[h.toLowerCase()] = i+1; // 1-indexed
  }
  for(var j=0;j<names.length;j++){
    var n = String(names[j]||"").trim();
    if(!n) continue;
    var idx = map[n.toLowerCase()];
    if(idx) return idx;
  }
  // fallback: partial contains
  for(var k=0;k<names.length;k++){
    var nn = String(names[k]||"").trim().toLowerCase();
    if(!nn) continue;
    for(var key in map){
      if(key && key.indexOf(nn) !== -1) return map[key];
    }
  }
  return 0;
}

function listOffreursForDemande_(p){
  p = p || {};
  var demandeId = String(p.demandeId||p.demandeID||p.DemandeID||p.id||"").trim();
  var k = String(p.k||p.key||p.token||p.demandeurToken||p.DemandeurToken||"").trim();
  if(!demandeId || !k) return { ok:false, error:"Lien invalide (parametres manquants)" };
  if(!verifyWithdrawKey_(demandeId, k)) return { ok:false, error:"Lien invalide ou expire" };

  var shAcc = ensureSheetStrict_(SHEETS.ACCESS, HEADERS.Access);
  var acc = sheetToObjects_(shAcc) || [];
  var ids = {};
  for(var i=0;i<acc.length;i++){
    var a = acc[i] || {};
    var did = String(a.DemandeID||a.demandeId||a.demandeID||"").trim();
    if(did !== demandeId) continue;
    var oid = String(a.OffreurID||a.offreurId||a.offreurID||"").trim();
    if(oid) ids[oid] = true;
  }
  var listIds = [];
  for(var oid2 in ids){ listIds.push(oid2); }
  if(!listIds.length) return { ok:true, data: [] };

  var shOff = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var offs = sheetToObjects_(shOff) || [];
  var out = [];
  for(var j=0;j<offs.length;j++){
    var o = offs[j] || {};
    var oid3 = String(o.OffreurID||o.offreurId||o.id||"").trim();
    if(!oid3 || !ids[oid3]) continue;
    var publicName = String(o.Pseudo||o.Nom||"Prestataire").trim();
    out.push({
      id: oid3,
      publicName: publicName,
      service: String(o.Service||"").trim(),
      zone: String(o.Zone||"").trim(),
      commune: String(o.Commune||"").trim()
    });
  }

  out.sort(function(a,b){
    var A = String(a.publicName||"").toLowerCase();
    var B = String(b.publicName||"").toLowerCase();
    if(A < B) return -1;
    if(A > B) return 1;
    return 0;
  });

  return { ok:true, data: out };
}

function addAvisFromDemande_(p){
  p = p || {};
  var demandeId = String(p.demandeId||p.demandeID||p.DemandeID||p.id||"").trim();
  var k = String(p.k||p.key||p.token||p.demandeurToken||p.DemandeurToken||"").trim();
  var offreurId = String(p.offreurId||p.offreurID||p.OffreurID||"").trim();
  var note = Number(p.note||0);
  var commentaire = String(p.commentaire||"").trim();
  var auteurNom = String(p.auteurNom||"").trim();
  var auteurEmail = String(p.auteurEmail||p.email||p.AuteurEmail||"").trim();

  if(!demandeId || !k) return { ok:false, error:"Lien de notation requis. Ouvre le lien depuis ton email." };
  if(!verifyWithdrawKey_(demandeId, k)) return { ok:false, error:"Lien invalide ou expire" };

  if(!offreurId) return { ok:false, error:"OffreurID manquant" };
  if(!note || note < 1 || note > 5) return { ok:false, error:"Note invalide (1 a 5)" };
  if(!auteurNom) return { ok:false, error:"Ton nom est obligatoire" };

  // La demande doit exister (meme SUPPRIME)
  var shD = ensureSheetStrict_(SHEETS.DEMANDES, HEADERS.Demandes);
  var rowD = findDemandeRowIndexById_(shD, demandeId);
  if(rowD < 2) return { ok:false, error:"Demande introuvable" };

  // Un seul avis par demande (evite modifications / spam)
  var shA = ensureSheetStrict_(SHEETS.AVIS, HEADERS.Avis);
  var hA = sheetHeaders_(shA);
  var colDem = colIndexAny_(hA, ["DemandeID","DemandeId","demande_id"]);
  if(!colDem) return { ok:false, error:"Feuille Avis: colonne DemandeID manquante" };

  var vals = shA.getDataRange().getValues();
  for(var i=1;i<vals.length;i++){
    if(String(vals[i][colDem-1]||"").trim() === demandeId){
      return { ok:false, error:"Un avis existe deja pour cette demande." };
    }
  }

  var avisId = uid_("avi");

  // PJ optionnelles
  var pjUrls = saveAttachments_(p.attachments, "avi", avisId);
  if(pjUrls && pjUrls.length){
    commentaire = (commentaire ? commentaire : "") + "\n\nPieces jointes :\n- " + pjUrls.join("\n- ");
  }

  var now = nowIso_();

  // Construire la ligne selon les headers existants (ne rien casser)
  var row = [];
  for(var c=0;c<hA.length;c++) row.push("");

  function setIf(colNames, value){
    var col = colIndexAny_(hA, colNames);
    if(col && col >= 1 && col <= row.length) row[col-1] = value;
  }

  setIf(["Date"], now);
  setIf(["AvisID"], avisId);
  setIf(["OffreurID"], offreurId);
  setIf(["Note"], note);
  setIf(["Commentaire"], commentaire);
  setIf(["AuteurNom"], auteurNom);
  setIf(["AuteurEmail","AuteurMail"], auteurEmail);
  setIf(["DemandeID"], demandeId);
  setIf(["DemandeurToken","DemandeurToke","Token"], k);
  setIf(["Status","Statut"], "LOCKED");
  setIf(["CreatedAt","Created_At"], now);
  setIf(["LockedAt","locked_at"], now);
  setIf(["SelectedOffreurID","SelectedOffreurId"], offreurId);

  shA.appendRow(row);

  // Recalcule et met a jour la note moyenne de l'offreur (ignore PENDING si colonne Status existe)
  var shO = ensureSheetStrict_(SHEETS.OFFREURS, HEADERS.Offreurs);
  var hO = sheetHeaders_(shO);
  var colId = colIndexAny_(hO, ["OffreurID"]);
  var colNoteM = colIndexAny_(hO, ["NoteMoyenne"]);
  var colNb = colIndexAny_(hO, ["NombreAvis"]);

  if(colId && colNoteM && colNb){
    var rowO = findRowBy_(shO, colId, offreurId);
    if(rowO > 0){
      var vals2 = shA.getDataRange().getValues();
      var colOff = colIndexAny_(hA, ["OffreurID"]);
      var colNote = colIndexAny_(hA, ["Note"]);
      var colSt = colIndexAny_(hA, ["Status","Statut"]);

      var sum = 0, count = 0;
      for(var r=1;r<vals2.length;r++){
        if(String(vals2[r][colOff-1]||"").trim() !== offreurId) continue;
        if(colSt){
          var st = String(vals2[r][colSt-1]||"").trim().toUpperCase();
          if(st === "PENDING") continue;
        }
        var n = Number(vals2[r][colNote-1] || 0);
        if(n){ sum += n; count++; }
      }
      var avg = count ? Math.round((sum / count) * 10) / 10 : 0;
      shO.getRange(rowO, colNoteM).setValue(avg);
      shO.getRange(rowO, colNb).setValue(count);
    }
  }

  return { ok:true, avisId: avisId, locked:true };
}

// Legacy route: we keep the old action name but we REQUIRE demandeId+k to prevent abuse
function addAvisOffreur_(p){
  p = p || {};
  var demandeId = String(p.demandeId||p.demandeID||p.DemandeID||p.id||"").trim();
  var k = String(p.k||p.key||p.token||p.demandeurToken||p.DemandeurToken||"").trim();
  if(!demandeId || !k){
    return { ok:false, error:"Pour noter, ouvre le lien recu par email (id + cle)." };
  }
  return addAvisFromDemande_(p);
}
