import type { JobApplicationRecordClient } from "@techrecruit/shared/lib/job-application-shared";

const VIEWED_IDS_STORAGE_V = "v1";
const BASELINE_STORAGE_V = "v1";

function viewedIdsStorageKey(tenantId: string, userId: string): string {
  return `portal-app-viewed:${VIEWED_IDS_STORAGE_V}:${tenantId}:${userId}`;
}

function inboxBaselineStorageKey(tenantId: string, userId: string): string {
  return `portal-app-inbox-baseline:${BASELINE_STORAGE_V}:${tenantId}:${userId}`;
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

/**
 * First time we see this tenant+user in this browser:
 * - If they already had a viewed-id list (legacy), baseline is epoch → unread = "not in viewed" (old behavior).
 * - Otherwise (fresh teammate / new device with no history), baseline is now → only applications created after
 *   this moment count as unread until opened.
 */
export function getOrInitInboxBaselineMs(tenantId: string, userId: string): number {
  if (typeof window === "undefined") return Date.parse("1970-01-01T00:00:00.000Z");
  const bKey = inboxBaselineStorageKey(tenantId, userId);
  const existing = localStorage.getItem(bKey);
  if (existing) {
    const ms = Date.parse(existing);
    if (!Number.isNaN(ms)) return ms;
  }
  const hadViewedList = localStorage.getItem(viewedIdsStorageKey(tenantId, userId)) !== null;
  const baselineIso = hadViewedList ? "1970-01-01T00:00:00.000Z" : new Date().toISOString();
  try {
    localStorage.setItem(bKey, baselineIso);
  } catch {
    /* ignore */
  }
  return Date.parse(baselineIso);
}

export function applicationCreatedAfterBaseline(row: JobApplicationRecordClient, baselineMs: number): boolean {
  const t = Date.parse(row.createdAt);
  if (Number.isNaN(t)) return true;
  return t > baselineMs;
}

export function isApplicationUnread(
  row: JobApplicationRecordClient,
  viewedIds: Set<string>,
  baselineMs: number,
): boolean {
  return applicationCreatedAfterBaseline(row, baselineMs) && !viewedIds.has(row.id);
}

/** While baseline is null (before client init), treat as no unreads to avoid SSR/flash mismatch. */
export function countUnreadApplications(
  rows: JobApplicationRecordClient[] | null | undefined,
  viewedIds: Set<string>,
  baselineMs: number | null,
): number {
  if (baselineMs == null || !rows?.length) return 0;
  return rows.filter((r) => isApplicationUnread(r, viewedIds, baselineMs)).length;
}
