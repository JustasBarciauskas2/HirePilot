"use client";

import Link from "next/link";
import { useState } from "react";
import type { JobDetail } from "@/data/jobs";
import {
  Bell,
  Briefcase,
  Buildings,
  CaretRight,
  ChartLineUp,
  Clock,
  CoinVertical,
  Info,
  MapPin,
  Star,
  TrendUp,
  Users,
  Wrench,
} from "@phosphor-icons/react";

type Tab = "job" | "company";

export function JobDetailView({ job }: { job: JobDetail }) {
  const [tab, setTab] = useState<Tab>("job");

  const headline = `${job.title}, ${job.companyName}`.toUpperCase();

  return (
    <div className="bg-[#f6f5f2]">
      {/* Hero band — Meridian accent instead of yellow */}
      <div className="border-b border-zinc-200/80 bg-gradient-to-b from-[#7107E7]/[0.09] via-violet-50/40 to-[#f6f5f2] pb-10 pt-28 sm:pb-14 sm:pt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav className="mb-6 text-left text-sm text-zinc-500">
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
            <div className="grid gap-0 md:grid-cols-2">
              <div className="border-b border-zinc-100 p-6 sm:p-8 md:border-b-0 md:border-r md:border-zinc-100">
                <h1 className="font-display text-left text-xl font-extrabold leading-snug tracking-tight text-zinc-950 sm:text-2xl">
                  {headline}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                    <CoinVertical className="h-4 w-4 text-emerald-600" weight="duotone" />
                    {job.salaryHighlight}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                    {job.type}
                  </span>
                </div>
                <p className="mt-4 max-w-md text-left text-sm leading-relaxed text-zinc-600">
                  {job.equityNote}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <Wrench className="h-4 w-4 shrink-0 text-zinc-400" weight="duotone" />
                  {job.skills.map((s) => (
                    <span
                      key={s.name}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                        s.highlight
                          ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
                <p className="mt-6 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <TrendUp className="h-4 w-4 text-[#7107E7]" weight="duotone" />
                  {job.experienceLevel}
                </p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200/60">
                  <MapPin className="h-4 w-4 text-emerald-700" weight="duotone" />
                  {job.locationTag}
                </p>
              </div>

              <div className="flex flex-col justify-between bg-zinc-50/40 p-6 sm:p-8">
                <div>
                  <p className="font-display text-2xl font-bold tracking-tight text-[#7107E7] sm:text-3xl">
                    {job.companyName}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{job.companyTagline}</p>
                  <p className="mt-5 flex items-center gap-2 text-sm text-zinc-700">
                    <Users className="h-4 w-4 text-zinc-400" weight="duotone" />
                    {job.companySize}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Briefcase className="h-4 w-4 shrink-0 text-zinc-400" weight="duotone" />
                    {job.industries.map((ind) => (
                      <span
                        key={ind}
                        className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200/90"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                  <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/70">
                    <Clock className="h-4 w-4" weight="duotone" />
                    Open for applications
                  </p>
                </div>
                <Link
                  href="/#contact"
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-[#7107E7]/35 hover:bg-[#7107E7]/5 hover:text-[#5b06c2] sm:w-auto sm:self-start"
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
          <Info className="h-4 w-4 text-zinc-400" weight="duotone" aria-hidden />
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
        <Info className="h-3.5 w-3.5 text-zinc-400" weight="duotone" />
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
