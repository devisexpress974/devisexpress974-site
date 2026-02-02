// paypal-config.js — DevisExpress974
// Configuration centralisée des liens PayPal pour les 3 offres offreur.
// NOTE : Avec PayPal, tu ne peux pas masquer PayPal à 100% (c'est la plateforme de paiement).
// Les liens ci-dessous ouvrent la page PayPal qui propose souvent un paiement par carte (selon pays/compte PayPal).

window.DX_PAYPAL = {
  // 0,99€ — 1 demande
  ponctuel: {
    label: "Ponctuel",
    priceText: "0,99 €",
    ncpLinksId: "4LRS689BCXY5G",
    directLink: "https://www.paypal.com/ncp/payment/4LRS689BCXY5G"
  },

  // 2,99€ — 10 demandes
  pack10: {
    label: "Pack 10 demandes",
    priceText: "2,99 €",
    ncpLinksId: "H9VZ7RL35LE6G",
    directLink: "https://www.paypal.com/ncp/payment/H9VZ7RL35LE6G"
  },

  // 4,99€/mois — abonnement (1er mois offert)
  abonnement: {
    label: "Abonnement",
    priceText: "4,99 €/mois",
    subscribeUrl: "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-059089791K4448340NEBEK7I"
  }
};

// Helper: récupère un lien PayPal selon le type d'offre
window.DX_PAYPAL.getLink = function(kind){
  kind = (kind||"").toString().toLowerCase().trim();
  if(kind === "ponctuel" || kind === "one" || kind === "single" || kind === "0.99"){
    return (window.DX_PAYPAL.ponctuel && window.DX_PAYPAL.ponctuel.directLink) ? window.DX_PAYPAL.ponctuel.directLink : "";
  }
  if(kind === "pack" || kind === "pack10" || kind === "10" || kind === "2.99"){
    return (window.DX_PAYPAL.pack10 && window.DX_PAYPAL.pack10.directLink) ? window.DX_PAYPAL.pack10.directLink : "";
  }
  if(kind === "abonnement" || kind === "abo" || kind === "subscription"){
    return (window.DX_PAYPAL.abonnement && window.DX_PAYPAL.abonnement.subscribeUrl) ? window.DX_PAYPAL.abonnement.subscribeUrl : "";
  }
  return "";
};
