function ensureFetch(){
  if(typeof fetch !== "function"){
    throw new Error("Global fetch is not available. Set Netlify Node to 18+.");
  }
}

function json(statusCode, obj, origin){
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin || "",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(obj),
  };
}

function getAllowedOrigin(event){
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

function parsePdt(text){
  // Format:
  // SUCCESS\nkey=value\nkey=value...
  const lines = String(text || "").split(/\r?\n/);
  const first = (lines.shift() || "").trim();
  if(first !== "SUCCESS") return { ok:false, error:"PayPal PDT: FAIL" };
  const kv = {};
  for(const line of lines){
    if(!line) continue;
    const i = line.indexOf("=");
    if(i === -1) continue;
    const k = decodeURIComponent(line.slice(0,i));
    const v = decodeURIComponent(line.slice(i+1));
    kv[k] = v;
  }
  return { ok:true, kv };
}

function asNumber(v){
  const s = String(v || "").replace(",", ".").replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

async function verifyPdt({ tx, expectedAmount }){
  const pdtToken = process.env.PAYPAL_PDT_TOKEN;
  if(!pdtToken) return { ok:false, error:"PAYPAL_PDT_TOKEN manquant (configuration PayPal PDT)." };

  const env = String(process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || "live").toLowerCase();
  const endpoint = (env === "sandbox")
    ? "https://www.sandbox.paypal.com/cgi-bin/webscr"
    : "https://www.paypal.com/cgi-bin/webscr";

  const body = new URLSearchParams({ cmd: "_notify-synch", tx, at: pdtToken }).toString();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  const text = await res.text();
  const parsed = parsePdt(text);
  if(!parsed.ok) return parsed;

  const kv = parsed.kv || {};
  const status = String(kv.payment_status || kv.status || "").trim();
  if(status && status !== "Completed" && status !== "Processed"){
    return { ok:false, error:`Paiement PayPal non finalisé (status=${status}).` };
  }

  const receiverExpected = String(process.env.PAYPAL_RECEIVER_EMAIL || "").trim().toLowerCase();
  if(receiverExpected){
    const receiver = String(kv.receiver_email || kv.business || "").trim().toLowerCase();
    if(receiver && receiver !== receiverExpected){
      return { ok:false, error:"Paiement PayPal invalide (receiver_email différent)." };
    }
  }

  const currency = String(kv.mc_currency || kv.currency || "").trim().toUpperCase();
  if(currency && currency !== "EUR"){
    return { ok:false, error:`Devise PayPal inattendue (${currency}).` };
  }

  if(typeof expectedAmount === "number"){
    const gross = asNumber(kv.mc_gross || kv.payment_gross || kv.mc_gross1);
    if(gross !== null){
      const diff = Math.abs(gross - expectedAmount);
      if(diff > 0.01){
        return { ok:false, error:`Montant PayPal inattendu (${gross}€ au lieu de ${expectedAmount}€).` };
      }
    }
  }

  return { ok:true, kv };
}

async function paypalOAuth(){
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if(!clientId || !secret) return { ok:false, error:"PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET manquants (abonnement)." };

  const env = String(process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || "live").toLowerCase();
  const base = (env === "sandbox") ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "authorization": `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const data = await res.json().catch(() => ({}));
  if(!res.ok || !data.access_token){
    return { ok:false, error:"Impossible d'obtenir un token PayPal (abonnement)." };
  }
  return { ok:true, base, access_token: data.access_token };
}

async function verifySubscription(subId){
  const o = await paypalOAuth();
  if(!o.ok) return o;

  const res = await fetch(`${o.base}/v1/billing/subscriptions/${encodeURIComponent(subId)}`, {
    headers: { "authorization": `Bearer ${o.access_token}` }
  });
  const data = await res.json().catch(() => ({}));
  if(!res.ok){
    return { ok:false, error:"Abonnement PayPal introuvable ou non accessible." };
  }
  const status = String(data.status || "").toUpperCase();
  if(!status) return { ok:false, error:"Statut abonnement PayPal inconnu." };

  // On accepte APPROVAL_PENDING (mois offert) ou ACTIVE. Le suivi du paiement du mois suivant se fera par contrôle périodique / webhook.
  if(status !== "ACTIVE" && status !== "APPROVAL_PENDING"){
    return { ok:false, error:`Abonnement PayPal non actif (status=${status}).` };
  }
  return { ok:true, data: { status, id: data.id || subId } };
}

exports.handler = async (event) => {
  ensureFetch();
  const origin = getAllowedOrigin(event);

  if(event.httpMethod === "OPTIONS"){
    return json(204, {}, origin || "null");
  }
  if(event.httpMethod !== "POST"){
    return json(405, { ok:false, error:"Method Not Allowed" }, origin || "null");
  }

  let body = {};
  try{
    body = event.body ? JSON.parse(event.body) : {};
  }catch(e){
    return json(400, { ok:false, error:"Invalid JSON body" }, origin || "null");
  }

  const gasUrl = process.env.GAS_URL;
  const dxSecret = process.env.DX_SECRET;

  if(!gasUrl) return json(500, { ok:false, error:"GAS_URL manquant." }, origin || "null");
  if(!dxSecret) return json(500, { ok:false, error:"DX_SECRET manquant (Netlify env)." }, origin || "null");

  const product = String(body.product || body.type || "").trim().toLowerCase();
  const token = String(body.token || "").trim();
  const demandeId = String(body.demandeId || body.id || "").trim();

  if(!product) return json(400, { ok:false, error:"Produit manquant." }, origin || "null");
  if(!token) return json(401, { ok:false, error:"Token manquant (connexion requise)." }, origin || "null");

  try{
    let verification = { ok:false, error:"Type inconnu" };
    const expectedAmount = (product === "ponctuel") ? 0.99 : (product === "pack" || product === "pack10") ? 2.99 : null;

    if(product === "ponctuel" || product === "pack" || product === "pack10"){
      const tx = String(body.tx || body.txn_id || body.transaction || "").trim();
      if(!tx) return json(400, { ok:false, error:"Transaction PayPal (tx) manquante." }, origin || "null");
      if(product === "ponctuel" && !demandeId){
        return json(400, { ok:false, error:"DemandeID manquant pour un paiement ponctuel." }, origin || "null");
      }
      verification = await verifyPdt({ tx, expectedAmount });
      if(!verification.ok) return json(400, verification, origin || "null");

      // Appel GAS sécurisé : enregistre paiement + active pack / abo / accès
      const payload = {
        action: "confirmPayPalPayment",
        token,
        product,
        tx,
        demandeId,
        pay_ok: true,
        dx_secret: dxSecret
      };

      const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok) return json(500, { ok:false, error:"Erreur serveur GAS.", details: data }, origin || "null");
      return json(200, data, origin || "null");
    }

    if(product === "abonnement" || product === "abo"){
      const subId = String(body.subscription_id || body.sub_id || body.subscriptionId || "").trim();
      if(!subId) return json(400, { ok:false, error:"subscription_id manquant (abonnement)." }, origin || "null");

      verification = await verifySubscription(subId);
      if(!verification.ok) return json(400, verification, origin || "null");

      const payload = {
        action: "confirmPayPalPayment",
        token,
        product: "abonnement",
        tx: subId, // On log l'ID d'abonnement côté sheet paiements (Tx)
        subscription_id: subId,
        pay_ok: true,
        dx_secret: dxSecret
      };

      const res = await fetch(gasUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok) return json(500, { ok:false, error:"Erreur serveur GAS.", details: data }, origin || "null");
      return json(200, data, origin || "null");
    }

    return json(400, { ok:false, error:"Produit inconnu." }, origin || "null");
  }catch(err){
    return json(500, { ok:false, error: err && err.message ? err.message : String(err) }, origin || "null");
  }
};
