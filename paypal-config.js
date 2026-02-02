/* paypal-config.js
   Centralise les liens PayPal (DevisExpress974)
   - ponctuel: 0,99€ (débloque 1 demande)
   - pack: 2,99€ (10 demandes)
   - abonnement: 1er mois offert puis 4,99€/mois
*/
(function(){
  var PAYPAL = {
    currency: 'EUR',

    // 0,99€
    ponctuel: {
      label: 'Ponctuel 0,99€',
      ncpLink: 'https://www.paypal.com/ncp/links/4LRS689BCXY5G',
      hostedButtonId: '',
      directLink: ''
    },

    // 2,99€ (Pack 10 demandes)
    // NOTE: ici on utilise un Hosted Button PayPal (ID connu) => lien direct webscr
    pack: {
      label: 'Pack 10 demandes 2,99€',
      ncpLink: '',
      hostedButtonId: 'H9VZ7RL35LE6G',
      directLink: ''
    },

    // 4,99€/mois (abonnement)
    abonnement: {
      label: 'Abonnement 4,99€/mois',
      // lien de souscription PayPal (plan)
      ncpLink: 'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-059089791K4448340NEBEK7I',
      hostedButtonId: '',
      directLink: ''
    }
  };

  // Calcule un lien payable “direct” quand on n'a qu'un hostedButtonId
  function buildLink(plan){
    if(!plan) return '';
    if(plan.directLink) return plan.directLink;
    if(plan.ncpLink) return plan.ncpLink;
    if(plan.hostedButtonId){
      return 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=' + encodeURIComponent(plan.hostedButtonId);
    }
    return '';
  }

  PAYPAL.getLink = function(key){
    try{ return buildLink(PAYPAL[key]); }catch(e){ return ''; }
  };

  // Expose
  window.DX_PAYPAL = PAYPAL;
})();
