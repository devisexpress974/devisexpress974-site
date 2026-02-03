README_PATCH7.txt

But du Patch7
- Assurer que demande.html et offreur-register.html chargent bien api.js + auth.js + main.js (nécessaire pour le header auth/login/logout et les helpers).
- Uniformiser les cache-busters (?v=34) pour éviter les vieux fichiers en cache.

Fichiers inclus
- demande.html
- offreur-register.html

Installation
1) Dézippe.
2) Copie/colle ces 2 fichiers à la racine du site :
   D:\DX28_RECLONE\devisexpress974-site\
3) Quand Windows demande : Remplacer les fichiers (Oui).

Test rapide (local)
- Ouvre demande.html et offreur-register.html : le header doit s’afficher normalement.
- Si tu es connecté (token existant), le bouton doit passer en "Mon compte" / "Se déconnecter" selon ton header.

Commit Git (suggestion)
Summary: Patch7: ensure auth deps on forms + cache bust
Description (optionnel): Add api/auth/main to demande + align versions on demande/offreur-register
