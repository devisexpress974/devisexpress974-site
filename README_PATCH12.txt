README_PATCH12 — Emails Pro + Notifications (DevisExpress974)

Objectif
- Email offreur plus "pro" (CTA + liens: voir demande / paiement / prefs)
- Ajout email de confirmation au demandeur (si email fourni)
- Désinscription notifications Patch11 conservée
- IMPORTANT: UNSUB_SECRET est auto-généré si absent (plus besoin de le créer à la main).

1) Côté site (PC)
Copie/colle à la racine du site (si pas déjà fait via Patch11) :
- offreur-notifications.html
- offreur-notifications.js
- offreur-unsubscribe.html
- offreur-unsubscribe.js

2) Côté Apps Script
Remplacer Code.gs en entier par le Code.gs de ce patch, puis:
Deploy > Manage deployments > Edit (crayon) > New version > Deploy

3) Tests
- Une nouvelle demande doit envoyer un email offreur avec boutons.
- Le lien "Se désinscrire des notifications" doit marcher.
- Le demandeur reçoit un email de confirmation si un email a été fourni.

Git summary (si tu commits)
Patch12: pro emails + notif unsubscribe auto-secret
