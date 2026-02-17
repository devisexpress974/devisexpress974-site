(function(){
  function qs(name){
    try{ return (new URL(location.href)).searchParams.get(name) || ""; }catch(e){ return ""; }
  }

  const id = (qs("id")||qs("demandeId")||qs("did")||"").trim();
  const k  = (qs("k")||qs("key")||"").trim();

  const box = document.getElementById("demandeBox");
  const msg = document.getElementById("msg");
  const withdrawBtn = document.getElementById("withdrawBtn");
  const viewBtn = document.getElementById("viewBtn");

  const ratingCard = document.getElementById("ratingCard");
  const offreursList = document.getElementById("offreursList");
  const manualRate = document.getElementById("manualRate");
  const manualOffreurId = document.getElementById("manualOffreurId");
  const manualRateBtn = document.getElementById("manualRateBtn");
  const selectedBox = document.getElementById("selectedBox");

  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function show(type, text){
    if(!msg) return;
    msg.className = type ? ("msg " + type) : "msg";
    msg.textContent = text || "";
    msg.style.display = text ? "block" : "none";
  }

  function ratingLink(offreurId){
    const url = new URL("./noter-offreur.html", window.location.href);
    url.searchParams.set("oid", offreurId);
    url.searchParams.set("did", id);
    url.searchParams.set("k", k);
    // keep relative
    return url.pathname + url.search;
  }

  function setSelectedUI(state){
    if(!selectedBox) return;

    const sel = (state && state.SelectedOffreurID) ? String(state.SelectedOffreurID).trim() : "";
    const rs = (state && state.RatingStatus) ? String(state.RatingStatus).trim().toUpperCase() : "";
    const closedAt = (state && state.ClosedAt) ? String(state.ClosedAt).trim() : "";

    if(rs === "LOCKED"){
      selectedBox.innerHTML =
        '<div class="card pad" style="border:1px solid rgba(16,185,129,.35);background:rgba(16,185,129,.08);padding:12px 14px;margin:0 0 12px;">'
        + '<div style="font-weight:900;">✅ Avis déjà envoyé</div>'
        + '<div style="color:#333;margin-top:4px;">Merci ! Ton avis est verrouillé.</div>'
        + '</div>';
      return;
    }

    if(sel){
      const btnNote = '<a class="dxBtn dxBtnPrimary" href="'+ratingLink(sel)+'">Noter mon prestataire</a>';
      const btnClose = (!closedAt)
        ? '<button class="dxBtn dxBtnGhost" id="closeBtn" type="button">Clôturer la prestation</button>'
        : '<span class="badge" title="Prestation clôturée">Clôturée</span>';

      selectedBox.innerHTML =
        '<div class="card pad" style="padding:12px 14px;margin:0 0 12px;">'
        + '<div style="font-weight:900;">Prestataire choisi :</div>'
        + '<div style="color:#333;margin:4px 0 10px;"><code>'+esc(sel)+'</code></div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;">' + btnNote + btnClose + '</div>'
        + '<div style="color:#666;font-size:13px;margin-top:8px;">Tu peux changer de prestataire tant que tu n’as pas envoyé d’avis.</div>'
        + '</div>';

      const closeBtn = document.getElementById("closeBtn");
      if(closeBtn){
        closeBtn.addEventListener("click", async ()=>{
          closeBtn.disabled = true;
          try{
            const res = await window.DX_API.postAny(["closeDemande","cloturerDemande"], { demandeId: id, k });
            if(res && res.ok){
              show("ok","✅ Prestation clôturée.");
              // reload state
              await init();
            }else{
              show("err", (res && res.error) ? res.error : "Impossible de clôturer.");
            }
          }catch(e){
            show("err","Erreur réseau.");
          }finally{
            closeBtn.disabled = false;
          }
        });
      }

    }else{
      selectedBox.innerHTML =
        '<div class="card pad" style="padding:12px 14px;margin:0 0 12px;">'
        + '<div style="font-weight:900;">1) Choisis ton prestataire</div>'
        + '<div style="color:#666;margin-top:4px;">Ensuite, tu pourras le noter (1 avis par demande).</div>'
        + '</div>';
    }
  }

  async function loadDemandeBoxBasic(){
    // fallback minimal (si k manquant)
    if(!id){
      box.textContent = "ID manquant. Ouvre ce lien depuis ton email.";
      if(withdrawBtn) withdrawBtn.disabled = true;
      if(ratingCard) ratingCard.style.display = "none";
      return null;
    }
    try{
      const res = await window.DX_API.getAny(["getDemandePublic","getDemandeByIdPublic","getDemandePublicById"], { id });
      const d = (res && res.ok) ? (res.data || res.demande || res.item || null) : null;
      if(d){
        box.innerHTML =
          "<strong>Métier :</strong> " + esc(d.Service||d.service||"") + "<br>" +
          "<strong>Commune :</strong> " + esc(d.Commune||d.commune||"") + "<br>" +
          "<strong>Statut :</strong> " + esc(d.Status||d.status||d.Statut||d.statut||"") + "<br>" +
          "<strong>Publié :</strong> " + esc(d.Date||d.CreatedAt||d.createdAt||"");
      }else{
        box.textContent = (res && res.error) ? res.error : "Demande introuvable.";
      }
    }catch(e){
      box.textContent = "Erreur de chargement.";
    }
    return null;
  }

  async function loadDemandeOwner(){
    if(!id){
      box.textContent = "ID manquant. Ouvre ce lien depuis ton email.";
      if(withdrawBtn) withdrawBtn.disabled = true;
      if(ratingCard) ratingCard.style.display = "none";
      return null;
    }

    if(!k){
      if(ratingCard) ratingCard.style.display = "none";
      return loadDemandeBoxBasic();
    }

    try{
      const res = await window.DX_API.postAny(["getDemandeOwner","getDemandeManage"], { demandeId: id, k });
      const d = (res && res.ok) ? (res.data || res.item || res.demande || null) : null;

      if(d){
        box.innerHTML =
          "<strong>Métier :</strong> " + esc(d.Service||"") + "<br>" +
          "<strong>Commune :</strong> " + esc(d.Commune||d.Commune||"") + "<br>" +
          "<strong>Statut :</strong> " + esc(d.Status||"") + "<br>" +
          "<strong>Publié :</strong> " + esc(d.Date||"");
      }else{
        box.textContent = (res && res.error) ? res.error : "Demande introuvable.";
      }

      if(viewBtn){
        viewBtn.href = "./mur-demandes.html?open=" + encodeURIComponent(id);
      }

      if(ratingCard) ratingCard.style.display = "block";
      return d;

    }catch(e){
      box.textContent = "Erreur de chargement.";
      if(ratingCard) ratingCard.style.display = "none";
      return null;
    }
  }

  async function renderOffreurs(state){
    if(!ratingCard || !offreursList) return;

    if(!id || !k){
      ratingCard.style.display = "none";
      return;
    }

    manualRate.style.display = "none";
    offreursList.textContent = "Chargement…";

    const sel = state && state.SelectedOffreurID ? String(state.SelectedOffreurID).trim() : "";
    const rs = state && state.RatingStatus ? String(state.RatingStatus).trim().toUpperCase() : "";

    if(rs === "LOCKED"){
      offreursList.innerHTML = '<p style="margin:0;color:#333;">Avis déjà envoyé.</p>';
      manualRate.style.display = "none";
      return;
    }

    try{
      const res = await window.DX_API.post("listOffreursForDemande", { demandeId: id, k });
      const list = (res && res.ok) ? (res.data || []) : [];

      if(res && !res.ok){
        offreursList.textContent = res.error || "Impossible de charger la liste.";
        manualRate.style.display = "block";
        return;
      }

      const btnLabel = "Choisir";
      const items = (list || []).map(o => {
        const name = esc(o.publicName || "Prestataire");
        const meta = [o.service, o.zone, o.commune].filter(Boolean).map(esc).join(" • ");
        const chosen = sel && (String(o.id).trim() === sel);
        const badge = chosen ? '<span class="badge" style="margin-left:8px;">Choisi</span>' : '';
        return (
          "<div class=\"card pad\" style=\"padding:12px 14px;margin:0 0 10px;\">" +
            "<div style=\"display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;\">" +
              "<div>" +
                "<div style=\"font-weight:900;\">" + name + badge + "</div>" +
                (meta ? "<div style=\"color:#666;font-size:14px;margin-top:2px;\">" + meta + "</div>" : "") +
                "<div style=\"color:#888;font-size:12px;margin-top:2px;\"><code>" + esc(o.id) + "</code></div>" +
              "</div>" +
              "<button class=\"dxBtn dxBtnPrimary chooseBtn\" data-oid=\"" + esc(o.id) + "\" type=\"button\">" + btnLabel + "</button>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      if(items){
        offreursList.innerHTML =
          "<p style=\"margin:0 0 10px;color:#333;\">Prestataires détectés pour cette demande :</p>" + items;
      }else{
        offreursList.innerHTML =
          "<p style=\"margin:0;color:#333;\">Aucun prestataire détecté pour l’instant.</p>";
      }

      // Enable choose buttons
      Array.from(document.querySelectorAll(".chooseBtn")).forEach(btn => {
        btn.addEventListener("click", async ()=>{
          const oid = String(btn.getAttribute("data-oid")||"").trim();
          if(!oid) return;
          btn.disabled = true;
          try{
            const r = await window.DX_API.postAny(["selectOffreur","chooseOffreur","setSelectedOffreur"], { demandeId: id, k, offreurId: oid });
            if(r && r.ok){
              show("ok","✅ Prestataire choisi.");
              await init();
            }else{
              show("err", (r && r.error) ? r.error : "Impossible de choisir.");
            }
          }catch(e){
            show("err","Erreur réseau.");
          }finally{
            btn.disabled = false;
          }
        });
      });

      manualRate.style.display = "block";

    }catch(e){
      offreursList.textContent = "Erreur réseau.";
      manualRate.style.display = "block";
    }
  }

  async function init(){
    show("", "");
    const state = await loadDemandeOwner();
    if(selectedBox) setSelectedUI(state || {});
    await renderOffreurs(state || {});
  }

  if(withdrawBtn){
    withdrawBtn.addEventListener("click", async ()=>{
      if(!id || !k) return show("err","Clé de retrait manquante. Ouvre ce lien depuis l'email.");
      withdrawBtn.disabled = true;
      try{
        const res = await window.DX_API.postAny(["withdrawDemande"], { id, k });
        if(res && res.ok){
          show("ok","✅ Ta demande a été supprimée.");
          // keep rating available even if removed, but state reload
          await init();
        }else{
          show("err", (res && res.error) ? res.error : "Impossible de supprimer.");
        }
      }catch(e){
        show("err","Erreur réseau.");
      }finally{
        withdrawBtn.disabled = false;
      }
    });
  }

  if(manualRateBtn){
    manualRateBtn.addEventListener("click", async ()=>{
      const oid = String((manualOffreurId && manualOffreurId.value) || "").trim();
      if(!oid) return show("err","Entre un ID de prestataire (off_...).");
      manualRateBtn.disabled = true;
      try{
        const r = await window.DX_API.postAny(["selectOffreur","chooseOffreur","setSelectedOffreur"], { demandeId: id, k, offreurId: oid });
        if(r && r.ok){
          show("ok","✅ Prestataire choisi.");
          await init();
        }else{
          show("err", (r && r.error) ? r.error : "Impossible de choisir.");
        }
      }catch(e){
        show("err","Erreur réseau.");
      }finally{
        manualRateBtn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();