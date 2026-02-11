// gas.js — DX proxy to Google Apps Script (GAS) — v5
// Security: CORS restricted + basic rate-limit + optional DX_SECRET injection for sensitive actions

const fetch = require("node-fetch");

const RATE_WINDOW_MS = 60_000; // 1 min
const RATE_MAX = parseInt(process.env.DX_RATE_MAX || "120", 10); // per IP per window
const buckets = new Map();

function now(){ return Date.now(); }

function getIp(event){
  return (
    (event.headers && (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"])) ||
    "unknown"
  ).split(",")[0].trim();
}

function allowRequest(ip){
  const t = now();
  const b = buckets.get(ip) || { t0: t, n: 0 };
  if (t - b.t0 > RATE_WINDOW_MS){
    b.t0 = t; b.n = 0;
  }
  b.n += 1;
  buckets.set(ip, b);
  return b.n <= RATE_MAX;
}

function getAllowedOrigin(event){
  // Allow only same-origin: Netlify provides URL/DEPLOY_PRIME_URL
  const allowed = new Set(
    [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]
      .filter(Boolean)
      .map(u => String(u).replace(/\/$/, ""))
  );
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) ? String(event.headers.origin || event.headers.Origin) : "";
  const norm = origin.replace(/\/$/, "");
  if (allowed.has(norm)) return origin;
  return "";
}

exports.handler = async (event) => {
  const gasUrl = process.env.GAS_URL;
  if (!gasUrl){
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok:false, error:"GAS_URL environment variable is missing (Netlify)."} ),
    };
  }

  const ip = getIp(event);
  if (!allowRequest(ip)){
    return {
      statusCode: 429,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok:false, error:"Rate limit exceeded. Please retry later." }),
    };
  }

  const allowedOrigin = getAllowedOrigin(event);

  // CORS preflight
  if (event.httpMethod === "OPTIONS"){
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": allowedOrigin || "null",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST"){
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload = {};
  try{
    payload = event.body ? JSON.parse(event.body) : {};
  }catch(e){
    return { statusCode: 400, body: JSON.stringify({ ok:false, error:"Invalid JSON body" }) };
  }

  // Optional secret injection (never expose secret to client)
  if (process.env.DX_SECRET){
    payload.dx_secret = process.env.DX_SECRET;
  }

  try{
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return {
      statusCode: res.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": allowedOrigin || "null",
      },
      body: text,
    };
  }catch(err){
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok:false, error:"Proxy error", detail:String(err && err.message || err) }),
    };
  }
};
