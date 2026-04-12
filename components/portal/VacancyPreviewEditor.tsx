"use client";

import type { JobDetail } from "@/data/jobs";
import { JOB_SIZE_BANDS, JOB_SIZE_BAND_LABELS, type JobSizeBand } from "@/data/job-types";
import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";
import type { User } from "firebase/auth";
import { CaretRight, Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { portalAuthHeaders } from "@/lib/portal-auth";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

const textareaClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

/** Inputs on tinted panels — matches benefits section */
const inputPanelClass = `${inputClass} bg-white/90`;
const textareaPanelClass = `${textareaClass} bg-white/90`;

/** Meridian brand — use sparingly for accents */
const brand = {
  softBg: "bg-[#7107E7]/[0.04]",
  softBorder: "border-[#7107E7]/15",
  accentBorderL: "border-l-[3px] border-l-[#7107E7]/70",
  bullet: "text-[#7107E7]",
  ring: "ring-1 ring-[#7107E7]/10",
} as const;

const sectionPanelClass = `rounded-xl border border-zinc-200/90 ${brand.accentBorderL} ${brand.softBg} p-4 sm:p-5 ${brand.ring}`;

const labelClass = "mb-1.5 block text-xs font-medium text-zinc-800";

const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-xl border border-[#7107E7]/12 bg-white/95 px-2.5 py-1.5 text-sm font-medium text-zinc-800 shadow-sm ring-1 ring-[#7107E7]/8";

const emptyStateClass = `rounded-xl border border-dashed ${brand.softBorder} bg-white/70 px-3 py-4 text-sm text-zinc-500`;

const addButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#7107E7]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#5b06c2] shadow-sm transition hover:border-[#7107E7]/40 hover:bg-[#7107E7]/8";

function SectionPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${sectionPanelClass} ${className}`}>{children}</div>;
}

const CATEGORIES = [
  { id: "role", label: "Role & pay" },
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "skills", label: "Skills & industries" },
  { id: "story", label: "Story & bullets" },
  { id: "extras", label: "Benefits & extras" },
] as const;

function linesToArray(s: string): string[] {
  return s
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function arrayToLines(a: string[]): string {
  return a.join("\n");
}

function normalizeToken(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function addSkillToList(
  skills: VacancyNormalizedFromDocument["skills"],
  name: string,
): VacancyNormalizedFromDocument["skills"] {
  const n = normalizeToken(name);
  if (!n) return skills;
  if (skills.some((s) => s.name.toLowerCase() === n.toLowerCase())) return skills;
  return [...skills, { name: n }];
}

function removeSkillAt(skills: VacancyNormalizedFromDocument["skills"], index: number) {
  return skills.filter((_, i) => i !== index);
}

function addStringToList(list: string[], raw: string): string[] {
  const n = normalizeToken(raw);
  if (!n) return list;
  if (list.some((x) => x.toLowerCase() === n.toLowerCase())) return list;
  return [...list, n];
}

function removeStringAt(list: string[], index: number): string[] {
  return list.filter((_, i) => i !== index);
}

type BulletListFieldProps = {
  label: string;
  hint?: string;
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  emptyHint?: string;
  rowPlaceholder?: string;
  addPlaceholder?: string;
};

function BulletListField({
  label,
  hint,
  items,
  onChange,
  addLabel,
  emptyHint = "No bullets yet — add one below.",
  rowPlaceholder = "Bullet text",
  addPlaceholder = "Type a bullet, then add or press Enter",
}: BulletListFieldProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const n = normalizeToken(draft);
    if (!n) return;
    onChange([...items, n]);
    setDraft("");
  }

  function setLine(i: number, value: string) {
    const next = [...items];
    next[i] = value;
    onChange(next);
  }

  function blurLine(i: number) {
    const raw = items[i] ?? "";
    const t = normalizeToken(raw);
    if (!t) {
      onChange(items.filter((_, j) => j !== i));
    } else if (t !== raw) {
      const next = [...items];
      next[i] = t;
      onChange(next);
    }
  }

  return (
    <SectionPanel>
      <span className={labelClass}>{label}</span>
      {hint ? <p className="mb-2 text-xs text-zinc-500">{hint}</p> : null}
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span
                className={`shrink-0 pt-2.5 font-semibold ${brand.bullet} select-none`}
                aria-hidden
              >
                •
              </span>
              <input
                className={`${inputPanelClass} min-w-0 flex-1`}
                value={line}
                onChange={(e) => setLine(i, e.target.value)}
                onBlur={() => blurLine(i)}
                placeholder={rowPlaceholder}
              />
              <button
                type="button"
                title="Remove bullet"
                onClick={() => onChange(removeStringAt(items, i))}
                className="shrink-0 self-center rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={emptyStateClass}>{emptyHint}</p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={`${inputPanelClass} min-w-0 flex-1`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder={addPlaceholder}
        />
        <button type="button" onClick={commitDraft} className={addButtonClass}>
          <Plus className="h-4 w-4" weight="bold" aria-hidden />
          {addLabel}
        </button>
      </div>
    </SectionPanel>
  );
}

type Props = {
  initialVacancy: VacancyNormalizedFromDocument;
  user: User;
  onCancel: () => void;
  onPublished: (job: JobDetail) => void;
};

export function VacancyPreviewEditor({ initialVacancy, user, onCancel, onPublished }: Props) {
  const router = useRouter();
  const [vacancy, setVacancy] = useState<VacancyNormalizedFromDocument>(initialVacancy);
  const [cat, setCat] = useState(0);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState("");
  const [industryDraft, setIndustryDraft] = useState("");
  const [insightTagDraft, setInsightTagDraft] = useState("");
  const formAnchorRef = useRef<HTMLDivElement>(null);
  const skipScrollIntoView = useRef(true);

  useEffect(() => {
    if (skipScrollIntoView.current) {
      skipScrollIntoView.current = false;
      return;
    }
    formAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [cat]);

  async function publish() {
    if (!vacancy.title.trim() || !vacancy.companyName.trim()) {
      setErr("Add a job title and company name (Role & pay).");
      setCat(0);
      return;
    }
    setErr(null);
    setPending(true);
    try {
      const headers = await portalAuthHeaders(user);
      const res = await fetch("/api/portal/vacancy-publish-from-parsed", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ vacancy }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; job?: JobDetail };
      if (!res.ok || !data.job) {
        setErr(typeof data.error === "string" ? data.error : "Could not publish.");
        return;
      }
      await router.refresh();
      onPublished(data.job);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      ref={formAnchorRef}
      className="mt-8 space-y-6 scroll-mt-28"
    >
      <div className="flex flex-wrap gap-2 gap-y-2 rounded-xl bg-zinc-100/70 px-3 py-3 sm:px-4">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(i)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#7107E7]/40 focus-visible:ring-offset-2 ${
              cat === i
                ? "bg-[#7107E7] text-white shadow-sm shadow-[#7107E7]/25"
                : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/90 hover:bg-zinc-50 hover:text-zinc-900 hover:ring-zinc-300/80"
            }`}
          >
            {i + 1}. {c.label}
          </button>
        ))}
      </div>

      {err ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm shadow-zinc-200/40">
        {cat === 0 && (
          <SectionPanel>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Job title</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.title}
                  onChange={(e) => setVacancy((v) => ({ ...v, title: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Employment type</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.type}
                  onChange={(e) => setVacancy((v) => ({ ...v, type: e.target.value }))}
                  placeholder="FULL-TIME"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Compensation (full)</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.comp}
                  onChange={(e) => setVacancy((v) => ({ ...v, comp: e.target.value }))}
                  placeholder="$228k–$260k"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Salary highlight (pill)</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.salaryHighlight}
                  onChange={(e) => setVacancy((v) => ({ ...v, salaryHighlight: e.target.value }))}
                  placeholder="$228k"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Equity note</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.equityNote}
                  onChange={(e) => setVacancy((v) => ({ ...v, equityNote: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Experience level</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.experienceLevel}
                  onChange={(e) => setVacancy((v) => ({ ...v, experienceLevel: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Client line (optional)</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.clientLine ?? ""}
                  onChange={(e) => setVacancy((v) => ({ ...v, clientLine: e.target.value || undefined }))}
                />
              </label>
            </div>
          </SectionPanel>
        )}

        {cat === 1 && (
          <SectionPanel>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Location</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.location}
                  onChange={(e) => setVacancy((v) => ({ ...v, location: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Location tag (map pill)</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.locationTag}
                  onChange={(e) => setVacancy((v) => ({ ...v, locationTag: e.target.value }))}
                  placeholder="SF Bay hybrid"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Regions (one per line)</span>
                <textarea
                  className={`${textareaPanelClass} min-h-[120px] font-mono text-xs sm:text-sm`}
                  value={arrayToLines(vacancy.regions)}
                  onChange={(e) =>
                    setVacancy((v) => ({ ...v, regions: linesToArray(e.target.value) }))
                  }
                  placeholder="United States&#10;California"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Company size band</span>
                <select
                  className={`${inputPanelClass} cursor-pointer`}
                  value={vacancy.sizeBand}
                  onChange={(e) =>
                    setVacancy((v) => ({ ...v, sizeBand: e.target.value as JobSizeBand }))
                  }
                >
                  {JOB_SIZE_BANDS.map((b) => (
                    <option key={b} value={b}>
                      {JOB_SIZE_BAND_LABELS[b]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionPanel>
        )}

        {cat === 2 && (
          <SectionPanel>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Company name</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.companyName}
                  onChange={(e) => setVacancy((v) => ({ ...v, companyName: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Company tagline</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.companyTagline}
                  onChange={(e) => setVacancy((v) => ({ ...v, companyTagline: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Company size (label)</span>
                <input
                  className={inputPanelClass}
                  value={vacancy.companySize}
                  onChange={(e) => setVacancy((v) => ({ ...v, companySize: e.target.value }))}
                  placeholder="21–100 employees"
                />
              </label>
            </div>
          </SectionPanel>
        )}

        {cat === 3 && (
          <div className="space-y-6">
            <SectionPanel>
              <span className={labelClass}>Skills</span>
              <p className="mb-3 text-xs text-zinc-500">
                Add each skill as a chip. Listing emphasis can follow the visitor&apos;s filters on the public site —
                not chosen here.
              </p>
              {vacancy.skills.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {vacancy.skills.map((s, i) => (
                    <li key={`${s.name}-${i}`} className={`${chipClass} transition`}>
                      <span className="min-w-0 truncate">{s.name}</span>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => setVacancy((v) => ({ ...v, skills: removeSkillAt(v.skills, i) }))}
                        className="shrink-0 rounded-lg p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={emptyStateClass}>No skills yet — add one below.</p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className={`${inputPanelClass} min-w-0 flex-1`}
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setVacancy((v) => {
                        const skills = addSkillToList(v.skills, skillDraft);
                        if (skills === v.skills) return v;
                        setSkillDraft("");
                        return { ...v, skills };
                      });
                    }
                  }}
                  placeholder="e.g. Python"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVacancy((v) => {
                      const skills = addSkillToList(v.skills, skillDraft);
                      if (skills !== v.skills) setSkillDraft("");
                      return { ...v, skills };
                    });
                  }}
                  className={addButtonClass}
                >
                  <Plus className="h-4 w-4" weight="bold" aria-hidden />
                  Add skill
                </button>
              </div>
            </SectionPanel>

            <SectionPanel>
              <span className={labelClass}>Industries</span>
              <p className="mb-3 text-xs text-zinc-500">Tags for the company column — add as many as you need.</p>
              {vacancy.industries.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {vacancy.industries.map((ind, i) => (
                    <li key={`${ind}-${i}`} className={chipClass}>
                      <span className="min-w-0 truncate">{ind}</span>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() =>
                          setVacancy((v) => ({ ...v, industries: removeStringAt(v.industries, i) }))
                        }
                        className="shrink-0 rounded-lg p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={emptyStateClass}>No industries yet.</p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className={`${inputPanelClass} min-w-0 flex-1`}
                  value={industryDraft}
                  onChange={(e) => setIndustryDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setVacancy((v) => {
                        const industries = addStringToList(v.industries, industryDraft);
                        if (industries === v.industries) return v;
                        setIndustryDraft("");
                        return { ...v, industries };
                      });
                    }
                  }}
                  placeholder="e.g. SaaS"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVacancy((v) => {
                      const industries = addStringToList(v.industries, industryDraft);
                      if (industries !== v.industries) setIndustryDraft("");
                      return { ...v, industries };
                    });
                  }}
                  className={addButtonClass}
                >
                  <Plus className="h-4 w-4" weight="bold" aria-hidden />
                  Add industry
                </button>
              </div>
            </SectionPanel>
          </div>
        )}

        {cat === 4 && (
          <div className="space-y-6">
            <SectionPanel>
              <label className="block">
                <span className={labelClass}>Our take (intro)</span>
                <textarea
                  className={`${textareaPanelClass} min-h-[100px]`}
                  value={vacancy.ourTake}
                  onChange={(e) => setVacancy((v) => ({ ...v, ourTake: e.target.value }))}
                />
              </label>
            </SectionPanel>
            <BulletListField
              label="Who you are"
              hint="Each point is its own row — edit inline or remove with ×."
              items={vacancy.whoYouAre}
              onChange={(whoYouAre) => setVacancy((v) => ({ ...v, whoYouAre }))}
              addLabel="Add bullet"
              emptyHint="No bullets yet — add candidate requirements below."
            />
            <BulletListField
              label="What the job involves"
              hint="Concrete responsibilities and outcomes, one bullet at a time."
              items={vacancy.whatJobInvolves}
              onChange={(whatJobInvolves) => setVacancy((v) => ({ ...v, whatJobInvolves }))}
              addLabel="Add bullet"
              emptyHint="No bullets yet — describe the role below."
            />
            <BulletListField
              label="Desirable (nice to have)"
              items={vacancy.desirable}
              onChange={(desirable) => setVacancy((v) => ({ ...v, desirable }))}
              addLabel="Add bullet"
              emptyHint="Optional — add extras that strengthen a fit."
            />
          </div>
        )}

        {cat === 5 && (
          <div className="space-y-6">
            <BulletListField
              label="Company benefits"
              hint="Perks and comp extras — each benefit is one bullet."
              items={vacancy.companyBenefits}
              onChange={(companyBenefits) => setVacancy((v) => ({ ...v, companyBenefits }))}
              addLabel="Add benefit"
              emptyHint="No benefits listed yet."
              rowPlaceholder="e.g. Health, dental, vision"
              addPlaceholder="Add another benefit"
            />
            <SectionPanel>
              <span className={labelClass}>Insight tags</span>
              <p className="mb-3 text-xs text-zinc-500">Short labels for the listing (e.g. New listing, Inference).</p>
              {vacancy.insights.tags.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {vacancy.insights.tags.map((t, i) => (
                    <li key={`${t}-${i}`} className={chipClass}>
                      <span className="min-w-0 truncate">{t}</span>
                      <button
                        type="button"
                        title="Remove"
                        onClick={() =>
                          setVacancy((v) => ({
                            ...v,
                            insights: {
                              ...v.insights,
                              tags: removeStringAt(v.insights.tags, i),
                            },
                          }))
                        }
                        className="shrink-0 rounded-lg p-1 text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`${emptyStateClass} mb-0`}>No tags yet.</p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className={`${inputPanelClass} min-w-0 flex-1`}
                  value={insightTagDraft}
                  onChange={(e) => setInsightTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setVacancy((v) => {
                        const tags = addStringToList(v.insights.tags, insightTagDraft);
                        if (tags === v.insights.tags) return v;
                        setInsightTagDraft("");
                        return { ...v, insights: { ...v.insights, tags } };
                      });
                    }
                  }}
                  placeholder="e.g. New listing"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVacancy((v) => {
                      const tags = addStringToList(v.insights.tags, insightTagDraft);
                      if (tags !== v.insights.tags) setInsightTagDraft("");
                      return { ...v, insights: { ...v.insights, tags } };
                    });
                  }}
                  className={addButtonClass}
                >
                  <Plus className="h-4 w-4" weight="bold" aria-hidden />
                  Add tag
                </button>
              </div>
            </SectionPanel>
            <SectionPanel>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Growth stat</span>
                  <input
                    className={inputPanelClass}
                    value={vacancy.insights.growthStat}
                    onChange={(e) =>
                      setVacancy((v) => ({
                        ...v,
                        insights: { ...v.insights, growthStat: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Glassdoor-style rating (1–5)</span>
                  <input
                    className={inputPanelClass}
                    type="number"
                    min={1}
                    max={5}
                    value={vacancy.insights.glassdoorRating}
                    onChange={(e) =>
                      setVacancy((v) => ({
                        ...v,
                        insights: {
                          ...v.insights,
                          glassdoorRating: Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 4)),
                        },
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Total funding label</span>
                  <input
                    className={inputPanelClass}
                    value={vacancy.totalFunding}
                    onChange={(e) => setVacancy((v) => ({ ...v, totalFunding: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Recruiter name</span>
                  <input
                    className={inputPanelClass}
                    value={vacancy.specialist.name}
                    onChange={(e) =>
                      setVacancy((v) => ({
                        ...v,
                        specialist: { ...v.specialist, name: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelClass}>Recruiter title</span>
                  <input
                    className={inputPanelClass}
                    value={vacancy.specialist.title}
                    onChange={(e) =>
                      setVacancy((v) => ({
                        ...v,
                        specialist: { ...v.specialist, title: e.target.value },
                      }))
                    }
                  />
                </label>
              </div>
            </SectionPanel>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/90 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
        >
          Cancel
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {cat > 0 ? (
            <button
              type="button"
              onClick={() => setCat((c) => c - 1)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Previous section
            </button>
          ) : null}
          {cat < CATEGORIES.length - 1 ? (
            <button
              type="button"
              onClick={() => setCat((c) => c + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7107E7] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#7107E7]/30 transition hover:bg-[#5b06c2]"
            >
              Next section
              <CaretRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => void publish()}
              className="inline-flex items-center justify-center rounded-xl bg-[#7107E7] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[#7107E7]/35 transition hover:bg-[#5b06c2] disabled:opacity-50"
            >
              {pending ? "Publishing…" : "Publish listing"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
