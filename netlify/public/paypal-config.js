// paypal-config.js — DevisExpress974
// Configuration centralisée des liens PayPal pour les 3 offres offreur.
// Objectif UX : PayPal sert d'encaissement (paiement carte possible selon contexte PayPal).
// IMPORTANT : Ce fichier doit être chargé AVANT les pages paiement (ponctuel/pack/abonnement).

(() => {
  "use strict";

  // 1) Configuration (source de vérité)
  const CONFIG = {
    // 0,99€ — 1 demande
    ponctuel: {
      label: "Ponctuel",
      priceText: "0,99 €",
      ncpLinksId: "4LRS689BCXY5G",
      directLink: "https://www.paypal.com/ncp/payment/4LRS689BCXY5G",
    },

    // 2,99€ — 10 demandes
    pack10: {
      label: "Pack 10 demandes",
      priceText: "2,99 €",
      ncpLinksId: "H9VZ7RL35LE6G",
      directLink: "https://www.paypal.com/ncp/payment/H9VZ7RL35LE6G",
    },

    // 4,99€/mois — abonnement (1er mois offert)
    abonnement: {
      label: "Abonnement",
      priceText: "4,99 €/mois",
      subscribeUrl:
        "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-059089791K4448340NEBEK7I",
    },
  };

  // 2) Expose en global (sans casser si déjà défini)
  //    - On fusionne (Object.assign) pour éviter d'écraser si tu ajoutes plus tard d'autres champs.
  window.DX_PAYPAL = window.DX_PAYPAL || {};
  Object.assign(window.DX_PAYPAL, CONFIG);

  // 3) Normalisation des alias → clé canonique
  const ALIAS = {
    // ponctuel
    "ponctuel": "ponctuel",
    "one": "ponctuel",
    "single": "ponctuel",
    "0.99": "ponctuel",
    "0,99": "ponctuel",
    "099": "ponctuel",

    // pack
    "pack": "pack10",
    "pack10": "pack10",
    "10": "pack10",
    "2.99": "pack10",
    "2,99": "pack10",
    "299": "pack10",

    // abonnement
    "abonnement": "abonnement",
    "abo": "abonnement",
    "subscription": "abonnement",
    "sub": "abonnement",
    "4.99": "abonnement",
    "4,99": "abonnement",
    "499": "abonnement",
  };

  function normalizeKind(kind) {
    return (kind || "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "");
  }

  // 4) Helper principal : récupère le lien PayPal selon le type d'offre
  //    - "ponctuel" → directLink (NCP payment)
  //    - "pack" / "pack10" → directLink (NCP payment)
  //    - "abonnement" / "abo" → subscribeUrl (Billing plan)
  if (typeof window.DX_PAYPAL.getLink !== "function") {
    window.DX_PAYPAL.getLink = function (kind) {
      const k = normalizeKind(kind);
      const key = ALIAS[k] || k;

      const cfg = window.DX_PAYPAL[key];
      if (!cfg) return "";

      // directLink prioritaire (ponctuel/pack)
      if (cfg.directLink) return cfg.directLink;

      // abonnement
      if (cfg.subscribeUrl) return cfg.subscribeUrl;

      return "";
    };
  }

  // (Optionnel) Helper : récupère la config complète d'une offre (utile si tu veux afficher label/prix)
  if (typeof window.DX_PAYPAL.getOffer !== "function") {
    window.DX_PAYPAL.getOffer = function (kind) {
      const k = normalizeKind(kind);
      const key = ALIAS[k] || k;
      return window.DX_PAYPAL[key] || null;
    };
  }
})();
