
/* DX35 - demande submit wiring (Patch9)
   - Validation pro : tel OU email, tel 974, email format, description >=100
   - Consentements : démarchage (oui/non) + accept CGV obligatoire
   - Pièces jointes : jpg/png/pdf, max 3, 5 Mo max par fichier
   - Flags soft : incohérence service/description + langage inadapté (avertissement)
   Dépend de api.js (window.DX_API). */

(function(){
  function $(id){ return document.getElementById(id); }

  function showStatus(msg, type){
    var box = $('demandeStatus');
    if(!box) return;
    box.style.display = 'block';
    box.textContent = msg || '';
    if(type === 'ok'){
      box.style.background = '#e9fff1';
      box.style.borderColor = 'rgba(0,150,60,.25)';
      box.style.color = '#0b4b22';
    }else if(type === 'error'){
      box.style.background = '#ffe9ea';
      box.style.borderColor = 'rgba(200,0,20,.22)';
      box.style.color = '#7a0010';
    }else{
      box.style.background = '#fff3e6';
      box.style.borderColor = 'rgba(255,120,0,.25)';
      box.style.color = '#333';
    }
  }

  function stripAccents(s){
    try{ return (s||"").normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){ return s||""; }
  }
  function normText(s){
    s = stripAccents(String(s||"").toLowerCase());
    s = s.replace(/[^a-z0-9\s]/g,' ');
    s = s.replace(/\s+/g,' ').trim();
    return s;
  }

  function isValidEmail(email){
    email = String(email||"").trim().toLowerCase();
    if(!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function normalizePhone974(tel){
    tel = String(tel||"").trim();
    if(!tel) return "";
    tel = tel.replace(/[\s\.\-\(\)]/g,'');
    if(/^0(262|692|693)\d{6}$/.test(tel)) return tel;
    if(/^\+262(262|692|693)\d{6}$/.test(tel)) return tel;
    if(/^262(262|692|693)\d{6}$/.test(tel)) return tel;
    return "";
  }

  // lecture fichiers -> dataURL
  function readAsDataURL(file){
    return new Promise(function(resolve, reject){
      var r = new FileReader();
      r.onload = function(){ resolve(String(r.result||"")); };
      r.onerror = function(){ reject(new Error('Lecture fichier impossible')); };
      r.readAsDataURL(file);
    });
  }

  async function buildAttachments(fileList){
    var files = Array.prototype.slice.call(fileList || []);
    if(files.length > 3) files = files.slice(0,3);

    var out = [];
    for(var i=0;i<files.length;i++){
      var f = files[i];
      var name = String(f.name||"").toLowerCase();
      var type = String(f.type||"").toLowerCase();

      var okType = (type.indexOf('image/') === 0) || (type === 'application/pdf');
      var okExt = (/\.(jpg|jpeg|png|pdf)$/i).test(name);

      if(!okType || !okExt){
        throw new Error("Fichier non autorisé : " + (f.name||""));
      }
      if(f.size && f.size > (5*1024*1024)){
        throw new Error("Fichier trop lourd (max 5 Mo) : " + (f.name||""));
      }

      var dataUrl = await readAsDataURL(f);
      var parts = dataUrl.split(',');
      var b64 = parts.length > 1 ? parts[1] : '';
      out.push({
        name: f.name || ('pj_'+(i+1)),
        type: f.type || 'application/octet-stream',
        dataBase64: b64
      });
    }
    return out;
  }

  function detectSoftBadWords(text){
    var t = normText(text);
    if(!t) return 0;
    var bad = ["idiot","imbecile","debile","nul","con","connard","sale","stupide","abruti","bouffon"];
    var score = 0;
    for(var i=0;i<bad.length;i++){
      var w = bad[i];
      var re = new RegExp("\\b" + w + "\\b","g");
      var m = t.match(re);
      if(m && m.length) score += Math.min(2, m.length);
    }
    return score;
  }

  function coherenceFlag(service, serviceAutre, description){
    // heuristique douce : flag seulement si très évident
    var svc = normText(service);
    var desc = normText(description);

    function score(h, words){
      var sc=0;
      for(var i=0;i<words.length;i++){
        if(h.indexOf(words[i]) !== -1) sc++;
      }
      return sc;
    }

    var groups = [
      {k:"plomberie", svc:["plomb","fuite","debouch","chauffe eau","salle de bain"], desc:["plomb","fuite","debouch","evier","wc","robinet","chauffe eau"]},
      {k:"electricite", svc:["elect","tableau","interrup","prise"], desc:["elect","tableau","disjonct","prise","interrup","cable"]},
      {k:"banque", svc:["banque","assurance","credit","pret"], desc:["banque","assurance","credit","pret","compte","banquier"]},
      {k:"chien", svc:["chien","garde","petsit","animal"], desc:["chien","garde","promenade","animal","petsitter"]},
      {k:"menage", svc:["menage","nettoyage","vitre"], desc:["menage","nettoyage","vitre","aspir","serpill"]},
    ];

    var svcGroup="", bestSvc=0, bestDescGroup="", bestDesc=0;
    for(var i=0;i<groups.length;i++){
      var g=groups[i];
      var s=score(svc,g.svc);
      if(s>bestSvc){ bestSvc=s; svcGroup=g.k; }
      var d=score(desc,g.desc);
      if(d>bestDesc){ bestDesc=d; bestDescGroup=g.k; }
    }

    if(bestDesc>=3 && svcGroup && bestDescGroup && svcGroup !== bestDescGroup && bestSvc<=1){
      return true;
    }
    return false;
  }

  function toggleAutreService(serviceVal){
    var row = $('rowAutreService');
    if(!row) return;
    row.style.display = (serviceVal === 'Autre') ? 'grid' : 'none';
  }

  function updateCounter(){
    var t = String(($('besoin') && $('besoin').value) || '');
    var c = $('descCount');
    if(c) c.textContent = String(t.length);
  }

  async function onSubmit(e){
    e.preventDefault();

    if(!window.DX_API || typeof DX_API.post !== 'function'){
      showStatus("API non chargée (api.js). Recharge la page.", "error");
      return;
    }

    var service = String(($('typeService') && $('typeService').value) || '').trim();
    var serviceAutre = String(($('autreService') && $('autreService').value) || '').trim();
    var zone = String(($('zone') && $('zone').value) || '').trim();
    var commune = String(($('commune') && $('commune').value) || '').trim();
    var description = String(($('besoin') && $('besoin').value) || '').trim();
    var budget = String(($('budget') && $('budget').value) || '').trim();
    var nom = String(($('nomPrenom') && $('nomPrenom').value) || '').trim();
    var telRaw = String(($('telephone') && $('telephone').value) || '').trim();
    var emailRaw = String(($('email') && $('email').value) || '').trim();
    var acceptCgv = !!($('acceptCgv') && $('acceptCgv').checked);
    var optInContact = !!($('optInContact') && $('optInContact').checked);

    // règles mini
    if(!service) service = '';
    if(!zone) zone = '';
    if(!commune) commune = '';

    if(!service || !zone || !commune || !description || !nom){
      showStatus("Champs obligatoires manquants : service / zone / commune / description / nom.", "error");
      return;
    }
    if(service === 'Autre' && !serviceAutre){
      showStatus("Tu as choisi « Autre » : précise le service.", "error");
      return;
    }
    if(description.length < 50){
      showStatus("La description doit faire au moins 50 caractères.", "error");
      return;
    }
    if(!acceptCgv){
      showStatus("Tu dois accepter les CGV / confidentialité pour publier.", "error");
      return;
    }
    if(!optInContact){
      showStatus("Tu dois accepter d’être contacté(e) par des professionnels pour recevoir des devis.", "error");
      return;
    }
    if(!telRaw && !emailRaw){
      showStatus("Mets au moins un moyen de contact : téléphone OU email.", "error");
      return;
    }

    var telNorm = telRaw ? normalizePhone974(telRaw) : "";
    if(telRaw && !telNorm){
      showStatus("Numéro invalide (format 974). Exemple : 0692XXXXXX.", "error");
      return;
    }
    var email = emailRaw ? String(emailRaw).trim().toLowerCase() : "";
    if(emailRaw && !isValidEmail(email)){
      showStatus("Email invalide (ex : nom@domaine.fr).", "error");
      return;
    }

    // soft checks
    var badScore = detectSoftBadWords(description);
    if(badScore >= 2){
      showStatus("Ta demande semble contenir des mots inadaptés : elle pourra être vérifiée avant publication.", "info");
    }
    if(coherenceFlag(service, serviceAutre, description)){
      // avertissement (pas de blocage)
      var ok = confirm("Ton texte semble parler d’un autre domaine que le service choisi. Continuer quand même ?");
      if(!ok) return;
    }

    // pièces jointes
    var fileInput = $('pieces');
    var attachments = [];
    if(fileInput && fileInput.files && fileInput.files.length){
      if(fileInput.files.length > 3){
        showStatus("Tu peux joindre maximum 3 fichiers.", "error");
        return;
      }
      try{
        attachments = await buildAttachments(fileInput.files);
      }catch(err){
        showStatus("❌ " + (err && err.message ? err.message : String(err)), "error");
        return;
      }
    }

    var submitBtn = e.target.querySelector('button[type="submit"], input[type="submit"]');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }

    try{
      showStatus("Envoi de ta demande…", "info");

      var payload = {
        service: service,
        serviceAutre: serviceAutre,
        zone: zone,
        commune: commune,
        description: description,
        budget: budget,
        nom: nom,
        tel: telRaw,
        email: email,
        acceptCGV: acceptCgv,
        optInContact: optInContact ? "OUI" : "NON",
        attachments: attachments
      };

      var res = await DX_API.post('createDemande', payload);
      if(res && res.ok){
        var id = (res.id || (res.data && res.data.id) || '').toString();
        var st = (res.status || (res.data && res.data.status) || '').toString();
        if(st && st.toUpperCase() === 'MODERATION'){
          showStatus("✅ Demande reçue (ID : " + (id || "—") + "). Elle est en vérification avant publication.", "ok");
        }else{
          showStatus("✅ Demande publiée ! (ID : " + (id || "—") + ")", "ok");
        }
        // reset léger
        // e.target.reset();  // (désactivé pour ne pas effacer si l’utilisateur veut copier)
      }else{
        var msg = (res && (res.error || res.message)) ? (res.error || res.message) : "Erreur lors de la publication.";
        showStatus("❌ " + msg, "error");
      }
    }catch(err){
      showStatus("❌ Erreur : " + (err && err.message ? err.message : String(err)), "error");
    }finally{
      if(submitBtn){ submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    var form = $('demandeForm');
    if(form){
      form.addEventListener('submit', onSubmit);
    }

    var serviceSel = $('typeService');
    if(serviceSel){
      serviceSel.addEventListener('change', function(){ toggleAutreService(String(serviceSel.value||"").trim()); });
      toggleAutreService(String(serviceSel.value||"").trim());
    }

    var desc = $('besoin');
    if(desc){
      desc.addEventListener('input', updateCounter);
      updateCounter();
    }

    // sécurité : limiter à 3 fichiers (UX)
    var input = $('pieces');
    var err = $('fileError');
    if(input){
      input.addEventListener('change', function(){
        var files = input.files ? Array.from(input.files) : [];
        if (files.length > 3) {
          if(err) err.style.display = 'block';
          input.value = '';
        } else {
          if(err) err.style.display = 'none';
        }
      });
    }
  });
})();
