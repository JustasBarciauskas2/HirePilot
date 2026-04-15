"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Six columns: Received, Candidate, Contact, Vacancy, Status, CV & screening */
/** Status min must fit longest label (“Shortlisted”) in the native <select>. */
export const APPLICATIONS_TABLE_DEFAULT_WIDTHS = [148, 160, 200, 240, 200, 232] as const;

const MIN_WIDTHS = [72, 88, 120, 140, 168, 168] as const;

function storageKey(uid: string): string {
  return `portal:applicationsTable:cols:v2:${uid}`;
}

function clampWidths(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== APPLICATIONS_TABLE_DEFAULT_WIDTHS.length) return null;
  const out: number[] = [];
  for (let i = 0; i < APPLICATIONS_TABLE_DEFAULT_WIDTHS.length; i++) {
    const n = raw[i];
    const v = typeof n === "number" && Number.isFinite(n) ? n : APPLICATIONS_TABLE_DEFAULT_WIDTHS[i];
    out.push(Math.max(MIN_WIDTHS[i], Math.min(640, Math.round(v))));
  }
  return out;
}

export function useApplicationsTableColumnWidths(userUid: string | undefined) {
  const [widths, setWidths] = useState<number[]>(() => [...APPLICATIONS_TABLE_DEFAULT_WIDTHS]);
  const dragRef = useRef<{ left: number; right: number; startX: number; startWidths: number[] } | null>(null);
  const lastWidthsRef = useRef<number[]>([...APPLICATIONS_TABLE_DEFAULT_WIDTHS]);

  useEffect(() => {
    lastWidthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    if (!userUid || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey(userUid));
      if (!raw) return;
      const parsed = clampWidths(JSON.parse(raw) as unknown);
      if (parsed) {
        setWidths(parsed);
        lastWidthsRef.current = parsed;
      }
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
        /* ignore quota */
      }
    },
    [userUid],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      let dx = e.clientX - d.startX;
      const w = d.startWidths;
      const li = d.left;
      const ri = d.right;
      const maxLeft = w[li]! - MIN_WIDTHS[li]!;
      const maxRight = w[ri]! - MIN_WIDTHS[ri]!;
      dx = Math.max(-maxLeft, Math.min(dx, maxRight));
      const next = [...w];
      next[li] = Math.round(next[li]! + dx);
      next[ri] = Math.round(next[ri]! - dx);
      setWidths(next);
      lastWidthsRef.current = next;
    };

    const onUp = () => {
      if (dragRef.current) {
        persist(lastWidthsRef.current);
      }
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [persist]);

  /**
   * Resize between two **logical** column indices (after reordering, adjacent columns in the UI
   * may correspond to any pair of logical indices).
   */
  const onResizeBetweenLogical =
    (leftLogical: number, rightLogical: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (leftLogical < 0 || rightLogical < 0 || leftLogical >= MIN_WIDTHS.length || rightLogical >= MIN_WIDTHS.length) {
        return;
      }
      dragRef.current = {
        left: leftLogical,
        right: rightLogical,
        startX: e.clientX,
        startWidths: [...lastWidthsRef.current],
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };

  return { widths, onResizeBetweenLogical };
}
