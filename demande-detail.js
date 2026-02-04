/* DevisExpress974 — demande-detail.js (Patch10)
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
    // Si c'est déjà une string, on laisse.
    try {
      var d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleString("fr-FR");
    } catch (e) {
      return String(v);
    }
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

  function setAccessUI(canSee) {
    var dot = el("dotAccess"), txt = el("txtAccess");
    if (dot) {
      dot.classList.remove("ok", "warn", "off");
      dot.classList.add(canSee ? "ok" : "off");
    }
    if (txt) txt.textContent = canSee ? "Coordonnées visibles" : "Coordonnées masquées";

    var masked = el("coordsMasked");
    var coords = el("coordsBox");
    if (masked) masked.style.display = canSee ? "none" : "block";
    if (coords) coords.style.display = canSee ? "block" : "none";

    var payBox = el("payBox");
    if (payBox) payBox.style.display = canSee ? "none" : "block";
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
    setText("vDate", fmtDate(base.CreatedAt || base.Date || base.Timestamp));
    setText("vDesc", base.Description || base.Besoin || base.Texte || "—");

    // 2) Si connecté : on tente la version privée (qui met CanSeeContact)
    if (isLogged) {
      var priv = await apiCall("getDemande", { token: token, demandeId: demandeId });
      if (priv && priv.ok === true) {
        var d = priv.data || priv.demande || priv.item || {};
        var canSee = !!d.CanSeeContact;

        setAccessUI(canSee);

        if (canSee) {
          setText("vTel", d.Tel || d.Telephone || "—");
          setText("vEmail", d.Email || "—");
          renderAttachments(d.Attachments || d.Pieces || d.Files || null);
        } else {
          renderAttachments(null);
        }
      } else {
        // Token invalide → on repasse en mode non connecté
        setLoginUI(false);
        setAccessUI(false);
      }
    } else {
      setAccessUI(false);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    main().catch(function (e) {
      showAlert("Erreur inattendue : " + (e && e.message ? e.message : String(e)));
    });
  });
})();
