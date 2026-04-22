import { decryptSecret, encryptSecret } from "@/lib/security/secrets";

const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";

type GhlLocationResponse = {
  location?: {
    id: string;
    name?: string;
    companyId?: string;
    email?: string;
  };
  id?: string;
  name?: string;
  companyId?: string;
  email?: string;
};

export type GoHighLevelConnectionInput = {
  locationId: string;
  privateIntegrationToken: string;
};

export type GoHighLevelConnectionSummary = {
  locationId: string;
  locationName: string;
  companyId?: string | null;
  email?: string | null;
  tokenLast4: string;
  encryptedToken: string;
};

export async function verifyGoHighLevelConnection(
  input: GoHighLevelConnectionInput,
): Promise<GoHighLevelConnectionSummary> {
  const response = await fetch(`${GHL_API_BASE_URL}/locations/${encodeURIComponent(input.locationId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${input.privateIntegrationToken}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new Error(
      body?.message ??
        body?.error ??
        `GoHighLevel connection failed with status ${response.status}. Check the location ID and token.`,
    );
  }

  const payload = (await response.json()) as GhlLocationResponse;
  const location = payload.location ?? payload;

  if (!location?.id) {
    throw new Error("GoHighLevel connection succeeded, but the location response was incomplete.");
  }

  return {
    locationId: location.id,
    locationName: location.name ?? "GoHighLevel location",
    companyId: location.companyId ?? null,
    email: location.email ?? null,
    tokenLast4: input.privateIntegrationToken.slice(-4),
    encryptedToken: encryptSecret(input.privateIntegrationToken),
  };
}

export function getStoredGoHighLevelToken(metadata: Record<string, any> | null | undefined) {
  const encryptedToken = metadata?.encryptedToken;

  if (!encryptedToken || typeof encryptedToken !== "string") {
    return null;
  }

  return decryptSecret(encryptedToken);
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

