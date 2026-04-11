"use client";

import type { JobSizeBand } from "@/data/jobs";
import { JOB_SIZE_BANDS } from "@/data/job-types";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Buildings,
  CaretDown,
  CaretUp,
  Coins,
  Funnel,
  Globe,
  MagnifyingGlass,
  MapPin,
  SlidersHorizontal,
  Wrench,
  X,
} from "@phosphor-icons/react";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import type { JobDetail } from "@/data/jobs";
import { CompensationPillIcon } from "@/components/jobs/CompensationPillIcon";
import { equityPillText } from "@/lib/job-equity-pill";
import { salaryDisplayLine } from "@/lib/job-salary-display";
import {
  buildJobDetailHref,
  jobFilterHighlightFromState,
} from "@/lib/job-filter-highlight-url";
import {
  filterJobs,
  hasAnyFilter,
  matchesType,
  type JobFilterState,
  type TypeFilter,
  type WorkFilter,
  SIZE_BAND_LABELS,
  uniqueExperienceLevels,
  uniqueIndustries,
  uniqueRegions,
  uniqueSkills,
} from "@/lib/job-filters";
import { Reveal } from "./Reveal";

const selectClass =
  "w-full min-w-[9.5rem] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none transition focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15 sm:min-w-0";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/50 focus:ring-2 focus:ring-[#7107E7]/15";

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

const SIZE_BAND_ORDER: JobSizeBand[] = [...JOB_SIZE_BANDS];

/** Compact pills on listing cards — emerald only when that filter dimension is active and matches. */
const cardPillEmerald =
  "rounded-md bg-emerald-50/90 px-2 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-emerald-200/70";
const cardPillZinc =
  "rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600";

const cardCompPill =
  "inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-emerald-900 ring-1 ring-emerald-200/85";

/** Icon column + body — separates skill / region / comp blocks on listing cards. */
function CardFactRow({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; weight?: "duotone" | "regular" | "bold" | "fill" }>;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="flex w-5 shrink-0 justify-center pt-0.5 text-zinc-400" aria-hidden>
        <Icon className="h-4 w-4" weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function JobVacancies({ jobs }: { jobs: JobDetail[] }) {
  const advancedDetailsRef = useRef<HTMLDetailsElement>(null);
  const rolesSectionRef = useRef<HTMLElement>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [work, setWork] = useState<WorkFilter>("all");
  const [industry, setIndustry] = useState("all");
  const [skills, setSkills] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [sizeBands, setSizeBands] = useState<JobSizeBand[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);

  const industries = useMemo(() => uniqueIndustries(jobs), [jobs]);
  const skillOptions = useMemo(() => uniqueSkills(jobs), [jobs]);
  const regionOptions = useMemo(() => uniqueRegions(jobs), [jobs]);
  const experienceOptions = useMemo(() => uniqueExperienceLevels(jobs), [jobs]);

  const filterState: JobFilterState = useMemo(
    () => ({
      q,
      type,
      work,
      industry,
      skills,
      regions,
      sizeBands,
      experienceLevels,
    }),
    [q, type, work, industry, skills, regions, sizeBands, experienceLevels],
  );

  const filtered = useMemo(() => filterJobs(jobs, filterState), [jobs, filterState]);

  const highlight = useMemo(
    () => jobFilterHighlightFromState(filterState),
    [filterState],
  );
  const hasSkillHighlight = highlight.skills.size > 0;
  const hasRegionHighlight = highlight.regions.size > 0;
  const hasSizeHighlight = highlight.sizeBands.size > 0;
  const hasTypeHighlight = type !== "all";

  const hasFilters = hasAnyFilter(filterState);

  function clearFilters() {
    setQ("");
    setType("all");
    setWork("all");
    setIndustry("all");
    setSkills([]);
    setRegions([]);
    setSizeBands([]);
    setExperienceLevels([]);
  }

  return (
    <section
      ref={rolesSectionRef}
      id="roles"
      className="relative z-10 scroll-mt-24 border-b border-zinc-200/80 bg-white py-24 sm:scroll-mt-28 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#7107E7]">
            Looking for a job?
          </p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display max-w-xl text-3xl font-semibold tracking-tighter text-zinc-950 sm:text-4xl">
              Roles we&apos;re <span className="text-[#7107E7]">actively recruiting</span> for
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-zinc-500">
              Search, then use quick filters—or open <strong className="font-medium text-zinc-700">Advanced</strong>{" "}
              for tech stack, regions, company size, and seniority.
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-10" delay={0.04}>
          <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="job-search"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                >
                  Search
                </label>
                <div className="relative">
                  <MagnifyingGlass
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                    weight="duotone"
                    aria-hidden
                  />
                  <input
                    id="job-search"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Title, company, skill, ref, region…"
                    autoComplete="off"
                    className={inputClass}
                  />
                  {q ? (
                    <button
                      type="button"
                      onClick={() => setQ("")}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" weight="bold" />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                <div>
                  <label
                    htmlFor="filter-type"
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Contract
                  </label>
                  <select
                    id="filter-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as TypeFilter)}
                    className={selectClass}
                  >
                    <option value="all">All types</option>
                    <option value="full-time">Full-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="filter-work"
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Work style
                  </label>
                  <select
                    id="filter-work"
                    value={work}
                    onChange={(e) => setWork(e.target.value as WorkFilter)}
                    className={selectClass}
                  >
                    <option value="all">All</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Office / onsite</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label
                    htmlFor="filter-industry"
                    className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
                  >
                    Industry
                  </label>
                  <select
                    id="filter-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All industries</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <details
              ref={advancedDetailsRef}
              className="group mt-4 border-t border-zinc-200/80 pt-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-1 py-2 text-sm font-semibold text-zinc-900 transition hover:text-[#7107E7] [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#7107E7]" weight="duotone" aria-hidden />
                  Advanced filters
                  <span className="font-normal text-zinc-500">
                    (tech stack, location &amp; region, company size, seniority)
                  </span>
                </span>
                <CaretDown
                  className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180"
                  weight="bold"
                  aria-hidden
                />
              </summary>

              <div className="mt-6 space-y-8 border-t border-zinc-200/60 pt-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Tech stack
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Select any technologies you care about—roles that include <strong className="font-medium text-zinc-700">at least one</strong> of your picks will show.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skillOptions.map((name) => {
                      const checked = skills.includes(name);
                      return (
                        <label
                          key={name}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            checked
                              ? "border-[#7107E7]/50 bg-[#7107E7]/10 text-[#4c0599]"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => setSkills((prev) => toggleInArray(prev, name))}
                          />
                          {name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Location &amp; region
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Roles can match multiple regions (e.g. US + Remote). We use any selected tag.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {regionOptions.map((r) => {
                      const checked = regions.includes(r);
                      return (
                        <label
                          key={r}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                            checked
                              ? "border-[#7107E7]/50 bg-[#7107E7]/10 text-[#4c0599]"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => setRegions((prev) => toggleInArray(prev, r))}
                          />
                          {r}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Company size
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {SIZE_BAND_ORDER.map((band) => {
                        const checked = sizeBands.includes(band);
                        return (
                          <label
                            key={band}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 transition hover:border-zinc-300 has-[:checked]:border-[#7107E7]/45 has-[:checked]:bg-[#7107E7]/8"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-zinc-300 text-[#7107E7] focus:ring-[#7107E7]/30"
                              checked={checked}
                              onChange={() => setSizeBands((prev) => toggleInArray(prev, band))}
                            />
                            {SIZE_BAND_LABELS[band]}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Seniority / role type
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">From each listing&apos;s experience line.</p>
                    <div className="mt-3 flex flex-col gap-2">
                      {experienceOptions.map((level) => {
                        const checked = experienceLevels.includes(level);
                        return (
                          <label
                            key={level}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 transition hover:border-zinc-300 has-[:checked]:border-[#7107E7]/45 has-[:checked]:bg-[#7107E7]/8"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-[#7107E7] focus:ring-[#7107E7]/30"
                              checked={checked}
                              onChange={() =>
                                setExperienceLevels((prev) => toggleInArray(prev, level))
                              }
                            />
                            <span>{level}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center border-t border-zinc-200/60 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    const details = advancedDetailsRef.current;
                    if (details) details.open = false;
                    requestAnimationFrame(() => {
                      rolesSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/5 hover:text-[#5b06c2]"
                >
                  <CaretUp className="h-4 w-4" weight="bold" aria-hidden />
                  Hide advanced filters
                </button>
              </div>
            </details>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 pt-4">
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <Funnel className="h-4 w-4 text-[#7107E7]" weight="duotone" aria-hidden />
                <span>
                  Showing{" "}
                  <span className="font-semibold tabular-nums text-zinc-900">{filtered.length}</span> of{" "}
                  <span className="tabular-nums">{jobs.length}</span> roles
                </span>
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-[#7107E7] transition hover:text-[#5b06c2]"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          </div>
        </Reveal>

        <div className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <Reveal>
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-14 text-center">
                <p className="font-medium text-zinc-800">No roles match your filters</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Try clearing tech stack or other advanced filters, or shortening your search.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded-full bg-[#7107E7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.35)] transition hover:bg-[#5b06c2]"
                >
                  Reset filters
                </button>
              </div>
            </Reveal>
          ) : (
            filtered.map((job, i) => (
              <Reveal key={job.id ?? `${job.ref}-${job.slug}-${i}`} delay={0.04 * Math.min(i, 8)}>
                <div className="group rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-2 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#7107E7]/45 hover:bg-white hover:shadow-[0_22px_56px_-14px_rgba(113,7,231,0.2),0_8px_24px_-12px_rgba(24,24,27,0.08)]">
                  <div className="flex flex-col gap-4 rounded-[calc(1rem-2px)] border border-white/80 bg-white px-5 py-5 shadow-sm transition-[box-shadow,border-color] duration-300 group-hover:border-[#7107E7]/12 group-hover:shadow-[0_12px_32px_-18px_rgba(113,7,231,0.14)] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 shrink-0 text-zinc-400" weight="duotone" aria-hidden />
                          <span
                            className={`${
                              hasTypeHighlight && matchesType(job, type)
                                ? cardPillEmerald
                                : cardPillZinc
                            } uppercase tracking-wide`}
                          >
                            {job.type}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Buildings className="h-3.5 w-3.5 shrink-0 text-zinc-400" weight="duotone" aria-hidden />
                          <span
                            className={
                              hasSizeHighlight && highlight.sizeBands.has(job.sizeBand)
                                ? cardPillEmerald
                                : cardPillZinc
                            }
                          >
                            {SIZE_BAND_LABELS[job.sizeBand]}
                          </span>
                        </span>
                      </div>
                      <h3 className="font-display mt-2 text-lg font-semibold tracking-tight text-zinc-950 sm:text-xl">
                        {job.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">{job.clientLine}</p>
                      <p className="mt-0.5 text-sm font-medium text-zinc-800">{job.companyName}</p>

                      <div className="mt-3 space-y-2.5">
                        {job.skills.length > 0 ? (
                          <CardFactRow icon={Wrench}>
                            <div className="flex flex-wrap gap-2">
                              {job.skills.map((s) => {
                                const match = hasSkillHighlight && highlight.skills.has(s.name);
                                return (
                                  <span
                                    key={s.name}
                                    className={match ? cardPillEmerald : cardPillZinc}
                                  >
                                    {s.name}
                                  </span>
                                );
                              })}
                            </div>
                          </CardFactRow>
                        ) : null}

                        {job.regions.length > 0 ? (
                          <CardFactRow icon={Globe}>
                            <div className="flex flex-wrap gap-2">
                              {job.regions.map((r) => {
                                const match = hasRegionHighlight && highlight.regions.has(r);
                                return (
                                  <span
                                    key={r}
                                    className={match ? cardPillEmerald : cardPillZinc}
                                  >
                                    {r}
                                  </span>
                                );
                              })}
                            </div>
                          </CardFactRow>
                        ) : null}

                        <CardFactRow icon={MapPin}>
                          <p className="text-xs leading-relaxed text-zinc-600">{job.location}</p>
                        </CardFactRow>

                        {salaryDisplayLine(job) || equityPillText(job) ? (
                          <CardFactRow icon={Coins}>
                            {(() => {
                              const salaryPrimary = salaryDisplayLine(job);
                              const equityPill = equityPillText(job);
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  {salaryPrimary ? (
                                    <span className={cardCompPill}>
                                      <CompensationPillIcon
                                        job={job}
                                        className="size-3.5 shrink-0 text-emerald-600"
                                      />
                                      <span className="min-w-0">{salaryPrimary}</span>
                                    </span>
                                  ) : null}
                                  {equityPill ? (
                                    <span className={cardCompPill}>
                                      <CompensationPillIcon
                                        job={job}
                                        text={equityPill}
                                        variant="equity"
                                        className="size-3.5 shrink-0 text-emerald-600"
                                      />
                                      <span className="min-w-0">{equityPill}</span>
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </CardFactRow>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      href={buildJobDetailHref(job.slug, filterState)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition duration-300 hover:border-[#7107E7]/40 hover:bg-[#7107E7]/5 hover:text-[#5b06c2] group-hover:border-[#7107E7]/50 group-hover:bg-[#7107E7]/[0.09] group-hover:text-[#5b06c2] group-hover:shadow-[0_6px_20px_-6px_rgba(113,7,231,0.35)] sm:min-w-[8.5rem]"
                    >
                      I&apos;m interested
                      <ArrowUpRight className="h-4 w-4" weight="bold" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))
          )}
        </div>

        <Reveal className="mt-10" delay={0.08}>
          <p className="text-center text-sm text-zinc-500">
            Nothing here fits?{" "}
            <Link href="/#contact" className="font-medium text-[#7107E7] underline-offset-4 hover:underline">
              Tell us what you&apos;re looking for
            </Link>{" "}
            — we&apos;ll see what we can match you with.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
