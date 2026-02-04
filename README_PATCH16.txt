README_PATCH16 — DevisExpress974 (Patch 16)
=====================================

Objectif:
- Cycle de vie demandes:
  1) Ajout des colonnes: ExpireAt / WithdrawToken / WithdrawAt / ExpiredAt / ClosedAt
  2) Lien "Retirer ma demande" (token) envoyé au demandeur
  3) Cron quotidien qui passe automatiquement les demandes en EXPIRÉ après 30 jours
  4) Le mur public n’affiche plus les demandes expirées/fermées (filtre backend)

FICHIERS (site)
---------------
- retirer-demande.html (racine)
- assets/js/retirer-demande.js

BACKEND (Apps Script)
---------------------
- Code.gs (remplacement complet)
  - Ajout route: withdrawDemande
  - Ajout cronDemandes_ + wrapper cronDemandes()
  - Ajout ExpireAt + token retrait dans addDemande_
  - Mail confirmation: bouton "Retirer ma demande"

ACTIVER LE CRON (à faire quand tu veux)
---------------------------------------
Apps Script > Déclencheurs (horloge) > Ajouter un déclencheur:
- Fonction: cronDemandes
- Source: Déclencheur horaire
- Type: Quotidien
- Heure: au choix

TEST
----
1) Publier une demande (demande.html)
2) Vérifier dans le Sheet "Demandes": ExpireAt + WithdrawToken remplis
3) Dans l'email demandeur: bouton "Retirer ma demande"
4) Cliquer le bouton -> la demande passe en Status = RETIRÉ

Git Summary conseillé:
Patch16: cycle vie demandes (retrait + expiration)
