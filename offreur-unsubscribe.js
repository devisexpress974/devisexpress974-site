// offreur-unsubscribe.js (Patch46) — Désinscription / Réabonnement emails
(() => {
  const $ = (id) => document.getElementById(id);

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  }

  function getParam(name){
    try { return new URLSearchParams(location.search).get(name) || ""; }
    catch { return ""; }
  }

  function setStatus(html, cls){
    const el = $("status");
    if(!el) return;
    el.className = "muted " + (cls || "");
    el.innerHTML = html;
  }

  function showActions(show){
    const a = $("actions");
    if(a) a.style.display = show ? "flex" : "none";
  }

  const email = String(getParam("email") || "").trim().toLowerCase();
  const sig = String(getParam("sig") || "").trim();

  async function call(action){
    if(!window.DX_API) return { ok:false, error:"DX_API manquant" };
    return window.DX_API.post(action, { email, sig });
  }

  async function doUnsub(){
    setStatus("Désinscription en cours…");
    const r = await call("unsubscribeEmail");
    if(r && r.ok){
      setStatus('<span class="ok">OK.</span> Tu ne recevras plus d’emails de nouvelles demandes.', "ok");
      showActions(true);
      return;
    }
    setStatus('<span class="bad">Erreur :</span> ' + esc((r && r.error) || "Impossible de traiter la demande.") , "bad");
    showActions(true);
  }

  async function doResub(){
    setStatus("Réabonnement en cours…");
    const r = await call("resubscribeEmail");
    if(r && r.ok){
      setStatus('<span class="ok">OK.</span> Tu recevras à nouveau les emails de nouvelles demandes.', "ok");
      showActions(true);
      return;
    }
    setStatus('<span class="bad">Erreur :</span> ' + esc((r && r.error) || "Impossible de traiter la demande.") , "bad");
    showActions(true);
  }

  function wire(){
    const b1 = $("btnUnsub");
    const b2 = $("btnResub");
    if(b1) b1.addEventListener("click", doUnsub);
    if(b2) b2.addEventListener("click", doResub);
  }

  function init(){
    // Année footer (compat: certains footers utilisent y, d'autres year)
    try{
      const y = document.getElementById("y") || document.getElementById("year");
      if(y) y.textContent = String(new Date().getFullYear());
    }catch(e){}

    wire();

    if(!email || !sig){
      setStatus('Lien incomplet. Ouvre le lien reçu par email, ou gère ça via <a href="./offreur-compte.html">Mon compte</a>.', "bad");
      showActions(false);
      return;
    }

    // One-click : on désinscrit automatiquement à l’ouverture du lien
    doUnsub();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
