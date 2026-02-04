README_PATCH13 — DevisExpress974 (Patch 13)
=====================================

Objectif:
- Page "Mon abonnement" (statut plan + crédits + arrêt abonnement plateforme)
- Backend: actions getMyPlan / cancelAbonnement
- Cron essais: activer un déclencheur pour cronTrials_ (alerte J-5 + désactivation après fin essai si non payé)

1) Côté PC (site)
-----------------
Copie/colle ces fichiers à la racine du site (même endroit que index.html):
- offreur-abonnement.html
- offreur-abonnement.js

2) Côté Apps Script (backend)
-----------------------------
Dans Apps Script > Code.gs :
- Ctrl+A
- Colle le Code.gs du patch (remplacement complet)
- Enregistre
- Redeploy (New version)

3) IMPORTANT: activer le "Cron" essais (sinon pas d'alerte J-5)
---------------------------------------------------------------
Dans Apps Script:
- Barre gauche: clique sur l’icône "Déclencheurs" (clock)
- Ajouter un déclencheur
  - Fonction: cronTrials_
  - Source d’événement: Time-driven
  - Type: Day timer
  - Heure: 03:00 à 04:00 (ou n’importe quelle heure)
- Enregistrer

4) Test
-------
- Connecte-toi comme offreur
- Ouvre: /offreur-abonnement.html
- Vérifie Plan + Crédits
- Clique "Arrêter l’abonnement" -> doit couper AboActive=NON, Plan=FREE
