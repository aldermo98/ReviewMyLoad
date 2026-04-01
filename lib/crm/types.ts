export interface CrmJobPayload {
  externalId: string;
  customerName: string;
  customerEmail: string;
  serviceType: string;
  city?: string;
  notes?: string;
  amountCents: number;
}

export interface CrmAdapter {
  name: string;
  connect(): Promise<{ status: "connected" | "pending" }>;
  pullRecentJobs(): Promise<CrmJobPayload[]>;
  disconnect(): Promise<void>;
}

// Future adapters for GHL, Jobber, Housecall Pro, ServiceTitan, and similar
// systems should conform to this interface so the rest of the app can keep
// using the same job ingestion pipeline as manual entries.
