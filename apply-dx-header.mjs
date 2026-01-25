// apply-dx-header.mjs
// Patch toutes les pages HTML pour utiliser le header injecté (partials/header.html)
// + ajoute le CSS dx-header + ajoute les scripts dx-include-header/dx-header
// + supprime l'ancien header <header class="siteHeader">...</header> quand il existe

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

// Dossiers à ignorer pendant le scan
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "assets",
  "netlify",
  "DX-header-logo-pack",
  "partials",
]);

const HEAD_LINK = `<link rel="stylesheet" href="assets/css/dx-header.css?v=1">`;
const BODY_DIV = `<div id="dx-header"></div>`;
const SCRIPTS =
  `<script src="assets/js/dx-include-header.js?v=1"></script>\n` +
  `<script src="assets/js/dx-header.js?v=1"></script>`;

function normalizeNewlines(s) {
  return s.replace(/\r\n/g, "\n");
}

function restoreNewlinesLike(original, patched) {
  // Si le fichier original est en CRLF, on remet en CRLF
  const usesCRLF = /\r\n/.test(original);
  return usesCRLF ? patched.replace(/\n/g, "\r\n") : patched;
}

function patchHtml(original) {
  let s = normalizeNewlines(original);

  // 1) Supprime l'ancien header si c'est le header "siteHeader"
  // (c'est celui que tu avais au début de tes pages)
  const oldHeaderRegex =
    /<header\b[^>]*class=["'][^"']*\bsiteHeader\b[^"']*["'][^>]*>[\s\S]*?<\/header>\s*/i;
  s = s.replace(oldHeaderRegex, "");

  // 2) Ajoute le CSS dx-header juste avant </head> si absent
  if (!/dx-header\.css(\?v=1)?/i.test(s)) {
    s = s.replace(/<\/head>/i, `  ${HEAD_LINK}\n</head>`);
  }

  // 3) Ajoute <div id="dx-header"></div> juste après <body...> si absent
  if (!/id=["']dx-header["']/i.test(s)) {
    s = s.replace(/<body\b[^>]*>\s*/i, (m) => `${m}\n  ${BODY_DIV}\n\n`);
  }

  // 4) Ajoute les scripts juste avant </body> si absents
  if (!/dx-include-header\.js/i.test(s)) {
    s = s.replace(/<\/body>/i, `\n  ${SCRIPTS}\n\n</body>`);
  } else {
    // Si dx-include-header est là mais pas dx-header.js, on ajoute dx-header.js
    if (!/dx-header\.js/i.test(s)) {
      s = s.replace(/<\/body>/i, `\n  <script src="assets/js/dx-header.js?v=1"></script>\n\n</body>`);
    }
  }

  return restoreNewlinesLike(original, s);
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walk(full)));
      continue;
    }

    if (e.isFile() && e.name.toLowerCase().endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

async function backupIfNeeded(filePath, content) {
  const bakPath = filePath + ".bak";
  try {
    await fs.access(bakPath);
    // backup existe déjà → on ne recrée pas
  } catch {
    await fs.writeFile(bakPath, content, "utf8");
  }
}

async function main() {
  const files = await walk(ROOT);

  if (!files.length) {
    console.log("Aucun fichier .html trouvé à patcher.");
    return;
  }

  let changed = 0;

  for (const f of files) {
    const original = await fs.readFile(f, "utf8");
    const patched = patchHtml(original);

    if (patched !== original) {
      await backupIfNeeded(f, original);
      await fs.writeFile(f, patched, "utf8");
      changed++;
      console.log("PATCH:", path.relative(ROOT, f));
    } else {
      console.log("OK   :", path.relative(ROOT, f));
    }
  }

  console.log(`\nTerminé. Fichiers modifiés: ${changed}/${files.length}`);
  console.log("Backups créés en .bak (une seule fois).");
  console.log("Relance Live Server et fais Ctrl+F5 sur le navigateur.");
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
