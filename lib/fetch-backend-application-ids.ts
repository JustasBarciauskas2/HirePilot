import "server-only";

import { getTenantInstancePayload } from "@/lib/tenant-instance";

/**
 * Parses JSON from your backend listing endpoint into Firestore `jobApplications` document ids.
 * Supported shapes:
 * - `["id1", "id2"]`
 * - `{ "applicationIds": ["..."] }` or `firestoreApplicationIds`, `firestoreIds`, `ids`
 * - `{ "data": [{ "applicationId": "..." }] }` (also `id`, `firestoreId`)
 */
export function parseFirestoreApplicationIdsFromBackendJson(data: unknown): string[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    if (typeof data[0] === "string") {
      return data.map((s) => String(s).trim()).filter(Boolean);
    }
    if (typeof data[0] === "object" && data[0] !== null) {
      return data
        .map((row) => {
          const r = row as Record<string, unknown>;
          return String(r.applicationId ?? r.firestoreId ?? r.id ?? "").trim();
        })
        .filter(Boolean);
    }
  }
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const raw =
    o.firestoreApplicationIds ??
    o.applicationIds ??
    o.firestoreIds ??
    o.ids ??
    o.applicationDocumentIds;
  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === "object" && raw[0] !== null) {
      return raw
        .map((row) => {
          const r = row as Record<string, unknown>;
          return String(r.applicationId ?? r.firestoreId ?? r.id ?? "").trim();
        })
        .filter(Boolean);
    }
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  const nested = o.data ?? o.applications ?? o.results;
  if (Array.isArray(nested)) {
    return parseFirestoreApplicationIdsFromBackendJson(nested);
  }
  return [];
}

/**
 * GET `listUrl` — your backend returns which Firestore application document ids to show in the portal.
 * Sends `X-Tenant-Id` and appends `tenantId` query if missing.
 */
export async function fetchBackendFirestoreApplicationIds(listUrl: string): Promise<string[]> {
  const tenantId = getTenantInstancePayload().id;
  let url: URL;
  try {
    url = new URL(listUrl);
  } catch {
    throw new Error("Invalid BACKEND_APPLICATIONS_PORTAL_LIST_URL");
  }
  if (!url.searchParams.has("tenantId")) {
    url.searchParams.set("tenantId", tenantId);
  }

  let res: Response;
  try {
    res = await fetch(url.href, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Tenant-Id": tenantId,
      },
      cache: "no-store",
    });
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not reach applications list at ${url.origin} (${hint}). Is the backend running and BACKEND_APPLICATIONS_PORTAL_LIST_* correct?`,
    );
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Backend applications list returned ${res.status}. ${text.slice(0, 280)}`.trim(),
    );
  }

  let data: unknown;
  try {
    data = text.trim() ? (JSON.parse(text) as unknown) : [];
  } catch {
    throw new Error("Backend applications list did not return valid JSON.");
  }

  return parseFirestoreApplicationIdsFromBackendJson(data);
}
