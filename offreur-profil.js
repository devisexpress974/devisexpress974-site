// offreur-profil.js (profil PUBLIC) — DX (v42)
// Affiche un profil offreur depuis offreur-profil.html?id=XXXX
// - Sans coordonnées (confidentialité)
// - Chargement via backend (GAS via /.netlify/functions/gas) via DX_API

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  function esc(s) {
    return (s ?? "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setBox(html, isError) {
    const box = $("#box");
    if (!box) return;
    box.className = isError ? "notice" : "notice muted";
    box.innerHTML = html;
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return "";
  }

  function qp(name) {
    try { return (new URL(location.href)).searchParams.get(name) || ""; }
    catch (e) { return ""; }
  }

  function pickOffreurId() {
    return (qp("id") || qp("oid") || qp("offreurId") || qp("offreurID") || "").trim();
  }

  function toBoolShowNote(v) {
    if (v === undefined || v === null || v === "") return true;
    const s = String(v).trim().toLowerCase();
    if (s === "non" || s === "0" || s === "false") return false;
    return true;
  }

  function splitList(v) {
    return String(v || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  }

  async function loadProfile(id) {
    if (!window.DX_API || typeof window.DX_API.getAny !== "function") {
      return { ok: false, error: "API non chargée (DX_API). Recharge la page." };
    }

    // 1) Profil public dédié (sans coordonnées)
    let resp = null;
    try {
      resp = await window.DX_API.getAny(
        ["getOffreurProfilePublic", "getOffreurProfile"],
        { id }
      );
    } catch (e) {
      resp = null;
    }

    if (resp && resp.ok) return resp;

    // 2) Fallback ultime : liste publique (si le backend ne supporte pas l'endpoint direct)
    try {
      const list = await window.DX_API.getAny(["getOffreursPublic"], { q: "", limit: 200, offset: 0 });
      if (list && list.ok && Array.isArray(list.data)) {
        const found = list.data.find(o =>
          String(pick(o, ["OffreurID", "offreurID", "id", "ID"])).trim() === id
        );
        if (found) return { ok: true, offreur: found };
      }
    } catch (e) {}

    return resp || { ok: false, error: "Impossible de charger ce profil." };
  }

  function buildProfileHtml(p) {
    const publicName =
      pick(p, ["publicName", "PublicName"]) ||
      pick(p, ["pseudo", "Pseudo"]) ||
      pick(p, ["entreprise", "Entreprise"]) ||
      pick(p, ["nom", "Nom"]) ||
      "Offreur";

    const service = pick(p, ["service", "Service"]) || pick(p, ["service_id", "Service_id"]);
    const serviceAutre = pick(p, ["serviceAutre", "ServiceAutre"]);
    const zone = pick(p, ["zone", "Zone"]);
    const communes = splitList(pick(p, ["commune", "Commune"]));

    const desc = pick(p, ["description", "Description", "bio", "Bio"]);

    const showNote = toBoolShowNote(pick(p, ["showNote", "ShowNote", "show_note", "Show_Note"]));
    const note = pick(p, ["note", "Note", "rating", "Rating"]);
    const nbAvis = pick(p, ["nbAvis", "NbAvis", "reviewsCount", "ReviewsCount"]);

    const chipsArr = [];
    if (service) chipsArr.push(String(service));
    if (serviceAutre && String(service).toLowerCase().startsWith("autre")) chipsArr.push(String(serviceAutre));
    communes.forEach(c => chipsArr.push(c));
    if (zone) chipsArr.push(String(zone));

    const chips = chipsArr
      .filter(Boolean)
      .slice(0, 10)
      .map(x => `<span class="chip">${esc(x)}</span>`)
      .join(" ");

    const noteLine = (!showNote)
      ? `<div style="margin-top:10px;" class="muted"><strong>Note :</strong> masquée</div>`
      : (note
          ? `<div style="margin-top:10px;"><strong>Note :</strong> ${esc(note)}${nbAvis ? ` <span class="muted">(${esc(nbAvis)} avis)</span>` : ""}</div>`
          : `<div style="margin-top:10px;" class="muted"><strong>Note :</strong> pas d’avis</div>`);

    return `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <div class="sectionTitle" style="margin:0; font-size:20px;">${esc(publicName)}</div>
          <div class="muted" style="margin-top:4px;">Profil public — coordonnées masquées</div>
        </div>

        ${chips ? `<div style="display:flex; flex-wrap:wrap; gap:8px;">${chips}</div>` : ""}

        ${desc ? `<div><strong>À propos :</strong><div class="muted" style="margin-top:6px; line-height:1.5;">${esc(desc)}</div></div>` : ""}

        ${noteLine}

        <div class="muted" style="margin-top:8px;">
          Pour contacter cet offreur : publie une demande, puis débloque les coordonnées depuis le mur (si ton offre te le permet).
        </div>

        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn" href="./offreurs.html">Retour aux offreurs</a>
          <a class="btn" href="./mur-demandes.html">Voir le mur</a>
        </div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const y = document.getElementById("y");
    if (y) y.textContent = String(new Date().getFullYear());

    const id = pickOffreurId();
    if (!id) {
      setBox(`Profil introuvable : il manque l’identifiant.<br><br><a class="btn" href="./offreurs.html">Retour</a>`, true);
      return;
    }

    setBox("Chargement…", false);

    const resp = await loadProfile(id);
    if (!resp || resp.ok === false) {
      const err = resp?.error ? esc(resp.error) : "Erreur inconnue";
      setBox(`Impossible de charger ce profil.<br><span class="muted">${err}</span><br><br><a class="btn" href="./offreurs.html">Retour</a>`, true);
      return;
    }

    const p = resp.offreur || resp.user || resp.data || resp;
    setBox(buildProfileHtml(p), false);
  });
})();
