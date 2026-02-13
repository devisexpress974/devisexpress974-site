// assets/js/dx-metiers.js (V20)
// Lexique métiers (A→Z) — conforme CDC
// - liste A→Z + recherche instantanée
// - clic métier => pop-up 3 actions (Demande / Voir demandes / Devenir offreur)
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    search: $("metierSearch"),
    count: $("metierCount"),
    azNav: $("azNav"),
    host: $("metiersHost"),
  };

  function norm(s){ return String(s||"").trim(); }
  function alpha(a,b){ return norm(a).localeCompare(norm(b), "fr", { sensitivity:"base" }); }

  function buildFlatList(lex){
    const out = [];
    const cats = Array.isArray(lex?.categories) ? lex.categories : [];
    cats.forEach(cat => {
      const catLabel = norm(cat.label) || "Autres";
      const jobs = Array.isArray(cat.jobs) ? cat.jobs : [];
      jobs.forEach(j => {
        const label = norm(j.label);
        if (!label) return;
        out.push({ category: catLabel, label });
      });
    });
    // tri: catégorie (ordre déjà géré côté lexique) puis alpha métier
    out.sort((a,b) => alpha(a.label, b.label));
    return out;
  }

  function groupByFirstLetter(items){
    const map = new Map();
    items.forEach(it => {
      const l = norm(it.label);
      const first = (l[0] || "#").toUpperCase();
      const key = first.match(/[A-ZÀ-ÖØ-Ý]/) ? first : "#";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    });
    // tri dans chaque lettre
    for (const [k, arr] of map.entries()){
      arr.sort((a,b)=>alpha(a.label,b.label));
      map.set(k, arr);
    }
    return map;
  }

  function renderAZNav(keys){
    if (!els.azNav) return;
    els.azNav.innerHTML = "";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const all = [...new Set([...letters, "#"])].filter(Boolean);

    all.forEach(ch => {
      const a = document.createElement("a");
      a.href = "#";
      a.className = "azLink" + (keys.has(ch) ? "" : " isDisabled");
      a.textContent = ch;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (!keys.has(ch)) return;
        const anchor = document.getElementById("az_" + ch);
        if (anchor) anchor.scrollIntoView({ behavior:"smooth", block:"start" });
      });
      els.azNav.appendChild(a);
    });
  }

  function ensureModal(){
    let m = document.getElementById("dxMetierModal");
    if (m) return m;

    m = document.createElement("div");
    m.id = "dxMetierModal";
    m.className = "dxModal isHidden";
    m.innerHTML = `
      <div class="dxModalBackdrop" data-close="1"></div>
      <div class="dxModalCard" role="dialog" aria-modal="true">
        <div class="dxModalHead">
          <div class="dxModalTitle" id="dxMetierModalTitle">Métier</div>
          <button class="dxModalX" type="button" data-close="1" aria-label="Fermer">✕</button>
        </div>
        <div class="dxModalBody">
          <div class="dxModalBtns">
            <a class="dxBtn" id="dxActDemande" href="#">Faire une demande</a>
            <a class="dxBtn dxBtnGhost" id="dxActMur" href="#">Voir les demandes</a>
            <a class="dxBtn dxBtnGhost" id="dxActOffreur" href="#">Devenir offreur</a>
          </div>
          <p class="dxModalHint">Les coordonnées restent floutées sur le mur. Déblocage selon tes droits.</p>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    m.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-close") === "1") hideModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideModal();
    });
    return m;
  }

  function showModal(metier){
    const m = ensureModal();
    const title = document.getElementById("dxMetierModalTitle");
    const a1 = document.getElementById("dxActDemande");
    const a2 = document.getElementById("dxActMur");
    const a3 = document.getElementById("dxActOffreur");

    if (title) title.textContent = metier;

    const q = encodeURIComponent(metier);
    if (a1) a1.href = `./demande.html?service=${q}`;
    if (a2) a2.href = `./mur-demandes.html?service=${q}`;
    if (a3) a3.href = `./offreur-register.html?service=${q}`;

    m.classList.remove("isHidden");
    document.body.classList.add("dxModalOpen");
  }

  function hideModal(){
    const m = document.getElementById("dxMetierModal");
    if (!m) return;
    m.classList.add("isHidden");
    document.body.classList.remove("dxModalOpen");
  }

  function renderList(items){
    if (!els.host) return;
    els.host.innerHTML = "";

    const grouped = groupByFirstLetter(items);
    const keys = new Set(grouped.keys());
    renderAZNav(keys);

    const sortedKeys = [...keys].sort(alpha);
    sortedKeys.forEach(k => {
      const section = document.createElement("section");
      section.className = "azSection";

      const h = document.createElement("h2");
      h.className = "azTitle";
      h.id = "az_" + k;
      h.textContent = k;
      section.appendChild(h);

      const ul = document.createElement("ul");
      ul.className = "metiersList";

      grouped.get(k).forEach(it => {
        const li = document.createElement("li");
        li.className = "metierItem";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "metierBtn";
        btn.textContent = it.label;
        btn.addEventListener("click", () => showModal(it.label));
        li.appendChild(btn);
        ul.appendChild(li);
      });

      section.appendChild(ul);
      els.host.appendChild(section);
    });

    if (els.count) els.count.textContent = `${items.length} métier${items.length>1?"s":""}`;
  }

  async function loadLexique(){
    const r = await fetch("./assets/data/lexique-metiers.json?v=20", { cache:"no-store" });
    if (!r.ok) throw new Error("lexique load failed");
    return await r.json();
  }

  function initSearch(allItems){
    if (!els.search) return;
    els.search.addEventListener("input", () => {
      const q = norm(els.search.value).toLowerCase();
      if (!q) return renderList(allItems);
      const filtered = allItems.filter(it => it.label.toLowerCase().includes(q));
      renderList(filtered);
    });
  }

  async function init(){
    try {
      const lex = await loadLexique();
      const all = buildFlatList(lex);
      renderList(all);
      initSearch(all);
    } catch (e){
      if (els.host) els.host.innerHTML = `<p class="dxError">Impossible de charger le lexique des métiers.</p>`;
      if (els.count) els.count.textContent = "—";
      console.error(e);
    }
  }

  init();
})();
