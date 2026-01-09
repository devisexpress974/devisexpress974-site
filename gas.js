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
