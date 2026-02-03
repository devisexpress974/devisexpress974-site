// offreur-profil.js (profil PUBLIC)
// Affiche un profil offreur depuis offreur-profil.html?id=XXXX
// - Sans coordonnées (confidentialité)
// - Chargement via backend (GAS via netlify/functions/gas ou API existante)

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

  function qp(obj) {
    const u = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      u.set(k, String(v));
    });
    const s = u.toString();
    return s ? `?${s}` : "";
  }

  async function fetchJson(url, opt) {
    const res = await fetch(url, opt || {});
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch (e) {
      return { ok: false, error: "Réponse non JSON", raw: (txt || "").slice(0, 180) };
    }
  }

  async function callBackend(route, query) {
    query = query || {};

    // 1) Si ton api.js expose déjà une fonction, on l'utilise (si elle existe).
    try {
      if (window.DX_API && typeof window.DX_API.call === "function") {
        return await window.DX_API.call(route, query);
      }
      if (typeof window.apiCall === "function") {
        return await window.apiCall(route, query);
      }
      if (typeof window.apiGet === "function") {
        return await window.apiGet(route, query);
      }
    } catch (e) {}

    // 2) Fallback vers Netlify Function
    const base = (window.DX_API_BASE || window.API_BASE || "").toString().trim();
    const fn = base || "/.netlify/functions/gas";

    const tries = [
      fn + qp({ route, ...query }),
      fn + qp({ action: route, ...query }),
      fn + qp({ path: route, ...query }),
      fn + qp({ fn: route, ...query }),
    ];

    for (const url of tries) {
      try {
        const js = await fetchJson(url);
        if (js && (js.ok === true || js.offreur || js.user || js.data)) return js;
      } catch (e) {}
    }

    const postOpt = (payload) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    for (const payload of [
      { route, ...query },
      { action: route, ...query },
      { path: route, ...query },
      { fn: route, ...query },
    ]) {
      try {
        const js = await fetchJson(fn, postOpt(payload));
        if (js && (js.ok === true || js.offreur || js.user || js.data)) return js;
      } catch (e) {}
    }

    return { ok: false, error: "Impossible de joindre le backend" };
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return "";
  }

  function buildProfileHtml(p) {
    const publicName =
      pick(p, ["publicName", "PublicName"]) ||
      pick(p, ["pseudo", "Pseudo"]) ||
      pick(p, ["entreprise", "Entreprise"]) ||
      pick(p, ["nom", "Nom"]) ||
      "Offreur";

    const service = pick(p, ["service", "Service"]) || pick(p, ["service_id", "Service_id"]);
    const zone = pick(p, ["zone", "Zone"]);
    const commune = pick(p, ["commune", "Commune"]);
    const desc = pick(p, ["description", "Description", "bio", "Bio"]);

    const showNoteRaw = pick(p, ["showNote", "ShowNote", "show_note", "Show_Note"]);
    const showNote = String(showNoteRaw).toLowerCase() === "true" || showNoteRaw === 1 || showNoteRaw === "1" || showNoteRaw === true;

    const note = pick(p, ["note", "Note", "rating", "Rating"]);
    const nbAvis = pick(p, ["nbAvis", "NbAvis", "reviewsCount", "ReviewsCount"]);

    const chips = [service, commune, zone].filter(Boolean).map((x) => `<span class="chip">${esc(x)}</span>`).join(" ");

    const noteLine = (showNote && note)
      ? `<div style="margin-top:10px;"><strong>Note :</strong> ${esc(note)}${nbAvis ? ` <span class="muted">(${esc(nbAvis)} avis)</span>` : ""}</div>`
      : `<div style="margin-top:10px;" class="muted"><strong>Note :</strong> non affichée</div>`;

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
          <a class="btn" href="offreurs.html">Retour aux offreurs</a>
          <a class="btn" href="mur-demandes.html">Voir le mur</a>
        </div>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const y = document.getElementById("y");
    if (y) y.textContent = String(new Date().getFullYear());

    const params = new URLSearchParams(location.search);
    const id = params.get("id") || "";

    if (!id) {
      setBox(`Profil introuvable : il manque l’identifiant.<br><br><a class="btn" href="offreurs.html">Retour</a>`, true);
      return;
    }

    setBox("Chargement…", false);

    const resp = await callBackend("getOffreurProfile", { id });

    if (!resp || resp.ok === false) {
      const err = resp?.error ? esc(resp.error) : "Erreur inconnue";
      setBox(`Impossible de charger ce profil.<br><span class="muted">${err}</span><br><br><a class="btn" href="offreurs.html">Retour</a>`, true);
      return;
    }

    const p = resp.offreur || resp.user || resp.data || resp;
    setBox(buildProfileHtml(p), false);
  });
})();
