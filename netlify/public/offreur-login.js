// offreur-login.js (PATCH2 - next redirect)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  const btn = document.getElementById("btnLogin");

  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "mur-demandes.html";

  function show(type, text) {
    if (!msg) return;
    msg.style.display = "block";
    msg.className = "notice " + (type || "");
    msg.textContent = text || "";
  }

  if (!form || !btn) {
    show("err", "Erreur : formulaire de connexion introuvable.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.style.display = "none";

    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("password");

    const email = (emailEl?.value || "").trim();
    const password = passEl?.value || "";

    if (!email || !password) return show("err", "Email et mot de passe obligatoires.");

    btn.disabled = true;
    btn.textContent = "Connexion…";
    show("muted", "Connexion en cours…");

    try {
      const res = await window.DX_AUTH.login(email, password);

      btn.disabled = false;
      btn.textContent = "Se connecter";

      if (res && res.ok) {
        show("ok", "Connecté. Redirection…");
        setTimeout(() => (location.href = next), 400);
        return;
      }
      show(
        "err",
        res && (res.error || res.message) ? (res.error || res.message) : "Connexion impossible."
      );
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Se connecter";
      show("err", err?.message || String(err));
    }
  });
});
