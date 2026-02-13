// assets/js/noter-offreur.js (v100) — Page "Donner un avis" (DX)
// Objectifs :
// - utiliser le wrapper DX_API (même config que le reste du site)
// - charger 1 seul offreur (getOffreurProfilePublic) sans récupérer toute la liste
// - respecter "Afficher ma note" (ShowNote)
(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);

  const errBox = $('errBox');
  const infoBox = $('infoBox');

  const offreurCard = $('offreurCard');
  const offreurNom = $('offreurNom');
  const offreurMeta = $('offreurMeta');
  const offreurRating = $('offreurRating');

  const form = $('avisForm');
  const noteInput = $('note');
  const noteTxt = $('noteTxt');
  const stars = Array.from(document.querySelectorAll('#stars .star'));

  function qs(name){
    try{ return (new URL(window.location.href)).searchParams.get(name) || ''; }
    catch(e){ return ''; }
  }

  function pickToken(){
    return (qs('t') || qs('token') || '').trim();
  }

  function pickOffreurId(){
    return (qs('oid') || qs('offreurId') || qs('offreurID') || qs('id') || '').trim();
  }
  function pickDemandeId(){
    return (qs('did') || qs('demandeId') || qs('demandeID') || '').trim();
  }

  function showBox(el, text){
    if(!el) return;
    el.style.display = 'block';
    el.textContent = String(text || '');
  }
  function hideBox(el){
    if(!el) return;
    el.style.display = 'none';
    el.textContent = '';
  }

  // -------- Stars --------
  let selected = 0;
  function setStars(v){
    selected = Number(v||0);
    if(noteInput) noteInput.value = String(selected);
    stars.forEach(btn => {
      const b = Number(btn.dataset.v || 0);
      btn.classList.toggle('on', b <= selected);
    });
    if(noteTxt) noteTxt.textContent = selected ? ('Note : ' + selected + '/5') : '(choisis une note)';
  }
  stars.forEach(btn => {
    btn.addEventListener('click', () => setStars(Number(btn.dataset.v || 0)));
  });

  // Petits styles (au cas où styles.css n’a pas les classes)
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
    hideBox(errBox);
    hideBox(infoBox);

    const token = pickToken();
    let offreurId = pickOffreurId();

    if(token && window.DX_API && DX_API.post){
      try{
        const tr = await DX_API.post('consumeAvisToken', { token });
        if(tr && tr.ok && tr.offreurId){
          offreurId = tr.offreurId;
        } else {
          showBox(errBox, (tr && tr.error) ? String(tr.error) : 'Lien invalide ou expiré.');
          return null;
        }
      }catch(e){
        showBox(errBox, 'Lien invalide ou expiré.');
        return null;
      }
    }

    if(!offreurId){
      showBox(errBox, 'OffreurID manquant (lien invalide).');
      if(offreurCard) offreurCard.style.display = 'none';
      return null;
    }

    if(!window.DX_API || typeof window.DX_API.getAny !== 'function'){
      showBox(errBox, 'API non chargée (DX_API). Recharge la page.');
      return null;
    }

    // 1) Charge profil public (sans coordonnées)
    let resp = null;
    try{
      resp = await window.DX_API.getAny([
        'getOffreurProfilePublic',
        'getOffreurProfile',
        'getOffreursPublic'
      ], { id: offreurId });
    }catch(e){
      resp = null;
    }

    // 2) Fallback : liste et filtre (compat si action indisponible)
    let data = null;
    if(resp && resp.ok){
      data = resp.data || resp.offreur || resp.user || null;
    }
    if(!data){
      try{
        const r2 = await window.DX_API.getAny(['listOffreursPublic','listOffreurs'], {});
        if(r2 && r2.ok && Array.isArray(r2.data)){
          data = r2.data.find(x => String(x.id||x.offreurId||x.OffreurID||'') === String(offreurId)) || null;
        }
      }catch(e){ data = null; }
    }

    if(!data){
      showBox(errBox, 'Prestataire introuvable.');
      if(offreurCard) offreurCard.style.display = 'none';
      return null;
    }

    // Normalisation
    const publicName = data.publicName || data.nom || data.Nom || 'Prestataire';
    const service = data.service || data.Service || '';
    const zone = data.zone || data.Zone || '';
    const commune = data.commune || data.Commune || '';
    const showNoteRaw = (data.showNote !== undefined) ? data.showNote : (data.ShowNote !== undefined ? data.ShowNote : 'OUI');
    const showNote = String(showNoteRaw || 'OUI').trim().toUpperCase() !== 'NON';
    const avgRaw = (data.noteMoyenne !== undefined) ? data.noteMoyenne : (data.NoteMoyenne !== undefined ? data.NoteMoyenne : '');
    const avg = (avgRaw === '' || avgRaw === null || avgRaw === undefined) ? null : Number(avgRaw);
    const cntRaw = (data.nombreAvis !== undefined) ? data.nombreAvis : (data.NombreAvis !== undefined ? data.NombreAvis : 0);
    const cnt = Number(cntRaw || 0) || 0;

    if(offreurNom) offreurNom.textContent = publicName;
    if(offreurMeta) offreurMeta.textContent = [service, zone, commune].filter(Boolean).join(' • ');

    if(offreurRating){
      if(!showNote){
        offreurRating.textContent = 'Note masquée par le prestataire.';
      } else if(avg){
        offreurRating.textContent = 'Note moyenne : ' + avg + '/5 (' + cnt + ' avis)';
      } else {
        offreurRating.textContent = 'Pas encore d’avis.';
      }
    }

    if(offreurCard) offreurCard.style.display = 'block';

    return offreurId;
  }

  async function submitAvis(ev){
    ev.preventDefault();
    hideBox(errBox);
    hideBox(infoBox);

    const token = pickToken();
    let offreurId = pickOffreurId();

    if(token && window.DX_API && DX_API.post){
      try{
        const tr = await DX_API.post('consumeAvisToken', { token });
        if(tr && tr.ok && tr.offreurId){
          offreurId = tr.offreurId;
        } else {
          showBox(errBox, (tr && tr.error) ? String(tr.error) : 'Lien invalide ou expiré.');
          return null;
        }
      }catch(e){
        showBox(errBox, 'Lien invalide ou expiré.');
        return null;
      }
    }

    const demandeId = pickDemandeId();
    const auteurNom = String(($('auteurNom') && $('auteurNom').value) || '').trim();
    const auteurEmail = String(($('auteurEmail') && $('auteurEmail').value) || '').trim();
    const note = Number((noteInput && noteInput.value) || 0);
    const commentaire = String(($('commentaire') && $('commentaire').value) || '').trim();

    if(!offreurId){ showBox(errBox, 'OffreurID manquant.'); return; }
    if(!auteurNom){ showBox(errBox, 'Ton nom est obligatoire.'); return; }
    if(!(note >= 1 && note <= 5)){ showBox(errBox, 'Choisis une note entre 1 et 5.'); return; }

    const btn = $('btnSend');
    if(btn){ btn.disabled = true; btn.textContent = 'Envoi…'; }

    try{
      const resp = await window.DX_API.postAny(['addAvisOffreur','addAvis'], {
        offreurId,
        demandeId,
        note,
        commentaire,
        auteurNom,
        auteurEmail
      });

      if(resp && resp.ok){
        showBox(infoBox, 'Merci ! Ton avis a été enregistré.');
        if(form) form.reset();
        setStars(0);
        await loadOffreur();
      } else {
        showBox(errBox, (resp && (resp.error || resp.message)) ? (resp.error || resp.message) : 'Erreur inconnue.');
      }
    }catch(e){
      showBox(errBox, 'Erreur réseau : ' + String((e && e.message) || e));
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = 'Envoyer l’avis'; }
    }
  }

  // init
  setStars(0);
  loadOffreur();
  if(form) form.addEventListener('submit', submitAvis);
})();
