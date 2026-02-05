/* DX33 - mur des demandes
   Affiche les demandes depuis le Google Sheet via l'action listDemandesPublic.
   Dépend de api.js (window.DX_API). */

(function(){
  function $(id){ return document.getElementById(id); }

  function esc(s){
    s = (s === undefined || s === null) ? '' : String(s);
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function showStatus(msg){
    var box = $('murStatus');
    if(!box) return;
    if(!msg){ box.style.display='none'; box.textContent=''; return; }
    box.style.display='block';
    box.textContent = msg;
  }

  var all = [];
  var visible = [];
  var PUBLIC_MAX = 12; // total max visible sans compte
  var PUBLIC_PER_SERVICE = 3; // max par service sans compte


  // ---- état offreur connecté (token) ----
  var me = null;
  var pendingUnlockId = '';

  function getToken(){
    try{ return localStorage.getItem('dx_token') || ''; }catch(e){ return ''; }
  }
  function isLoggedIn(){ return !!getToken(); }
function slicePublic(list){
  var per = {};
  var out = [];
  for(var i=0;i<list.length;i++){
    var d = list[i] || {};
    var k = String(d.service_id || d.serviceId || d.service || 'autre');
    per[k] = per[k] || 0;
    if(per[k] >= PUBLIC_PER_SERVICE) continue;
    out.push(d);
    per[k]++;
    if(out.length >= PUBLIC_MAX) break;
  }
  return out;
}

function ensureGateEl(){
  var gate = $('murGate');
  if(gate) return gate;
  var host = $('murList');
  if(!host) return null;
  gate = document.createElement('div');
  gate.id = 'murGate';
  gate.style.cssText = 'margin-top:14px;';
  host.insertAdjacentElement('afterend', gate);
  return gate;
}

function showGate(total, shown){
  if(!(total > shown)) { hideGate(); return; }
  var gate = ensureGateEl();
  if(!gate) return;
  var next = (location.pathname ? location.pathname.replace(/^\//,'') : 'mur-demandes.html') + (location.search||'');
  var loginUrl = './offreur-login.html?next=' + encodeURIComponent(next);
  var regUrl = './offreur-register.html';
  var btnCss = 'display:inline-flex;align-items:center;justify-content:center;padding:11px 16px;border-radius:999px;text-decoration:none;font-weight:900;white-space:nowrap;';
  var btnPrimary = btnCss + 'color:#000;background:linear-gradient(180deg,#ffd98a,#ff8a2a);border:1px solid rgba(0,0,0,0.12);box-shadow:0 10px 22px rgba(255,138,42,0.20);';
  var btnGhost = btnCss + 'background:#fff;border:1px solid rgba(0,0,0,0.12);color:#1f2329;';

  gate.innerHTML =
    '<div style="background:rgba(255,255,255,0.92);border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:14px;box-shadow:0 10px 26px rgba(0,0,0,0.08);">'
    + '<div style="font-weight:900;font-size:15px;">Voir plus de demandes</div>'
    + '<div style="color:#666;font-weight:700;font-size:13px;margin-top:6px;">Tu vois <b>' + shown + '</b> demande(s) récentes sur <b>' + total + '</b>. Connecte-toi (gratuit) pour afficher tout le mur et utiliser la recherche complète.</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">'
    + '<a href="' + loginUrl + '" style="' + btnPrimary + '">Se connecter</a>'
    + '<a href="' + regUrl + '" style="' + btnGhost + '">Créer un compte</a>'
    + '</div>'
    + '</div>';
  gate.style.display = 'block';
}

function hideGate(){
  var gate = $('murGate');
  if(gate){
    gate.style.display = 'none';
    gate.innerHTML = '';
  }
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


  function render(list){
    var host = $('murList');
    if(!host) return;
    host.innerHTML = '';
    if(!list || !list.length){
      host.innerHTML = '<div style="grid-column:1/-1;padding:14px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;font-weight:700;">Aucune demande pour le moment.</div>';
      return;
    }

    for(var i=0;i<list.length;i++){
      var d = list[i] || {};
      var id = String(d.id || '');
      var photos = d.photos || [];
      var photo = photos && photos[0] ? String(photos[0]) : '';

      var card = document.createElement('article');
      card.style.cssText = 'background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;box-shadow:0 8px 26px rgba(0,0,0,.06);display:flex;flex-direction:column;gap:10px;';

      var top = document.createElement('div');
      top.innerHTML = '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">'
        + '<div>'
        + '<div style="font-weight:900;font-size:16px;">' + esc(d.service || '—') + '</div>'
        + '<div style="color:#666;font-weight:700;font-size:13px;">' + esc((d.zone||'') + (d.commune ? (' • ' + d.commune) : '')) + '</div>'
        + '</div>'
        + (d.budget ? ('<div style="font-weight:900;background:#fff7ee;border:1px solid rgba(255,120,0,.18);padding:6px 10px;border-radius:999px;white-space:nowrap;">' + esc(d.budget) + '€</div>') : '')
        + '</div>';
      card.appendChild(top);

      if(photo){
        var img = document.createElement('img');
        img.src = photo;
        img.alt = 'Photo';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:160px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,.06);';
        card.appendChild(img);
      }

      var desc = document.createElement('div');
      var txt = String(d.description || '').trim();
      if(txt.length > 170) txt = txt.slice(0,170) + '…';
      desc.innerHTML = '<div style="color:#333;line-height:1.35;">' + esc(txt || '—') + '</div>'
        + '<div style="margin-top:8px;color:#666;font-weight:800;font-size:13px;">Coordonnées : <span style="filter:blur(3px);display:inline-block;">06 92 xx xx xx • email@xxxx.com</span> (déblocage)</div>';
      card.appendChild(desc);

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:auto;';
      var a1 = document.createElement('a');
      a1.href = './demande-detail.html?id=' + encodeURIComponent(id);
      a1.textContent = 'Voir';
      a1.style.cssText = 'flex:1;min-width:120px;text-align:center;text-decoration:none;padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.14);font-weight:900;color:#222;';
      actions.appendChild(a1);

      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Débloquer';
      b.style.cssText = 'flex:1;min-width:120px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,120,0,.35);background:#fff3e6;font-weight:900;cursor:pointer;';
      (function(dem){
        b.addEventListener('click', function(){ openUnlock(dem); });
      })(d);
      actions.appendChild(b);

      card.appendChild(actions);
      host.appendChild(card);
    }
  }

  function openUnlock(d){
    var modal = $('unlockModal');
    var content = $('unlockContent');
    if(!modal || !content) return;

    var id = String(d.id || '');
    var title = esc(d.service || 'Demande');
    var where = esc((d.zone||'') + (d.commune ? (' — ' + d.commune) : ''));

    // Exiger connexion avant paiement/déblocage
    if(!isLoggedIn()){
      var next = 'mur-demandes.html?unlock=' + encodeURIComponent(id);
      location.href = './offreur-login.html?next=' + encodeURIComponent(next);
      return;
    }

    // Pages paiement présentes dans le projet
    var p1 = './paiement-ponctuel.html?id=' + encodeURIComponent(id);
    var p2 = './paiement-pack.html?id=' + encodeURIComponent(id);
    var p3 = './paiement-abonnement.html?id=' + encodeURIComponent(id);

    var instantHtml = '';
    if(me && (String(me.plan||'').toUpperCase()==='ABO' || String(me.aboActive||me.abonnement||'').toUpperCase()==='OUI')){
      instantHtml = '<button id="btnInstantUnlock" type="button" style="width:100%;padding:12px 14px;border-radius:12px;border:none;background:#ff3b0a;color:#fff;font-weight:1000;cursor:pointer;">Débloquer maintenant (abonné)</button>';
    }else if(me && Number(me.credits||0) > 0){
      instantHtml = '<button id="btnInstantUnlock" type="button" style="width:100%;padding:12px 14px;border-radius:12px;border:none;background:#ff3b0a;color:#fff;font-weight:1000;cursor:pointer;">Débloquer maintenant (utiliser 1 crédit • restants: ' + esc(me.credits) + ')</button>';
    }

    content.innerHTML =
      '<div style="font-weight:900;margin-bottom:6px;">' + title + '</div>' +
      '<div style="color:#666;font-weight:800;margin-bottom:12px;">' + where + '</div>' +
      (instantHtml ? ('<div style="margin:10px 0 12px;">' + instantHtml + '<div id="unlockMsg" style="margin-top:10px;font-weight:900;"></div></div>') : '') +
      '<div style="background:#f7f7f9;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:12px;margin-bottom:12px;">' +
      '<div style="font-weight:900;margin-bottom:8px;">Choisis ton accès :</div>' +
      '<div style="display:grid;gap:10px;">' +
      '<a href="'+p1+'" style="text-decoration:none;padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);font-weight:900;color:#222;display:flex;justify-content:space-between;align-items:center;">Ponctuel <span>0,99€</span></a>' +
      '<a href="'+p2+'" style="text-decoration:none;padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);font-weight:900;color:#222;display:flex;justify-content:space-between;align-items:center;">Pack 10 <span>2,99€</span></a>' +
      '<a href="'+p3+'" style="text-decoration:none;padding:12px;border-radius:12px;border:1px solid rgba(0,0,0,.12);font-weight:900;color:#222;display:flex;justify-content:space-between;align-items:center;">Abonnement <span>4,99€</span></a>' +
      '</div>' +
      '</div>' +
      '<div style="color:#666;font-weight:700;font-size:13px;">Après paiement, le contact se débloque via le système d’accès (AccesDemandes).</div>';
    modal.style.display = 'flex';

    // Débloquage instant (crédit ou abo)
    var btnIU = document.getElementById('btnInstantUnlock');
    if(btnIU){
      btnIU.addEventListener('click', async function(){
        var msg = document.getElementById('unlockMsg');
        if(msg) msg.textContent = 'Déblocage en cours…';
        try{
          var t = (me && (String(me.plan||'').toUpperCase()==='ABO' || String(me.aboActive||me.abonnement||'').toUpperCase()==='OUI')) ? 'abonnement' : 'credit';
          var res = await DX_API.postAny(['grantAccess','unlockDemande'], { demandeId: id, type: t });
          if(res && res.ok){
            if(msg) msg.textContent = 'Accès enregistré. Ouverture…';
            setTimeout(function(){ location.href = './demande-detail.html?id=' + encodeURIComponent(id); }, 350);
            return;
          }
          if(msg) msg.textContent = (res && (res.error||res.message)) ? (res.error||res.message) : 'Impossible.';
        }catch(e){
          if(msg) msg.textContent = e && e.message ? e.message : String(e);
        }
      });
    }

  }

  async function load(){
    if(!window.DX_API || !DX_API.get){
      showStatus("API non chargée (api.js). Recharge la page.");
      return;
    }
    showStatus("Chargement des demandes…");
    try{
      var res = await DX_API.get('listDemandesPublic');
      if(res && res.ok){
        all = res.data || [];
        showStatus("");
        if(!isLoggedIn()){
          visible = slicePublic(all);
          render(visible);
          showGate(all.length, visible.length);
        }else{
          visible = all;
          render(all);
          hideGate();
        }
if(pendingUnlockId){
          var pid = String(pendingUnlockId);
          var found = null;
          for(var i=0;i<all.length;i++){
            var xid = String(all[i].id || all[i].DemandeID || all[i].demandeId || '');
            if(xid === pid){ found = all[i]; break; }
          }
          if(found){ pendingUnlockId = ''; openUnlock(found); }
        }
      }else{
        showStatus("Erreur API : " + (res && (res.error || res.message) ? (res.error || res.message) : "inconnue"));
      }
    }catch(err){
      showStatus("Erreur : " + (err && err.message ? err.message : String(err)));
    }
  }

  function applySearch(){
    var q = String(($('murSearch') && $('murSearch').value) || '').trim().toLowerCase();
    if(!q){ render(visible); return; }
    var filtered = [];
    for(var i=0;i<visible.length;i++){
      var d = visible[i] || {};
      var blob = (String(d.service||'') + ' ' + String(d.zone||'') + ' ' + String(d.commune||'') + ' ' + String(d.description||'')).toLowerCase();
      if(blob.indexOf(q) !== -1) filtered.push(d);
    }
    render(filtered);
  }

  document.addEventListener('DOMContentLoaded', function(){
    try{
      var params = new URLSearchParams(location.search);
      pendingUnlockId = params.get('unlock') || '';
    }catch(e){ pendingUnlockId = ''; }
    var close = $('unlockClose');
    var modal = $('unlockModal');
    if(close && modal){
      close.addEventListener('click', function(){ modal.style.display='none'; });
      modal.addEventListener('click', function(e){
        if(e.target === modal) modal.style.display='none';
      });
    }

    var r = $('murRefresh');
    if(r) r.addEventListener('click', load);

    var s = $('murSearch');
    if(s) s.addEventListener('input', applySearch);
    loadMe().then(function(){ load(); }).catch(function(){ load(); });
  });

})();