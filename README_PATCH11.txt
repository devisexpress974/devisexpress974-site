README_PATCH11 — Notifications + lien de désinscription (signed)

Objectif:
- Permettre à un offreur de couper/réactiver les emails de nouvelles demandes.
- Ajouter un lien de désinscription dans les emails (fonctionne même sans login).
- Tout reste compatible avec l'existant, sans casser.

Fichiers dans ce patch:
- offreur-notifications.html
- offreur-notifications.js
- offreur-unsubscribe.html
- offreur-unsubscribe.js
- Code.gs

INSTALLATION (PC):
1) Copie/colle ces 4 fichiers à la racine du site:
   - offreur-notifications.html
   - offreur-notifications.js
   - offreur-unsubscribe.html
   - offreur-unsubscribe.js

NOTE: ils doivent être dans le même dossier que index.html (racine).

INSTALLATION (Apps Script):
1) Ouvre Apps Script
2) Ouvre Code.gs
3) Ctrl+A puis colle le Code.gs du patch (remplacement complet)
4) Enregistre
5) Redeploy (nouvelle version)

CONFIG RECOMMANDEE (Apps Script Script Properties):
- UNSUB_SECRET : une chaîne secrète (au hasard), ex: dx_unsub_2026_xxxxxxxxx
  -> sert à signer les liens de désinscription.

TESTS:
- Connecte-toi puis ouvre /offreur-notifications.html pour activer/couper.
- Clique sur un lien "Se désinscrire" depuis un email (redirige sur offreur-unsubscribe.html).

GIT Summary (suggestion):
Patch11: unsubscribe link + notification preferences
