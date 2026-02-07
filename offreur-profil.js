// offreur-profil.js (profil PUBLIC) — Patch 49
// URL: offreur-profil.html?id=OFFREUR_ID
// Objectifs :
// - charger via DX_API (action=...)
// - afficher la note uniquement si autorisée (ShowNote/OUI)
// - proposer un bouton "Noter ce prestataire"

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function esc(s){
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
    }[m]));
  }

  function stars(v){
    const n = Math.max(0, Math.min(5, Math.round(Number(v) || 0)));
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5-n);
  }

  function setBox(html, isError){
    const box = $("box");
    if(!box) return;
    box.className = isError ? "notice" : "notice muted";
    box.innerHTML = html;
  }

  function normBoolOUI(v, def){
    const s = String(v ?? "").toUpperCase().trim();
    if(s === "OUI" || s === "YES" || s === "TRUE" || s === "1") return "OUI";
    if(s === "NON" || s === "NO" || s === "FALSE" || s === "0") return "NON";
    return def ? "OUI" : "NON";
  }

  async function apiGetAny(actions, params){
    try{
      if(window.DX_API && typeof window.DX_API.getAny === "function"){
        return await window.DX_API.getAny(actions, params);
      }
    }catch(e){}

    // Fallback brut (devrait rarement servir)
    const endpoint = (window.DX_API && window.DX_API.ENDPOINT) ? window.DX_API.ENDPOINT : "/.netlify/functions/gas";
    let last = null;

    for(const a of actions){
      try{
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set("action", a);
        Object.entries(params || {}).forEach(([k,v]) => {
          if(v === undefined || v === null || v === "") return;
          url.searchParams.set(k, String(v));
        });
        const r = await fetch(url.toString(), { method:"GET" });
        const t = await r.text();
        let js = null;
        try{ js = JSON.parse(t); }catch(_){ js = { ok:false, error:"Réponse non JSON", raw: String(t||"").slice(0,200)}; }
        last = js;
        if(js && js.ok) return js;
      }catch(e2){
        last = { ok:false, error:String(e2||"Erreur") };
      }
    }
    return last || { ok:false, error:"Aucune action n’a répondu OK" };
  }

  function pick(obj, keys){
    for(const k of keys){
      if(obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return "";
  }

  function buildProfile(p, id){
    const publicName = pick(p, ["publicName","PublicName","nomPublic","NomPublic","nom","Nom"]) || "Prestataire";
    const service = pick(p, ["service","Service"]) || "—";
    const serviceAutre = pick(p, ["serviceAutre","ServiceAutre"]) || "";
    const zone = pick(p, ["zone","Zone"]) || "";
    const commune = pick(p, ["commune","Commune"]) || "";
    const description = pick(p, ["description","Description"]) || "";

    const showNote = normBoolOUI(pick(p, ["showNote","ShowNote","afficherNote","AfficherNote"]), true);
    const note = pick(p, ["noteMoyenne","NoteMoyenne","note","Note"]);
    const nb = pick(p, ["nombreAvis","NombreAvis","nbAvis","NbAvis"]);
    let badge = "";
    if(showNote !== "OUI"){
      badge = '<span class="badge">Note masquée</span>';
    } else if(note && Number(nb||0) > 0){
      badge = '<span class="badge">' + esc(stars(note)) + ' • ' + esc(String(note)) + '/5 (' + esc(String(nb)) + ')</span>';
    } else {
      badge = '<span class="badge">Pas d’avis</span>';
    }

    const serviceLabel = (String(service).toLowerCase() === "autre" && serviceAutre) ? ("Autre — " + serviceAutre) : service;

    return `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:950;font-size:26px;line-height:1.1;">${esc(publicName)}</div>
          <div style="margin-top:6px;color:#666;font-weight:800;">${esc(serviceLabel)}${commune ? " • " + esc(commune) : ""}${zone ? " • " + esc(zone) : ""}</div>
        </div>
        <div>${badge}</div>
      </div>

      ${description ? `<div style="margin-top:12px;font-weight:800;white-space:pre-wrap;">${esc(description)}</div>` : `<div style="margin-top:12px;color:#666;font-weight:800;">Aucune description.</div>`}

      <div class="actions">
        <a class="btn" href="./offreurs.html">Retour</a>
        <a class="btn" href="./noter-offreur.html?id=${encodeURIComponent(id)}">Noter ce prestataire</a>
        <a class="btn btnPrimary" href="./offreur-login.html">Contacter</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = (params.get("id") || "").trim();

    if(!id){
      setBox('Profil introuvable : identifiant manquant.<br><br><a class="btn" href="./offreurs.html">Retour</a>', true);
      return;
    }

    setBox("Chargement…", false);

    const resp = await apiGetAny(["getOffreurProfilePublic","getOffreurProfile"], { id });

    if(!resp || resp.ok !== true){
      const err = resp && resp.error ? esc(resp.error) : "Erreur inconnue";
      setBox('Impossible de charger ce profil.<br><span class="muted">' + err + '</span><br><br><a class="btn" href="./offreurs.html">Retour</a>', true);
      return;
    }

    const p = resp.data || resp.offreur || resp.user || resp;
    setBox(buildProfile(p, id), false);
  });
})();
