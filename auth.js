// auth.js (v14) - Auth offreur complet (Apps Script)
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
    const logoutMobileBtn = document.getElementById("logoutMobileBtn");
    // desktop elements may exist on all pages, mobile ones are optional
    if(!loginCta || !logoutBtn || !headerRight) return;

    const token = getToken();
    if(!token){
      loginCta.style.display = "";
      logoutBtn.style.display = "none";
      if(loginCtaMobile) loginCtaMobile.style.display = "";
      if(logoutMobileBtn) logoutMobileBtn.style.display = "none";
      return;
    }

    // try whoami
    const me = await whoami();
    if(me && me.ok && me.user){
      loginCta.style.display = "none";
      logoutBtn.style.display = "";
      if(loginCtaMobile) loginCtaMobile.style.display = "none";
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
        pill.querySelector("span:last-child").textContent = (me.user.nom||"Offreur");
      }
    } else {
      // token invalide
      clearToken();
      loginCta.style.display = "";
      logoutBtn.style.display = "none";
      if(loginCtaMobile) loginCtaMobile.style.display = "";
      if(logoutMobileBtn) logoutMobileBtn.style.display = "none";
      const pill = document.getElementById("userPill");
      if(pill) pill.remove();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn){
      logoutBtn.addEventListener("click", async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "Déconnexion…";
        try { await logout(); } finally {
          location.href = "index.html";
        }
      });
    }
    refreshHeader();
  });

  window.DX_AUTH = { login, register, requestReset, logout, whoami, getToken };
})();
