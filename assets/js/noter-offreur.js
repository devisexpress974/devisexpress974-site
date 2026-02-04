// noter-offreur.js
(function(){
  'use strict';

  const API_BASE = (window.DX_API_BASE || '/.netlify/functions/gas');

  function qs(name){
    const url = new URL(window.location.href);
    return (url.searchParams.get(name) || '').trim();
  }
  function esc(s){
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function show(el, html){
    el.style.display = 'block';
    el.innerHTML = html;
  }
  function hide(el){
    el.style.display = 'none';
    el.innerHTML = '';
  }

  async function apiGet(action, params){
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    Object.entries(params||{}).forEach(([k,v]) => url.searchParams.set(k, v));
    const r = await fetch(url.toString(), { method:'GET', credentials:'omit' });
    return r.json();
  }
  async function apiPost(action, payload){
    const url = new URL(API_BASE, window.location.origin);
    url.searchParams.set('action', action);
    const r = await fetch(url.toString(), {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload||{})
    });
    return r.json();
  }

  const errBox = document.getElementById('errBox');
  const infoBox = document.getElementById('infoBox');

  const offreurCard = document.getElementById('offreurCard');
  const offreurNom = document.getElementById('offreurNom');
  const offreurMeta = document.getElementById('offreurMeta');
  const offreurRating = document.getElementById('offreurRating');

  const form = document.getElementById('avisForm');
  const noteInput = document.getElementById('note');
  const noteTxt = document.getElementById('noteTxt');
  const stars = Array.from(document.querySelectorAll('#stars .star'));

  let selected = 0;

  function setStars(v){
    selected = v;
    noteInput.value = String(v);
    stars.forEach(btn => {
      const b = Number(btn.dataset.v);
      btn.classList.toggle('on', b <= v);
    });
    noteTxt.textContent = v ? ('Note : ' + v + '/5') : '(choisis une note)';
  }

  stars.forEach(btn => {
    btn.addEventListener('click', () => setStars(Number(btn.dataset.v)));
  });

  // minimal styles injection if not present in styles.css
  const style = document.createElement('style');
  style.textContent = `
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    @media(max-width:720px){.grid2{grid-template-columns:1fr;}}
    .stars{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .star{border:1px solid #ddd;background:#fff;border-radius:10px;padding:6px 10px;font-size:20px;line-height:1;cursor:pointer;}
    .star.on{border-color:#ffb300;}
    .notice{border:1px solid #e6e6e6;background:#f8f8f8;border-radius:12px;padding:10px 12px;}
    .alert{border:1px solid #ffb3b3;background:#fff5f5;border-radius:12px;padding:10px 12px;}
  `;
  document.head.appendChild(style);

  async function loadOffreur(){
    hide(errBox); hide(infoBox);

    const offreurId = qs('oid') || qs('offreurId') || qs('id');
    if(!offreurId){
      show(errBox, 'OffreurID manquant. (Lien invalide)');
      return null;
    }

    try{
      // 1) on essaye l'action dédiée
      let resp = await apiGet('getOffreurPublic', { id: offreurId });
      if(!resp || resp.ok !== true){
        // 2) fallback : liste et filtre
        const r2 = await apiGet('listOffreursPublic', {});
        if(r2 && r2.ok && Array.isArray(r2.data)){
          const f = r2.data.find(x => String(x.id) === String(offreurId));
          if(f) resp = { ok:true, offreur:f };
        }
      }
      if(!resp || resp.ok !== true){
        show(errBox, esc((resp && resp.error) || 'Prestataire introuvable'));
        return null;
      }

      const o = resp.offreur;
      offreurNom.textContent = o.nom || 'Prestataire';
      offreurMeta.textContent = [o.service, o.zone, o.commune].filter(Boolean).join(' • ');
      const avg = (o.noteMoyenne === '' || o.noteMoyenne == null) ? null : Number(o.noteMoyenne);
      const cnt = Number(o.nombreAvis||0);
      offreurRating.textContent = avg ? ('Note moyenne : ' + avg + '/5 (' + cnt + ' avis)') : ('Pas encore d’avis');
      offreurCard.style.display = 'block';

      // auto-valorise le nom si vide
      const n = document.getElementById('auteurNom');
      if(n && !n.value) n.value = '';

      return offreurId;
    }catch(e){
      show(errBox, 'Erreur de chargement : ' + esc(e.message||e));
      return null;
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hide(errBox); hide(infoBox);

    const offreurId = qs('oid') || qs('offreurId') || qs('id');
    const demandeId = qs('did') || qs('demandeId') || '';
    const auteurNom = (document.getElementById('auteurNom').value || '').trim();
    const auteurEmail = (document.getElementById('auteurEmail').value || '').trim();
    const note = Number(noteInput.value || 0);
    const commentaire = (document.getElementById('commentaire').value || '').trim();

    if(!offreurId){ show(errBox, 'OffreurID manquant.'); return; }
    if(!auteurNom){ show(errBox, 'Ton nom est obligatoire.'); return; }
    if(!(note>=1 && note<=5)){ show(errBox, 'Choisis une note entre 1 et 5.'); return; }

    const btn = document.getElementById('btnSend');
    btn.disabled = true;
    btn.textContent = 'Envoi…';

    try{
      const resp = await apiPost('addAvisOffreur', {
        offreurId, demandeId,
        note, commentaire,
        auteurNom, auteurEmail
      });

      if(resp && resp.ok){
        show(infoBox, 'Merci ! Ton avis a été enregistré.');
        form.reset();
        setStars(0);
        // recharge note moyenne affichée
        await loadOffreur();
      }else{
        show(errBox, esc((resp && resp.error) || 'Erreur inconnue'));
      }
    }catch(e){
      show(errBox, 'Erreur réseau : ' + esc(e.message||e));
    }finally{
      btn.disabled = false;
      btn.textContent = 'Envoyer l’avis';
    }
  });

  // init
  setStars(0);
  loadOffreur();

})();
