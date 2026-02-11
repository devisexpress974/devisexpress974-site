DEVIS_EXPRESS974 — V5 PRODUCTION (clé en main)

Objectif
- Version unique, propre, déployable.
- Front statique Netlify + API Google Apps Script (Sheets).
- Paiements : sécurisés côté serveur (Netlify) via secret DX_SECRET (obligatoire pour actions sensibles).

Déploiement (ordre strict)
1) GitHub
   - Commit + Push ce dossier.
2) Apps Script
   - Remplace apps-script/Code.gs (fichier complet).
   - Project Settings -> Script properties :
     - DX_SECRET = (une longue valeur au hasard)
   - Deploy as Web App (Execute as: Me, Access: Anyone) -> copie l'URL /exec
3) Netlify
   - Env vars :
     - GAS_URL = https://script.google.com/macros/s/XXXX/exec
     - DX_SECRET = (la même valeur que dans Apps Script)
     - (optionnel prod PayPal) PAYPAL_CLIENT_ID, PAYPAL_SECRET
     - (optionnel) PAYPAL_BASE = https://api-m.paypal.com  (ou sandbox: https://api-m.sandbox.paypal.com)
   - Trigger deploy -> Clear cache and deploy
4) Tests rapides
   - Mur des demandes: affiche + filtre
   - Login offreur
   - Paiement pages: aucun 404, aucun message "manquant" si PayPal configuré

Notes sécurité
- Sans DX_SECRET, les actions sensibles sont refusées (anti-fraude).
- gas.js applique un rate-limit basique + CORS same-origin.

