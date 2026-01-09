// api.js - wrapper pour /.netlify/functions/gas (v14)
(() => {
  const ENDPOINT = "/.netlify/functions/gas";

  function getToken(){
    try { return localStorage.getItem("dx_token") || ""; } catch { return ""; }
  }

  async function safeJson(res){
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { ok:false, error:"Réponse non JSON", raw:text }; }
  }

  async function get(action, params = {}) {
    const url = new URL(ENDPOINT, window.location.origin);
    url.searchParams.set("action", action);

    const token = getToken();
    if(token) url.searchParams.set("token", token);

    Object.entries(params).forEach(([k,v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), { method:"GET" });
    return safeJson(res);
  }

  async function post(action, payload = {}) {
    const token = getToken();
    const res = await fetch(ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action, token, ...payload })
    });
    return safeJson(res);
  }

  async function postAny(actions, payload){
    let last = null;
    for (const a of actions){
      const r = await post(a, payload);
      last = r;
      if (r && r.ok) return r;
    }
    return last || { ok:false, error:"Aucune action n’a répondu OK" };
  }

  async function getAny(actions, params){
    let last = null;
    for (const a of actions){
      const r = await get(a, params);
      last = r;
      if (r && r.ok) return r;
    }
    return last || { ok:false, error:"Aucune action n’a répondu OK" };
  }

  window.DX_API = { get, post, postAny, getAny, ENDPOINT };
})();
