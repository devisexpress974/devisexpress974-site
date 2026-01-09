// offreur-reset.js (v14)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetForm");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnReset");

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.style.display = "none";

    const email = document.getElementById("email").value.trim();
    if(!email) return show("err", "Email obligatoire.");

    btn.disabled = true;
    btn.textContent = "Envoi…";
    show("muted", "Envoi en cours…");

    const res = await window.DX_AUTH.requestReset(email);

    btn.disabled = false;
    btn.textContent = "Envoyer";

    if(res && res.ok){
      show("ok", "Email envoyé (si le compte existe).");
      return;
    }
    show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Erreur.");
  });
});
