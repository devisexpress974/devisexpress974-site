// netlify/functions/gas.js (v23)
// Proxy Netlify -> Google Apps Script WebApp
// ✅ Ne dépend PAS d'une variable d'environnement : fallback intégré
// (Tu peux quand même définir GAS_URL dans Netlify, ça prendra priorité)

export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
  // --- DX input validation / moderation (server-side) ---
  function stripAccents(s){
    try { return (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,""); }

    // Parse JSON body when present (POST/PUT) for validation
    let parsedBody = null;
    if (event.body && (event.httpMethod || "").toUpperCase() !== "GET") {
      try { parsedBody = JSON.parse(event.body); } catch(e) { parsedBody = null; }
    }

    // Enforce moderation on demand creation
    if (parsedBody && String(parsedBody.action || "") === "createDemande") {
      const err = validateCreateDemande(parsedBody);
      if (err) {
        return {
          statusCode: 400,
          headers: { ...cors, "Content-Type": "application/json" },
          body: JSON.stringify({ ok: false, error: err })
        };
      }
    }
    catch(e){ return (s||""); }
  }
  function normText(s){
    s = stripAccents(String(s||"").toLowerCase());
    s = s.replace(/[^a-z0-9\s]/g," ");
    s = s.replace(/\s+/g," ").trim();
    return s;
  }
  function isValidEmail(email){
    email = String(email||"").trim().toLowerCase();
    if(!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }
  function normalizePhone974(tel){
    tel = String(tel||"").trim();
    if(!tel) return "";
    tel = tel.replace(/[\s\.\-\(\)]/g,"");
    if(/^0(262|692|693)\d{6}$/.test(tel)) return tel;
    if(/^\+262(262|692|693)\d{6}$/.test(tel)) return tel;
    if(/^262(262|692|693)\d{6}$/.test(tel)) return tel;
    return "";
  }
  // "hard" blocked words list (keep it reasonable; no hate slurs)
  const HARD_BLOCK = ["connard","encule","fdp","pute","salope","merde","bite","putain"];
  // "soft" words list (warning only)
  const SOFT_BLOCK = ["idiot","imbecile","debile","nul","con","sale","stupide","abruti","bouffon"];

  function countBadWords(text, list){
    const t = normText(text);
    if(!t) return 0;
    let score = 0;
    for(const w of list){
      const re = new RegExp("\\\\b" + w + "\\\\b","g");
      const m = t.match(re);
      if(m && m.length) score += Math.min(2, m.length);
    }
    return score;
  }

  function validateCreateDemande(body){
    const service = String(body?.service || body?.Service || "").trim();
    const serviceAutre = String(body?.serviceAutre || body?.ServiceAutre || "").trim();
    const zone = String(body?.zone || body?.Zone || "").trim();
    const commune = String(body?.commune || body?.Commune || "").trim();
    const description = String(body?.description || body?.Description || "").trim();
    const nom = String(body?.nom || body?.Nom || "").trim();
    const email = String(body?.email || body?.Email || "").trim();
    const telRaw = String(body?.tel || body?.telephone || body?.Tel || "").trim();

    // basic required
    if(!service) return "Service manquant.";
    if(!zone) return "Zone manquante.";
    if(!commune) return "Commune manquante.";
    if(!description || description.length < 20) return "Description trop courte.";
    if(description.length > 4000) return "Description trop longue.";

    // contact required: tel OR email
    const tel = normalizePhone974(telRaw);
    const hasEmail = !!email && isValidEmail(email);
    if(!tel && !hasEmail) return "Merci d’indiquer un email valide ou un numéro (Réunion).";

    // moderation: hard block in key fields
    const hardScore = countBadWords([service, serviceAutre, zone, commune, description, nom].join(" "), HARD_BLOCK);
    if(hardScore >= 1) return "Contenu inapproprié détecté.";

    // soft block doesn't reject (could be logged later)
    return "";
  }


  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  const GAS_URL =
    process.env.GAS_URL ||
    process.env.GAS_WEBAPP_URL ||
    "https://script.google.com/macros/s/AKfycbwb4qKG6EDlHborHOJgtVTkD-2ujfbmhqqOwgnNMTfFqUtkXek-YiZ1CBNnvYJOhXQm/exec";

  if (!GAS_URL) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "GAS_URL manquant" }),
    };
  }

  try {
    const target = new URL(GAS_URL);

    // Forward query params (GET calls: action=..., token=..., etc.)
    const qs = event.queryStringParameters || {};
    for (const [k, v] of Object.entries(qs)) {
      if (v !== undefined && v !== null) target.searchParams.set(k, String(v));
    }

    const method = (event.httpMethod || "GET").toUpperCase();
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method !== "GET" && method !== "HEAD") {
      // event.body is already a string when coming from browser fetch
      opts.body = event.body || "";
    }

    const resp = await fetch(target.toString(), opts);
    const text = await resp.text();

    // Try to normalize JSON output
    let body = text;
    let contentType = resp.headers.get("content-type") || "text/plain; charset=utf-8";

    try {
      const j = JSON.parse(text);
      body = JSON.stringify(j);
      contentType = "application/json";
    } catch (e) {
      // keep raw
    }

    return {
      statusCode: resp.status,
      headers: { ...cors, "Content-Type": contentType },
      body,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: String(e?.message || e) }),
    };
  }
}
