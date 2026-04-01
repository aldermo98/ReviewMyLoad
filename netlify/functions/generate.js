// netlify/functions/generate.js
//
// POST /.netlify/functions/generate
// Body: { token: "..." }
//
// Token is created by /.netlify/functions/link and contains:
// { tenantId, crm:"ghl", locationId, contactId, exp }
//
// Env vars:
// - APP_TOKEN_SECRET
// - TENANTS_JSON
// - OPENAI_API_KEY
// - MAX_VISION_IMAGES (optional, default 3)

const crypto = require("crypto");

const API_BASE = "https://services.leadconnectorhq.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function safeString(v) {
  return v == null ? "" : String(v).trim();
}

function clampText(v, max = 2500) {
  const s = safeString(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function getTenants() {
  try {
    return JSON.parse(process.env.TENANTS_JSON || "{}");
  } catch {
    return {};
  }
}

function verifyToken(token) {
  const secret = process.env.APP_TOKEN_SECRET;
  if (!secret) throw new Error("Missing APP_TOKEN_SECRET");

  const t = safeString(token);
  const parts = t.split(".");
  if (parts.length !== 2) throw new Error("Invalid token format");

  const payloadB64 = parts[0];
  const sig = parts[1];

  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (sig !== expected) throw new Error("Invalid token signature");

  const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    throw new Error("Invalid token payload");
  }

  const exp = Number(payload.exp || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!exp || exp < now) throw new Error("Token expired");

  return payload;
}

async function ghlFetch(tenant, path, { method = "GET", query, body } = {}) {
  const token = safeString(tenant?.ghl?.privateToken);
  if (!token) throw new Error("Tenant missing ghl.privateToken");

  const url = new URL(API_BASE + path);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && String(v).length) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GHL ${method} ${path} failed (${res.status}): ${text || "no body"}`);
  }

  return res.json();
}

function pickLatestOpportunity(opps) {
  if (!Array.isArray(opps) || opps.length === 0) return null;

  const score = (o) => {
    const u = Date.parse(o.updatedAt || o.updated_at || o.dateUpdated || "");
    const c = Date.parse(o.createdAt || o.created_at || o.dateAdded || "");
    return (isFinite(u) ? u : 0) || (isFinite(c) ? c : 0) || 0;
  };

  return opps.slice().sort((a, b) => score(b) - score(a))[0];
}

function getCustomFieldString(opp, fieldId) {
  const id = safeString(fieldId);
  if (!id) return "";

  const cf = opp?.customFields || opp?.custom_fields;
  if (!Array.isArray(cf)) return "";

  const hit = cf.find((x) => safeString(x?.id) === id);
  return safeString(hit?.fieldValueString || hit?.value || "");
}

function extractNotesFromOpportunity(opp, notesFieldId) {
  const cf = opp?.customFields || opp?.custom_fields;
  if (!Array.isArray(cf)) return "";

  if (notesFieldId) {
    const hit = cf.find((x) => safeString(x?.id) === safeString(notesFieldId));
    return clampText(hit?.fieldValueString || hit?.value || "", 2500);
  }

  const parts = cf
    .map((x) => x?.fieldValueString)
    .filter(Boolean)
    .map((s) => safeString(s))
    .filter(Boolean);

  return clampText(parts.join(" | "), 2500);
}

function parseUrlsFromText(text) {
  const raw = safeString(text);
  if (!raw) return [];

  const parts = raw
    .split(/[\n,|]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const urls = [];
  for (const p of parts.length ? parts : [raw]) {
    const matches = p.match(/https?:\/\/[^\s]+/g);
    if (matches) urls.push(...matches.map((u) => u.replace(/[)\].,]+$/g, "")));
  }

  return uniq(urls);
}

function isLikelyImageUrl(url) {
  const u = String(url || "").toLowerCase();
  return (
    u.endsWith(".jpg") ||
    u.endsWith(".jpeg") ||
    u.endsWith(".png") ||
    u.endsWith(".webp") ||
    u.endsWith(".gif") ||
    u.includes("googleusercontent.com") ||
    u.includes("lh3.googleusercontent.com") ||
    u.includes("storage.googleapis.com")
  );
}

function guessMimeFromUrl(url) {
  const u = String(url || "").toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function fetchImageAsDataUrl(url, { timeoutMs = 9000, maxBytes = 2_500_000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`image fetch failed (${res.status}): ${txt?.slice?.(0, 120) || "no body"}`);
    }

    const contentType = res.headers.get("content-type") || guessMimeFromUrl(url);
    const buf = Buffer.from(await res.arrayBuffer());

    if (buf.byteLength > maxBytes) {
      throw new Error(`image too large (${buf.byteLength} bytes)`);
    }

    const b64 = buf.toString("base64");
    return `data:${contentType};base64,${b64}`;
  } finally {
    clearTimeout(t);
  }
}

async function openaiResponsesCreate(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI responses failed (${res.status}): ${text || "no body"}`);
  }
  return res.json();
}

function buildSystemPrompt({ withPhotos }) {
  const lines = [
    "You write a short, natural-sounding 5-star SEO-optimized Google review for a home-service business from the customer's perspective.",
    withPhotos ? "You may receive job photos and brief notes." : "You may receive brief notes.",
    "Rules:",
    "- Sound like a real customer (1st person).",
    "- 70–140 words (4–8 sentences).",
    "- Mention the CITY exactly once if provided.",
    "- Identify the SERVICE TYPE using notes (and photos if provided): junk removal, yard cleanout, garage cleanout, furniture removal, appliance removal, etc.",
    "- If photos clearly show specific items, you may mention 1–2 items briefly. Do not invent details not supported by notes/photos.",
    "- No phone numbers, URLs, hashtags, emojis, pricing, or discounts.",
    "- No bullets. No quotes. No ALL CAPS.",
    "- End with a simple recommendation sentence.",
    "Output only the review text.",
  ];
  return lines.join("\n");
}

async function generateReviewTextOnly({ city, notes }) {
  const systemPrompt = buildSystemPrompt({ withPhotos: false });

  const textContext = {
    city: safeString(city),
    opportunity_notes: safeString(notes),
  };

  const resp = await openaiResponsesCreate({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: [{ type: "input_text", text: JSON.stringify(textContext) }] },
    ],
    temperature: 0.7,
    max_output_tokens: 260,
  });

  return safeString(resp.output_text || "");
}

async function generateReviewWithVision({ city, notes, jobPhotosUrl }) {
  const maxImages = Math.max(0, Math.min(6, Number(process.env.MAX_VISION_IMAGES || 3)));

  const urls = parseUrlsFromText(jobPhotosUrl).slice(0, 12);
  const candidateImageUrls = urls.filter(isLikelyImageUrl).slice(0, maxImages);

  // If no image candidates, bail (so caller can fall back)
  if (!candidateImageUrls.length) return "";

  const imageDataUrls = [];
  for (const u of candidateImageUrls) {
    try {
      const dataUrl = await fetchImageAsDataUrl(u);
      imageDataUrls.push(dataUrl);
    } catch (e) {
      console.log("VISION_IMAGE_SKIP", u, e?.message || e);
    }
  }

  // If none fetched successfully, bail
  if (!imageDataUrls.length) return "";

  const systemPrompt = buildSystemPrompt({ withPhotos: true });

  const textContext = {
    city: safeString(city),
    opportunity_notes: safeString(notes),
    job_photos_url: safeString(jobPhotosUrl),
    parsed_url_count: urls.length,
    included_image_count: imageDataUrls.length,
  };

  const userContent = [
    { type: "input_text", text: JSON.stringify(textContext) },
    ...imageDataUrls.map((dataUrl) => ({ type: "input_image", image_url: dataUrl })),
  ];

  const resp = await openaiResponsesCreate({
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.7,
    max_output_tokens: 260,
  });

  return safeString(resp.output_text || "");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = JSON.parse(event.body || "{}");
    const token = safeString(body.token);
    if (!token) return json(400, { error: "Missing token" });

    const payload = verifyToken(token);

    // Identify tenant (TENANTS_JSON is keyed by API key, so we search by tenantId)
    const tenants = getTenants();
    let tenant = null;
    for (const k of Object.keys(tenants)) {
      if (tenants[k] && tenants[k].tenantId === payload.tenantId) {
        tenant = tenants[k];
        break;
      }
    }
    if (!tenant) return json(403, { error: "Unknown tenant" });

    if (payload.crm !== "ghl") return json(400, { error: "Unsupported CRM", crm: payload.crm });

    const locationId = safeString(payload.locationId) || safeString(tenant?.ghl?.locationId);
    const contactId = safeString(payload.contactId);

    if (!locationId) return json(400, { error: "Missing locationId" });
    if (!contactId) return json(400, { error: "Missing contactId" });

    const notesFieldId = safeString(tenant?.ghl?.notesFieldId);
    const photosFieldId = safeString(tenant?.ghl?.photosFieldId);

    // 1) Contact -> city
    const contactResp = await ghlFetch(tenant, `/contacts/${contactId}`);
    const contact = contactResp?.contact || contactResp;
    const city = safeString(contact?.city);

    // 2) Opportunities -> pick latest WON
    const oppSearch = await ghlFetch(tenant, `/opportunities/search`, {
      query: { location_id: locationId, contact_id: contactId, limit: 100 },
    });

    const opportunities = oppSearch?.opportunities || [];
    const wonOpps = opportunities.filter((o) => safeString(o?.status).toLowerCase() === "won");
    const picked = pickLatestOpportunity(wonOpps.length ? wonOpps : opportunities);

    if (!picked) {
      // Still allow a text-only review with whatever we have
      const review = await generateReviewTextOnly({ city, notes: "" });
      return json(200, { review, city, opportunityId: "", jobPhotosUrl: "" });
    }

    const opportunityId = safeString(picked.id || picked._id);

    // 3) Extract notes + photos
    const notes = extractNotesFromOpportunity(picked, notesFieldId);
    const jobPhotosUrl = getCustomFieldString(picked, photosFieldId);

    // 4) Generate (vision if possible, fallback to text-only)
    let review = "";
    if (jobPhotosUrl) {
      review = await generateReviewWithVision({ city, notes, jobPhotosUrl });
    }
    if (!review) {
      review = await generateReviewTextOnly({ city, notes });
    }
    if (!review) {
      return json(502, {
        error: "OpenAI returned an empty review (vision + text fallback).",
        city,
        opportunityId,
        jobPhotosUrl,
        notesPreview: (notes || "").slice(0, 200),
      });
    }

    return json(200, { review, city, opportunityId, jobPhotosUrl });
  } catch (e) {
    console.error("generate error:", e);
    return json(500, { error: "Server error", debug: safeString(e.message || e) });
  }
};
