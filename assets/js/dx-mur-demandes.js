/* DX46 - mur des demandes
   - Public: affiche un aperçu (limité par service) + CTA connexion "Voir plus"
   - Connecté: affiche le mur complet via pagination (Voir plus)
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
    box.style.display='block';
    box.textContent = msg;
  }

  // ---- état ----
  var all = [];
  var total = 0;
  var pageSizeLogged = 24;
  var pageSizePublicFetch = 200;
  var loading = false;

  // ---- aperçu public ----
  var PUBLIC_PER_SERVICE = 3;   // aperçu par domaine
  var PUBLIC_MAX_TOTAL   = 24;  // limite totale pour l'aperçu

  function getToken(){
    try{ return localStorage.getItem('dx_token') || ''; }catch(e){ return ''; }
  }
  function isLoggedIn(){ return !!getToken(); }

  function serviceLabel(it){
    var s = (it.service || it.Service || '').toString();
    if(/^autre/i.test(s)){
      var a = (it.serviceAutre || it.ServiceAutre || '').toString().trim();
      if(a) return 'Autre — ' + a;
    }
    return s;
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

  function groupByService(list){
    var groups = {};
    (list||[]).forEach(function(it){
      var k = serviceLabel(it) || 'Autre';
      if(!groups[k]) groups[k] = [];
      groups[k].push(it);
    });
    return groups;
  }

  function renderPublicPreview(){
    var host = $('murList');
    if(!host) return;
    host.innerHTML = '';

    var groups = groupByService(all);

    // ordre: services avec le plus de demandes récentes d’abord
    var keys = Object.keys(groups).sort(function(a,b){
      return groups[b].length - groups[a].length;
    });

    var shownTotal = 0;
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      var arr = groups[k];
      if(shownTotal >= PUBLIC_MAX_TOTAL) break;

      var sec = document.createElement('section');
      sec.className = 'murSection';

      var title = document.createElement('div');
      title.className = 'murSectionTitle';
      title.innerHTML = '<span>'+ esc(k) +'</span>'
        + '<span class="murSectionCount">'+ Math.min(arr.length, PUBLIC_PER_SERVICE) +'/'+ arr.length +'</span>';
      sec.appendChild(title);

      var listWrap = document.createElement('div');
      listWrap.className = 'murGrid';

      var slice = arr.slice(0, PUBLIC_PER_SERVICE);
      if(shownTotal + slice.length > PUBLIC_MAX_TOTAL){
        slice = slice.slice(0, Math.max(0, PUBLIC_MAX_TOTAL - shownTotal));
      }
      shownTotal += slice.length;

      renderCards(slice, listWrap);
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
  }

  function ensurePager(){
    var host = $('murList');
    if(!host) return null;
    var pager = document.getElementById('murPager');
    if(pager) return pager;

    pager = document.createElement('div');
    pager.id = 'murPager';
    pager.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0 4px 0;flex-wrap:wrap;';
    pager.innerHTML = ''
      + '<div id="murPagerCount" style="font-weight:900;color:#1f2329;"></div>'
      + '<button id="murPagerBtn" class="dxBtn dxBtnPrimary" type="button" style="cursor:pointer;">Voir plus</button>';

    host.insertAdjacentElement('afterend', pager);

    var btn = document.getElementById('murPagerBtn');
    if(btn){
      btn.addEventListener('click', function(){
        if(loading) return;
        loadMore();
      });
    }
    return pager;
  }

  function updatePager(){
    var pager = ensurePager();
    if(!pager) return;

    var count = document.getElementById('murPagerCount');
    var btn = document.getElementById('murPagerBtn');

    if(!isLoggedIn()){
      pager.style.display = 'none';
      return;
    }

    var shown = all.length || 0;
    var t = total || shown;

    if(count) count.textContent = shown + ' / ' + t;

    if(btn){
      var canMore = (shown < t);
      btn.style.display = canMore ? 'inline-flex' : 'none';
      btn.disabled = loading;
      btn.textContent = loading ? 'Chargement…' : 'Voir plus';
    }

    pager.style.display = 'flex';
  }

  function renderFull(){
    var host = $('murList');
    if(!host) return;
    host.innerHTML = '';
    renderCards(all, host);
    updatePager();
  }

  function render(){
    showStatus("");
    if(isLoggedIn()) renderFull();
    else renderPublicPreview();
  }

  async function fetchPage(opts){
    opts = opts || {};
    var reset = !!opts.reset;
    var limit = opts.limit;

    if(reset){
      all = [];
      total = 0;
    }

    try{
      var offset = all.length;
      var res = await DX_API.get('listDemandesPublic', { offset: offset, limit: limit });
      if(res && res.ok){
        var items = res.data || [];
        var t = (res.total !== undefined && res.total !== null) ? Number(res.total) : null;

        if(reset){
          all = items;
        }else{
          all = all.concat(items);
        }

        if(isFinite(t) && t >= 0) total = t;
        else total = all.length;

        render();
      }else{
        showStatus((res && res.error) ? res.error : "Erreur de chargement.");
      }
    }catch(e){
      showStatus("Erreur réseau. Recharge la page.");
    }
  }

  async function loadMore(){
    if(!window.DX_API || !DX_API.get) return;

    loading = true;
    updatePager();

    var limit = pageSizeLogged;
    await fetchPage({ reset:false, limit: limit });

    loading = false;
    updatePager();
  }

  async function load(){
    if(!window.DX_API || !DX_API.get){
      showStatus("API indisponible (api.js manquant).");
      return;
    }

    loading = true;
    showStatus("Chargement…");

    // Public: on ne récupère qu’un lot “raisonnable” (les demandes les plus récentes)
    // Connecté: pagination (Voir plus)
    var limit = isLoggedIn() ? pageSizeLogged : pageSizePublicFetch;
    await fetchPage({ reset:true, limit: limit });

    loading = false;
    updatePager();
  }

  document.addEventListener('DOMContentLoaded', load);
})();