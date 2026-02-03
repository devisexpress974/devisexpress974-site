PATCH 3 — Espace Offreur : Profil + Statut + Logout (SAFE)

Objectif :
- Ajouter une page “Mon profil offreur” (sans casser le reste)
- Permettre la MAJ du profil côté Sheet (Offreurs)
- Compatibilité UI : whoami/me renvoie aussi user{...}

===== 1) SITE (Netlify / ton dossier devisexpress974-site) =====
Ajoute ces 2 fichiers à la racine :
- offreur-profil.html
- offreur-profil.js

+ Vérifie que ce fichier existe bien dans le même dossier :
- services_devisexpress974.json  (à la racine aussi)

Test local / Netlify :
- Ouvre offreur-profil.html
- Si pas connecté => redirection offreur-login.html?next=offreur-profil.html
- Enregistre => OK + mise à jour Sheet

===== 2) APPS SCRIPT (Google Apps Script) =====
Remplacer ton Code.gs par le Code.gs fourni ici.
⚠️ Important : copie-colle TOUT le fichier (pas de patch partiel) pour éviter les erreurs de ligne.

Après collage :
- Enregistrer
- Déployer > Gérer les déploiements > Mettre à jour (si nécessaire)
- Tester dans le navigateur : /?action=getOffreurProfile&token=...

===== 3) COMMIT (si tu commits) =====
Summary conseillé :
Patch3: Add offreur profile page + backend profile routes

