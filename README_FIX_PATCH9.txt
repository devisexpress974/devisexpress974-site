DX Fix – demande form (Patch9)
Files:
- demande.html
- assets/js/dx-demande-submit.js

What changed:
- Removed the stray leading "\" in dx-demande-submit.js that caused: "Invalid or unexpected token".
- Removed the "démarchage pro autorisé ?" opt-in block from the demande form (no more option).
- Removed demarchageOK from the frontend payload (backend will treat it as false by default).
Install:
Copy both files into your site root, keeping the folder structure, and replace existing files.
