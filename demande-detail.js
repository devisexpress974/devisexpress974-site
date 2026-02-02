// demande-detail.js (PATCH1)
document.addEventListener("DOMContentLoaded", async () => {
  const box = document.getElementById("box");
  const params = new URLSearchParams(location.search);
  const id = params.get("id") || "";

  function esc(s){
    return (s??"").toString()
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  if(!box){
    return;
  }
  if(!id){
    box.className = "notice err";
    box.textContent = "ID manquant.";
    return;
  }

  // On tente d'abord l'endpoint complet (qui peut renvoyer les coordonnées si accès),
  // sinon on retombe sur la liste publique.
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
  const canSee = !!(item.canSeeContact || item.hasAccess || item.canSee || false);

  const tel = (item.tel || item.Tel || "").toString().trim();
  const email = (item.email || item.Email || "").toString().trim();
  const nom = (item.nom || item.Nom || "").toString().trim();

  const contactHtml = (() => {
    if(canSee && (tel || email)){
      return `
        <div class="card" style="padding:16px;margin-top:14px;border:1px solid rgba(0,0,0,.08);border-radius:14px;">
          <div style="font-weight:1000;margin-bottom:6px;">Coordonnées débloquées ✅</div>
          ${nom ? `<div class="muted" style="margin-bottom:8px;"><strong>Nom :</strong> ${esc(nom)}</div>` : ``}
          ${tel ? `<div style="margin-bottom:6px;"><strong>Téléphone :</strong> <a href="tel:${esc(tel)}">${esc(tel)}</a></div>` : ``}
          ${email ? `<div><strong>Email :</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></div>` : ``}
        </div>
      `;
    }
    return `
      <div class="card" style="padding:16px;margin-top:14px;border:1px solid rgba(0,0,0,.08);border-radius:14px;">
        <div style="font-weight:1000;margin-bottom:6px;">Coordonnées masquées 🔒</div>
        <div class="muted" style="margin-bottom:12px;">Débloque cette demande pour voir le téléphone/email.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a class="btn btnPrimary" href="paiement-ponctuel.html?id=${encodeURIComponent(id)}">Débloquer (0,99€)</a>
          <a class="btn" href="paiement-pack.html?id=${encodeURIComponent(id)}">Pack 10 (2,99€)</a>
          <a class="btn" href="paiement-abonnement.html?id=${encodeURIComponent(id)}">Abonnement (4,99€/mois)</a>
        </div>
      </div>
    `;
  })();

  box.className = "notice";
  box.innerHTML = `
    <div style="font-weight:1000;margin-bottom:6px;">${esc(service)}</div>
    <div style="color:#64748b;font-weight:900;margin-bottom:10px;">${esc(commune)}${zone ? " • " + esc(zone) : ""}</div>
    <div style="font-weight:800;line-height:1.7;">${esc(desc)}</div>
    ${budget ? `<div style="margin-top:10px;color:#64748b;font-weight:900;">Budget : ${esc(budget)} €</div>` : ``}
    ${contactHtml}
  `;
});
