"use client";

import type { JobSizeBand } from "@/data/jobs";
import Link from "next/link";
import {
  ArrowUpRight,
  CaretDown,
  Funnel,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { jobs } from "@/data/jobs";
import {
  filterJobs,
  hasAnyFilter,
  type JobFilterState,
  type SkillsMatchMode,
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

const SIZE_BAND_ORDER: JobSizeBand[] = ["1-100", "101-250", "201-500"];

export function JobVacancies() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [work, setWork] = useState<WorkFilter>("all");
  const [industry, setIndustry] = useState("all");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsMode, setSkillsMode] = useState<SkillsMatchMode>("any");
  const [regions, setRegions] = useState<string[]>([]);
  const [sizeBands, setSizeBands] = useState<JobSizeBand[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<string[]>([]);

  const industries = useMemo(() => uniqueIndustries(jobs), []);
  const skillOptions = useMemo(() => uniqueSkills(jobs), []);
  const regionOptions = useMemo(() => uniqueRegions(jobs), []);
  const experienceOptions = useMemo(() => uniqueExperienceLevels(jobs), []);

  const filterState: JobFilterState = useMemo(
    () => ({
      q,
      type,
      work,
      industry,
      skills,
      skillsMode,
      regions,
      sizeBands,
      experienceLevels,
    }),
    [q, type, work, industry, skills, skillsMode, regions, sizeBands, experienceLevels],
  );

  const filtered = useMemo(() => filterJobs(jobs, filterState), [filterState]);

  const hasFilters = hasAnyFilter(filterState);

  function clearFilters() {
    setQ("");
    setType("all");
    setWork("all");
    setIndustry("all");
    setSkills([]);
    setSkillsMode("any");
    setRegions([]);
    setSizeBands([]);
    setExperienceLevels([]);
  }

  return (
    <section id="roles" className="relative z-10 border-b border-zinc-200/80 bg-white py-24 sm:py-32">
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

            <details className="group mt-4 border-t border-zinc-200/80 pt-4">
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
                    Tap any combination of skills first—you can switch between &ldquo;Match any&rdquo; and
                    &ldquo;Match all&rdquo; anytime without losing your selection.
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

                  <fieldset className="mt-4">
                    <legend className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Combine selected skills
                    </legend>
                    <div
                      className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
                      role="radiogroup"
                      aria-label="How to combine selected tech stack skills"
                    >
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 has-[:checked]:border-[#7107E7]/45 has-[:checked]:bg-[#7107E7]/8 has-[:checked]:text-[#4c0599]">
                        <input
                          type="radio"
                          name="skills-mode"
                          value="any"
                          checked={skillsMode === "any"}
                          onChange={() => setSkillsMode("any")}
                          className="h-4 w-4 border-zinc-300 text-[#7107E7] focus:ring-[#7107E7]/30"
                        />
                        <span>
                          Match any <span className="font-normal text-zinc-500">(OR — role has at least one)</span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 has-[:checked]:border-[#7107E7]/45 has-[:checked]:bg-[#7107E7]/8 has-[:checked]:text-[#4c0599]">
                        <input
                          type="radio"
                          name="skills-mode"
                          value="all"
                          checked={skillsMode === "all"}
                          onChange={() => setSkillsMode("all")}
                          className="h-4 w-4 border-zinc-300 text-[#7107E7] focus:ring-[#7107E7]/30"
                        />
                        <span>
                          Match all <span className="font-normal text-zinc-500">(AND — role has every selected)</span>
                        </span>
                      </label>
                    </div>
                  </fieldset>
                  <p className="mt-2 text-xs text-zinc-500">
                    With &ldquo;Match all,&rdquo; pick multiple skills—roles must list each one. Switch back to
                    &ldquo;Match any&rdquo; whenever you want a looser match.
                  </p>
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
                  Try clearing advanced filters, switching skill mode to &ldquo;Match any,&rdquo; or
                  shortening your search.
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
              <Reveal key={job.ref} delay={0.04 * Math.min(i, 8)}>
                <div className="group rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-2 transition hover:border-[#7107E7]/25 hover:bg-white sm:p-2">
                  <div className="flex flex-col gap-4 rounded-[calc(1rem-2px)] border border-white/80 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-[#7107E7]">
                          {job.ref}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {job.type}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          {SIZE_BAND_LABELS[job.sizeBand]}
                        </span>
                      </div>
                      <h3 className="font-display mt-2 text-lg font-semibold tracking-tight text-zinc-950 sm:text-xl">
                        {job.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">{job.clientLine}</p>
                      <p className="mt-0.5 text-sm font-medium text-zinc-800">{job.companyName}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.skills.map((s) => (
                          <span
                            key={s.name}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                              s.highlight
                                ? "bg-[#7107E7]/12 text-[#5b06c2] ring-1 ring-[#7107E7]/25"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {job.regions.map((r) => (
                          <span
                            key={r}
                            className="rounded-md bg-emerald-50/90 px-2 py-0.5 text-[10px] font-medium text-emerald-900 ring-1 ring-emerald-200/70"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span>{job.location}</span>
                        <span className="font-mono tabular-nums text-zinc-700">{job.comp}</span>
                      </div>
                    </div>
                    <Link
                      href={`/jobs/${job.slug}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-[#7107E7]/40 hover:bg-[#7107E7]/5 hover:text-[#5b06c2] sm:min-w-[8.5rem]"
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
