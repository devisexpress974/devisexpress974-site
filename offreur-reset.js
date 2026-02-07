// offreur-reset.js (v15) — demande de lien + confirmation token
document.addEventListener("DOMContentLoaded", () => {
  const formReq = document.getElementById("resetRequestForm");
  const formConf = document.getElementById("resetConfirmForm");
  const msg = document.getElementById("msg");

  const emailEl = document.getElementById("email");
  const tokenEl = document.getElementById("token");
  const pass1El = document.getElementById("password");
  const pass2El = document.getElementById("password2");

  const btnReq = document.getElementById("btnReset");
  const btnConf = document.getElementById("btnConfirm");

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text || "";
  }
  function hide(){
    msg.style.display = "none";
    msg.textContent = "";
  }

  function setMode(mode){
    // mode: "request" | "confirm"
    if(mode === "confirm"){
      formReq.style.display = "none";
      formConf.style.display = "block";
    } else {
      formReq.style.display = "block";
      formConf.style.display = "none";
    }
  }

  const qs = new URLSearchParams(location.search || "");
  const tokenFromUrl = (qs.get("token") || qs.get("resetToken") || "").trim();

  if(tokenFromUrl){
    setMode("confirm");
    tokenEl.value = tokenFromUrl;
    show("muted", "Choisis un nouveau mot de passe.");
  } else {
    setMode("request");
  }

  // 1) Demande de lien
  if(formReq){
    formReq.addEventListener("submit", async (e) => {
      e.preventDefault();
      hide();

      const email = String(emailEl.value || "").trim().toLowerCase();
      if(!email){
        show("err", "Email manquant.");
        return;
      }

      btnReq.disabled = true;
      const oldTxt = btnReq.textContent;
      btnReq.textContent = "Envoi…";

      try{
        const res = await window.DX_AUTH.requestReset(email);
        // Réponse neutre : ne pas révéler si le compte existe.
        if(res && res.ok){
          show("ok", "Si un compte existe, un email de réinitialisation a été envoyé.");
        } else {
          show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Erreur.");
        }
      }catch(err){
        show("err", "Erreur réseau. Réessaie.");
      }finally{
        btnReq.disabled = false;
        btnReq.textContent = oldTxt;
      }
    });
  }

  // 2) Confirmation (token)
  if(formConf){
    formConf.addEventListener("submit", async (e) => {
      e.preventDefault();
      hide();

      const token = String(tokenEl.value || "").trim();
      const p1 = String(pass1El.value || "");
      const p2 = String(pass2El.value || "");

      if(!token){
        show("err", "Code / Token manquant.");
        return;
      }
      if(!p1 || p1.length < 8){
        show("err", "Mot de passe : 8 caractères minimum.");
        return;
      }
      if(p1 !== p2){
        show("err", "Les mots de passe ne correspondent pas.");
        return;
      }

      btnConf.disabled = true;
      const oldTxt = btnConf.textContent;
      btnConf.textContent = "Mise à jour…";

      try{
        const res = await window.DX_AUTH.confirmReset(token, p1);
        if(res && res.ok){
          show("ok", "Mot de passe mis à jour. Redirection…");
          setTimeout(() => { location.href = "offreur-login.html"; }, 900);
          return;
        }
        show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Erreur.");
      }catch(err){
        show("err", "Erreur réseau. Réessaie.");
      }finally{
        btnConf.disabled = false;
        btnConf.textContent = oldTxt;
      }
    });
  }
});
