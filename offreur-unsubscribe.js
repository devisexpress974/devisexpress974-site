// offreur-unsubscribe.js (Patch 47)
(function(){
  function qs(name){
    try{
      const url = new URL(window.location.href);
      return (url.searchParams.get(name) || '').trim();
    }catch(e){
      return '';
    }
  }

  function showMsg(text, isOk){
    const el = document.getElementById('msg');
    if(!el) return;
    el.style.display = 'block';
    el.textContent = text;
    el.className = 'notice ' + (isOk ? 'noticeOk' : 'noticeErr');
  }

  function setBusy(btn, busy){
    if(!btn) return;
    btn.disabled = !!busy;
    btn.style.opacity = busy ? '0.6' : '1';
  }

  async function doAction(action, email, sig){
    if(!window.DX_API || !DX_API.post) throw new Error('API indisponible');
    const res = await DX_API.post(action, { email, sig });
    return res;
  }

  async function main(){
    const email = qs('email').toLowerCase();
    const sig = qs('sig');

    const btnResub = document.getElementById('btnResub');
    const btnUnsub = document.getElementById('btnUnsub');

    if(!email || !sig){
      showMsg('Lien invalide : paramètres manquants.', false);
      if(btnResub) btnResub.style.display = 'none';
      if(btnUnsub) btnUnsub.style.display = 'none';
      return;
    }

    // Par défaut : on désinscrit à l'ouverture du lien
    try{
      showMsg('Traitement en cours…', true);
      const r = await doAction('unsubscribeEmail', email, sig);
      if(r && r.ok){
        showMsg('OK — tu ne recevras plus les emails de nouvelles demandes sur ' + email + '.', true);
        if(btnResub) btnResub.style.display = 'inline-flex';
        if(btnUnsub) btnUnsub.style.display = 'none';
      }else{
        showMsg((r && r.error) ? r.error : 'Impossible de traiter la demande.', false);
        if(btnResub) btnResub.style.display = 'none';
        if(btnUnsub) btnUnsub.style.display = 'none';
      }
    }catch(err){
      showMsg('Erreur réseau. Réessaie plus tard.', false);
      if(btnResub) btnResub.style.display = 'none';
      if(btnUnsub) btnUnsub.style.display = 'none';
      return;
    }

    // Bouton Réabonner
    if(btnResub){
      btnResub.addEventListener('click', async function(){
        setBusy(btnResub, true);
        try{
          const r2 = await doAction('resubscribeEmail', email, sig);
          if(r2 && r2.ok){
            showMsg('OK — tu es réabonné. Tu recevras à nouveau les emails de nouvelles demandes sur ' + email + '.', true);
            btnResub.style.display = 'none';
            if(btnUnsub) btnUnsub.style.display = 'inline-flex';
          }else{
            showMsg((r2 && r2.error) ? r2.error : 'Impossible de réactiver les emails.', false);
          }
        }catch(err2){
          showMsg('Erreur réseau. Réessaie plus tard.', false);
        }finally{
          setBusy(btnResub, false);
        }
      });
    }

    // Bouton Se désinscrire (si l'utilisateur se réabonne puis veut re-couper)
    if(btnUnsub){
      btnUnsub.addEventListener('click', async function(){
        setBusy(btnUnsub, true);
        try{
          const r3 = await doAction('unsubscribeEmail', email, sig);
          if(r3 && r3.ok){
            showMsg('OK — tu ne recevras plus les emails de nouvelles demandes sur ' + email + '.', true);
            btnUnsub.style.display = 'none';
            if(btnResub) btnResub.style.display = 'inline-flex';
          }else{
            showMsg((r3 && r3.error) ? r3.error : 'Impossible de se désinscrire.', false);
          }
        }catch(err3){
          showMsg('Erreur réseau. Réessaie plus tard.', false);
        }finally{
          setBusy(btnUnsub, false);
        }
      });
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', main);
  }else{
    main();
  }
})();
