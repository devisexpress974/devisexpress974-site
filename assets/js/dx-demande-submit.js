/* DX33 - demande submit wiring
   Envoie le formulaire demande.html vers le backend GAS via Netlify function.
   Dépend de api.js (window.DX_API). */

(function(){
  function $(id){ return document.getElementById(id); }
  function showStatus(msg, type){
    var box = $('demandeStatus');
    if(!box) return;
    box.style.display = 'block';
    box.textContent = msg || '';
    // petites variations sans casser le thème
    if(type === 'ok'){
      box.style.background = '#e9fff1';
      box.style.borderColor = 'rgba(0,150,60,.25)';
      box.style.color = '#0b4b22';
    }else if(type === 'error'){
      box.style.background = '#fff0f0';
      box.style.borderColor = 'rgba(220,50,50,.25)';
      box.style.color = '#7a1111';
    }else{
      box.style.background = '#fff3e6';
      box.style.borderColor = 'rgba(255,120,0,.25)';
      box.style.color = '#333';
    }
  }

  function readAsDataURL(file){
    return new Promise(function(resolve, reject){
      var r = new FileReader();
      r.onload = function(){ resolve(String(r.result || '')); };
      r.onerror = function(){ reject(new Error('Lecture fichier impossible')); };
      r.readAsDataURL(file);
    });
  }

  async function buildAttachments(fileList){
    var files = Array.prototype.slice.call(fileList || []);
    var imgs = [];
    for(var i=0;i<files.length;i++){
      var f = files[i];
      var mime = String(f.type || '').toLowerCase();
      if(mime.indexOf('image/') !== 0) continue;
      imgs.push(f);
      if(imgs.length >= 3) break;
    }
    var out = [];
    for(var j=0;j<imgs.length;j++){
      var f2 = imgs[j];
      var dataUrl = await readAsDataURL(f2);
      var parts = dataUrl.split(',');
      var b64 = parts.length > 1 ? parts[1] : '';
      out.push({
        name: f2.name || ('photo_'+(j+1)+'.jpg'),
        mime: f2.type || 'image/jpeg',
        base64: b64
      });
    }
    return out;
  }

  async function onSubmit(e){
    e.preventDefault();

    if(!window.DX_API || !DX_API.post){
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
    var tel = String(($('telephone') && $('telephone').value) || '').trim();
    var email = String(($('email') && $('email').value) || '').trim();

    // règles mini
    if(!service || service === 'Choisir un service...') service = '';
    if(!zone || zone === 'Choisir une zone...') zone = '';
    if(!commune || commune === 'Choisir une commune...') commune = '';

    if(!service || !zone || !commune || !description || !nom || !tel || !email){
      showStatus("Champs obligatoires manquants : vérifie service / zone / commune / description / nom / tel / email.", "error");
      return;
    }
    if(service === 'Autre' && !serviceAutre){
      showStatus("Tu as choisi \"Autre\" : précise le service dans le champ \"Autre\".", "error");
      return;
    }

    // Bouton submit
    var submitBtn = e.target.querySelector('button[type="submit"], input[type="submit"]');
    if(submitBtn){ submitBtn.disabled = true; submitBtn.style.opacity = '0.7'; }

    try{
      showStatus("Envoi de ta demande…", "info");

      // pièces jointes (images uniquement, max 3)
      var fileInput = $('pieces');
      var attachments = [];
      if(fileInput && fileInput.files && fileInput.files.length){
        attachments = await buildAttachments(fileInput.files);
      }

      var payload = {
        service: service,
        serviceAutre: serviceAutre,
        zone: zone,
        commune: commune,
        description: description,
        budget: budget,
        nom: nom,
        tel: tel,
        email: email,
        attachments: attachments
      };

      var res = await DX_API.post('createDemande', payload);
      if(res && res.ok){
        var id = (res.id || (res.data && res.data.id) || '').toString();
        showStatus("✅ Demande publiée ! (ID : " + (id || "—") + ") Redirection vers le mur…", "ok");
        try{ e.target.reset(); }catch(_){}
        setTimeout(function(){
          window.location.href = "./mur-demandes.html" + (id ? ("?id="+encodeURIComponent(id)) : "");
        }, 900);
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
    if(!form) return;
    form.addEventListener('submit', onSubmit);
  });

})();