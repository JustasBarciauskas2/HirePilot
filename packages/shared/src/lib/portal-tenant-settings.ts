import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@techrecruit/shared/lib/firebase-admin";
import {
  DEFAULT_APPLICATION_PIPELINE_STATUSES,
  type ApplicationPipelineStatus,
} from "@techrecruit/shared/lib/job-application-shared";

export const PORTAL_TENANT_SETTINGS_COLLECTION = "portalTenantSettings";

const ID_RE = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_STAGES = 30;
const MAX_LABEL_LEN = 60;

function mapPipelineFromDoc(raw: unknown): ApplicationPipelineStatus[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ApplicationPipelineStatus[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!id || !label || !ID_RE.test(id) || label.length > MAX_LABEL_LEN) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
  }
  return out.length ? out : null;
}

/**
 * Ordered pipeline stages for a tenant (shared by all recruiters on the portal).
 * Falls back to {@link DEFAULT_APPLICATION_PIPELINE_STATUSES} when unset or invalid.
 */
export async function getApplicationPipelineForTenant(tenantId: string): Promise<ApplicationPipelineStatus[]> {
  const tid = tenantId.trim();
  if (!tid) return [...DEFAULT_APPLICATION_PIPELINE_STATUSES];

  const db = getFirebaseAdminFirestore();
  const doc = await db.collection(PORTAL_TENANT_SETTINGS_COLLECTION).doc(tid).get();
  if (!doc.exists) return [...DEFAULT_APPLICATION_PIPELINE_STATUSES];

  const parsed = mapPipelineFromDoc(doc.data()?.applicationPipelineStatuses);
  if (!parsed) return [...DEFAULT_APPLICATION_PIPELINE_STATUSES];

  const withNew = ensureNewFirst(parsed);
  return withNew;
}

function ensureNewFirst(rows: ApplicationPipelineStatus[]): ApplicationPipelineStatus[] {
  const hasNew = rows.some((r) => r.id === "new");
  if (!hasNew) {
    return [{ id: "new", label: "New" }, ...rows];
  }
  const rest = rows.filter((r) => r.id !== "new");
  const newRow = rows.find((r) => r.id === "new")!;
  return [newRow, ...rest];
}

export type SetApplicationPipelineResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Replace the tenant’s pipeline. Enforces stable `new` as the first stage id (applications are created with status `new`).
 */
export async function setApplicationPipelineForTenant(
  tenantId: string,
  statuses: ApplicationPipelineStatus[],
): Promise<SetApplicationPipelineResult> {
  const tid = tenantId.trim();
  if (!tid) return { ok: false, error: "Missing tenant." };

  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { ok: false, error: "Add at least one stage." };
  }
  if (statuses.length > MAX_STAGES) {
    return { ok: false, error: `At most ${MAX_STAGES} stages.` };
  }

  const normalized: ApplicationPipelineStatus[] = [];
  const seen = new Set<string>();
  for (const row of statuses) {
    const id = row.id.trim();
    const label = row.label.trim();
    if (!id || !label) {
      return { ok: false, error: "Each stage needs an id and a label." };
    }
    if (label.length > MAX_LABEL_LEN) {
      return { ok: false, error: `Labels must be ${MAX_LABEL_LEN} characters or fewer.` };
    }
    if (!ID_RE.test(id)) {
      return {
        ok: false,
        error: "Stage ids must start with a letter and use lowercase letters, numbers, or underscores only.",
      };
    }
    if (seen.has(id)) {
      return { ok: false, error: "Duplicate stage id." };
    }
    seen.add(id);
    normalized.push({ id, label });
  }

  if (!normalized.some((r) => r.id === "new")) {
    return { ok: false, error: 'A stage with id "new" is required — new applications always start there.' };
  }

  const ordered = ensureNewFirst(normalized);
  if (ordered[0]?.id !== "new") {
    return { ok: false, error: 'The "new" stage must be first in the list.' };
  }

  const db = getFirebaseAdminFirestore();
  await db.collection(PORTAL_TENANT_SETTINGS_COLLECTION).doc(tid).set(
    {
      tenantId: tid,
      applicationPipelineStatuses: ordered,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true };
}
