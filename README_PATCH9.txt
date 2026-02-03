README_PATCH9.txt

But Patch9
- Validation "pro" du formulaire demande :
  - Tel OU Email (au moins 1)
  - Tel 974 (0262/0692/0693 ou +262…)
  - Email format
  - Description >= 100 caractères + compteur
  - Démarchage pro (oui/non)
  - Acceptation CGV obligatoire
  - Pièces jointes : jpg/png/pdf, max 3, 1,5 Mo max
  - Soft flags : mots inadaptés / incohérence service-texte (warning + flag côté Sheet)
- Backend (Code.gs) applique les mêmes règles (non contournable).
- Si contenu jugé trop inadapté (score insultes >=2) => Status = MODERATION (pas d'envoi aux offreurs, pas d'affichage sur le mur).

Fichiers
- demande.html (à la racine)
- assets/js/dx-demande-submit.js
- Code.gs (Google Apps Script)

Installation côté site (PC)
1) Copie/colle demande.html à la racine :
   D:\DX28_RECLONE\devisexpress974-site\
2) Copie/colle dx-demande-submit.js ici :
   D:\DX28_RECLONE\devisexpress974-site\assets\js\
3) Remplace les fichiers existants quand Windows demande.

Installation côté Apps Script
1) Ouvre Apps Script > Code.gs
2) Ctrl+A (tout sélectionner) > Colle le contenu du fichier Code.gs fourni
3) Enregistre (Ctrl+S) puis Déployer (si besoin)

Test
- demande.html : essaye tel vide + email OK => doit passer
- tel invalide => doit refuser
- description < 100 => doit refuser
- CGV non cochée => doit refuser
- upload pdf > 1.5Mo => doit refuser

Git commit (suggestion)
Summary: Patch9: demande validation + flags moderation
Description (optionnel): tel/email OR, CGV, demarchage, min 100, attachments, backend revalidation + sheet flags
