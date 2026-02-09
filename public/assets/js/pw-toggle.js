// pw-toggle.js — bouton œil pour afficher/masquer les mots de passe
document.addEventListener("DOMContentLoaded", () => {
  const toggles = document.querySelectorAll(".pwToggle[data-target]");
  toggles.forEach(btn => {
    const sel = btn.getAttribute("data-target");
    const input = document.querySelector(sel);
    if(!input) return;

    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      btn.title = show ? "Masquer le mot de passe" : "Afficher le mot de passe";
    });
  });
});
