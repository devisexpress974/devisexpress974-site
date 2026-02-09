DX28_PRO — DevisExpress974 (ZIP complet)

Ce ZIP contient une version "PRO" fusionnée et corrigée, optimisée mobile-first :
- Base UI/UX : DX28_RECLONE 5 (mur des demandes v100, header riche, filtres, pagination)
- Correctifs fonctionnels : DX28_RECLONE_CED1 (Apps Script complet + paypal-cancel + actions paiement/contact)
- Correctifs inclus :
  - Liens Confidentialité corrigés (politique-confidentialite.html)
  - paypal-cancel.html ajouté
  - _redirects fusionné (routes propres)
  - Validation description : min 50 caractères (front + backend)
  - Pièces jointes : 5 Mo max / fichier (aligné front + backend)
  - Petits ajustements mobile (tap targets + iOS input zoom)

DÉPLOIEMENT (rapide)
1) Héberge le dossier sur Netlify (site statique) :
   - Tu peux pousser sur GitHub puis connecter Netlify, ou importer le dossier.
2) Variables Netlify :
   - GAS_URL : URL de ton Web App Google Apps Script (déployée en "Web app")
3) Google Apps Script :
   - Ouvre /apps-script/Code.gs dans Apps Script
   - Déploie en "Web app" (exécuter en tant que toi, accès : tout le monde)
4) PayPal :
   - Renseigne tes liens/IDs PayPal (dans Code.gs si nécessaire selon ta config)
   - Vérifie les routes /paypal-return et /paypal-cancel

CHECKLIST AVANT LANCEMENT
- Tester : publier une demande + voir dans le mur (public) + dépliage
- Créer compte offreur + login + profil
- Débloquer une demande via paiement (return/cancel)
- Vérifier contact, pages légales, menu mobile

Bon build !
