// mur-demandes.js (v300) — Mur public "plié / déplié" + PJ + bouton "Voir plus"
document.addEventListener("DOMContentLoaded", () => {
  const serviceFilter = document.getElementById("serviceFilter");
  const zoneFilter = document.getElementById("zoneFilter");
  const communeFilter = document.getElementById("communeFilter");
  const communeField = document.getElementById("communeField");
  const q = document.getElementById("q");
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");
  const countBox = document.getElementById("countBox");
  const btnReload = document.getElementById("btnReload");
  const pager = document.getElementById("pager");
  const moreBtn = document.getElementById("moreBtn");

  const getCommunesByZone = () => {
    try { if (window.DX_ZONES) return window.DX_ZONES; } catch(e) {}
    return {
      "Nord": ["Saint-Denis", "Sainte-Marie", "Sainte-Suzanne"],
      "Est": ["Saint-André", "Bras-Panon", "Saint-Benoît", "Sainte-Rose", "La Plaine-des-Palmistes", "Salazie"],
      "Ouest": ["Le Port", "La Possession", "Saint-Paul", "Trois-Bassins", "Saint-Leu"],
      "Sud": ["Les Avirons", "Saint-Louis", "L'Étang-Salé", "Saint-Pierre", "Rivière Saint-Louis", "Le Tampon", "Entre-Deux", "Saint-Joseph", "Petite-Île", "Saint-Philippe", "Cilaos"]
    };
  };

  const STATE = {
    limit: 10,
    offset: 0,
    total: null,
    loading: false,
    items: [],
    services: [],
    detailCache: new Map(),
    lastBatch: 0,
    me: null,
    openId: (new URLSearchParams(location.search).get("open") || "").trim(),
    openTried: false
  };

  function safeToken(){
    try { return localStorage.getItem("dx_token") || ""; } catch(e){ return ""; }
  }

  function el(tag, cls, text){
    const x = document.createElement(tag);
    if(cls) x.className = cls;
    if(text !== undefined && text !== null) x.textContent = String(text);
    return x;
  }

  function getServiceLabel(s){
    if(!s) return "";
    return String(s.label || s.name || s.title || s.value || s.service || s.metier || "").trim();
  }


  function norm(s){ return String(s || "").trim().toLowerCase(); }

  function fmtDate(iso){
    if(!iso) return "";
    const d = new Date(iso);
    if(isNaN(d.getTime())) return String(iso);
    try{
      return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric" });
    }catch(e){
      return d.toISOString().slice(0,10);
    }
  }

  function setCommuneOptions(){
    const zone = String(zoneFilter && zoneFilter.value || "").trim();
    if(!communeFilter || !communeField) return;

    const isAll = !zone || zone === "Sur toute l'île" || zone === "Toute l'île";
    if(isAll){
      communeField.style.display = "none";
      communeFilter.innerHTML = '<option value="">Toutes les communes</option>';
      communeFilter.disabled = true;
      communeFilter.value = "";
      return;
    }

    communeField.style.display = "";
    communeFilter.disabled = false;

    const list = (getCommunesByZone()[zone] || []).slice().sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"}));
    communeFilter.innerHTML = '<option value="">Toutes les communes</option>' + list.map(c=>`<option value="${c}">${c}</option>`).join("");
    communeFilter.value = "";
  }

  function currentParams(){
    return {
      service: String(serviceFilter && serviceFilter.value || "").trim(),
      zone: String(zoneFilter && zoneFilter.value || "").trim(),
      commune: String(communeFilter && communeFilter.value || "").trim(),
      q: String(q && q.value || "").trim()
    };
  }

  function applyClientFilters(items){
    const p = currentParams();
    const nq = norm(p.q);
    const service = norm(p.service);
    const zone = norm(p.zone);
    const commune = norm(p.commune);

    return (items || []).filter(d => {
      if(!d) return false;

      if(service && service !== "tous les métiers" && service !== "toutes les catégories"){
        const s = norm(d.service || "");
        const sa = norm(d.serviceAutre || "");
        if(!s.includes(service) && !sa.includes(service)) return false;
      }

      if(zone && zone !== "sur toute l'île" && zone !== "toute l'île"){
        if(norm(d.zone || "") !== zone) return false;
      }

      if(commune){
        if(norm(d.commune || "") !== commune) return false;
      }

      if(nq){
        const blob = [d.service, d.serviceAutre, d.zone, d.commune, d.description, d.budget].map(x=>norm(x)).join(" ");
        if(!blob.includes(nq)) return false;
      }

      return true;
    });
  }

  async function fetchMe(){
    const token = safeToken();
    if(!token || !window.DX_API) { STATE.me = null; return; }
    try{
      const res = await window.DX_API.getAny(["getOffreurProfile","whoami","me"], { token });
      if(res && res.ok){
        if(res.user) STATE.me = res.user;
        else if(res.data) STATE.me = res.data;
        else STATE.me = null;
      } else {
        STATE.me = null;
      }
    }catch(e){
      STATE.me = null;
    }
  }

    async function fetchServices(){
    // La liste métiers est désormais remplie par assets/js/dx-services.js (source unique lexique)
    return;
  }
    }catch(e){
      // keep defaults
    }
  }

  function render(){
    if(!listEl) return;
    listEl.innerHTML = "";

    const filtered = applyClientFilters(STATE.items);

    if(countBox){
      const countText = (filtered.length ? `${filtered.length} demande(s)` : "0 demande");
      countBox.textContent = STATE.loading ? (countText + " • chargement…") : countText;
    }

    if(!filtered.length && !STATE.loading){
      if(emptyEl) emptyEl.style.display = "";
      if(pager) pager.style.display = "none";
      return;
    }

    if(emptyEl) emptyEl.style.display = "none";
    if(pager) pager.style.display = "";

    filtered.forEach(d => listEl.appendChild(renderCard(d)));

    // bouton plus
    if(moreBtn){
      const canMore = STATE.loading ? false : (STATE.lastBatch === STATE.limit);
      moreBtn.disabled = !canMore;
      moreBtn.style.display = canMore ? "" : "none";
    }

    // auto-open (après rendu)
    maybeAutoOpen(filtered);
  }

    function renderCard(d){
    const card = el("article", "dxPost");
    const id = String(d.id || d.DemandeID || d.demande_id || "").trim();
    card.dataset.id = id;

    const top = el("div", "dxPostTop");
    const title = el("div", "dxPostTitle", (d.serviceAutre || d.service || d.Service || "Demande"));
    const meta = el("div", "dxPostMeta", `${d.zone || d.Zone || "Sur toute l'île"}${(d.commune||d.Commune) ? " • " + (d.commune||d.Commune) : ""}${d.createdAt ? " • " + fmtDate(d.createdAt) : ""}`);

    top.appendChild(title);
    top.appendChild(meta);

    const excerpt = el("div", "dxPostExcerpt");
    const full = String(d.description || d.Description || "").trim();
    const PREVIEW = 50;

    if(full.length > PREVIEW){
      excerpt.appendChild(document.createTextNode(full.slice(0, PREVIEW) + "… "));
      const more = el("button", "dxInlineMore", "Voir plus");
      more.type = "button";
      more.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleCard(card); });
      excerpt.appendChild(more);
    }else{
      excerpt.textContent = full;
    }

    top.appendChild(excerpt);

    const exp = el("div", "dxPostExpand");
    exp.hidden = true;

    card.appendChild(top);
    card.appendChild(exp);

    return card;
  }

    async function toggleCard(card){
    const exp = card.querySelector(".dxPostExpand");
    const excerpt = card.querySelector(".dxPostExcerpt");
    const id = card.dataset.id || "";
    if(!exp) return;

    const opening = exp.hidden;

    // Close
    if(!opening){
      exp.hidden = true;
      card.classList.remove("is-open");
      if(excerpt) excerpt.style.display = "";
      return;
    }

    // Open
    exp.hidden = false;
    card.classList.add("is-open");
    if(excerpt) excerpt.style.display = "none";

    // load details (only once)
    if(STATE.detailCache.has(id)){
      fillExpand(exp, STATE.detailCache.get(id), id);
      ensureLessLink_(exp, card);
      return;
    }

    exp.innerHTML = "";
    exp.appendChild(el("div", "dxLoadingMini", "Chargement…"));

    const token = safeToken();
    try{
      const res = await window.DX_API.getAny(
        ["getDemandePublic","getDemande","getDemandeByIdPublic"],
        { id, token }
      );
      const data = (res && res.ok) ? (res.data || res.demande || res.item || res) : null;
      if(!data){
        exp.innerHTML = "";
        exp.appendChild(el("div","dxNotice err","Impossible de charger le détail."));
        ensureLessLink_(exp, card);
        return;
      }
      STATE.detailCache.set(id, data);
      fillExpand(exp, data, id);
      ensureLessLink_(exp, card);
    }catch(e){
      exp.innerHTML = "";
      exp.appendChild(el("div","dxNotice err", (e && e.message) ? e.message : "Erreur réseau."));
      ensureLessLink_(exp, card);
    }
  }

  function ensureLessLink_(exp, card){
    if(!exp || !card) return;
    // Avoid duplicates
    if(exp.querySelector(".dxInlineLess")) return;
    const wrap = el("div","dxInlineLessWrap");
    const less = el("button","dxInlineLess","Voir moins");
    less.type = "button";
    less.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleCard(card); });
    wrap.appendChild(less);
    exp.appendChild(wrap);
  }

  function fillExpand(exp, data, id){
    exp.innerHTML = "";

    // description full
    const desc = el("div", "dxPostDesc");
    desc.textContent = String(data.description || data.Description || "").trim();
    exp.appendChild(desc);

    // budget
    const budgetVal = String(data.budget || data.Budget || "").trim();
    if(budgetVal){
      const b = el("div","dxPostBudget");
      b.innerHTML = `<strong>Budget :</strong> ${escapeHtml(budgetVal)}`;
      exp.appendChild(b);
    }

    // photos / PJ
    const photos = Array.isArray(data.photos) ? data.photos : (Array.isArray(data.Photos) ? data.Photos : []);
    if(photos && photos.length){
      const wrap = el("div","dxPostPhotos");
      const h = el("div","dxPostSubTitle","Pièces jointes");
      wrap.appendChild(h);

      const grid = el("div","dxPhotoGrid");
      photos.slice(0,3).forEach((u, idx) => {
        const url = String(u||"").trim();
        if(!url) return;

        const a = el("a","dxPhotoItem");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";

        const img = el("img","dxPhoto");
        img.alt = `Pièce jointe ${idx+1}`;
        img.loading = "lazy";
        img.src = url;

        const dl = el("span","dxPhotoDl","Télécharger");
        a.appendChild(img);
        a.appendChild(dl);
        grid.appendChild(a);
      });
      wrap.appendChild(grid);
      exp.appendChild(wrap);
    }

    // contact
    const contactBlock = el("div","dxContact");
    const canSee = !!(data.canSeeContact || data.canSee || data.CanSeeContact);
    const reason = String(data.accessReason || data.reason || "").trim();

    contactBlock.appendChild(el("div","dxPostSubTitle","Coordonnées"));

    const row = el("div","dxContactRow");
    const tel = String(data.tel || data.Tel || "").trim();
    const email = String(data.email || data.Email || "").trim();

    const telVal = canSee ? (tel || "—") : "••••••••";
    const mailVal = canSee ? (email || "—") : "••••••••@••••.••";

    const telLine = el("div","dxContactLine");
    telLine.innerHTML = `<span class="dxLabel">Téléphone</span><span class="dxValue"></span>`;
    const telSpan = telLine.querySelector(".dxValue");
    if(canSee && tel){
      const a = document.createElement("a");
      a.href = "tel:" + tel;
      a.textContent = tel;
      telSpan.appendChild(a);
    }else{
      telSpan.textContent = telVal;
    }

    const mailLine = el("div","dxContactLine");
    mailLine.innerHTML = `<span class="dxLabel">Email</span><span class="dxValue"></span>`;
    const mailSpan = mailLine.querySelector(".dxValue");
    if(canSee && email){
      const a = document.createElement("a");
      a.href = "mailto:" + email;
      a.textContent = email;
      mailSpan.appendChild(a);
    }else{
      mailSpan.textContent = mailVal;
    }

    row.appendChild(telLine);
    row.appendChild(mailLine);
    contactBlock.appendChild(row);

    // CTA
    const ctas = el("div","dxCtas");

    if(canSee){
      ctas.appendChild(el("div","dxUnlocked","✅ Coordonnées débloquées"));
    }else{
      const token = safeToken();
      if(!token){
        const next = "mur-demandes.html?open=" + encodeURIComponent(id);
        const a = el("a","dxBtnPrimary","Se connecter pour débloquer");
        a.href = "offreur-login.html?next=" + encodeURIComponent(next);
        ctas.appendChild(a);
      }else if(reason === "NOT_MATCH_SERVICE"){
        ctas.appendChild(el("div","dxNotice warn","Cette demande ne correspond pas à votre métier. (Sécurité)"));
        const a = el("a","dxBtnGhost","Modifier mon profil");
        a.href = "offreur-compte.html";
        ctas.appendChild(a);
      }else{
        // credits?
        const credits = STATE.me && isFinite(Number(STATE.me.credits)) ? Number(STATE.me.credits) : 0;
        if(credits > 0){
          const b = el("button","dxBtnPrimary",`Débloquer maintenant (1 crédit)`);
          b.type = "button";
          b.addEventListener("click", async () => {
            b.disabled = true;
            b.textContent = "Déblocage…";
            try{
              const res = await window.DX_API.post("unlockDemande", { demandeId: id, type: "credit" });
              if(res && res.ok){
                // refresh me + detail
                await fetchMe();
                STATE.detailCache.delete(id);
                const exp2 = exp; // same
                const btn = cardFindToggleFor(id);
                // re-open content
                const res2 = await window.DX_API.getAny(["getDemandePublic","getDemande"], { id, token: safeToken() });
                const data2 = (res2 && res2.ok) ? (res2.data || res2.demande || res2.item || res2) : null;
                if(data2){
                  STATE.detailCache.set(id, data2);
                  fillExpand(exp2, data2, id);
                }else{
                  b.disabled = false;
                  b.textContent = "Débloquer maintenant (1 crédit)";
                }
                return;
              }
              const msg = (res && (res.error || res.message)) ? (res.error || res.message) : "Impossible.";
              alert(msg);
            }catch(e){
              alert(e?.message || "Erreur réseau.");
            }
            b.disabled = false;
            b.textContent = "Débloquer maintenant (1 crédit)";
          });
          ctas.appendChild(b);
          const hint = el("div","dxHint", "Ou recharger / s’abonner :");
          ctas.appendChild(hint);
        }

        const payBtn = el("button","dxBtnGhost","Voir les options de paiement");
        payBtn.type = "button";
        payBtn.addEventListener("click", () => openPaySheet(id));
        ctas.appendChild(payBtn);

        if(reason === "ABO_INACTIVE"){
          ctas.appendChild(el("div","dxHint","Abonnement inactif — active-le pour débloquer sans limite (sur ton domaine)."));
        }else{
          ctas.appendChild(el("div","dxHint","Paiement requis — débloque cette demande (0,99€) ou prends un pack / abonnement."));
        }
      }
    }

    contactBlock.appendChild(ctas);
    exp.appendChild(contactBlock);
  }

  function cardFindToggleFor(id){
    const card = document.querySelector(`.dxPost[data-id="${cssEscape(id)}"]`);
    if(!card) return null;
    return card.querySelector(".dxInlineMore");
  }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function cssEscape(s){
    if(window.CSS && CSS.escape) return CSS.escape(String(s||""));
    return String(s||"").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  // --- Pay bottom sheet ---
  let sheetReady = false;
  function ensurePaySheet(){
    if(sheetReady) return;
    sheetReady = true;

    const overlay = el("div","dxSheetOverlay");
    overlay.hidden = true;

    const sheet = el("div","dxSheet");
    sheet.hidden = true;

    const title = el("div","dxSheetTitle","Débloquer les coordonnées");
    const close = el("button","dxSheetClose","✕");
    close.type = "button";

    const body = el("div","dxSheetBody");
    body.innerHTML = `
      <div class="dxSheetText">Choisis une option :</div>
      <div class="dxSheetBtns">
        <a class="dxSheetBtn dxSheetBtnPrimary" id="dxPayOne" href="#">0,99€ — Débloquer 1 demande</a>
        <a class="dxSheetBtn" id="dxPayPack" href="#">2,99€ — Pack 10 déblocages</a>
        <a class="dxSheetBtn" id="dxPayAbo" href="#">4,99€/mois — Abonnement (1er mois offert)</a>
      </div>
      <div class="dxSheetSmall">Après paiement, tu reviens ici et les coordonnées seront visibles.</div>
    `;

    const head = el("div","dxSheetHead");
    head.appendChild(title);
    head.appendChild(close);

    sheet.appendChild(head);
    sheet.appendChild(body);

    function hide(){
      overlay.hidden = true;
      sheet.hidden = true;
      document.body.classList.remove("dxNoScroll");
    }
    function show(){
      overlay.hidden = false;
      sheet.hidden = false;
      document.body.classList.add("dxNoScroll");
    }

    overlay.addEventListener("click", hide);
    close.addEventListener("click", hide);

    document.body.appendChild(overlay);
    document.body.appendChild(sheet);

    window.__DX_PAY_SHEET = { show, hide, overlay, sheet };
  }

  function openPaySheet(demandeId){
    ensurePaySheet();

    const next = "mur-demandes.html?open=" + encodeURIComponent(demandeId) + "&paid=1";

    const a1 = document.getElementById("dxPayOne");
    const a2 = document.getElementById("dxPayPack");
    const a3 = document.getElementById("dxPayAbo");

    if(a1) a1.href = "paiement-ponctuel.html?id=" + encodeURIComponent(demandeId) + "&next=" + encodeURIComponent(next);
    if(a2) a2.href = "paiement-pack.html?id=" + encodeURIComponent(demandeId) + "&next=" + encodeURIComponent(next);
    if(a3) a3.href = "paiement-abonnement.html?id=" + encodeURIComponent(demandeId) + "&next=" + encodeURIComponent(next);

    window.__DX_PAY_SHEET.show();
  }

  function maybeAutoOpen(filtered){
    if(!STATE.openId || STATE.openTried) return;

    // if card exists, open it
    const card = document.querySelector(`.dxPost[data-id="${cssEscape(STATE.openId)}"]`);
    if(card){
      STATE.openTried = true;
      // open + scroll
      const more = card.querySelector(".dxInlineMore");
      if(more) more.click();
      else toggleCard(card);
      setTimeout(() => { try { card.scrollIntoView({ behavior:"smooth", block:"start" }); } catch(e) {} }, 120);
    }else{
      // auto-fetch more pages to find the target (return from paiement)
      if(STATE.loading) return;
      // If last batch was full, there may be more
      if(STATE.lastBatch === STATE.limit){
        STATE._autoOpenTries = (STATE._autoOpenTries || 0) + 1;
        if(STATE._autoOpenTries <= 6){
          fetchMore().then(() => { /* render() will call maybeAutoOpen again */ });
          return;
        }
      }
      STATE.openTried = true;
    }
  }

  async function fetchFirst(){
    try{
  STATE.loading = true;
  STATE.items = [];
  STATE.offset = 0;
  STATE.total = null;
  STATE.detailCache = new Map();
  render();

  try{
    const res = await window.DX_API.getAny(
      ((STATE.me && (STATE.me.offreurId || STATE.me.offreurID)) ? ["listDemandesForOffreur","listDemandesOffreur"] : ["listDemandesPublic","listDemandes","getDemandesPublic"]),
      { offset: 0, limit: STATE.limit, service: (serviceFilter && serviceFilter.value)||"", zone: (zoneFilter&&zoneFilter.value)||"", commune:(communeFilter&&communeFilter.value)||"", q:(q&&q.value)||"" }
    );

    const data = res && res.ok ? (res.data || res.items || res.demandes || []) : [];
    const items = Array.isArray(data) ? data : [];
    const t = (res && res.total !== undefined && res.total !== null) ? Number(res.total) : null;
    if(isFinite(t) && t >= 0) STATE.total = t;

    STATE.items = items;
    STATE.offset = items.length;
    STATE.lastBatch = items.length;
    STATE.loading = false;
    render();
  }catch(e){
    STATE.loading = false;
    STATE.items = [];
    STATE.offset = 0;
    STATE.lastBatch = 0;
    if(countBox){
      countBox.textContent = "0 demande • erreur API";
    }
    if(emptyEl){
      emptyEl.style.display = "";
      emptyEl.textContent = "Erreur de chargement (API). Vérifie le déploiement Netlify Functions / Apps Script.";
    }
    if(pager) pager.style.display = "none";
    console.error(e);
  }
}


  async function fetchMore(){
  if(STATE.loading) return;
  STATE.loading = true;
  render();

  try{
    const res = await window.DX_API.getAny(
      ((STATE.me && (STATE.me.offreurId || STATE.me.offreurID)) ? ["listDemandesForOffreur","listDemandesOffreur"] : ["listDemandesPublic","listDemandes","getDemandesPublic"]),
      { offset: STATE.offset, limit: STATE.limit, service: (serviceFilter && serviceFilter.value)||"", zone: (zoneFilter&&zoneFilter.value)||"", commune:(communeFilter&&communeFilter.value)||"", q:(q&&q.value)||"" }
    );

    const data = res && res.ok ? (res.data || res.items || res.demandes || []) : [];
    const more = Array.isArray(data) ? data : [];
    const t = (res && res.total !== undefined && res.total !== null) ? Number(res.total) : null;
    if(isFinite(t) && t >= 0) STATE.total = t;

    STATE.items = STATE.items.concat(more);
    STATE.offset += more.length;
    STATE.lastBatch = more.length;
    STATE.loading = false;
    render();
  }catch(e){
    STATE.loading = false;
    if(countBox){
      countBox.textContent = (STATE.items.length ? `${STATE.items.length} demande(s)` : "0 demande") + " • erreur API";
    }
    console.error(e);
    render();
  }
}


  // events
  setCommuneOptions();
  zoneFilter && zoneFilter.addEventListener("change", () => { setCommuneOptions(); render(); });
  communeFilter && communeFilter.addEventListener("change", () => render());
  serviceFilter && serviceFilter.addEventListener("change", () => render());
  q && q.addEventListener("input", () => render());

  btnReload && btnReload.addEventListener("click", () => fetchFirst());
  moreBtn && moreBtn.addEventListener("click", () => fetchMore());

  // boot
  (async () => {
    await fetchServices();
    await fetchMe();
    await fetchFirst();
  })();
});
