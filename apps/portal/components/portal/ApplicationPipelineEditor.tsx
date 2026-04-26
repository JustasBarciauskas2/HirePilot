"use client";

import type { JobApplicationRecordClient } from "@techrecruit/shared/lib/job-application-shared";
import {
  DEFAULT_APPLICATION_PIPELINE_STATUSES,
  type ApplicationPipelineStatus,
  slugifyApplicationPipelineId,
} from "@techrecruit/shared/lib/job-application-shared";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { ArrowDown, ArrowUp, Plus, Trash, X } from "@phosphor-icons/react";
import type { User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ApplicationPipelineEditorProps = {
  open: boolean;
  onClose: () => void;
  pipeline: ApplicationPipelineStatus[];
  rows: JobApplicationRecordClient[] | null;
  user: User;
  onSaved: (next: ApplicationPipelineStatus[]) => void;
};

export function ApplicationPipelineEditor({
  open,
  onClose,
  pipeline,
  rows,
  user,
  onSaved,
}: ApplicationPipelineEditorProps) {
  const [draft, setDraft] = useState<ApplicationPipelineStatus[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (open && !prevOpen.current) {
      setDraft(pipeline.map((x) => ({ ...x })));
      setErr(null);
      setNewLabel("");
    }
    prevOpen.current = open;
  }, [open, pipeline]);

  const usageByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const id = r.status.trim();
      if (!id) continue;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      setErr(null);
      return next;
    });
  }, []);

  const removeAt = useCallback((index: number) => {
    setDraft((prev) => {
      if (prev.length <= 1) {
        setErr("Keep at least one stage — new applicants are placed in the first stage.");
        return prev;
      }
      const row = prev[index];
      if (!row) return prev;
      const n = usageByStatus.get(row.id) ?? 0;
      if (n > 0) {
        setErr(`Move the ${n} applicant${n === 1 ? "" : "s"} out of “${row.label}” before removing this stage.`);
        return prev;
      }
      const next = prev.filter((_, i) => i !== index);
      setErr(null);
      return next;
    });
  }, [usageByStatus]);

  const addStage = useCallback(() => {
    const label = newLabel.trim();
    if (!label) {
      setErr("Enter a name for the new stage.");
      return;
    }
    setDraft((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const id = slugifyApplicationPipelineId(label, ids);
      setErr(null);
      setNewLabel("");
      return [...prev, { id, label }];
    });
  }, [newLabel]);

  const restoreDefaults = useCallback(() => {
    if (!window.confirm("Reset all stages to the default list? Your current order and custom stages will be replaced.")) {
      return;
    }
    setDraft(DEFAULT_APPLICATION_PIPELINE_STATUSES.map((x) => ({ ...x })));
    setErr(null);
  }, []);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      if (draft.length < 1) {
        setErr("Add at least one stage.");
        return;
      }
      const headers = await portalAuthHeaders(user);
      const res = await fetch("/api/portal/application-pipeline", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ statuses: draft }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; statuses?: ApplicationPipelineStatus[] };
      if (!res.ok) {
        setErr(typeof data.error === "string" && data.error.trim() ? data.error : `Could not save (${res.status}).`);
        return;
      }
      if (Array.isArray(data.statuses) && data.statuses.length) {
        onSaved(data.statuses);
      } else {
        onSaved(draft);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="pipeline-editor-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/40 dark:bg-slate-950/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-slate-500/30 dark:bg-slate-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 dark:border-slate-600/40 sm:px-5">
          <div className="min-w-0">
            <h2 id="pipeline-editor-title" className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">
              Pipeline stages
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-slate-400">
              Same list and order for everyone on your team. <strong className="font-medium text-zinc-700 dark:text-slate-300">New applicants</strong> are assigned the{" "}
              <strong className="font-medium text-zinc-700 dark:text-slate-300">first</strong> stage. You can rename, reorder, add, or remove stages (remove only when no applicants
              are still in that stage).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-200/90 bg-white p-2 text-zinc-500 transition hover:bg-zinc-50 dark:border-slate-500/40 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" weight="bold" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {err ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
              {err}
            </p>
          ) : null}

          <ul className="space-y-2">
            {draft.map((row, index) => {
              const used = usageByStatus.get(row.id) ?? 0;
              const onlyStage = draft.length <= 1;
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-3 dark:border-slate-500/25 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <input
                      value={row.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraft((prev) => prev.map((r, i) => (i === index ? { ...r, label: v } : r)));
                      }}
                      aria-label={`Stage name (${row.id})`}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
                    />
                    {used > 0 ? (
                      <div className="shrink-0 text-[10px] text-zinc-500 dark:text-slate-400">
                        {used} applicant{used === 1 ? "" : "s"}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="rounded-lg border border-zinc-200/90 bg-white p-2 text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-40 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
                      aria-label="Move up"
                      title="Move up (priority)"
                    >
                      <ArrowUp className="h-4 w-4" weight="bold" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={index >= draft.length - 1}
                      onClick={() => move(index, 1)}
                      className="rounded-lg border border-zinc-200/90 bg-white p-2 text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-40 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
                      aria-label="Move down"
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" weight="bold" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={onlyStage || used > 0}
                      onClick={() => removeAt(index)}
                      className="rounded-lg border border-zinc-200/90 bg-white p-2 text-zinc-600 transition enabled:hover:border-rose-200 enabled:hover:bg-rose-50 enabled:hover:text-rose-700 disabled:opacity-40 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-300 dark:enabled:hover:border-rose-900/50 dark:enabled:hover:bg-rose-950/40 dark:enabled:hover:text-rose-200"
                      aria-label="Remove stage"
                      title={
                        onlyStage
                          ? "At least one stage is required."
                          : used > 0
                            ? "Move applicants out of this stage first."
                            : "Remove stage"
                      }
                    >
                      <Trash className="h-4 w-4" weight="bold" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white/60 px-3 py-3 dark:border-slate-500/35 dark:bg-slate-800/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-slate-500">Add stage</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Phone screen"
                aria-label="New stage name"
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => addStage()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2563EB]/35 bg-[#2563EB]/10 px-3 py-2 text-sm font-semibold text-[#1d4ed8] transition hover:bg-[#2563EB]/15 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-300"
              >
                <Plus className="h-4 w-4" weight="bold" aria-hidden />
                Add
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={restoreDefaults}
            className="mt-4 text-xs font-semibold text-zinc-600 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Restore default stages
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3 dark:border-slate-600/40 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-slate-500/25 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || draft.length < 1}
            onClick={() => void save()}
            className="rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {saving ? "Saving…" : "Save for team"}
          </button>
        </div>
      </div>
    </div>
  );
}
