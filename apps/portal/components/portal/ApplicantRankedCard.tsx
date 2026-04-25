"use client";

import { CandidateScreeningCard } from "@techrecruit/shared/components/jobs/CandidateScreeningCard";
import {
  type JobApplicationRecordClient,
  type JobApplicationStatus,
  isScreeningPendingOnRecord,
  JOB_APPLICATION_STATUS_LABELS,
  JOB_APPLICATION_STATUSES,
} from "@techrecruit/shared/lib/job-application-shared";
import { CaretRight, DownloadSimple, Star } from "@phosphor-icons/react";
import { useCallback, type KeyboardEvent } from "react";

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
  onDownloadCv: (id: string) => void | Promise<void>;
  jobPublicHref: string | null;
  pendingScreening: boolean;
};

export function ApplicantRankedCard({
  r,
  expanded,
  onToggle,
  onUpdateStatus,
  onDownloadCv,
  jobPublicHref,
  pendingScreening,
}: ApplicantRankedCardProps) {
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
