(function(){
  function qs(name){
    try{ return (new URL(location.href)).searchParams.get(name) || ""; }catch(e){ return ""; }
  }

  const offreurId = (qs("oid") || qs("id") || "").trim();
  const demandeId = (qs("did") || qs("demandeId") || "").trim();
  const k = (qs("k") || qs("key") || "").trim();

  const box = document.getElementById("offreurBox");
  const errBox = document.getElementById("errBox");
  const form = document.getElementById("formAvis");

  const stars = Array.from(document.querySelectorAll(".star"));
  const noteInput = document.getElementById("note");
  const noteTxt = document.getElementById("noteTxt");

  const auteurNom = document.getElementById("auteurNom");
  const auteurEmail = document.getElementById("auteurEmail");
  const commentaire = document.getElementById("commentaire");
  const btnSend = document.getElementById("btnSend");

  let currentNote = 0;

  function esc(s){
    return String(s||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function show(type, text){
    if(!errBox) return;
    errBox.style.display = "block";
    errBox.className = "alert " + (type === "ok" ? "success" : "danger");
    errBox.textContent = text;
  }

  function authOk(){
    return !!(demandeId && k);
  }

  function setNote(n){
    currentNote = n;
    if(noteInput) noteInput.value = String(n);
    if(noteTxt) noteTxt.textContent = n ? (n + "/5") : "";
    stars.forEach(st => {
      const v = Number(st.getAttribute("data-val")||0);
      st.classList.toggle("on", v <= n);
      st.setAttribute("aria-pressed", v <= n ? "true" : "false");
    });
  }

  function lockForm(lock){
    if(btnSend) btnSend.disabled = lock;
    if(auteurNom) auteurNom.disabled = lock;
    if(auteurEmail) auteurEmail.disabled = lock;
    if(commentaire) commentaire.disabled = lock;
    stars.forEach(st => st.classList.toggle("disabled", lock));
  }

  function wireStars(){
    stars.forEach(st => {
      st.addEventListener("click", ()=>{
        if(st.classList.contains("disabled")) return;
        const v = Number(st.getAttribute("data-val")||0);
        if(!v) return;
        setNote(v);
      });
    });
  }

  async function loadOffreur(){
    if(!offreurId){
      box.textContent = "ID prestataire manquant.";
      lockForm(true);
      return;
    }

    try{
      const res = await window.DX_API.getAny([
        "getOffreurPublic",
        "getOffreurProfile",
        "getOffreur"
      ], { id: offreurId });

      const o = (res && res.ok) ? (res.data || res.offreur || res.item || null) : null;
      if(!o){
        box.textContent = (res && res.error) ? res.error : "Prestataire introuvable.";
        return;
      }

      const name = esc(o.Pseudo||o.Nom||"Prestataire");
      const meta = [o.Service, o.Zone, o.Commune].filter(Boolean).map(esc).join(" • ");
      const noteM = (o.NoteMoyenne!=null && o.NoteMoyenne!=="") ? esc(o.NoteMoyenne) : "—";
      const nb = (o.NombreAvis!=null && o.NombreAvis!=="") ? esc(o.NombreAvis) : "0";

      box.innerHTML =
        "<div style=\"font-weight:1000;font-size:20px;\">" + name + "</div>" +
        (meta ? "<div style=\"color:#666;margin-top:2px;\">" + meta + "</div>" : "") +
        "<div style=\"margin-top:8px;color:#333;\">⭐ " + noteM + " / 5 (" + nb + ")</div>";

    }catch(e){
      box.textContent = "Erreur réseau.";
    }
  }

  async function submit(e){
    e.preventDefault();

    if(!authOk()){
      return show("err","Pour noter, ouvre le lien depuis ton email (gérer ma demande). Sans ce lien, la note est refusée.");
    }

    const nom = String((auteurNom && auteurNom.value) || "").trim();
    const email = String((auteurEmail && auteurEmail.value) || "").trim();
    const com = String((commentaire && commentaire.value) || "").trim();

    if(!currentNote) return show("err","Choisis une note (1 à 5)." );
    if(!nom) return show("err","Ton nom est obligatoire." );
    if(com.length < 5) return show("err","Écris un avis (au moins 5 caractères)." );

    lockForm(true);

    try{
      const res = await window.DX_API.postAny([
        "addAvisFromDemande",
        "addAvisDemandeur",
        "addAvisOffreur"
      ], {
        demandeId,
        k,
        offreurId,
        note: currentNote,
        commentaire: com,
        auteurNom: nom,
        auteurEmail: email
      });

      if(res && res.ok){
        show("ok","✅ Merci ! Ton avis a été enregistré et verrouillé.");
      }else{
        show("err", (res && res.error) ? res.error : "Impossible d'envoyer l'avis.");
        lockForm(false);
      }

    }catch(err){
      show("err","Erreur réseau.");
      lockForm(false);
    }
  }

  document.addEventListener("DOMContentLoaded", async ()=>{
    wireStars();
    setNote(0);
    await loadOffreur();

    if(!authOk()){
      show("err","Pour noter, ouvre le lien reçu par email (gérer ma demande). Sans ce lien, la note est refusée.");
      lockForm(true);
    }

    if(form) form.addEventListener("submit", submit);
  });
})();
