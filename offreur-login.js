// offreur-login.js (v14)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnLogin");

  function show(type, text){
    msg.style.display = "block";
    msg.className = "notice " + (type||"");
    msg.textContent = text;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.style.display = "none";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if(!email || !password) return show("err", "Email et mot de passe obligatoires.");

    btn.disabled = true;
    btn.textContent = "Connexion…";
    show("muted", "Connexion en cours…");

    const res = await window.DX_AUTH.login(email, password);

    btn.disabled = false;
    btn.textContent = "Se connecter";

    if(res && res.ok){
      show("ok", "Connecté. Redirection…");
      setTimeout(()=> location.href = "mur-demandes.html", 400);
      return;
    }
    show("err", (res && (res.error||res.message)) ? (res.error||res.message) : "Connexion impossible.");
  });
});
