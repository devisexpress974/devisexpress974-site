/**
 * PayPal config centralisée (DevisExpress974)
 * Objectif: 3 offres (0,99 / 2,99 / abonnement) et des boutons "Payer" côté site.
 *
 * IMPORTANT:
 * - Si tu veux que les clients puissent payer par CARTE SANS compte PayPal,
 *   ce n'est pas garanti avec les "PayPal Payment Links" (/ncp/...). Selon les comptes/pays,
 *   PayPal peut forcer la connexion.
 * - L'abonnement via "billing plan" (subscribe?plan_id=...) exige souvent un compte PayPal.
 *   Pour un abonnement 100% CB, il faudra Stripe (ou une intégration PayPal avancée).
 */
window.PAYPAL_CONFIG = {
  // 0,99€ (déblocage 1 demande)
  ponctuel: {
    label: "0,99 €",
    ncpLinksId: "4LRS689BCXY5G",
    // Page PayPal hébergée
    ncpPaymentUrl: "https://www.paypal.com/ncp/payment/4LRS689BCXY5G",
    // Lien de secours (si bloqueur empêche les scripts)
    directLink: "https://www.paypal.com/ncp/payment/4LRS689BCXY5G",
  },

  // 2,99€ (pack 10 demandes)
  // 👉 Tu dois coller ici TON lien PayPal 2,99€ (ex: https://www.paypal.com/ncp/payment/XXXX ou paypal.me/...)
  pack10: {
    label: "2,99 €",
    directLink: "",
  },

  // 4,99€/mois (1er mois offert) — abonnement PayPal plan
  abonnement: {
    label: "4,99 €/mois",
    subscribeUrl: "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-059089791K4448340NEBEK7I",
    directLink: "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-059089791K4448340NEBEK7I",
  },
};
