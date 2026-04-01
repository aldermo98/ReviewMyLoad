const crypto = require("crypto");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function safeString(v) {
  return v == null ? "" : String(v).trim();
}

function getTenants() {
  try { return JSON.parse(process.env.TENANTS_JSON || "{}"); }
  catch { return {}; }
}

function getApiKey(event) {
  const h = event.headers || {};
  const auth = safeString(h.authorization || h.Authorization);
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return safeString(auth.slice(7));
}

function signToken(payloadObj) {
  const secret = process.env.APP_TOKEN_SECRET;
  if (!secret) throw new Error("Missing APP_TOKEN_SECRET");

  const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const apiKey = getApiKey(event);
    if (!apiKey) return json(401, { error: "Missing Authorization: Bearer <apiKey>" });

    const tenants = getTenants();
    const tenant = tenants[apiKey];
    if (!tenant) return json(403, { error: "Invalid apiKey" });

    const body = JSON.parse(event.body || "{}");
    const contactId = safeString(body.contactId);
    const locationId = safeString(body.locationId) || safeString(tenant?.ghl?.locationId);

    if (!contactId) return json(400, { error: "Missing contactId" });
    if (tenant.crm === "ghl" && !locationId) return json(400, { error: "Missing locationId" });

    // Token expires in 7 days
    const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

    const token = signToken({
      tenantId: tenant.tenantId,
      crm: tenant.crm,
      locationId,
      contactId,
      exp,
    });

    const url = `https://review.pricemyload.com/r/${token}`;
    return json(200, { url, expiresAtUnix: exp });
  } catch (e) {
    return json(500, { error: "Server error", debug: safeString(e.message || e) });
  }
};
