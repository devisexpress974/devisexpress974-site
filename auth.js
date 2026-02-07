// auth.js (v16) - Auth offreur complet (Apps Script)
(() => {
  function setToken(token){
    try { localStorage.setItem("dx_token", token || ""); } catch {}
  }
  function getToken(){
    try { return localStorage.getItem("dx_token") || ""; } catch { return ""; }
  }
  function clearToken(){
    try { localStorage.removeItem("dx_token"); } catch {}
  }

  async function whoami(){
    const token = getToken();
    if(!token) return { ok:false };
    const res = await window.DX_API.getAny(["whoami","me"], {});
    return res;
  }

  async function login(email, password){
    const res = await window.DX_API.postAny(["loginOffreur","login"], { email, password });
    if(res && res.ok && res.token){
      setToken(res.token);
    }
    return res;
  }

  async function register(payload){
    const res = await window.DX_API.postAny(["registerOffreur","createOffreur"], { payload });
    if(res && res.ok && res.token){
      setToken(res.token);
    }
    return res;
  }

  async function requestReset(email){
    return window.DX_API.postAny(["resetOffreur","requestResetOffreur"], { email });
  }

  async function logout(){
    const res = await window.DX_API.postAny(["logout","logoutOffreur"], {});
    clearToken();
    return res;
  }
async function refreshHeader(){
  const loginCta = document.getElementById("loginCta");
  const logoutBtn = document.getElementById("logoutBtn");
  const headerRight = document.getElementById("headerRight");
  const loginCtaMobile = document.getElementById("loginCtaMobile");
  const accountLink = document.getElementById("accountLink");
  const accountLinkMobile = document.getElementById("accountLinkMobile");
  const logoutMobileBtn = document.getElementById("logoutMobileBtn");

  // desktop elements may exist on all pages, mobile ones are optional
  if(!loginCta || !logoutBtn || !headerRight) return;

  function removePill(){
    const pill = document.getElementById("userPill");
    if(pill) pill.remove();
  }

  function setLoggedOutUI(){
    loginCta.style.display = "";
    logoutBtn.style.display = "none";
    if(accountLink) accountLink.style.display = "none";
    if(loginCtaMobile) loginCtaMobile.style.display = "";
    if(accountLinkMobile) accountLinkMobile.style.display = "none";
    if(logoutMobileBtn) logoutMobileBtn.style.display = "none";
    removePill();
  }

  function setLoggedInUI(me){
    loginCta.style.display = "none";
    logoutBtn.style.display = "";
    if(accountLink) accountLink.style.display = "";
    if(loginCtaMobile) loginCtaMobile.style.display = "none";
    if(accountLinkMobile) accountLinkMobile.style.display = "";
    if(logoutMobileBtn) logoutMobileBtn.style.display = "";

    // add small pill (once)
    if(!document.getElementById("userPill")){
      const pill = document.createElement("div");
      pill.className = "userPill";
      pill.id = "userPill";
      pill.innerHTML = `<span class="userDot"></span><span>${(me.user.nom||"Offreur")}</span>`;
      headerRight.prepend(pill);
    } else {
      const pill = document.getElementById("userPill");
      const nameEl = pill.querySelector("span:last-child");
      if(nameEl) nameEl.textContent = (me.user.nom||"Offreur");
    }
  }

  const token = getToken();
  if(!token){
    setLoggedOutUI();
    return;
  }

  // try whoami
  const me = await whoami();
  if(me && me.ok && me.user){
    setLoggedInUI(me);
  } else {
    // token invalide
    clearToken();
    setLoggedOutUI();
  }
}

  function bindLogoutButtons(){
    const btns = [
      document.getElementById("logoutBtn"),
      document.getElementById("logoutMobileBtn"),
    ].filter(Boolean);

    btns.forEach((btn) => {
      if(btn.dataset.dxBound === "1") return;
      btn.dataset.dxBound = "1";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const old = btn.textContent;
        btn.textContent = "Déconnexion…";
        try { await logout(); } finally {
          location.href = "index.html";
        }
      });
    });
  }

  async function initHeader(){
    // called after header injection too
    bindLogoutButtons();
    await refreshHeader();
  }

document.addEventListener("DOMContentLoaded", () => {
    initHeader();
  });

  window.DX_AUTH = { login, register, requestReset, logout, whoami, getToken, refreshHeader, initHeader };
})();
