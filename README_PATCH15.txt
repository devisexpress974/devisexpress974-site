PATCH 15 — AVIS + FERMETURE DEMANDE

Objectif
- Ajouter une page propre pour "Noter un prestataire"
- Enregistrer l'avis dans l'onglet Avis (avec DemandeID optionnel)
- Mettre à jour NoteMoyenne / NombreAvis dans Offreurs
- Si le lien contient did=DEMxxxx, la demande passe en Status=FERME (elle ne s'affiche plus sur le mur)

Contenu du ZIP
- noter-offreur.html   (à la racine du site)
- assets/js/noter-offreur.js
- Code.gs              (Apps Script) -> remplace ton Code.gs actuel

Étapes (site)
1) Dézippe
2) Copie les fichiers exactement aux bons endroits :
   - noter-offreur.html  -> à la racine de ton site (même niveau que index.html)
   - assets/js/noter-offreur.js -> dans assets/js/
3) Si Windows demande : Remplacer (Oui)

Étapes (Apps Script)
1) Ouvre Apps Script > Code.gs
2) Ctrl+A / Colle le Code.gs du patch (remplace tout)
3) Enregistrer
4) Déployer -> Gérer les déploiements -> mettre à jour

Test
- Ouvre : noter-offreur.html?oid=OFF1234
- Choisis une note + envoie
- Vérifie :
  - Onglet "Avis" : une ligne ajoutée
  - Onglet "Offreurs" : NoteMoyenne / NombreAvis mis à jour
- Test fermeture demande : noter-offreur.html?oid=OFF1234&did=DEM0001
  - Après envoi, la demande DEM0001 doit passer en Status=FERME

Commit Git (summary)
Patch15: avis page + close demande after avis
