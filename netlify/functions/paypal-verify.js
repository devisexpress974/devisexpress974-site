
function ensureFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this runtime. Please set Netlify Node version to 18+.");
  }
}

// paypal-verify.js — v5 (OPTIONAL, but recommended for production)
// Verifies PayPal order or subscription server-side.
// Env required: PAYPAL_CLIENT_ID, PAYPAL_SECRET
// Usage (POST JSON):
// { kind: "order", id: "<ORDER_ID>" }  OR  { kind: "subscription", id: "<SUBSCRIPTION_ID>" }
async function getAccessToken(){
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if(!id || !secret) throw new Error("PAYPAL_CLIENT_ID/PAYPAL_SECRET missing");
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const base = process.env.PAYPAL_BASE || "https://api-m.paypal.com"; // set sandbox if needed
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "authorization": `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data && data.error_description || "PayPal auth failed");
  return { token: data.access_token, base };
}

exports.handler = async (event) => {
  ensureFetch();
  if(event.httpMethod === "OPTIONS") return { statusCode: 204, body: "" };
  if(event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let body = {};
  try{ body = JSON.parse(event.body || "{}"); }catch(e){}

  const kind = String(body.kind || "").toLowerCase();
  const id = String(body.id || "").trim();
  if(!kind || !id) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"kind and id required" }) };

  try{
    const { token, base } = await getAccessToken();
    let url = "";
    if(kind === "order") url = `${base}/v2/checkout/orders/${encodeURIComponent(id)}`;
    else if(kind === "subscription") url = `${base}/v1/billing/subscriptions/${encodeURIComponent(id)}`;
    else return { statusCode: 400, body: JSON.stringify({ ok:false, error:"kind must be order|subscription" }) };

    const res = await fetch(url, {
      headers: { "authorization": `Bearer ${token}`, "content-type":"application/json" },
    });
    const data = await res.json();
    if(!res.ok) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"PayPal verify failed", detail:data }) };

    // Minimal checks (you can tighten per-product)
    if(kind === "order"){
      const status = String(data.status || "");
      const ok = (status === "COMPLETED" || status === "APPROVED");
      return { statusCode: 200, body: JSON.stringify({ ok, kind, status, data }) };
    }
    if(kind === "subscription"){
      const status = String(data.status || "");
      const ok = (status === "ACTIVE" || status === "APPROVAL_PENDING");
      return { statusCode: 200, body: JSON.stringify({ ok, kind, status, data }) };
    }
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ ok:false, error:String(err && err.message || err) }) };
  }
};
