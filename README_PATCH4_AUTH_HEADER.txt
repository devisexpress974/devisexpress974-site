README_PATCH4_AUTH_HEADER.txt

But : afficher automatiquement le bon état "S'identifier" / "Mon compte" / "Déconnexion" dans le header (desktop + mobile),
en fonction de la connexion de l’offreur.

✅ Fichiers fournis (à copier à la racine du site, en gardant les mêmes chemins) :
- partials/header.html
- assets/css/dx-header.css
- assets/js/dx-include-header.js
- auth.js

✅ Étapes (zéro casse) :
1) Ferme tes pages du site ouvertes dans le navigateur (important).
2) Copie/colle ces fichiers dans TON dossier devisexpress974-site en remplaçant les existants.
3) Recharge une page (Ctrl+F5) :
   - si tu n’es PAS connecté : tu dois voir "S'identifier"
   - si tu es connecté : tu dois voir "Mon compte" + "Déconnexion" + ton petit badge (nom)
4) Test rapide :
   - clique Déconnexion -> retour index.html + bouton "S'identifier" revient.

Notes :
- Ça ne change PAS ton backend, juste l’UX du header.
- Si une page n’inclut pas auth.js, elle restera en mode "S'identifier" (normal).
