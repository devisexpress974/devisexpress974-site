DevisExpress974 — Patch Backend (Code.gs) — Patch2

Contenu:
- Code.gs (à remplacer dans Google Apps Script)

Points clés:
- doGet passe e.parameter (support GET token/id)
- routes: whoami, listDemandesForOffreur, getDemande, grantAccess, activatePack, activateAbonnement, confirmResetOffreur
- matching strict service + geo (mur & emails)
- pack credits (10) + décrément à chaque déblocage
- abonnement: 1 mois offert + anti-abus email/tel + trialEnd + J-5 warning (cronTrials_ optionnel)
- coordonnées visibles uniquement si accès (getDemande)
- audit Notifications dans l’onglet "Notifications"

Installation:
1) Apps Script > Code.gs > Ctrl+A > coller Code.gs
2) Déployer > Gérer les déploiements > Web app > Mettre à jour
3) Tester: action=ping / whoami / listDemandesForOffreur
