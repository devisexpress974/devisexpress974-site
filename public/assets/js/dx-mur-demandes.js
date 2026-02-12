/* DX49 - mur des demandes
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

function parseDate(v){
  if(!v) return null;
  try{
    var d = new Date(v);
    if(isNaN(d.getTime())) return null;
    return d;
  }catch(e){ return null; }
}

function fmtDateTime(d){
  if(!d) return '—';
  try{
    return d.toLocaleString('fr-FR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  }catch(e){
    return d.toLocaleString('fr-FR');
  }
}

function timeAgo(d){
  if(!d) return '';
  var ms = Date.now() - d.getTime();
  if(!isFinite(ms)) return '';
  var s = Math.floor(ms/1000);
  if(s < 10) return "à l’instant";
  if(s < 60) return "il y a " + s + " s";
  var m = Math.floor(s/60);
  if(m < 60) return "il y a " + m + " min";
  var h = Math.floor(m/60);
  if(h < 48) return "il y a " + h + " h";
  var j = Math.floor(h/24);
  if(j < 14) return "il y a " + j + " j";
  var sem = Math.floor(j/7);
  if(sem < 8) return "il y a " + sem + " sem";
  var mo = Math.floor(j/30);
  if(mo < 24) return "il y a " + mo + " mois";
  var a = Math.floor(j/365);
  return "il y a " + a + " an" + (a>1 ? "s" : "");
}

function addOneMonth(d){
  if(!d) return null;
  var x = new Date(d.getTime());
  x.setMonth(x.getMonth() + 1);
  return x;
}

function statusLabel(raw){
  raw = String(raw||'').trim().toUpperCase();
  if(!raw) raw = 'PUBLIÉ';
  if(raw === 'PUBLIE' || raw === 'PUBLIÉ') return {t:'Publié', bg:'rgba(255,122,24,.14)', fg:'#ffb36b'};
  if(raw === 'EN_COURS' || raw === 'EN COURS') return {t:'En cours', bg:'rgba(255,122,24,.10)', fg:'#ffd2a8'};
  if(raw === 'CLOTURE' || raw === 'CLOTURÉ' || raw === 'CLOTUREE' || raw === 'CLOTURÉE') return {t:'Clôturée', bg:'rgba(255,255,255,.06)', fg:'rgba(255,255,255,.78)'};
  if(raw === 'EXPIRE' || raw === 'EXPIRÉ' || raw === 'EXPIREE' || raw === 'EXPIRÉE') return {t:'Expirée', bg:'rgba(255,122,24,.10)', fg:'#ffd2a8'};
  if(raw === 'SUPPRIME' || raw === 'SUPPRIMÉ') return {t:'Supprimée', bg:'#f3f4f6', fg:'#6b7280'};
  return {t: raw.charAt(0) + raw.slice(1).toLowerCase(), bg:'#f3f4f6', fg:'#111827'};
}

function pillHtml(info){
  return '<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-weight:900;font-size:12px;background:'+info.bg+';color:'+info.fg+';">'+esc(info.t)+'</span>';
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

  // ---- filtres ----
  var currentQ = '';
  var currentSvc = '';

  function readUrlParam_(name){
    try{
      var sp = new URLSearchParams(location.search || '');
      return (sp.get(name) || '').toString().trim();
    }catch(e){
      return '';
    }
  }

  function initFromUrl_(){
    // exact métier (filtre strict)
    currentSvc = readUrlParam_('service') || readUrlParam_('svc') || readUrlParam_('typeService') || '';
    // recherche libre (texte)
    var q = readUrlParam_('q') || '';
    var input = $('murSearch');
    if(input && q) input.value = q;
    // badge métier
    renderSvcBadge_();
  }

  function sameText_(a,b){
    a = (a||'').toString().trim().toLowerCase();
    b = (b||'').toString().trim().toLowerCase();
    try{
      a = a.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      b = b.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    }catch(e){}
    return a === b;
  }

  function containsText_(hay, needle){
    hay = (hay||'').toString().toLowerCase();
    needle = (needle||'').toString().toLowerCase().trim();
    if(!needle) return true;
    try{
      hay = hay.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      needle = needle.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    }catch(e){}
    return hay.indexOf(needle) !== -1;
  }

  function applyFilters_(list){
    var out = (list || []).slice();
    // filtre strict service
    if(currentSvc){
      out = out.filter(function(it){
        return sameText_(serviceLabel(it), currentSvc);
      });
    }
    // recherche texte (client-side en plus du server-side, pour robustesse)
    if(currentQ){
      out = out.filter(function(it){
        var blob = [
          serviceLabel(it),
          it.zone || it.Zone || '',
          it.commune || it.Commune || '',
          it.description || it.Description || '',
          it.serviceAutre || it.ServiceAutre || ''
        ].join(' ');
        return containsText_(blob, currentQ);
      });
    }
    return out;
  }

  function getVisible_(){
    return applyFilters_(all);
  }

  function setQueryParam_(k,v){
    try{
      var sp = new URLSearchParams(location.search || '');
      if(!v) sp.delete(k);
      else sp.set(k, v);
      var qs = sp.toString();
      var url = location.pathname + (qs ? ('?' + qs) : '');
      history.replaceState(null, '', url);
    }catch(e){}
  }

  function renderSvcBadge_(){
    var host = $('murFilters');
    var existing = document.getElementById('murServiceBadge');
    if(!host){
      if(existing) existing.remove();
      return;
    }
    if(!currentSvc){
      if(existing) existing.remove();
      return;
    }
    if(!existing){
      existing = document.createElement('button');
      existing.id = 'murServiceBadge';
      existing.type = 'button';
      existing.style.cssText = 'padding:10px 12px;border-radius:999px;border:1px solid rgba(0,0,0,.15);background:#fff;font-weight:900;cursor:pointer;';
      existing.addEventListener('click', function(){
        // clear filtre métier
        currentSvc = '';
        setQueryParam_('service','');
        setQueryParam_('svc','');
        setQueryParam_('typeService','');
        renderSvcBadge_();
        load();
      });
      host.insertBefore(existing, host.firstChild);
    }
    existing.textContent = 'Métier: ' + currentSvc + ' ✕';
  }

  var debounceT = null;

  // ---- aperçu public ----
  var PUBLIC_PER_SERVICE = 3;   // aperçu par domaine
  var PUBLIC_MAX_TOTAL   = 24;  // limite totale pour l'aperçu

  function getToken(){
    try{ return localStorage.getItem('dx_token') || ''; }catch(e){ return ''; }
  }
  function isLoggedIn(){ return !!getToken(); }

  function readQ(){
    var el = $('murSearch');
    return el ? String(el.value || '').trim() : '';
  }

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
      var createdRaw = (it.createdAt || it.CreatedAt || it.Date || it.date || it.Timestamp || '').toString();
      var createdD = parseDate(createdRaw);
      var createdAt = esc(createdRaw);
      var createdPretty = createdD ? (fmtDateTime(createdD) + (timeAgo(createdD) ? ' • ' + timeAgo(createdD) : '')) : createdAt;
      var statusRaw = (it.status || it.Status || 'PUBLIÉ');
      var sInfo = statusLabel(statusRaw);
      var status = pillHtml(sInfo);
      var expiresD = (it.expiresAt || it.ExpiresAt) ? parseDate(it.expiresAt || it.ExpiresAt) : addOneMonth(createdD);
      var expiresPretty = expiresD ? fmtDateTime(expiresD) : '—';

      var card = document.createElement('article');
      card.className = 'murCard';
      card.innerHTML = ''
        + '<div class="murCardTop">'
        + '  <div class="murService">'+ service +'</div>'
        + '  <div class="murMeta">'+ zone + (commune ? ' • '+commune : '') +'</div>'
        + '</div>'
        + '<div class="murDesc">'+ desc +'</div>'
        + '<div class="murCardBottom">'
        + '  <div class="murSmall">Publié : '+ createdPretty +'</div>'
        + '  <div class="murSmall">Expire : '+ esc(expiresPretty) +'</div>'
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

    var groups = groupByService(getVisible_());

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

    var shown = getVisible_().length || 0;
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
    renderCards(getVisible_(), host);
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
    var forcePublic = !!opts.forcePublic;

    if(reset){
      all = [];
      total = 0;
    }

    try{
      var offset = all.length;
      var params = { offset: offset, limit: limit };
      if(currentQ) params.q = currentQ;
      if(currentSvc) params.service = currentSvc;

      var logged = isLoggedIn() && !forcePublic;
      var action = logged ? "listDemandesForOffreur" : "listDemandesPublic";
      var res = await DX_API.get(action, params);

      // Token invalide => fallback en mode public (une seule fois)
      if(logged && res && !res.ok){
        var msg = String(res.error || "");
        if(/connexion|token|session/i.test(msg)){
          try{ localStorage.removeItem("dx_token"); }catch(e){}
          return fetchPage({ reset: reset, limit: limit, forcePublic: true });
        }
      }

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

  function initFilters(){
    var input = $('murSearch');
    var refresh = $('murRefresh');

    // Pré-remplir via ?q=... (optionnel)
    try{
      var sp = new URLSearchParams(location.search);
      var qp = sp.get('q');
      if(qp && input && !input.value) input.value = qp;
    }catch(e){}

    if(input){
      input.addEventListener('input', function(){
        clearTimeout(debounceT);
        debounceT = setTimeout(function(){
          var q = readQ();
          if(q === currentQ) return;
          currentQ = q;
          load();
        }, 350);
      });

      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          clearTimeout(debounceT);
          currentQ = readQ();
          load();
        }
      });
    }

    if(refresh){
      refresh.addEventListener('click', function(){
        clearTimeout(debounceT);
        currentQ = readQ();
        load();
      });
    }
  }

  // patch: load() lit currentQ avant d'appeler l'API
  var _origLoad = load;
  load = async function(){
    currentQ = readQ();
    await _origLoad();
  };

  document.addEventListener('DOMContentLoaded', function(){
    initFromUrl_();
    initFilters();
    load();
  });
})();