// offreur-unsubscribe.js (Patch11)
(async () => {
  const params = new URLSearchParams(location.search);
  const email = (params.get("email") || "").trim().toLowerCase();
  const sig = (params.get("sig") || "").trim();

  const emailTxt = document.getElementById("emailTxt");
  const msg = document.getElementById("msg");
  const btnUnsub = document.getElementById("btnUnsub");
  const btnResub = document.getElementById("btnResub");

  function show(text, danger){
    msg.style.display = "block";
    msg.classList.toggle("danger", !!danger);
    msg.textContent = text;
  }

  if(!email || !sig){
    emailTxt.textContent = "Lien incomplet.";
    show("Lien invalide. Connecte-toi et utilise Mon compte → Notifications.", true);
    btnUnsub.disabled = true;
    btnResub.disabled = true;
    return;
  }

  emailTxt.textContent = "Email : " + email;

  async function call(action){
    const r = await window.DX_API.getAny([action], { email, sig });
    if(!r || !r.ok){
      show((r && r.error) ? r.error : "Erreur", true);
      return null;
    }
    show("OK — " + (r.notifEmail === "NON" ? "désinscrit" : "réactivé") + ".", false);
    return r;
  }

  btnUnsub.addEventListener("click", async () => {
    btnUnsub.disabled = true;
    btnUnsub.textContent = "Traitement…";
    try{ await call("unsubscribeEmail"); }
    finally{ btnUnsub.disabled = false; btnUnsub.textContent = "Me désinscrire"; }
  });

  btnResub.addEventListener("click", async () => {
    btnResub.disabled = true;
    btnResub.textContent = "Traitement…";
    try{ await call("resubscribeEmail"); }
    finally{ btnResub.disabled = false; btnResub.textContent = "Réactiver"; }
  });
})();
