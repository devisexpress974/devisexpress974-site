// noter-offreur.js (v14)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("avisForm");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnSend");
  const params = new URLSearchParams(location.search);
  const offreurId = params.get("id") || "";

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }


  // -------- Pièces jointes (max 3) --------
  const ATT_MAX_FILES = 3;
  const ATT_MAX_BYTES = 1500 * 1024; // 1,5 Mo conseillé

  function fileToBase64_(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("Lecture fichier impossible"));
      r.onload = () => {
        const s = String(r.result || "");
        const comma = s.indexOf(",");
        resolve(comma !== -1 ? s.slice(comma+1) : s);
      };
      r.readAsDataURL(file);
    });
  }

  async function readAttachments_(inputEl){
    const files = Array.from((inputEl && inputEl.files) ? inputEl.files : []);
    if(!files.length) return [];
    const kept = files.slice(0, ATT_MAX_FILES);

    for(const f of kept){
      if(ATT_MAX_BYTES && f.size > ATT_MAX_BYTES){
        throw new Error("Fichier trop volumineux (1,5 Mo max conseillé) : " + (f.name || "fichier"));
      }
    }

    const out = [];
    for(const f of kept){
      const dataBase64 = await fileToBase64_(f);
      out.push({ name: f.name, type: f.type || "application/octet-stream", dataBase64 });
    }
    return out;
  }

  if(!offreurId){
    btn.disabled = true;
    return show("err", "ID offreur manquant.");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.style.display = "none";

    const note = Number(document.getElementById("note").value);
    const commentaire = document.getElementById("commentaire").value.trim();
    const auteurNom = document.getElementById("auteurNom").value.trim();

    if(!note || note < 1 || note > 5) return show("err", "Note invalide (1 à 5).");

    // pièces jointes (optionnel)
    let attachments = [];
    try{
      attachments = await readAttachments_(document.getElementById("attachments"));
    }catch(err){
      return show("err", err.message || "Pièces jointes invalides.");
    }


    btn.disabled = true;
    btn.textContent = "Envoi…";
    show("muted", "Enregistrement…");

    const res = await window.DX_API.postAny(["addAvisOffreur","addAvis"], {
      offreurId,
      note,
      commentaire,
      auteurNom,
      attachments
    });

    btn.disabled = false;
    btn.textContent = "Envoyer";

    if(res && res.ok){
      show("ok", "Merci ! Avis enregistré.");
      form.reset();
      return;
    }
    show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Erreur.");
  });
});
