/* DX Patch14 — affiche un résumé abonnement/crédits sur offreur-compte.html */
(function(){
  function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
    });
  }
  function fmtDate(d){
    try{
      if(!d) return '';
      var dt = (d instanceof Date) ? d : new Date(d);
      if(String(dt) === 'Invalid Date') return String(d);
      return dt.toLocaleDateString('fr-FR');
    }catch(e){
      return String(d||'');
    }
  }
  function pill(dotClass, text){
    return '<span class="pill"><span class="dot ' + dotClass + '"></span>' + esc(text) + '</span>';
  }

  async function run(){
    var pillsEl = document.getElementById('dxAboPills');
    var textEl  = document.getElementById('dxAboText');
    if(!pillsEl || !textEl) return;

    try{
      if(!window.DX_AUTH || !window.DX_API){
        textEl.textContent = "Erreur: modules manquants (DX_AUTH/DX_API). Recharge la page.";
        return;
      }

      var me = await window.DX_AUTH.whoami();
      if(!me || !me.ok){
        pillsEl.innerHTML = pill('off', 'Non connecté');
        textEl.innerHTML = 'Connecte-toi pour voir ton statut. <a href="offreur-login.html">S’identifier</a>';
        return;
      }

      var res = await window.DX_API.get('getMyPlan');
      if(!res || !res.ok){
        throw new Error((res && res.error) ? res.error : 'Impossible de récupérer le plan');
      }

      var plan = String(res.plan || 'FREE').toUpperCase();
      var planName = res.planName || (plan === 'ABO' ? 'Abonnement' : 'Gratuit');
      var aboActive = String(res.aboActive || 'NON').toUpperCase() === 'OUI';
      var credits = Number(res.credits ?? 0);
      var trialDaysLeft = (res.trialDaysLeft === null || res.trialDaysLeft === undefined) ? null : Number(res.trialDaysLeft);
      var trialEnd = res.trialEnd || '';
      var canStartTrial = !!res.canStartTrial;

      var pills = [];

      if(aboActive && plan === 'ABO'){
        pills.push(pill('ok', planName + ' actif'));
      }else if(plan === 'ABO' && trialDaysLeft !== null && trialDaysLeft > 0){
        pills.push(pill('warn', 'Essai en cours (' + trialDaysLeft + 'j)'));
      }else if(plan === 'ABO' && canStartTrial){
        pills.push(pill('warn', 'Essai gratuit disponible'));
      }else{
        pills.push(pill('off', planName));
      }

      if(aboActive && plan === 'ABO'){
        pills.push(pill('ok', 'Déblocages illimités'));
      }else if(credits > 0){
        pills.push(pill('ok', 'Crédits: ' + credits));
      }else{
        pills.push(pill('off', 'Crédits: 0'));
      }

      pillsEl.innerHTML = pills.join('');

      if(aboActive && plan === 'ABO'){
        textEl.textContent = "Tu peux débloquer les coordonnées sans limite tant que l’abonnement est actif.";
      }else if(plan === 'ABO' && trialDaysLeft !== null && trialDaysLeft > 0){
        textEl.textContent = "Essai gratuit en cours jusqu’au " + fmtDate(trialEnd) + ".";
      }else if(plan === 'ABO' && canStartTrial){
        textEl.textContent = "Tu peux démarrer ton essai gratuit sur la page “Gérer”.";
      }else if(credits > 0){
        textEl.textContent = "Il te reste " + credits + " déblocage(s).";
      }else{
        textEl.textContent = "Aucun crédit. Choisis Pack 10 ou Déblocage 0,99€.";
      }

    }catch(err){
      console.error(err);
      pillsEl.innerHTML = pill('off', 'Erreur');
      textEl.textContent = 'Erreur: ' + (err && err.message ? err.message : err);
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  }else{
    run();
  }
})();
