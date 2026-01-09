// offreur-register.js (v14)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnReg");

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }

  function cleanPhone(p){
    return (p||"").toString().replace(/[^\d+]/g,"").trim();
  }
  function isEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||"");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.style.display = "none";

    const payload = {
      nom: document.getElementById("nom").value.trim(),
      email: document.getElementById("email").value.trim(),
      tel: cleanPhone(document.getElementById("tel").value),
      password: document.getElementById("password").value,
      service: document.getElementById("service").value,
      zone: document.getElementById("zone").value,
      commune: document.getElementById("commune").value,
      description: document.getElementById("description").value.trim()
    };

    if(!payload.nom || !payload.email || !payload.tel || !payload.password || !payload.service || !payload.zone || !payload.commune || !payload.description){
      return show("err", "Merci de remplir tous les champs obligatoires (*).");
    }
    if(!isEmail(payload.email)) return show("err", "Email invalide.");
    if(payload.password.length < 8) return show("err", "Mot de passe : 8 caractères minimum.");

    btn.disabled = true;
    btn.textContent = "Création…";
    show("muted", "Création du compte…");

    const res = await window.DX_AUTH.register(payload);

    btn.disabled = false;
    btn.textContent = "Créer mon compte";

    if(res && res.ok){
      show("ok", "Compte créé. Redirection…");
      setTimeout(()=> location.href = "mur-demandes.html", 500);
      return;
    }
    show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Inscription impossible.");
  });
});
