/* DX43 - mur des demandes
   - Public: affiche un aperçu (limité par service) + CTA connexion "Voir plus"
   - Connecté: affiche tout le mur
   Dépend de api.js (window.DX_API). */

(function(){
  function $(id){ return document.getElementById(id); }

  function esc(s){
    s = (s === undefined || s === null) ? '' : String(s);
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function showStatus(msg){
    var box = $('murStatus');
    if(!box) return;
    if(!msg){ box.style.display='none'; box.textContent=''; return; }
    box.style.display = 'block';
    box.textContent = msg;
  }

  var all = [];

  // ---- état offreur connecté (token) ----
  var me = null;
  var pendingUnlockId = '';

  var PUBLIC_PER_SERVICE = 3;   // aperçu par domaine
  var PUBLIC_MAX_TOTAL   = 24;  // limite totale pour l'aperçu

  function getToken(){
    try{ return localStorage.getItem('dx_token') || ''; }catch(e){ return ''; }
  }
  function isLoggedIn(){ return !!getToken(); }

  function serviceLabel(it){
    var s = (it && (it.service || it.Service)) ? String(it.service || it.Service) : '';
    var sa = (it && (it.serviceAutre || it.ServiceAutre)) ? String(it.serviceAutre || it.ServiceAutre) : '';
    s = (s || '').trim();
    sa = (sa || '').trim();
    if(!s) s = 'Autre';
    if(s.toLowerCase() === 'autre' && sa) return 'Autre : ' + sa;
    return s;
  }

  async function loadMe(){
    me = null;
    if(!isLoggedIn()) return null;
    if(!window.DX_API || !DX_API.getAny) return null;
    try{
      var res = await DX_API.getAny(['me','whoami'], {});
      if(res && res.ok){ me = res.data || res.me || res.user || null; }
    }catch(e){ me = null; }
    return me;
  }

  function renderCards(list, host){
    (list || []).forEach(function(it){
      var id = it.id || it.DemandeID || it.demandeId || '';
      var service = esc(serviceLabel(it));
      var zone = esc(it.zone || it.Zone || '');
      var commune = esc(it.commune || it.Commune || '');
      var desc = esc(it.description || it.Description || '');
      var createdAt = esc((it.createdAt || it.Date || it.date || '').toString());
      var status = esc(it.status || it.Status || 'PUBLIÉ');

      var card = document.createElement('article');
      card.className = 'murCard';
      card.innerHTML = ''
        + '<div class="murCardTop">'
        + '  <div class="murService">'+ service +'</div>'
        + '  <div class="murMeta">'+ zone + (commune ? ' • '+commune : '') +'</div>'
        + '</div>'
        + '<div class="murDesc">'+ desc +'</div>'
        + '<div class="murCardBottom">'
        + '  <div class="murSmall">Publié : '+ createdAt +'</div>'
        + '  <div class="murSmall">Statut : '+ status +'</div>'
        + '</div>';

      // clic => détail (si page détail existe)
      card.addEventListener('click', function(){
        if(!id) return;
        var url = './demande-detail.html?id=' + encodeURIComponent(String(id));
        window.location.href = url;
      });

      host.appendChild(card);
    });
  }

  function renderLoginCta(host){
    var box = document.createElement('div');
    box.className = 'murLoginBox';
    box.innerHTML = ''
      + '<div style="font-weight:900;margin-bottom:6px;">Pour voir toutes les demandes</div>'
      + '<div style="color:#6b7280;margin-bottom:10px;">Crée un compte ou connecte-toi (accès aux demandes complètes).</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
      + '  <a class="dxBtn dxBtnPrimary" href="./offreur-login.html?next=mur-demandes.html">Se connecter</a>'
      + '  <a class="dxBtn dxBtnGhost" href="./offreur-register.html?next=mur-demandes.html">Créer un compte</a>'
      + '</div>';
    host.appendChild(box);
  }

  function renderPublicPreview(){
    var host = $('murList');
    if(!host) return;
    host.innerHTML = '';

    // regroupe par service
    var groups = {};
    for(var i=0;i<all.length;i++){
      var it = all[i];
      var key = serviceLabel(it);
      if(!groups[key]) groups[key] = [];
      groups[key].push(it);
    }

    // ordre des groupes: plus récent d'abord
    var keys = Object.keys(groups);
    keys.sort(function(a,b){
      var da = String((groups[a][0] && (groups[a][0].createdAt || groups[a][0].Date)) || '');
      var db = String((groups[b][0] && (groups[b][0].createdAt || groups[b][0].Date)) || '');
      return db.localeCompare(da);
    });

    var shownTotal = 0;
    for(var k=0;k<keys.length;k++){
      if(shownTotal >= PUBLIC_MAX_TOTAL) break;
      var svc = keys[k];
      var arr = groups[svc] || [];
      if(!arr.length) continue;

      var sec = document.createElement('section');
      sec.className = 'murSection';

      var title = document.createElement('div');
      title.className = 'murSectionTitle';
      title.innerHTML = ''
        + '<span>'+ esc(svc) +'</span>'
        + '<span class="murSectionCount">'+ Math.min(arr.length, PUBLIC_PER_SERVICE) +'/'+ arr.length +'</span>';
      sec.appendChild(title);

      var listWrap = document.createElement('div');
      listWrap.className = 'murSectionList';

      var slice = arr.slice(0, PUBLIC_PER_SERVICE);
      // limite globale
      if(shownTotal + slice.length > PUBLIC_MAX_TOTAL){
        slice = slice.slice(0, Math.max(0, PUBLIC_MAX_TOTAL - shownTotal));
      }

      renderCards(slice, listWrap);
      shownTotal += slice.length;

      sec.appendChild(listWrap);

      if(arr.length > PUBLIC_PER_SERVICE){
        var more = document.createElement('a');
        more.className = 'murMore';
        more.href = './offreur-login.html?next=mur-demandes.html';
        more.textContent = 'Voir plus de demandes (connexion)';
        sec.appendChild(more);
      }

      host.appendChild(sec);
    }

    renderLoginCta(host);

    // petite info
    var info = $('murInfo');
    if(info){
      info.textContent = 'Aperçu public : certaines demandes seulement. Connecte-toi pour tout voir.';
      info.style.display = 'block';
    }
  }

  function renderFull(){
    var host = $('murList');
    if(!host) return;
    host.innerHTML = '';
    renderCards(all, host);

    var info = $('murInfo');
    if(info){
      info.textContent = '';
      info.style.display = 'none';
    }
  }

  function render(){
    if(!all || !all.length){
      showStatus("Aucune demande pour l'instant.");
      return;
    }
    showStatus("");
    if(isLoggedIn()) renderFull();
    else renderPublicPreview();
  }

  async function load(){
    pendingUnlockId = '';
    try{
      var u = new URL(window.location.href);
      pendingUnlockId = u.searchParams.get('unlock') || '';
    }catch(e){}

    if(!window.DX_API || !DX_API.get){
      showStatus("API non chargée (api.js). Recharge la page.");
      return;
    }

    showStatus("Chargement des demandes…");
    try{
      // statut auth (silencieux)
      await loadMe();

      var res = await DX_API.get('listDemandesPublic');
      if(res && res.ok){
        all = res.data || [];
        render();
      }else{
        showStatus((res && res.error) ? res.error : "Erreur de chargement.");
      }
    }catch(e){
      showStatus("Erreur réseau. Recharge la page.");
    }
  }

  document.addEventListener('DOMContentLoaded', load);
})();
