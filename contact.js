// contact.js (v1) - Formulaire Contact (DX28)
(() => {
  function $(id){ return document.getElementById(id); }

  function setStatus(text, isError){
    const el = $("contactStatus");
    if(!el) return;
    el.textContent = text || "";
    el.style.color = isError ? "var(--brand)" : "";
  }

  function disableForm(disabled){
    const btn = $("cSendBtn");
    if(btn) btn.disabled = !!disabled;
  }

  function val(){
    return {
      role: ($("cRole")?.value || "").trim(),
      sujet: ($("cSujet")?.value || "").trim(),
      nom: ($("cNom")?.value || "").trim(),
      email: ($("cEmail")?.value || "").trim(),
      tel: ($("cTel")?.value || "").trim(),
      message: ($("cMessage")?.value || "").trim(),
      page: window.location.href,
      userAgent: navigator.userAgent || ""
    };
  }

  function isEmail(s){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||""));
  }

  async function submit(e){
    e.preventDefault();
    setStatus("");

    const p = val();
    if(!p.role || !p.sujet || !p.nom || !p.email || !p.message){
      setStatus("Merci de remplir tous les champs requis.", true);
      return;
    }
    if(!isEmail(p.email)){
      setStatus("Email invalide.", true);
      return;
    }

    if(!window.DX_API || !window.DX_API.postAny){
      setStatus("API indisponible. Vérifie que api.js est chargé.", true);
      return;
    }

    disableForm(true);
    setStatus("Envoi en cours…");

    try{
      const res = await window.DX_API.postAny(
        ["addContactMessage", "addContact"],
        p
      );

      if(res && res.ok){
        ["cRole","cSujet","cNom","cEmail","cTel","cMessage"].forEach(id => {
          const el = $(id);
          if(el) el.value = "";
        });
        setStatus("Message envoyé. Merci !");
      }else{
        setStatus((res && res.error) ? res.error : "Erreur lors de l’envoi.", true);
      }
    }catch(err){
      setStatus("Erreur réseau : " + String(err && err.message ? err.message : err), true);
    }finally{
      disableForm(false);
    }
  }

  function init(){
    const form = $("contactForm");
    if(form) form.addEventListener("submit", submit);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
