DX - Header DevisExpress974 (logo éclair orange sur toutes les pages)

1) Dézippe CE PACK dans le dossier RACINE de ton site, par exemple :
   C:\Users\TON_NOM\Desktop\devisexpress974-site\

   Après extraction tu dois avoir :
   - partials\header.html
   - assets\css\dx-header.css
   - assets\js\dx-header.js
   - assets\js\dx-include-header.js
   - assets\img\logo-eclair-orange.png

2) Remplace le logo :
   Mets TON vrai logo dans assets\img\ et garde exactement ce nom :
   logo-eclair-orange.png

3) Appliquer sur toutes les pages :
   Méthode rapide (automatique) :
   - Ouvre un terminal dans le dossier du site (Shift + clic droit -> Ouvrir PowerShell ici)
   - Lance :
     powershell -ExecutionPolicy Bypass -File .\apply_header.ps1

   (Ça ajoute automatiquement les 3 lignes dans <head> et le <div id="dx-header-slot"></div> après <body>.)

4) Déploie sur Netlify et teste.

Note :
- Le header est injecté via fetch("partials/header.html"), donc ça marche bien sur Netlify.
- Si tu ouvres une page en double-cliquant (file://), le fetch peut être bloqué : teste sur Netlify.
