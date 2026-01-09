// demande-detail.js (v14)
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

  let res = await window.DX_API.getAny(
    ["getDemande","getDemandePublic","getDemandeByIdPublic"],
    { id }
  );

  let item = null;
  if(res && res.ok){
    item = res.data || res.item || null;
  }

  if(!item){
    const res2 = await window.DX_API.getAny(
      ["listDemandesPublic","listDemandes","getDemandesPublic"],
      {}
    );
    const arr = (res2 && res2.ok) ? (res2.data || res2.items || res2.demandes || []) : [];
    item = Array.isArray(arr) ? arr.find(d => String(d.id||d.DemandeID||d.demandeId||"") === String(id)) : null;
  }

  if(!item){
    box.className = "notice err";
    box.textContent = "Demande introuvable.";
    return;
  }

  const service = item.service || item.Service || "Service";
  const commune = item.commune || item.Commune || "Commune";
  const zone = item.zone || item.Zone || "";
  const desc = item.description || item.Description || "";
  const budget = item.budget || item.Budget || "";

  box.className = "notice";
  box.innerHTML = `
    <div style="font-weight:1000;margin-bottom:6px;">${esc(service)}</div>
    <div style="color:#64748b;font-weight:900;margin-bottom:10px;">${esc(commune)}${zone ? " • " + esc(zone) : ""}</div>
    <div style="font-weight:800;line-height:1.7;">${esc(desc)}</div>
    ${budget ? `<div style="margin-top:10px;color:#64748b;font-weight:900;">Budget : ${esc(budget)} €</div>` : ``}
    <div style="margin-top:10px;color:#dc2626;font-weight:1000;">Coordonnées masquées (débloquage offreur requis)</div>
  `;
});
