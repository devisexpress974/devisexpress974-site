(function(){
  function qs(name){
    try{ return (new URL(location.href)).searchParams.get(name) || ""; }catch(e){ return ""; }
  }

  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function setBox(html, isError){
    const box = document.getElementById('profileBox');
    if(!box) return;
    box.innerHTML = html;
    box.classList.toggle('error', !!isError);
  }

  function showRating(note, nb){
    const n = Number(note||0);
    const c = Number(nb||0);
    if(!n || !c) return '';
    const stars = '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
    return `<span class="badge">${stars} • ${n.toFixed(1)}/5 (${c})</span>`;
  }

  function buildProfile(p, id, demandeId, k){
    const name = esc(p.Pseudo || p.Nom || 'Prestataire');
    const service = esc(p.Service || '');
    const zone = esc(p.Zone || '');

    const rating = showRating(p.NoteMoyenne, p.NombreAvis);

    const backHref = document.referrer ? document.referrer : './offreurs.html';

    const rateBtn = (demandeId && k)
      ? `<a class="btn" href="./noter-offreur.html?oid=${encodeURIComponent(id)}&did=${encodeURIComponent(demandeId)}&k=${encodeURIComponent(k)}">Noter ce prestataire</a>`
      : `<span class="badge" title="Pour noter, ouvre le lien reçu par email (gérer ma demande).">Avis via lien email</span>`;

    return `
      <div class="card">
        <h1>Profil offreur</h1>
        <p class="muted">Profil public (sans coordonnées). Pour laisser un avis, utilise ton lien email (demandeur).</p>

        <div class="row" style="justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:22px;font-weight:900;">${name}</div>
            <div class="muted" style="margin-top:2px;">${service}${service && zone ? ' • ' : ''}${zone}</div>
          </div>
          <div>${rating}</div>
        </div>

        <div class="muted" style="margin-top:10px;word-break:break-all;">${esc(p.OffreurID || id || '')}</div>

        <div class="actions">
          <a class="btn" href="${backHref}">Retour</a>
          ${rateBtn}
          <a class="btn primary" href="./publier-demande.html">Demander un devis</a>
        </div>
      </div>
    `;
  }

  async function main(){
    const params = new URL(location.href).searchParams;
    const id = (params.get('id') || '').trim();
    const demandeId = (params.get('did') || params.get('demandeId') || '').trim();
    const k = (params.get('k') || params.get('key') || '').trim();

    if(!id){
      setBox('<p>ID offreur manquant.</p>', true);
      return;
    }

    try{
      const res = await window.DX_API.getAny([
        'getOffreurPublic',
        'getOffreurProfile',
        'getOffreur'
      ], { id });

      if(res && res.ok){
        const p = res.data || res.offreur || res.item || res.profile || {};
        setBox(buildProfile(p, id, demandeId, k), false);
      }else{
        setBox(`<p>${esc((res && res.error) ? res.error : 'Offreur introuvable.')}</p>`, true);
      }
    }catch(e){
      setBox('<p>Erreur réseau.</p>', true);
    }
  }

  document.addEventListener('DOMContentLoaded', main);
})();
