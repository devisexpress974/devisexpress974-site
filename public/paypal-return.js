// paypal-return.js — Patch 57
// Page de retour PayPal : redirige vers la bonne page de confirmation selon le dernier contexte enregistré.

(function(){
  function $(id){ return document.getElementById(id); }
  function setMsg(t){
    var el = $("msg");
    if(el) el.textContent = t || "";
  }

  function getParam(name){
    var p = new URLSearchParams(window.location.search);
    return String(p.get(name) || "");
  }

  document.addEventListener("DOMContentLoaded", function(){
    var tx = getParam("tx") || getParam("txn_id");
    var st = getParam("st");

    if(!tx){
      setMsg("Transaction manquante (tx). Tu peux retourner au mur.");
      return;
    }

    var ctx = null;
    try{
      ctx = JSON.parse(localStorage.getItem("dx_last_payment") || "null");
    }catch(e){ ctx = null; }

    var type = ctx && ctx.type ? String(ctx.type) : "";
    var id = ctx && ctx.id ? String(ctx.id) : "";

    // Nettoie le contexte après lecture (évite des redirections surprenantes)
    try{ localStorage.removeItem("dx_last_payment"); }catch(e){}

    var target = "mur-demandes.html";
    if(type === "ponctuel"){
      if(id){
        target = "paiement-ponctuel.html?id=" + encodeURIComponent(id) + "&tx=" + encodeURIComponent(tx);
      }else{
        target = "paiement-ponctuel.html?tx=" + encodeURIComponent(tx);
      }
    }else if(type === "pack"){
      target = "paiement-pack.html?tx=" + encodeURIComponent(tx);
    }else if(type === "abonnement"){
      target = "paiement-abonnement.html" + (id ? ("?id=" + encodeURIComponent(id) + "&tx=" + encodeURIComponent(tx)) : ("?tx=" + encodeURIComponent(tx)));
    }else{
      // fallback : si st est "Completed", on renvoie au mur (le mur affichera la situation)
      target = "mur-demandes.html?paid=1";
    }

    setMsg("Paiement reçu. Redirection…");
    setTimeout(function(){
      window.location.href = target;
    }, 450);
  });
})();