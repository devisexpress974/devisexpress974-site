// offreur-notifications.js (Patch11)
(async () => {
  const msg = document.getElementById("msg");
  const chk = document.getElementById("chkNotif");
  const statusTxt = document.getElementById("statusTxt");
  const btnSave = document.getElementById("btnSave");

  function show(text, danger){
    if(!msg) return;
    msg.style.display = "block";
    msg.classList.toggle("danger", !!danger);
    msg.textContent = text || "";
  }

  function hide(){
    if(!msg) return;
    msg.style.display = "none";
    msg.textContent = "";
    msg.classList.remove("danger");
  }

  // Auth
  const token = (window.DX_AUTH && DX_AUTH.getToken) ? DX_AUTH.getToken() : "";
  if(!token){
    const next = encodeURIComponent("offreur-notifications.html");
    location.href = "offreur-login.html?next=" + next;
    return;
  }

  // Load prefs
  hide();
  statusTxt.textContent = "Chargement…";
  const r = await window.DX_API.getAny(["getOffreurPrefs"], {});
  if(!r || !r.ok){
    show((r && r.error) ? r.error : "Erreur chargement préférences", true);
    statusTxt.textContent = "—";
    return;
  }

  const enabled = !!(r.prefs && r.prefs.notifEmail);
  chk.checked = enabled;
  statusTxt.textContent = enabled ? "Actuellement : activé" : "Actuellement : désactivé";

  btnSave.addEventListener("click", async () => {
    hide();
    btnSave.disabled = true;
    btnSave.textContent = "Enregistrement…";
    try{
      const want = !!chk.checked;
      const r2 = await window.DX_API.postAny(["setOffreurPrefs"], { payload: { notifEmail: want ? "OUI" : "NON" } });
      if(!r2 || !r2.ok){
        show((r2 && r2.error) ? r2.error : "Erreur enregistrement", true);
        return;
      }
      statusTxt.textContent = (r2.notifEmail === "NON") ? "Actuellement : désactivé" : "Actuellement : activé";
      show("OK — préférence enregistrée.");
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Enregistrer";
    }
  });
})();
