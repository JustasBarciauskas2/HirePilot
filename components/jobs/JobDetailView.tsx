"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { JobDetail } from "@/data/jobs";
import { CompensationPillIcon } from "@/components/jobs/CompensationPillIcon";
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
  Star,
  Steps,
  TrendUp,
  Users,
  Wrench,
} from "@phosphor-icons/react";

type Tab = "job" | "company";

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
      {/* Hero band — Meridian accent instead of yellow */}
      <div className="border-b border-zinc-200/80 bg-gradient-to-b from-[#7107E7]/[0.09] via-violet-50/40 to-[#f6f5f2] pb-8 pt-24 sm:pb-10 sm:pt-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-4 text-left text-sm text-zinc-500">
            <Link href="/" className="transition hover:text-[#7107E7]">
              Home
            </Link>
            <span className="mx-2 text-zinc-300">/</span>
            <Link href="/#roles" className="transition hover:text-[#7107E7]">
              Open roles
            </Link>
            <span className="mx-2 text-zinc-300">/</span>
            <span className="font-mono text-xs text-zinc-600">{job.ref}</span>
          </nav>

          <div className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)]">
            <div className="grid gap-0 md:grid-cols-2 md:items-stretch">
              <div className="border-b border-zinc-100 p-5 sm:p-6 md:border-b-0 md:border-r md:border-zinc-100">
                <h1 className="font-display text-left text-lg font-extrabold leading-snug tracking-tight text-zinc-950 sm:text-xl">
                  {headline}
                </h1>

                <div className="mt-4 flex flex-col gap-3.5">
                  {equityPill || salaryLine || showEquityNoteParagraph(job) ? (
                    <HeroMetaRow icon={Coins}>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {equityPill ? (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold leading-none text-emerald-900 ring-1 ring-emerald-200/90 sm:text-sm">
                              <CompensationPillIcon
                                text={equityPill}
                                variant="equity"
                                className="size-3.5 text-emerald-600 sm:size-4"
                              />
                              <span className="min-w-0">{equityPill}</span>
                            </span>
                          ) : null}
                          {salaryLine ? (
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold leading-none text-emerald-900 ring-1 ring-emerald-200/90 sm:text-sm">
                              <CompensationPillIcon job={job} className="size-3.5 text-emerald-600 sm:size-4" />
                              <span className="min-w-0">{salaryLine}</span>
                            </span>
                          ) : null}
                        </div>
                        {showEquityNoteParagraph(job) ? (
                          <p className="max-w-lg text-xs leading-relaxed text-zinc-500">{job.equityNote}</p>
                        ) : null}
                      </div>
                    </HeroMetaRow>
                  ) : null}

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

                <Link
                  href="/#contact"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/5 hover:text-[#5b06c2] sm:w-auto sm:self-start"
                >
                  <Bell className="h-4 w-4" weight="duotone" />
                  Get updates via Meridian
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 border-b border-zinc-200/90 bg-[#f6f5f2]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
          <Link
            href="/#roles"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-[#7107E7]/30 hover:text-[#7107E7] sm:flex"
            aria-label="Next role"
          >
            <CaretRight className="h-5 w-5" weight="bold" />
          </Link>
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
      </div>
    </div>
  );
}

function JobRoleColumn({ job }: { job: JobDetail }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="bg-zinc-200/50 px-4 py-2.5 text-sm font-bold tracking-tight text-zinc-900 ring-1 ring-zinc-200/80">
        Role
      </div>
      <section className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-zinc-950">Who you are</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          {job.whoYouAre.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {job.desirable.length > 0 ? (
          <>
            <h2 className="mt-10 text-lg font-bold text-zinc-950">Desirable</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
              {job.desirable.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
        <h2 className="mt-10 text-lg font-bold text-zinc-950">What the job involves</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
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
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="bg-zinc-200/50 px-4 py-2.5 text-sm font-bold tracking-tight text-zinc-900 ring-1 ring-zinc-200/80">
        Company
      </div>
      <section className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-zinc-950">Company benefits</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
          {job.companyBenefits.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <FundingBlock job={job} />
        <h2 className="mt-10 flex items-center gap-2 text-lg font-bold text-zinc-950">
          Our take
          <InfoHint title="Meridian’s short view on the company and opportunity—written by our team, not the employer." />
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700">{job.ourTake}</p>
      </section>
    </div>
  );
}

function InsightsCard({ job }: { job: JobDetail }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="bg-zinc-200/50 px-4 py-2.5 text-sm font-bold text-zinc-900 ring-1 ring-zinc-200/80">
        Insights
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {job.insights.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200/80"
            >
              <ChartLineUp className="h-3.5 w-3.5 text-zinc-500" weight="duotone" />
              {t}
            </span>
          ))}
        </div>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <TrendUp className="h-4 w-4" weight="bold" />
          {job.insights.growthStat}
        </p>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Glassdoor</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-800">({job.insights.glassdoorRating})</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < job.insights.glassdoorRating ? "text-emerald-500" : "text-zinc-200"}`}
                  weight={i < job.insights.glassdoorRating ? "fill" : "regular"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanySidebarCard({ job, tab }: { job: JobDetail; tab: Tab }) {
  if (tab === "company") return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="bg-zinc-200/50 px-4 py-2.5 text-sm font-bold text-zinc-900 ring-1 ring-zinc-200/80">
        Company
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="text-sm font-bold text-zinc-950">Company benefits</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
          {job.companyBenefits.slice(0, 4).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <FundingBlock job={job} compact />
      </div>
    </div>
  );
}

function FundingBlock({ job, compact }: { job: JobDetail; compact?: boolean }) {
  return (
    <div className={compact ? "mt-6" : "mt-10"}>
      <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-950">
        Funding (last {job.funding.length} of 6 rounds)
        <InfoHint
          iconClassName="h-3.5 w-3.5"
          title="Funding rounds we have on record for this company (up to six, newest first). Total is a headline figure from public or shared data."
        />
      </h3>
      <ul className="mt-4 space-y-4 border-l-2 border-zinc-200 pl-4">
        {job.funding.map((r) => (
          <li key={r.date} className="relative">
            <span className="absolute -left-[calc(1rem+3px)] top-1.5 h-2 w-2 rounded-full bg-zinc-300 ring-2 ring-white" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">{r.date}</span>
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200/80">
                {r.round}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{r.amount}</p>
          </li>
        ))}
      </ul>
      <p className={`font-bold text-zinc-900 ${compact ? "mt-3 text-xs" : "mt-4 text-sm"}`}>
        Total funding: {job.totalFunding}
      </p>
    </div>
  );
}

function SpecialistCard({ job }: { job: JobDetail }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
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
  );
}
