DEVIS EXPRESS 974 — VERSION "PERFECT" (fusion ASSUMED + DX28)

Objectif :
- Base front ASSUMED (UI + structure)
- Nettoyage + cohérence header (état connecté / déconnexion / profil)
- UX login: oeil mot de passe déjà intégré
- Ajout styles pill utilisateur
- Pages légales homogénéisées (header partout)
- Code Apps Script repris de DX28 (équilibré)

Déploiement rapide :
1) Netlify
   - Publish directory: public
   - Functions directory: netlify/functions
2) Variables d'environnement recommandées (Netlify > Site settings > Environment variables)
   - GAS_URL = URL de ton WebApp Apps Script (/exec)
3) Apps Script
   - Déployer en tant que WebApp (exécuter en: moi, accès: tout le monde)
   - Copier l'URL /exec et la mettre dans GAS_URL

Tests à faire (checklist) :
- Accueil: aperçu mur charge
- Offreur login: connexion OK, header affiche le pill + Mon compte + Déconnexion
- Logout: token supprimé, retour accueil
- Mur: action "débloquer contact" (si dispo) -> demande login si pas connecté
