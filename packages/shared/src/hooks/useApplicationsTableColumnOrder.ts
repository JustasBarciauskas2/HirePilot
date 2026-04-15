"use client";

import { useCallback, useEffect, useState } from "react";

import { APPLICATIONS_TABLE_DEFAULT_WIDTHS } from "@techrecruit/shared/hooks/useApplicationsTableColumnWidths";

const COL_COUNT = APPLICATIONS_TABLE_DEFAULT_WIDTHS.length;

const DEFAULT_ORDER = (): number[] => Array.from({ length: COL_COUNT }, (_, i) => i);

function storageKey(uid: string): string {
  return `portal:applicationsTable:colOrder:v2:${uid}`;
}

function parseOrder(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== COL_COUNT) return null;
  const nums = raw.map((x) => (typeof x === "number" && Number.isInteger(x) ? x : NaN));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n >= COL_COUNT)) return null;
  const set = new Set(nums);
  if (set.size !== COL_COUNT) return null;
  return nums;
}

export function reorderColumnOrder(order: number[], fromIndex: number, toIndex: number): number[] {
  if (fromIndex === toIndex) return order;
  if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) return order;
  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function useApplicationsTableColumnOrder(userUid: string | undefined) {
  const [columnOrder, setColumnOrder] = useState<number[]>(DEFAULT_ORDER);

  useEffect(() => {
    if (!userUid || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey(userUid));
      if (!raw) return;
      const parsed = parseOrder(JSON.parse(raw) as unknown);
      if (parsed) setColumnOrder(parsed);
    } catch {
      /* ignore */
    }
  }, [userUid]);

  const persist = useCallback(
    (next: number[]) => {
      if (!userUid || typeof window === "undefined") return;
      try {
        localStorage.setItem(storageKey(userUid), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [userUid],
  );

  const moveColumn = useCallback(
    (fromVisualIndex: number, toVisualIndex: number) => {
      setColumnOrder((prev) => {
        const next = reorderColumnOrder(prev, fromVisualIndex, toVisualIndex);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { columnOrder, moveColumn };
}
