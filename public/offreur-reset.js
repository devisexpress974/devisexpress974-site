// offreur-reset.js (v15) — demande de lien + confirmation token


function dxPwRules_(pw){
  pw = String(pw||"");
  return {
    len: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw)
  };
}
function dxPwIsStrong_(pw){
  const r = dxPwRules_(pw);
  return r.len && r.lower && r.upper && r.digit && r.symbol;
}
function dxPwUpdateUI_(){
  const inp = document.getElementById("password");
  const ul = document.getElementById("pwRules");
  if(!inp || !ul) return;
  const r = dxPwRules_(inp.value);
  ul.querySelectorAll("li[data-rule]").forEach(li=>{
    const k = li.getAttribute("data-rule");
    const ok = !!r[k];
    li.classList.toggle("ok", ok);
    const baseText = li.textContent.replace(/^✅\s+|^❌\s+/,"");
    li.textContent = (ok ? "✅ " : "❌ ") + baseText;
  });
}
function dxInitPwToggles_(){
  document.querySelectorAll(".pwToggle[data-target]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-target");
      const inp = document.getElementById(id);
      if(!inp) return;
      const isPw = inp.type === "password";
      inp.type = isPw ? "text" : "password";
      btn.textContent = isPw ? "🙈" : "👁";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  dxInitPwToggles_();
  dxPwUpdateUI_();
  const pw1 = document.getElementById("password");
  if(pw1){ pw1.addEventListener("input", dxPwUpdateUI_); }

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
      if(!p1 || !dxPwIsStrong_(p1)){
        show("err", "Mot de passe : 8+ caractères avec minuscule, majuscule, chiffre et symbole.");
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
