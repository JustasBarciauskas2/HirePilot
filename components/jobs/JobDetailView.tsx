"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { JobDetail } from "@/data/jobs";
import { JobApplyForm } from "@/components/jobs/JobApplyForm";
import { JobShareBlock } from "@/components/jobs/JobShareBlock";
import { JOB_COMP_PILL_HERO } from "@/components/jobs/job-comp-pill-styles";
import { equityPillText, showEquityNoteParagraph } from "@/lib/job-equity-pill";
import { salaryDisplayLine } from "@/lib/job-salary-display";
import type { JobFilterHighlight } from "@/lib/job-filter-highlight-url";
import {
  EMPTY_JOB_FILTER_HIGHLIGHT,
  JOB_PILL_EMERALD,
  JOB_PILL_ZINC,
} from "@/lib/job-filter-highlight-url";
import {
  Bell,
  Briefcase,
  Buildings,
  CaretRight,
  ChartLineUp,
  Clock,
  Coins,
  Globe,
  Info,
  MapPin,
  PaperPlaneRight,
  Star,
  Steps,
  TrendUp,
  Users,
  Wrench,
  EyeSlash,
} from "@phosphor-icons/react";

type Tab = "job" | "company";

/** Brand-tinted panels — ties sidebar / body cards to the hero gradient without heavy fill. */
const JOB_WIDGET_CARD =
  "overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-[#7107E7]/10";
const JOB_WIDGET_HEADER =
  "border-b border-[#7107E7]/10 bg-gradient-to-r from-[#7107E7]/[0.09] to-white px-4 py-2.5 text-sm font-bold tracking-tight text-zinc-900";
const JOB_WIDGET_LIST =
  "list-disc pl-5 text-sm leading-relaxed text-zinc-700 marker:text-[#7107E7]/45";

/**
 * Visible hover tip (not native `title` — those are flaky on SVGs and often don’t appear).
 * Renders in a portal with `position: fixed` so parent `overflow-hidden` doesn’t clip the bubble.
 */
function InfoHint({
  title: hint,
  iconClassName = "h-4 w-4",
}: {
  title: string;
  iconClassName?: string;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const el = triggerRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setCoords({ left: r.left + r.width / 2, top: r.top - 8 });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const tooltip =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[200] w-max max-w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-full rounded-lg border border-zinc-700/90 bg-zinc-900 px-3 py-2 text-left text-xs font-medium leading-snug text-white shadow-xl"
            style={{ left: coords.left, top: coords.top }}
          >
            {hint}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex shrink-0 cursor-default items-center justify-center leading-none text-zinc-400 [&_svg]:block [&_svg]:shrink-0"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={hint}
      >
        <Info className={iconClassName} weight="duotone" aria-hidden />
      </span>
      {tooltip}
    </>
  );
}

/** Fixed icon column + body — matches Elastic-style “icon rail” alignment. */
function HeroMetaRow({
  icon: Icon,
  children,
  /** `center`: icon vertically centers with content (salary pills, single-line rows). `start`: top-align for multi-line blocks (e.g. skills). */
  align = "center",
}: {
  icon: React.ComponentType<{ className?: string; weight?: "duotone" | "regular" | "bold" | "fill" }>;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`flex gap-3 sm:gap-3.5 ${align === "center" ? "items-center" : "items-start"}`}
    >
      <div
        className={`flex w-5 shrink-0 justify-center text-zinc-400 sm:w-6 ${
          align === "start" ? "pt-0.5" : ""
        }`}
        aria-hidden
      >
        <Icon className="h-4 w-4 shrink-0" weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function JobDetailView({
  job,
  filterHighlight = EMPTY_JOB_FILTER_HIGHLIGHT,
}: {
  job: JobDetail;
  filterHighlight?: JobFilterHighlight;
}) {
  const [tab, setTab] = useState<Tab>("job");

  const headline = `${job.title}, ${job.companyName}`.toUpperCase();
  const equityPill = equityPillText(job);
  const salaryLine = salaryDisplayLine(job);
  /** Listings use `location` (cities / full line); `locationTag` is a short label e.g. “Multiple locations”. */
  const locationDisplay = job.location.trim() || job.locationTag;

  const h = filterHighlight;
  const hasSkillFilter = h.skills.size > 0;
  const hasRegionFilter = h.regions.size > 0;
  const hasExpFilter = h.experienceLevels.size > 0;
  const hasSizeFilter = h.sizeBands.size > 0;
  const expMatch = hasExpFilter && h.experienceLevels.has(job.experienceLevel);
  const sizeMatch = hasSizeFilter && h.sizeBands.has(job.sizeBand);

  return (
    <div className="bg-[#f6f5f2]">
      {/* Hero band — brand accent */}
      <div className="border-b border-zinc-200/80 bg-gradient-to-b from-[#7107E7]/[0.09] via-violet-50/40 to-[#f6f5f2] pb-8 pt-24 sm:pb-10 sm:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-4 text-left text-sm text-zinc-500">
            <Link href="/" className="transition hover:text-[#7107E7]">
              Home
            </Link>
            <span className="mx-2 text-zinc-300">/</span>
            <Link href="/#roles" className="transition hover:text-[#7107E7]">
              View roles
            </Link>
            <span className="mx-2 text-zinc-300">/</span>
            <span className="font-mono text-xs text-zinc-600">{job.ref}</span>
          </nav>

          <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)]">
            <div className="flex items-center justify-end border-b border-zinc-100 bg-zinc-50/50 px-4 py-2.5 sm:px-6">
              <Link
                href="/#roles"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold leading-none text-zinc-700 shadow-sm transition hover:border-[#7107E7]/30 hover:text-[#7107E7] sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
                title="Browse roles on the homepage"
              >
                <span>Next vacancy</span>
                <CaretRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" weight="bold" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-0 md:grid-cols-2 md:items-stretch">
              <div className="border-b border-zinc-100 p-5 sm:p-6 md:border-b-0 md:border-r md:border-zinc-100">
                <h1 className="font-display text-left text-lg font-extrabold leading-snug tracking-tight text-zinc-950 sm:text-xl">
                  {headline}
                </h1>

                {equityPill || salaryLine || showEquityNoteParagraph(job) ? (
                  <div className="mt-2">
                    <HeroMetaRow icon={Coins}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {salaryLine ? (
                            <span className={JOB_COMP_PILL_HERO}>
                              <span className="min-w-0">{salaryLine}</span>
                            </span>
                          ) : null}
                          {equityPill ? (
                            <span className={JOB_COMP_PILL_HERO}>
                              <span className="min-w-0">{equityPill}</span>
                            </span>
                          ) : null}
                        </div>
                        {showEquityNoteParagraph(job) ? (
                          <p className="max-w-lg text-xs leading-relaxed text-zinc-500">{job.equityNote}</p>
                        ) : null}
                      </div>
                    </HeroMetaRow>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-col gap-3.5">
                  <HeroMetaRow icon={Briefcase}>
                    <p className="text-sm font-medium leading-snug text-zinc-900">{job.type}</p>
                  </HeroMetaRow>

                  <HeroMetaRow icon={Wrench} align="start">
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((s) => {
                        const match = hasSkillFilter && h.skills.has(s.name);
                        return (
                          <span
                            key={s.name}
                            className={match ? JOB_PILL_EMERALD : JOB_PILL_ZINC}
                          >
                            {s.name}
                          </span>
                        );
                      })}
                    </div>
                  </HeroMetaRow>

                  <HeroMetaRow icon={Steps}>
                    <p
                      className={`text-sm leading-snug ${expMatch ? "font-semibold text-emerald-900" : "text-zinc-800"}`}
                    >
                      {job.experienceLevel}
                    </p>
                  </HeroMetaRow>

                  <HeroMetaRow icon={MapPin}>
                    <p className="text-sm font-medium leading-snug text-zinc-800">{locationDisplay}</p>
                  </HeroMetaRow>

                  {job.regions.length > 0 ? (
                    <HeroMetaRow icon={Globe} align="start">
                      <div className="flex flex-wrap gap-1.5">
                        {job.regions.map((r) => {
                          const match = hasRegionFilter && h.regions.has(r);
                          return (
                            <span
                              key={r}
                              className={match ? JOB_PILL_EMERALD : JOB_PILL_ZINC}
                            >
                              {r}
                            </span>
                          );
                        })}
                      </div>
                    </HeroMetaRow>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-3.5 bg-zinc-50/40 p-5 sm:p-6">
                <div>
                  <p className="font-display text-xl font-bold tracking-tight text-[#7107E7] sm:text-2xl">
                    {job.companyName}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{job.companyTagline}</p>
                </div>

                <HeroMetaRow icon={Users}>
                  <p
                    className={`text-sm leading-snug ${sizeMatch ? "font-semibold text-emerald-900" : "text-zinc-800"}`}
                  >
                    {job.companySize}
                  </p>
                </HeroMetaRow>

                <HeroMetaRow icon={Briefcase}>
                  <div className="flex flex-wrap gap-1.5">
                    {job.industries.map((ind) => {
                      const match = Boolean(h.industry && ind === h.industry);
                      return (
                        <span
                          key={ind}
                          className={
                            match
                              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/85"
                              : "rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200/90"
                          }
                        >
                          {ind}
                        </span>
                      );
                    })}
                  </div>
                </HeroMetaRow>

                <HeroMetaRow icon={Clock}>
                  <p className="text-sm font-medium text-emerald-900">Open for applications</p>
                </HeroMetaRow>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:self-start">
                  <a
                    href="#apply"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7107E7] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.35)] transition hover:bg-[#5b06c2] sm:w-auto"
                  >
                    <PaperPlaneRight className="h-4 w-4" weight="bold" aria-hidden />
                    Apply for this role
                  </a>
                  <Link
                    href="/#contact"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/5 hover:text-[#5b06c2] sm:w-auto"
                  >
                    <Bell className="h-4 w-4" weight="duotone" />
                    Get updates via TechRecruit
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 border-b border-zinc-200/90 bg-[#f6f5f2]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setTab("job")}
              className={`flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition sm:px-4 ${
                tab === "job"
                  ? "border-[#7107E7] text-zinc-950"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Briefcase className="h-4 w-4" weight="duotone" />
              Job
            </button>
            <button
              type="button"
              onClick={() => setTab("company")}
              className={`flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition sm:px-4 ${
                tab === "company"
                  ? "border-[#7107E7] text-zinc-950"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Buildings className="h-4 w-4" weight="duotone" />
              Company
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            {tab === "job" ? (
              <JobRoleColumn job={job} />
            ) : (
              <JobCompanyColumn job={job} />
            )}
          </div>
          <div className="space-y-6 lg:col-span-5">
            <InsightsCard job={job} />
            <CompanySidebarCard job={job} tab={tab} />
            <SpecialistCard job={job} />
          </div>
        </div>

        <section
          id="apply"
          className="mt-10 scroll-mt-28 border-t border-zinc-200/80 pt-8"
        >
          <div className={JOB_WIDGET_CARD}>
            <div className={JOB_WIDGET_HEADER}>Apply</div>
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-zinc-950">Submit your application</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                {job.title} · {job.companyName}. Your CV is stored securely; our team uses these details to
                match you to this role.
              </p>
              <div className="mt-6">
                <JobApplyForm job={job} />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 border-t border-zinc-200/80 pt-8">
          <JobShareBlock job={job} />
        </div>
      </div>
    </div>
  );
}

function JobRoleColumn({ job }: { job: JobDetail }) {
  return (
    <div className={JOB_WIDGET_CARD}>
      <div className={JOB_WIDGET_HEADER}>Role</div>
      <section className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-zinc-950">Who you are</h2>
        <ul className={`mt-4 ${JOB_WIDGET_LIST} space-y-2`}>
          {job.whoYouAre.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {job.desirable.length > 0 ? (
          <>
            <h2 className="mt-10 text-lg font-bold text-zinc-950">Desirable</h2>
            <ul className={`mt-4 ${JOB_WIDGET_LIST} space-y-2`}>
              {job.desirable.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
        <h2 className="mt-10 text-lg font-bold text-zinc-950">What the job involves</h2>
        <ul className={`mt-4 ${JOB_WIDGET_LIST} space-y-2`}>
          {job.whatJobInvolves.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function JobCompanyColumn({ job }: { job: JobDetail }) {
  return (
    <div className={JOB_WIDGET_CARD}>
      <div className={JOB_WIDGET_HEADER}>Company</div>
      <section className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-zinc-950">Company benefits</h2>
        <ul className={`mt-4 ${JOB_WIDGET_LIST} space-y-2`}>
          {job.companyBenefits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <FundingBlock job={job} />
        <h2 className="mt-10 flex items-center gap-2 text-lg font-bold text-zinc-950">
          Our take
          <InfoHint title="TechRecruit’s short view on the company and opportunity—written by our team, not the employer." />
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{job.ourTake}</p>
      </section>
    </div>
  );
}

function InsightsCard({ job }: { job: JobDetail }) {
  const glassdoor = job.insights.glassdoorRating;
  return (
    <div className={JOB_WIDGET_CARD}>
      <div className={JOB_WIDGET_HEADER}>Insights</div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {job.insights.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#7107E7]/[0.07] px-3 py-1 text-xs font-medium text-zinc-800 ring-1 ring-[#7107E7]/15"
            >
              <ChartLineUp className="h-3.5 w-3.5 text-[#7107E7]/75" weight="duotone" />
              {t}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <TrendUp className="h-4 w-4" weight="bold" />
          {job.insights.growthStat}
        </p>
        {glassdoor != null ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Glassdoor</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800">({glassdoor})</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < glassdoor ? "text-emerald-500" : "text-zinc-200"}`}
                    weight={i < glassdoor ? "fill" : "regular"}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompanySidebarCard({ job, tab }: { job: JobDetail; tab: Tab }) {
  if (tab === "company") return null;
  return (
    <div className={JOB_WIDGET_CARD}>
      <div className={JOB_WIDGET_HEADER}>Company</div>
      <div className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-zinc-950">Company benefits</h3>
        <ul className={`mt-3 ${JOB_WIDGET_LIST} space-y-1.5`}>
          {job.companyBenefits.slice(0, 4).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <FundingBlock job={job} compact />
      </div>
    </div>
  );
}

function fundingFieldShown(raw: string | undefined): boolean {
  const t = raw?.trim();
  return Boolean(t && t !== "—");
}

function FundingNotDisclosed({
  label,
  compact,
  narrow,
}: {
  label: string;
  compact?: boolean;
  narrow?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-lg border border-dashed border-zinc-300/90 bg-white/70 text-zinc-500 ring-1 ring-zinc-200/60 ${
        compact ? "px-1.5 py-0.5 text-[10px] leading-tight" : "px-2 py-1 text-xs leading-snug"
      } ${narrow ? "min-w-0" : ""}`}
      title="Not published on this listing."
    >
      <EyeSlash
        className={`shrink-0 text-zinc-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`}
        weight="duotone"
        aria-hidden
      />
      <span className="font-medium">{label}</span>
    </span>
  );
}

function FundingBlock({ job, compact }: { job: JobDetail; compact?: boolean }) {
  const rounds = job.funding;
  const total = job.totalFunding?.trim();
  const showTotalFigure = fundingFieldShown(total);
  if (rounds.length === 0 && !showTotalFigure) return null;

  /**
   * Vertical line through center of column 2 — grid: [date] [dot] [amount] [round badge].
   * compact: 4.25rem + gap-2 + half of 1.25rem = 5.375rem
   * default: 6rem + gap-3 + half of 1.5rem = 7.5rem; sm: 7rem col → 8.5rem
   */
  const timelineLineClass = compact
    ? "left-[5.375rem]"
    : "left-[7.5rem] sm:left-[8.5rem]";

  const gridCols = compact
    ? "grid-cols-[4.25rem_1.25rem_minmax(0,1fr)_auto] gap-x-2"
    : "grid-cols-[6rem_1.5rem_minmax(0,1fr)_auto] gap-x-3 sm:grid-cols-[7rem_1.5rem_minmax(0,1fr)_auto]";

  return (
    <div className={compact ? "mt-6" : "mt-10"}>
      <div
        className={`overflow-hidden rounded-xl border border-zinc-200/80 bg-gradient-to-br from-[#7107E7]/[0.04] to-zinc-100/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] ring-1 ring-[#7107E7]/10 ${
          compact ? "p-3.5" : "p-4 sm:p-5"
        }`}
      >
        <h3
          className={`flex items-center gap-2 font-bold text-zinc-950 ${compact ? "text-xs" : "text-sm"}`}
        >
          {rounds.length > 0 ? (
            <>Funding (last {rounds.length} of 6 rounds)</>
          ) : (
            <>Funding</>
          )}
          <InfoHint
            iconClassName={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
            title="Funding rounds we have on record for this company (up to six, newest first). Total is a headline figure from public or shared data."
          />
        </h3>

        {rounds.length > 0 ? (
          <div className={`relative ${compact ? "mt-3" : "mt-4"}`}>
            <div
              className={`pointer-events-none absolute bottom-0 top-0 w-px bg-zinc-300 ${timelineLineClass}`}
              aria-hidden
            />
            <ul className="relative space-y-0">
              {rounds.map((r, i) => (
                <li
                  key={`${r.date}-${r.round}-${i}`}
                  className={`grid items-center gap-y-0 ${gridCols} ${compact ? "py-2.5" : "py-3"}`}
                >
                  <div
                    className={`text-right tabular-nums text-zinc-700 ${
                      compact ? "text-xs font-medium leading-snug" : "text-sm font-medium leading-snug"
                    }`}
                  >
                    {r.date}
                  </div>
                  <div className="flex justify-center">
                    <span
                      className={`z-10 shrink-0 rounded-full border-2 border-zinc-100 bg-zinc-400 shadow-[0_0_0_2px_rgba(244,244,245,0.95)] ${
                        compact ? "h-2 w-2" : "h-2.5 w-2.5"
                      }`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 justify-self-start">
                    {fundingFieldShown(r.amount) ? (
                      <p
                        className={`tabular-nums text-zinc-900 ${
                          compact ? "text-xs font-semibold leading-snug" : "text-sm font-semibold leading-snug"
                        }`}
                      >
                        {r.amount!.trim()}
                      </p>
                    ) : (
                      <FundingNotDisclosed label="Amount not disclosed" compact={compact} narrow />
                    )}
                  </div>
                  <div className="justify-self-end">
                    {fundingFieldShown(r.round) ? (
                      <span
                        className={`inline-flex rounded-full bg-sky-100 px-2.5 py-1 font-semibold uppercase leading-snug tracking-wide text-zinc-900 ring-1 ring-sky-200/90 ${
                          compact
                            ? "max-w-[10rem] truncate text-[10px]"
                            : "max-w-[12rem] text-[11px] sm:max-w-none sm:text-xs"
                        }`}
                      >
                        {r.round!.trim()}
                      </span>
                    ) : (
                      <FundingNotDisclosed label="Round not disclosed" compact={compact} narrow />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showTotalFigure ? (
          <p
            className={`border-t border-zinc-200/80 text-zinc-900 ${compact ? "mt-3 border-dashed pt-2.5 text-xs font-semibold leading-snug" : "mt-4 pt-4 text-sm font-semibold leading-snug"}`}
          >
            Total funding: {total}
          </p>
        ) : rounds.length > 0 ? (
          <div
            className={`flex flex-wrap items-center gap-2 border-t border-dashed border-zinc-200/80 text-zinc-500 ${compact ? "mt-3 pt-2.5" : "mt-4 pt-4"}`}
          >
            <FundingNotDisclosed label="Total funding not disclosed" compact={compact} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpecialistCard({ job }: { job: JobDetail }) {
  return (
    <div className={JOB_WIDGET_CARD}>
      <div className={JOB_WIDGET_HEADER}>Leadership</div>
      <div className="flex gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7107E7]/10 text-sm font-bold text-[#7107E7] ring-1 ring-[#7107E7]/20">
          {job.specialist.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="font-semibold text-zinc-950">{job.specialist.name}</p>
          <p className="mt-0.5 text-sm text-zinc-600">{job.specialist.title}</p>
        </div>
      </div>
    </div>
  );
}
