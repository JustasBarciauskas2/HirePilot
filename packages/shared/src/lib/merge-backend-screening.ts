import "server-only";

import {
  fallbackJobAppliedForFromApplicationRow,
  parseCandidateScreeningResult,
  type CandidateScreeningResult,
} from "@techrecruit/shared/lib/candidate-screening-result";
import type { JobApplicationRecord } from "@techrecruit/shared/lib/job-application-shared";
import { getBackendTenantApplicationsUrl } from "@techrecruit/shared/lib/backend-url";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function addScreeningRowsToMap(rows: unknown[], map: Map<string, CandidateScreeningResult>): void {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const aid = String(
      row.applicationId ?? row.firestoreApplicationId ?? row.firestoreId ?? row.id ?? "",
    ).trim();
    const rawScreening = row.screening;
    if (!aid || rawScreening === undefined) continue;
    const fallback = fallbackJobAppliedForFromApplicationRow(row);
    const parsed = parseCandidateScreeningResult(rawScreening, fallback);
    if (parsed) map.set(aid, parsed);
  }
}

/**
 * Parses screening blobs keyed by Firestore `jobApplications` document id from your tenant applications JSON.
 * Each row can match `JobApplicationRequest`-style objects: `applicationId` + `screening`.
 * Supports:
 * - **Root JSON array** — Spring `ResponseEntity<List<JobApplicationRequest>>` serializes as `[{...},{...}]`
 * - Object with array under `applications`, `jobApplications`, `data`, `results`, `items`, or `content` (Spring Page)
 * - `{ "screeningByApplicationId": { "<docId>": { ... } } }`
 * Row id fields: `applicationId` (preferred), `firestoreApplicationId`, `firestoreId`, `id`
 */
export function parseScreeningByApplicationIdFromTenantJson(data: unknown): Map<string, CandidateScreeningResult> {
  const map = new Map<string, CandidateScreeningResult>();

  if (Array.isArray(data)) {
    addScreeningRowsToMap(data, map);
    return map;
  }

  if (!isRecord(data)) return map;

  const byIdField = data.screeningByApplicationId ?? data.screeningsByApplicationId;
  if (isRecord(byIdField)) {
    for (const [k, v] of Object.entries(byIdField)) {
      const id = k.trim();
      const parsed = parseCandidateScreeningResult(v);
      if (parsed && id) map.set(id, parsed);
    }
  }

  const apps =
    data.applications ??
    data.jobApplications ??
    data.data ??
    data.results ??
    data.items ??
    data.content;
  if (Array.isArray(apps)) {
    addScreeningRowsToMap(apps, map);
  }

  return map;
}

/**
 * Enriches Firestore application rows with `screening` from your backend GET (not stored in Firebase).
 * When `BACKEND_TENANT_APPLICATIONS_*` is unset, returns `applications` unchanged.
 */
export async function mergeScreeningFromBackendTenantApplications(
  tenantId: string,
  applications: JobApplicationRecord[],
): Promise<JobApplicationRecord[]> {
  const url = getBackendTenantApplicationsUrl(tenantId);
  if (!url) {
    if (process.env.NODE_ENV === "development") {
      const raw = process.env.BACKEND_TENANT_APPLICATIONS_URL;
      console.warn("[mergeScreening] BACKEND_TENANT_APPLICATIONS_URL not resolved — check .env and restart `next dev`.", {
        tenantId,
        envSet: Boolean(raw?.trim()),
      });
    }
    return applications;
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.info("[mergeScreening] GET", url, `(merge into ${applications.length} row(s))`);
    }
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Tenant-Id": tenantId,
      },
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.warn("[mergeScreening] tenant applications GET", res.status, text.slice(0, 200));
      return applications;
    }
    let data: unknown;
    try {
      data = text.trim() ? (JSON.parse(text) as unknown) : {};
    } catch {
      console.warn("[mergeScreening] invalid JSON from tenant applications");
      return applications;
    }

    const byId = parseScreeningByApplicationIdFromTenantJson(data);
    if (byId.size === 0) return applications;

    return applications.map((r) => {
      const s = byId.get(r.id);
      if (!s) return r;
      return { ...r, screening: s };
    });
  } catch (e) {
    console.warn("[mergeScreening]", e instanceof Error ? e.message : e);
    return applications;
  }
}
