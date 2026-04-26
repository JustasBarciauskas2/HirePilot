import type { JobApplicationRecordClient } from "@techrecruit/shared/lib/job-application-shared";

const VIEWED_IDS_STORAGE_V = "v1";

function viewedIdsStorageKey(tenantId: string, userId: string): string {
  return `portal-app-viewed:${VIEWED_IDS_STORAGE_V}:${tenantId}:${userId}`;
}

export function loadViewedApplicationIds(tenantId: string, userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(viewedIdsStorageKey(tenantId, userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0));
  } catch {
    return new Set();
  }
}

export function persistViewedApplicationIds(tenantId: string, userId: string, ids: Set<string>): void {
  try {
    const arr = [...ids];
    const capped = arr.length > 1000 ? arr.slice(arr.length - 1000) : arr;
    localStorage.setItem(viewedIdsStorageKey(tenantId, userId), JSON.stringify(capped));
  } catch {
    /* quota / private mode */
  }
}

/** Not yet opened in this browser (any pipeline status). New users start with an empty viewed set → all rows unread. */
export function countUnreadApplications(
  rows: JobApplicationRecordClient[] | null | undefined,
  viewedIds: Set<string>,
): number {
  if (!rows?.length) return 0;
  return rows.filter((r) => !viewedIds.has(r.id)).length;
}
