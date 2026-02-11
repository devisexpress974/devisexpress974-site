# DevisExpress974 – Checklist déploiement (V4)

## 1) GitHub
- Commit + push du dossier `devisexpress974-site/`

## 2) Google Apps Script
- Remplacer intégralement `Code.gs` par `apps-script/Code.gs` de ce projet
- Déployer en **Application web**
  - Exécuter en tant que : **Moi**
  - Accès : **Tout le monde**
- Copier l’URL **/exec**

## 3) Netlify
- Ajouter variable d’environnement :
  - `GAS_URL` = URL /exec
- Puis : **Clear cache and deploy**

## 4) Tests rapides
- Accueil : header OK
- Offreur login : connexion OK
- Badge connecté + Mon compte + Déconnexion OK
- Mur des demandes : chargement OK
- Déposer une demande : envoi OK
