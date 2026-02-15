/* DevisExpress974 — demande-detail.js (Patch24)
   Objectif :
   - Afficher une demande (public) et masquer les coordonnées
   - Si prestataire connecté : appeler getDemande et afficher coordonnées si CanSeeContact == true
   - Proposer les liens de paiement pour débloquer (sans casser l'existant)
*/
(function () {
  "use strict";

  function qs() { return new URLSearchParams(window.location.search || ""); }
  function el(id) { return document.getElementById(id); }

  function showAlert(msg) {
    var box = el("topAlert");
    if (!box) return;
    box.textContent = msg || "";
    box.style.display = msg ? "block" : "none";
  }

  function getTokenGuess_() {
    try {
      if (window.DX_AUTH) {
        if (typeof DX_AUTH.getToken === "function") return DX_AUTH.getToken();
        if (typeof DX_AUTH.token === "function") return DX_AUTH.token();
        if (typeof DX_AUTH.getSession === "function") {
          var s = DX_AUTH.getSession();
          if (typeof s === "string") return s;
          if (s && typeof s.token === "string") return s.token;
        }
      }
      return (
        localStorage.getItem("dx_token") ||
        localStorage.getItem("dx_session") ||
        localStorage.getItem("sessionToken") ||
        ""
      );
    } catch (e) {
      return "";
    }
  }

  async function apiCall(action, payload) {
    payload = payload || {};
    // Priorité à DX_API si présent
    try {
      if (window.DX_API && typeof DX_API.call === "function") {
        return await DX_API.call(action, payload);
      }
    } catch (e) { /* fallback */ }

    // Fallback Netlify function
    var url = "/.netlify/functions/gas?action=" + encodeURIComponent(action);
    var res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  
function fmtDate(v) {
  if (!v) return "—";
  try {
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    var abs = d.toLocaleString("fr-FR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    var ms = Date.now() - d.getTime();
    var rel = "";
    if (isFinite(ms)) {
      var s = Math.floor(ms/1000);
      if (s < 10) rel = "à l’instant";
      else if (s < 60) rel = "il y a " + s + " s";
      else {
        var mn = Math.floor(s/60);
        if (mn < 60) rel = "il y a " + mn + " min";
        else {
          var h = Math.floor(mn/60);
          if (h < 48) rel = "il y a " + h + " h";
          else {
            var j = Math.floor(h/24);
            if (j < 14) rel = "il y a " + j + " j";
            else rel = "";
          }
        }
      }
    }
    return rel ? (abs + " • " + rel) : abs;
  } catch (e) {
    return String(v);
  }
}

function addOneMonthStr(v){
  try{
    var d = new Date(v);
    if(isNaN(d.getTime())) return "—";
    d.setMonth(d.getMonth()+1);
    return d.toLocaleString("fr-FR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch(e){ return "—"; }
}

function statusLabel(v){
  var s = String(v||"").trim().toUpperCase();
  if(!s) s = "PUBLIÉ";
  if(s==="PUBLIE" || s==="PUBLIÉ") return "Publié";
  if(s==="EN_COURS" || s==="EN COURS") return "En cours";
  if(s==="CLOTURE" || s==="CLOTUREE" || s==="CLOTURÉ" || s==="CLOTURÉE") return "Clôturée";
  if(s==="EXPIRE" || s==="EXPIREE" || s==="EXPIRÉ" || s==="EXPIRÉE") return "Expirée";
  if(s==="SUPPRIME" || s==="SUPPRIMÉ") return "Supprimée";
  return s.charAt(0)+s.slice(1).toLowerCase();
}

function setText(id, v) {
    var node = el(id);
    if (node) node.textContent = (v === undefined || v === null || v === "") ? "—" : String(v);
  }

  function setLoginUI(isLogged) {
    var dot = el("dotLogin"), txt = el("txtLogin");
    if (dot) {
      dot.classList.remove("ok", "warn", "off");
      dot.classList.add(isLogged ? "ok" : "off");
    }
    if (txt) txt.textContent = isLogged ? "Connecté" : "Non connecté";

    var loginBox = el("loginBox");
    if (loginBox) loginBox.style.display = isLogged ? "none" : "block";
  }

  function setAccessUI(canSee, isLogged, reason, planData) {
    var dot = el("dotAccess"), txt = el("txtAccess");
    if (dot) {
      dot.classList.remove("ok", "warn", "off");
      if (canSee) dot.classList.add("ok");
      else if (reason && reason !== "PAY_REQUIRED") dot.classList.add("warn");
      else dot.classList.add("off");
    }

    // Texte état
    var label = canSee ? "Coordonnées visibles" : "Coordonnées masquées";
    if (!canSee && reason === "NOT_MATCH_SERVICE") label = "Hors métier";
    if (!canSee && reason === "DEMANDE_INACTIVE") label = "Demande expirée/clôturée";
    if (!canSee && reason === "ABO_INACTIVE") label = "Abonnement inactif";
    if (txt) txt.textContent = label;

    var masked = el("coordsMasked");
    var coords = el("coordsBox");
    if (masked) masked.style.display = canSee ? "none" : "block";
    if (coords) coords.style.display = canSee ? "block" : "none";
// Options de déblocage (si paiement requis)
var unlock = el("unlockOptions");
if (unlock){
  if(!canSee){
    unlock.style.display = "block";
    var did = encodeURIComponent(String(demandeId||id||""));
    unlock.innerHTML = ""
      + "<h3 style=\"margin:0 0 8px;\">Débloquer les coordonnées</h3>"
      + "<p style=\"margin:0 0 10px;color:#555\">Choisis une option :</p>"
      + "<div style=\"display:flex;gap:10px;flex-wrap:wrap\">"
      + "<a class=\"dxBtn dxBtnPrimary\" href=\"./paiement-ponctuel.html?demandeId=" + did + "\">Déblocage ponctuel</a>"
      + "<a class=\"dxBtn dxBtnGhost\" href=\"./paiement-pack.html\">Pack 10 crédits</a>"
      + "<a class=\"dxBtn dxBtnGhost\" href=\"./paiement-abonnement.html\">Abonnement</a>"
      + "</div>"
      + "<p style=\"margin:10px 0 0;color:#666\">Déjà inscrit ? <a href=\"./offreur-login.html\">Se connecter</a></p>";
  } else {
    unlock.style.display = "none";
  }
}


    // Paiement : uniquement si connecté + demande active + pas hors métier
    var payBox = el("payBox");
    if (payBox) {
      var showPay = (!canSee) && !!isLogged && reason !== "NOT_MATCH_SERVICE" && reason !== "DEMANDE_INACTIVE";
      payBox.style.display = showPay ? "block" : "none";
    }

    // Message en haut (optionnel)
    if (!canSee) {
      if (reason === "NOT_MATCH_SERVICE") {
        showAlert("Cette demande ne correspond pas à ton métier : tu ne peux pas débloquer ses coordonnées.");
      } else if (reason === "DEMANDE_INACTIVE") {
        showAlert("Cette demande est expirée ou clôturée : les coordonnées ne sont plus accessibles.");
      } else if (reason === "ABO_INACTIVE") {
        showAlert("Ton abonnement n’est pas actif (essai terminé ou non payé). Tu peux activer l’abonnement ou débloquer au coup par coup.");
      } else if (!isLogged) {
        showAlert("");
      } else {
        showAlert("");
      }
    } else {
      showAlert("");
    }

    // Ajuste les libellés des boutons selon plan/crédits
    try {
      var b1 = el("btnPay1"), bp = el("btnPayPack"), ba = el("btnPayAbo");
      if (planData && planData.plan) {
        var p = String(planData.plan || "").toUpperCase();
        var credits = Number(planData.credits || 0) || 0;

        if (p === "ABO" && planData.aboActive === true) {
          // Normalement coords visibles, mais on ne force rien ici
        }

        // Optionnel : petit indice via titre
        if (bp) bp.textContent = "Pack 10 (2,99€)";
        if (b1) b1.textContent = "Débloquer 0,99€";
        if (ba) ba.textContent = "Abonnement (4,99€)";

        // Si l'utilisateur a des crédits, le pack est moins pertinent, mais on le laisse visible.
        // Si hors métier / expirée, le payBox est déjà caché.
        if (credits > 0 && b1) b1.textContent = "Débloquer (1 crédit / 0,99€)";
      }
    } catch (e) {}
  }

  function setLinks(demandeId) {
    var back = "demande-detail.html?id=" + encodeURIComponent(demandeId);

    var l1 = el("btnPay1");
    var lp = el("btnPayPack");
    var la = el("btnPayAbo");
    // On passe plusieurs noms de params pour compatibilité.
    if (l1) l1.href = "./paiement-ponctuel.html?demandeId=" + encodeURIComponent(demandeId) + "&return=" + encodeURIComponent(back);
    if (lp) lp.href = "./paiement-pack.html?demandeId=" + encodeURIComponent(demandeId) + "&return=" + encodeURIComponent(back);
    if (la) la.href = "./paiement-abonnement.html?demandeId=" + encodeURIComponent(demandeId) + "&return=" + encodeURIComponent(back);

    var login = el("btnLogin");
    if (login) login.href = "./offreur-login.html?redirect=" + encodeURIComponent(back);
  }

  function renderAttachments(att) {
    var box = el("attachBox");
    var list = el("attachList");
    if (!box || !list) return;

    list.innerHTML = "";
    if (!att) {
      box.style.display = "none";
      return;
    }

    // att peut être string (JSON), array, ou texte
    var arr = null;
    try {
      if (Array.isArray(att)) arr = att;
      else if (typeof att === "string" && att.trim().charAt(0) === "[") arr = JSON.parse(att);
    } catch (e) {}

    if (!arr || !arr.length) {
      box.style.display = "none";
      return;
    }

    arr.forEach(function (it, i) {
      var li = document.createElement("li");
      li.className = "alert";
      var name = (it && (it.name || it.filename)) ? (it.name || it.filename) : ("Pièce " + (i + 1));
      var url = it && (it.url || it.link);
      if (url) {
        li.innerHTML = '<a class="btn btnSmall btnGhost" target="_blank" rel="noopener" href="' + String(url) + '">Ouvrir</a> ' +
                       '<span style="margin-left:10px; font-weight:900;">' + name + '</span>';
      } else {
        li.innerHTML = '<span style="font-weight:900;">' + name + "</span>";
      }
      list.appendChild(li);
    });

    box.style.display = "block";

// AUTO_SCROLL_UNLOCK_FROM_EMAIL : si le lien vient d'un email (&unlock=1), on descend directement
try{
  var u = qs().get("unlock");
  if(u === "1" || String(u).toLowerCase() === "true"){
    var target = el("unlockOptions") || el("payBox") || el("coordsBox");
    if(target && target.scrollIntoView){
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}catch(e){}
  }

  async function main() {
    showAlert("");

    var p = qs();
    var demandeId = p.get("id") || p.get("demandeId") || p.get("demande") || "";
    if (!demandeId) {
      showAlert("Erreur : ID de demande manquant dans l’URL (ex: demande-detail.html?id=... ).");
      return;
    }

    setLinks(demandeId);

    var token = getTokenGuess_();
    var isLogged = !!token;
    setLoginUI(isLogged);

    // 1) Public : on récupère toujours un minimum (service, commune, description...)
    var pub = await apiCall("getDemandePublic", { demandeId: demandeId });
    if (!pub || pub.ok !== true) {
      showAlert((pub && pub.error) ? pub.error : "Impossible de charger la demande.");
      return;
    }

    var base = pub.data || pub.demande || pub.item || {};
    setText("vService", base.ServiceLabel || base.Service || base.ServiceId || "—");
    setText("vZone", base.Zone || "—");
    setText("vCommune", base.Commune || "—");
    setText("vBudget", base.Budget ? (String(base.Budget) + " €") : "—");
    var created = base.CreatedAt || base.createdAt || base.Date || base.date || base.Timestamp || base.timestamp;
    setText("vDate", fmtDate(created));
    // statut + expiration (1 mois par défaut)
    setText("vStatus", statusLabel(base.Status || base.status));
    setText("vExpire", base.ExpiresAt || base.expiresAt ? fmtDate(base.ExpiresAt || base.expiresAt) : addOneMonthStr(created));
    setText("vDesc", base.Description || base.Besoin || base.Texte || "—");

    // 2) Si connecté : on tente la version privée (qui met CanSeeContact)
    if (isLogged) {
      var priv = await apiCall("getDemande", { token: token, demandeId: demandeId });
      if (priv && priv.ok === true) {
        var d = priv.data || priv.demande || priv.item || {};
        var canSee = !!(d.CanSeeContact || d.canSeeContact || d.canSee);
        var reason = (d.AccessReason || d.accessReason || "");

        // Récupère plan/crédits (utile pour l’UX si coordonnées masquées)
        var planData = null;
        try {
          var mp = await apiCall("getMyPlan", { token: token });
          if (mp && mp.ok === true) {
            var md = mp.data || mp.me || mp.user || {};
            planData = {
              plan: md.plan || md.Plan || "",
              credits: md.credits || md.Credits || 0,
              aboActive: (String(md.aboActive || md.AboActive || "NON").toUpperCase() === "OUI"),
              trialUsed: (String(md.trialUsed || md.TrialUsed || "NON").toUpperCase() === "OUI"),
              trialEnd: md.trialEnd || md.TrialEnd || ""
            };
          }
        } catch (e) {}

        setAccessUI(canSee, true, reason, planData);

        if (canSee) {
          setText("vTel", d.Tel || d.tel || d.Telephone || d.telephone || "—");
          setText("vEmail", d.Email || d.email || "—");
          renderAttachments(d.Attachments || d.attachments || d.Photos || d.photos || d.Pieces || d.Files || null);
        } else {
          renderAttachments(null);
        }
      } else {
        // Token invalide → on repasse en mode non connecté
        setLoginUI(false);
        setAccessUI(false, false, "NOT_LOGGED", null);
      }
    } else {
      setAccessUI(false, false, "NOT_LOGGED", null);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    main().catch(function (e) {
      showAlert("Erreur inattendue : " + (e && e.message ? e.message : String(e)));
    });
  });
})();
