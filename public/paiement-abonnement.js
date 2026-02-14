// paiement-abonnement.js — Patch 57
// Page de paiement abonnement (4,99€) + auto-confirmation via PayPal (tx)

(function(){
  function $(id){ return document.getElementById(id); }
  function setMsg(t){ var el=$("msg"); if(el) el.textContent = t || ""; }
  function qs(){ return new URLSearchParams(window.location.search); }
  function safeDecode(s){ try{return decodeURIComponent(s);}catch(e){return s;} }

  function rememberContext(demandeId){
    try{
      localStorage.setItem("dx_last_payment", JSON.stringify({
        type:"abonnement",
        id: demandeId || "",
        ts: Date.now()
      }));
    }catch(e){}
  }

  async function callConfirm(payload){
    const resp = await fetch("/.netlify/functions/paypal-confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await resp.json().catch(() => ({}));
  }

  function isLogged(){
    return !!(localStorage.getItem("dx_token") || localStorage.getItem("DX_TOKEN"));
  }

  function redirectToLogin(){
    var next = "paiement-abonnement.html" + (window.location.search || "");
    window.location.href = "offreur-login.html?next=" + encodeURIComponent(next);
  }

  function setPayLinks(demandeId){
    var link = "";
    try{
      if(window.DX_PAYPAL && typeof window.DX_PAYPAL.getLink === "function"){
        link = String(window.DX_PAYPAL.getLink("abonnement") || "");
      }
    }catch(e){ link = ""; }

    var btnPay = $("btnPay");
    var paypalLink = $("paypalLink");
    var missing = $("ppMissing");

    if(link){
      if(btnPay){
        btnPay.href = link;
        btnPay.addEventListener("click", function(){ rememberContext(demandeId); });
      }
      if(paypalLink){
        paypalLink.href = link;
        paypalLink.addEventListener("click", function(){ rememberContext(demandeId); });
      }
      if(missing) missing.style.display = "none";
    }else{
      if(missing) missing.style.display = "block";
      if(btnPay) btnPay.style.display = "none";
      if(paypalLink) paypalLink.style.display = "none";
    }
  }

  async function confirm(tx, subId, demandeId, next){
    var token = String(localStorage.getItem("dx_token") || localStorage.getItem("DX_TOKEN") || "").trim();
    if(!token){
      redirectToLogin();
      return;
    }
    var sid = String(subId || "").trim();
    var t = String(tx || "").trim();

    if(!sid && t){
      // Certains retours PayPal mettent l'ID d'abonnement dans "tx" : on accepte si ça ressemble à I-XXXX
      if(/^I-[A-Z0-9]+$/i.test(t)) sid = t;
    }

    if(!sid){
      setMsg("subscription_id manquant (abonnement).");
      return;
    }

    setMsg("Confirmation PayPal en cours…");
    var res = await callConfirm({ token: token, product: "abonnement", subscription_id: sid });

    if(!res || !res.ok){
      setMsg((res && (res.error || res.message)) ? (res.error || res.message) : "Confirmation impossible.");
      return;
    }

    // Redirection
    if(demandeId){
      window.location.href = "demande-detail.html?id=" + encodeURIComponent(demandeId) + "&abo=1";
      return;
    }
    if(next){
      next = safeDecode(next);
      if(/^[a-z0-9\-_/]+\.html(\?.*)?$/i.test(next)){
        window.location.href = next + (next.indexOf("?")>=0 ? "&" : "?") + "abo=1";
        return;
      }
    }
    window.location.href = "offreur-abonnement.html?abo=1";
  }

  document.addEventListener("DOMContentLoaded", function(){
    if(!isLogged()){
      redirectToLogin();
      return;
    }

    var p = qs();
    var demandeId = String(p.get("id") || p.get("demandeId") || "").trim();
    var tx = String(p.get("tx") || p.get("txn_id") || "").trim();
    var subId = String(p.get("subscription_id") || p.get("sub_id") || p.get("subscriptionId") || "").trim();
    var next = String(p.get("next") || "").trim();

    setPayLinks(demandeId);

    var btnPaid = $("btnPaid");
    if(btnPaid){
      btnPaid.addEventListener("click", async function(){
        try{
          var t = tx;
          if(!t){
            t = String(prompt("Colle ici le 'tx' (Transaction ID) PayPal :", "") || "").trim();
          }
          if(!t) return;
          await confirm(t, subId, demandeId, next);
        }catch(err){
          setMsg(err && err.message ? err.message : "Erreur.");
        }
      });
    }

    // Auto-confirm si tx dans l'URL
    if(subId || tx){
      setTimeout(function(){
        confirm(tx, subId, demandeId, next).catch(function(e){
          setMsg(e && e.message ? e.message : "Erreur.");
        });
      }, 250);
    }else{
      setMsg("1) Clique sur PayPal pour payer, 2) reviens ici : la confirmation se fait automatiquement.");
    }
  });
})();