"use client";

import { CandidateScreeningCard } from "@techrecruit/shared/components/jobs/CandidateScreeningCard";
import {
  MAX_RECRUITER_COMMENT_CHARS,
  type JobApplicationRecordClient,
  type JobApplicationStatus,
  isScreeningPendingOnRecord,
  JOB_APPLICATION_STATUS_LABELS,
  JOB_APPLICATION_STATUSES,
} from "@techrecruit/shared/lib/job-application-shared";
import { CaretRight, DownloadSimple, NotePencil, PencilSimple, Star, Trash } from "@phosphor-icons/react";
import { useCallback, useState, type KeyboardEvent } from "react";

const AVATAR_HUES = [
  "bg-[#2563EB]",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-violet-500",
  "bg-cyan-600",
] as const;

function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  return "?";
}

function avatarColorKey(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % AVATAR_HUES.length;
}

function matchPercent(r: JobApplicationRecordClient): { pct: number; hasScore: boolean } {
  if (!r.screening) return { pct: 0, hasScore: false };
  const m = r.screening.match;
  const max = m.scoreMax ?? 100;
  if (max <= 0) return { pct: 0, hasScore: true };
  return { pct: Math.min(100, Math.max(0, Math.round((m.score / max) * 100))), hasScore: true };
}

function skillPills(r: JobApplicationRecordClient): string[] {
  const s = r.screening?.attributes?.skills;
  if (s?.length) {
    return s.slice(0, 4).map((x) => x.name.trim()).filter(Boolean);
  }
  const exp = r.screening?.attributes?.experience?.trim();
  if (exp) {
    const short = exp.length > 24 ? `${exp.slice(0, 22)}…` : exp;
    return [short];
  }
  return [];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type ApplicantRankedCardProps = {
  r: JobApplicationRecordClient;
  expanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (id: string, next: JobApplicationStatus) => void | Promise<void>;
  onAddComment: (id: string, text: string) => Promise<boolean>;
  onUpdateComment: (applicationId: string, commentId: string, text: string) => Promise<boolean>;
  onDeleteComment: (applicationId: string, commentId: string) => Promise<boolean>;
  /** Signed-in user — used to show edit/delete only for own notes. */
  recruiterUserId: string;
  onDownloadCv: (id: string) => void | Promise<void>;
  jobPublicHref: string | null;
  pendingScreening: boolean;
};

export function ApplicantRankedCard({
  r,
  expanded,
  onToggle,
  onUpdateStatus,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  recruiterUserId,
  onDownloadCv,
  jobPublicHref,
  pendingScreening,
}: ApplicantRankedCardProps) {
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const { pct, hasScore } = matchPercent(r);
  const highScore = hasScore && pct >= 90;
  const tags = skillPills(r);
  const hue = AVATAR_HUES[avatarColorKey(r.id)];

  const onRowKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  const submitNote = useCallback(async () => {
    const text = noteDraft.trim();
    if (!text) return;
    setNoteSaving(true);
    setNoteErr(null);
    const ok = await onAddComment(r.id, text);
    setNoteSaving(false);
    if (ok) setNoteDraft("");
    else setNoteErr("Couldn’t save this note. Try again.");
  }, [noteDraft, onAddComment, r.id]);

  const startEdit = useCallback((commentId: string, currentText: string) => {
    setEditErr(null);
    setEditingCommentId(commentId);
    setEditDraft(currentText);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditDraft("");
    setEditErr(null);
  }, []);

  const submitEdit = useCallback(async () => {
    if (!editingCommentId) return;
    const text = editDraft.trim();
    if (!text) return;
    setEditSaving(true);
    setEditErr(null);
    const ok = await onUpdateComment(r.id, editingCommentId, text);
    setEditSaving(false);
    if (ok) {
      setEditingCommentId(null);
      setEditDraft("");
    } else {
      setEditErr("Couldn’t save. You can only edit your own notes.");
    }
  }, [editDraft, editingCommentId, onUpdateComment, r.id]);

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!window.confirm("Delete this note? This can’t be undone.")) return;
      const ok = await onDeleteComment(r.id, commentId);
      if (!ok) {
        window.alert("Couldn’t delete. You can only delete your own notes.");
      }
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditDraft("");
      }
    },
    [editingCommentId, onDeleteComment, r.id],
  );

  return (
    <li
      className={`overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition dark:border-slate-500/25 dark:bg-slate-800/50 ${
        expanded ? "ring-2 ring-[#2563EB]/20 dark:ring-sky-500/25" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        onKeyDown={onRowKey}
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-stretch gap-3 px-4 py-3.5 text-left transition hover:bg-zinc-50/90 dark:hover:bg-slate-800/80 sm:gap-4 sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${hue}`}
            aria-hidden
          >
            {initials(r.firstName, r.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-semibold text-zinc-950 dark:text-slate-100">
                {r.firstName} {r.lastName}
              </span>
              {r.status === "shortlisted" ? (
                <Star
                  className="h-4 w-4 shrink-0 text-amber-500"
                  weight="fill"
                  aria-label="Shortlisted"
                />
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-slate-400">{r.jobTitle}</p>
            {tags.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex max-w-full truncate rounded-full border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="w-[4.5rem] text-right sm:w-[5.5rem]">
            {hasScore ? (
              <>
                <p
                  className={`text-lg font-bold tabular-nums leading-none ${
                    highScore
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-900 dark:text-slate-100"
                  }`}
                >
                  {pct}%
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-slate-600">
                  <div
                    className={`h-full rounded-full transition-all ${
                      highScore ? "bg-emerald-500" : "bg-[#2563EB]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            ) : pendingScreening ? (
              <p className="text-[11px] font-medium text-zinc-400 dark:text-slate-500">AI…</p>
            ) : (
              <p className="text-[11px] font-medium text-zinc-400 dark:text-slate-500">—</p>
            )}
          </div>
          <CaretRight
            className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform dark:text-slate-500 ${
              expanded ? "rotate-90" : ""
            }`}
            weight="bold"
            aria-hidden
          />
        </div>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4 dark:border-slate-600/40 dark:bg-slate-900/20 sm:px-5 sm:py-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">
              Candidate
            </p>
            {/*
              Fixed 2×2 placement on sm+: column 1 = Email, Status; column 2 = Applied, Phone.
              A 4-cell auto `grid` with a conditional Phone child previously reflowed Status to the
              wrong column when Phone was missing.
            */}
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-x-8 sm:gap-y-3">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-slate-400">Email</p>
                <a
                  href={`mailto:${r.email}`}
                  className="font-medium text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
                >
                  {r.email}
                </a>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-slate-400">Applied</p>
                <p className="text-zinc-800 dark:text-slate-200">{formatDate(r.createdAt)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-slate-400">Status</p>
                <select
                  value={r.status}
                  title={JOB_APPLICATION_STATUS_LABELS[r.status]}
                  onChange={(e) => void onUpdateStatus(r.id, e.target.value as JobApplicationStatus)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm font-medium text-zinc-900 outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/12 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-200"
                >
                  {JOB_APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {JOB_APPLICATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              {r.phone ? (
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-slate-400">Phone</p>
                  <a href={`tel:${r.phone}`} className="font-medium text-zinc-800 dark:text-slate-200">
                    {r.phone}
                  </a>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-zinc-500 dark:text-slate-400">
              {r.jobRef} · {r.companyName}
            </p>

            <div className="mt-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">
                Team notes
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-slate-400">
                Shared with everyone in your organization on this portal. Newest at the bottom. You can only edit
                or delete notes you created.
              </p>
              {(r.recruiterComments?.length ?? 0) === 0 ? (
                <p className="mt-2 text-sm text-zinc-400 dark:text-slate-500">No notes yet.</p>
              ) : (
                <ul className="mt-3 max-h-60 space-y-2.5 overflow-y-auto pr-0.5">
                  {r.recruiterComments!.map((c) => {
                    const isAuthor = c.authorUserId === recruiterUserId;
                    const isEditing = editingCommentId === c.id;
                    return (
                      <li
                        key={c.id}
                        className="rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-2.5 dark:border-slate-500/30 dark:bg-slate-800/40"
                      >
                        {isEditing ? (
                          <div>
                            <textarea
                              value={editDraft}
                              onChange={(e) => {
                                setEditDraft(e.target.value);
                                if (editErr) setEditErr(null);
                              }}
                              rows={3}
                              maxLength={MAX_RECRUITER_COMMENT_CHARS}
                              className="w-full max-w-xl rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-200"
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void submitEdit()}
                                disabled={editSaving || !editDraft.trim()}
                                className="rounded-lg bg-[#2563EB] px-2.5 py-1 text-xs font-semibold text-white transition enabled:hover:bg-[#1d4ed8] disabled:opacity-50"
                              >
                                {editSaving ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={editSaving}
                                className="text-xs font-semibold text-zinc-600 underline-offset-2 hover:underline dark:text-slate-400"
                              >
                                Cancel
                              </button>
                            </div>
                            {editErr ? (
                              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="status">
                                {editErr}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-slate-200">{c.text}</p>
                            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[10px] text-zinc-400 dark:text-slate-500">
                                {c.authorName} · {formatDate(c.createdAt)}
                                {c.updatedAt ? ` · Edited ${formatDate(c.updatedAt)}` : ""}
                              </p>
                              {isAuthor ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(c.id, c.text)}
                                    className="inline-flex items-center gap-0.5 rounded p-1 text-[10px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-200"
                                    title="Edit note"
                                  >
                                    <PencilSimple className="h-3.5 w-3.5" aria-hidden />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void removeComment(c.id)}
                                    className="inline-flex items-center gap-0.5 rounded p-1 text-[10px] font-semibold text-zinc-500 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                    title="Delete note"
                                  >
                                    <Trash className="h-3.5 w-3.5" aria-hidden />
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3">
                <label className="sr-only" htmlFor={`applicant-note-${r.id}`}>
                  Add a note
                </label>
                <textarea
                  id={`applicant-note-${r.id}`}
                  value={noteDraft}
                  onChange={(e) => {
                    setNoteDraft(e.target.value);
                    if (noteErr) setNoteErr(null);
                  }}
                  rows={3}
                  maxLength={MAX_RECRUITER_COMMENT_CHARS}
                  placeholder="Add a note (screening, interview, next steps)…"
                  className="w-full max-w-xl rounded-xl border border-zinc-200/90 bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-200"
                />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400 dark:text-slate-500">
                  <span>
                    {noteDraft.length} / {MAX_RECRUITER_COMMENT_CHARS}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void submitNote()}
                    disabled={noteSaving || !noteDraft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200/90 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition enabled:hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500/30 dark:bg-slate-800/50 dark:text-slate-200 dark:enabled:hover:bg-slate-800/80"
                  >
                    <NotePencil className="h-3.5 w-3.5" weight="bold" aria-hidden />
                    {noteSaving ? "Saving…" : "Add note"}
                  </button>
                  {noteErr ? (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400" role="status">
                      {noteErr}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {r.jobSlug?.trim() && jobPublicHref ? (
                <a
                  href={jobPublicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
                >
                  View public job page
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => void onDownloadCv(r.id)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] underline-offset-2 hover:underline dark:text-sky-400"
              >
                <DownloadSimple className="h-4 w-4" weight="bold" aria-hidden />
                Download CV
              </button>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">
                AI screening
              </p>
              {r.screening ? (
                <div className="mt-3">
                  <CandidateScreeningCard screening={r.screening} onClose={onToggle} />
                </div>
              ) : isScreeningPendingOnRecord(r) ? (
                <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">Screening is still being generated…</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">
                  No AI screening for this application yet. When your backend returns screening, it will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
