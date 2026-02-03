README_PATCH6 — Services JSON + zones/communes (sans casser)

BUT
- Avoir EXACTEMENT la même liste de métiers sur : demande.html ET offreur-register.html
- Garder la compatibilité avec ton backend actuel (colonne "Service" => on envoie le LABEL)
- Filtrer la liste des communes quand on choisit une zone (Nord/Sud/Est/Ouest)

CONTENU DU PATCH
1) services_devisexpress974.json         (à la RACINE)
2) services_devisexpress974.js          (à la RACINE)  => fallback pour tests en file://
3) assets/js/dx-services.js             (nouveau)      => remplit les <select> automatiquement

INSTALLATION (3 MIN)
A) Copie/colle ces 3 fichiers dans ton projet :

- services_devisexpress974.json   -> D:\DX28_RECLONE\devisexpress974-site\
- services_devisexpress974.js     -> D:\DX28_RECLONE\devisexpress974-site\
- dx-services.js                  -> D:\DX28_RECLONE\devisexpress974-site\assets\js\

B) Dans demande.html  (dans <head>), ajoute UNE ligne :
<script defer src="./services_devisexpress974.js?v=1"></script>
<script defer src="./assets/js/dx-services.js?v=1"></script>

C) Dans offreur-register.html (dans <head>), ajoute LES MÊMES 2 lignes :
<script defer src="./services_devisexpress974.js?v=1"></script>
<script defer src="./assets/js/dx-services.js?v=1"></script>

IMPORTANT
- Tu n'as PAS besoin de supprimer les <option> existantes : dx-services.js les remplace.
- Ça marche aussi en local (file://) grâce à services_devisexpress974.js

TEST RAPIDE
1) Ouvre demande.html -> la liste des services doit être classée par catégories.
2) Change la zone -> la liste des communes se filtre.
3) Pareil sur offreur-register.html

COMMIT (Git summary)
Patch6: services list JSON + zone/commune filter
