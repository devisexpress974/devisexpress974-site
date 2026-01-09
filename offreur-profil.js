// offreur-profil.js (v14)
document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("box");
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";

  function esc(s){
    return (s??"").toString()
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  if(!id){
    box.className = "notice err";
    box.textContent = "ID manquant.";
    return;
  }

  const res = await window.DX_API.getAny(["getOffreurPublic","getOffreur"], { id });
  const o = res && res.ok ? (res.data || res.item || null) : null;

  if(!o){
    box.className = "notice err";
    box.textContent = "Offreur introuvable.";
    return;
  }

  const nom = o.nom || o.Nom || "Offreur";
  const service = o.service || o.Service || "";
  const commune = o.commune || o.Commune || "";
  const zone = o.zone || o.Zone || "";
  const desc = o.description || o.Description || "";
  const note = o.noteMoyenne || o.NoteMoyenne || "";
  const nb = o.nombreAvis || o.NombreAvis || "";

  box.className = "notice";
  box.innerHTML = `
    <div style="font-weight:1000;margin-bottom:6px;">${esc(nom)}</div>
    <div style="color:#64748b;font-weight:900;margin-bottom:10px;">${esc(service)}${commune? " • "+esc(commune):""}${zone? " • "+esc(zone):""}</div>
    <div style="font-weight:800;line-height:1.7;">${esc(desc)}</div>
    ${(note && Number(nb||0)>0) ? `<div style="margin-top:10px;color:#64748b;font-weight:1000;">Note : ${esc(note)}/5 (${esc(nb)} avis)</div>` : `<div style="margin-top:10px;color:#64748b;font-weight:1000;">Pas d’avis</div>`}
    <div class="btnRow" style="margin-top:12px;">
      <a class="btn" href="noter-offreur.html?id=${encodeURIComponent(id)}">Laisser un avis</a>
    </div>
  `;
});
