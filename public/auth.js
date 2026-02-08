// auth.js (v15) - Auth offreur complet (Apps Script)
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

  async function confirmReset(token, password){
    return window.DX_API.postAny(["confirmResetOffreur","confirmReset"], { token, password });
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

  function setLoggedOut(){
    loginCta.style.display = "";
    logoutBtn.style.display = "none";
    if(accountLink) accountLink.style.display = "none";
    if(loginCtaMobile) loginCtaMobile.style.display = "";
    if(accountLinkMobile) accountLinkMobile.style.display = "none";
    if(logoutMobileBtn) logoutMobileBtn.style.display = "none";
    removePill();
  }

  function setLoggedIn(displayName){
    loginCta.style.display = "none";
    logoutBtn.style.display = "";
    if(accountLink) accountLink.style.display = "";
    if(loginCtaMobile) loginCtaMobile.style.display = "none";
    if(accountLinkMobile) accountLinkMobile.style.display = "";
    if(logoutMobileBtn) logoutMobileBtn.style.display = "";

    // add small pill (once)
    const name = (displayName || "Offreur");
    if(!document.getElementById("userPill")){
      const pill = document.createElement("div");
      pill.className = "userPill";
      pill.id = "userPill";
      pill.innerHTML = `<span class="userDot"></span><span></span>`;
      pill.querySelector("span:last-child").textContent = name;
      headerRight.prepend(pill);
    } else {
      const pill = document.getElementById("userPill");
      const label = pill.querySelector("span:last-child");
      if(label) label.textContent = name;
    }
  }

  const token = getToken();
  if(!token){
    setLoggedOut();
    return;
  }

  // try whoami
  const me = await whoami();
  if(me && me.ok && me.user){
    setLoggedIn(me.user.nom || me.user.name || "Offreur");
  } else {
    // token invalide
    clearToken();
    setLoggedOut();
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

  window.DX_AUTH = { login, register, requestReset, confirmReset, logout, whoami, getToken, refreshHeader, initHeader };
})();
