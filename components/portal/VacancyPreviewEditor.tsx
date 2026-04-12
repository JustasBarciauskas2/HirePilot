"use client";

import type { JobDetail } from "@/data/jobs";
import {
  JOB_SIZE_BANDS,
  JOB_SIZE_BAND_LABELS,
  type FundingRound,
  type JobSizeBand,
} from "@/data/job-types";
import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";
import type { User } from "firebase/auth";
import { CaretRight, Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { portalAuthHeaders } from "@/lib/portal-auth";
import { FieldLabel } from "@/components/portal/FieldLabel";
import {
  FieldGroup,
  SectionPanel,
  addButtonClass,
  brand,
  chipClass,
  emptyStateClass,
  formCardClass,
  inputPanelClass,
  labelClass,
  stepPillClass,
  stepPillStripClass,
  stepPillStripInFormCardClass,
  textareaPanelClass,
} from "@/components/portal/portal-form-primitives";

/** Salary/range in `salaryHighlight`+`comp` vs competitive-style copy in `equityNote` (short pill). */
function inferCompMode(v: VacancyNormalizedFromDocument): "range" | "note" {
  const hasSalary = Boolean(v.salaryHighlight.trim() || v.comp.trim());
  const hasNote = Boolean(v.equityNote.trim());
  if (hasSalary) return "range";
  if (hasNote && !hasSalary) return "note";
  return "range";
}

const CATEGORIES = [
  { id: "role", label: "Role & pay" },
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "skills", label: "Skills & industries" },
  { id: "story", label: "Story & bullets" },
  { id: "extras", label: "Benefits & extras" },
] as const;

const MAX_FUNDING_ROUNDS = 6;

/** True when document/API already returned funding — show funding block by default. */
function hasFundingFromInitial(v: VacancyNormalizedFromDocument): boolean {
  if (v.funding.length > 0) return true;
  const t = v.totalFunding?.trim();
  return Boolean(t && t !== "—");
}

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
  rowPlaceholder = "e.g. One line per bullet",
  addPlaceholder = "e.g. One line per bullet — Enter to add",
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
      {hint ? <FieldLabel label={label} hint={hint} /> : <span className={labelClass}>{label}</span>}
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
  const [showFundingDetails, setShowFundingDetails] = useState(() => hasFundingFromInitial(initialVacancy));
  const [compMode, setCompMode] = useState<"range" | "note">(() => inferCompMode(initialVacancy));
  const formAnchorRef = useRef<HTMLDivElement>(null);
  const skipScrollIntoView = useRef(true);

  function setFundingRound(i: number, patch: Partial<FundingRound>) {
    setVacancy((v) => {
      const next = [...v.funding];
      const cur = next[i];
      if (!cur) return v;
      next[i] = { ...cur, ...patch };
      return { ...v, funding: next };
    });
  }

  function addFundingRound() {
    setVacancy((v) => {
      if (v.funding.length >= MAX_FUNDING_ROUNDS) return v;
      return {
        ...v,
        funding: [...v.funding, { date: "", amount: "", round: "" }],
      };
    });
  }

  function removeFundingRoundAt(i: number) {
    setVacancy((v) => ({ ...v, funding: v.funding.filter((_, j) => j !== i) }));
  }

  function switchCompMode(next: "range" | "note") {
    if (next === compMode) return;
    setCompMode(next);
    if (next === "note") {
      /** Drop salary lines; clear equity too so “competitive” isn’t mixed with old optional equity copy. */
      setVacancy((v) => ({ ...v, salaryHighlight: "", comp: "", equityNote: "" }));
    } else {
      /** Switching to salary/range: drop the note-only pill copy. */
      setVacancy((v) => ({ ...v, equityNote: "" }));
    }
  }

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
      <div className={`${formCardClass} space-y-6`}>
        <div className={stepPillStripInFormCardClass}>
          {CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(i)}
              className={stepPillClass(cat === i)}
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
        {cat === 0 && (
          <SectionPanel>
            <div className="space-y-6">
              <FieldGroup title="Role">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Job title"
                      hint="The role headline on the listing and job page — usually title + company appear together up top."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.title}
                      onChange={(e) => setVacancy((v) => ({ ...v, title: e.target.value }))}
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel
                      label="Employment type"
                      hint="How the role is employed — full-time, contract, part-time, etc. Shown as a line on the job page."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.type}
                      onChange={(e) => setVacancy((v) => ({ ...v, type: e.target.value }))}
                      placeholder="e.g. Full-time · Permanent"
                    />
                  </label>
                </div>
              </FieldGroup>

              <FieldGroup title="Pay & compensation">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel
                      label="How should pay show?"
                      hint="Use salary or range when you have numbers. Choose competitive / note when you only want a short line such as “Competitive” or “Discussed at interview” — that appears in the green chip instead of a figure."
                    />
                    <div className={stepPillStripClass}>
                      <button
                        type="button"
                        onClick={() => switchCompMode("range")}
                        className={stepPillClass(compMode === "range")}
                      >
                        Salary or range
                      </button>
                      <button
                        type="button"
                        onClick={() => switchCompMode("note")}
                        className={stepPillClass(compMode === "note")}
                      >
                        Competitive / note
                      </button>
                    </div>
                  </div>

                  {compMode === "range" ? (
                    <>
                      <label className="block sm:col-span-2">
                        <FieldLabel
                          label="Salary or range"
                          hint="This text is saved as both the listing pay line and the green salary chip. Keep the chip readable — you can still add bonus or equity in the same line."
                        />
                        <input
                          className={inputPanelClass}
                          value={vacancy.salaryHighlight || vacancy.comp}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVacancy((v) => ({ ...v, salaryHighlight: val, comp: val }));
                          }}
                          placeholder="e.g. £50k–£60k or $228k–$260k + bonus"
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <FieldLabel
                          label="Extra equity detail (optional)"
                          hint="Longer equity or package wording. If it doesn’t fit the small green pill, it appears as a paragraph under the pay chips."
                        />
                        <input
                          className={inputPanelClass}
                          value={vacancy.equityNote}
                          onChange={(e) => setVacancy((v) => ({ ...v, equityNote: e.target.value }))}
                          placeholder="e.g. Meaningful equity grant discussed at offer stage"
                        />
                      </label>
                    </>
                  ) : (
                    <label className="block sm:col-span-2">
                      <FieldLabel
                        label="Compensation note"
                        hint="Short line for the first green pay chip when you’re not publishing a figure — e.g. competitive package. If this gets long, extra text shows below the chips."
                      />
                      <input
                        className={inputPanelClass}
                        value={vacancy.equityNote}
                        onChange={(e) => setVacancy((v) => ({ ...v, equityNote: e.target.value }))}
                        placeholder="e.g. Competitive salary and benefits"
                      />
                    </label>
                  )}
                </div>
              </FieldGroup>

              <FieldGroup title="Listing details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Experience level"
                      hint="Seniority or years — used on the job page and for filters where applicable."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.experienceLevel}
                      onChange={(e) => setVacancy((v) => ({ ...v, experienceLevel: e.target.value }))}
                      placeholder="e.g. Senior · 5+ years"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Client line (optional)"
                      hint="A short metadata line near the top — e.g. who the role is posted for or funding stage."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.clientLine ?? ""}
                      onChange={(e) => setVacancy((v) => ({ ...v, clientLine: e.target.value || undefined }))}
                      placeholder="e.g. Posted for Acme · Series B"
                    />
                  </label>
                </div>
              </FieldGroup>
            </div>
          </SectionPanel>
        )}

        {cat === 1 && (
          <SectionPanel>
            <div className="space-y-6">
              <FieldGroup title="Where it’s based">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Location"
                      hint="Full location line for the role — cities, hybrid policy, countries. Shown on the listing and detail page."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.location}
                      onChange={(e) => setVacancy((v) => ({ ...v, location: e.target.value }))}
                      placeholder="e.g. London, UK · Hybrid (3 days in office)"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Location tag (map pill)"
                      hint="Short badge next to the map pin — e.g. region or ‘Multiple locations’ when the full line is long."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.locationTag}
                      onChange={(e) => setVacancy((v) => ({ ...v, locationTag: e.target.value }))}
                      placeholder="e.g. UK · Remote-first"
                    />
                  </label>
                </div>
              </FieldGroup>

              <FieldGroup title="Regions & filters">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Regions (one per line)"
                      hint="Used for regional filters on open roles — one region or country per line."
                    />
                    <textarea
                      className={`${textareaPanelClass} min-h-[120px] font-mono text-xs sm:text-sm`}
                      value={arrayToLines(vacancy.regions)}
                      onChange={(e) =>
                        setVacancy((v) => ({ ...v, regions: linesToArray(e.target.value) }))
                      }
                      placeholder={"United Kingdom\nGermany\nRemote EU"}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Company size band"
                      hint="Rough headcount bucket for the employer — used for company-size filters on listings."
                    />
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
              </FieldGroup>
            </div>
          </SectionPanel>
        )}

        {cat === 2 && (
          <SectionPanel>
            <div className="space-y-6">
              <FieldGroup title="Company identity">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Company name"
                      hint="Employer name as it should appear on the listing and job page."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.companyName}
                      onChange={(e) => setVacancy((v) => ({ ...v, companyName: e.target.value }))}
                      placeholder="e.g. Acme Labs"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Company tagline"
                      hint="One line under the company name — what they do or their mission."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.companyTagline}
                      onChange={(e) => setVacancy((v) => ({ ...v, companyTagline: e.target.value }))}
                      placeholder="e.g. Infrastructure for modern product teams"
                    />
                  </label>
                </div>
              </FieldGroup>
              <FieldGroup title="Headcount on the listing">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Company size (label)"
                      hint="Human-readable headcount for the company column — can be more specific than the size band alone."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.companySize}
                      onChange={(e) => setVacancy((v) => ({ ...v, companySize: e.target.value }))}
                      placeholder="e.g. 51–200 employees"
                    />
                  </label>
                </div>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel
                  label="Insight tags"
                  hint="Short labels shown on the listing card — e.g. New listing, AI, Series B."
                />
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
                    placeholder="e.g. New listing — Enter to add"
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
              </FieldGroup>

              <FieldGroup title="Company insights">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel
                      label="Growth stat"
                      hint="One line on traction or growth — e.g. headcount or revenue growth, shown in the company insights area."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.insights.growthStat}
                      onChange={(e) =>
                        setVacancy((v) => ({
                          ...v,
                          insights: { ...v.insights, growthStat: e.target.value },
                        }))
                      }
                      placeholder="e.g. Team doubled in 18 months"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel
                      label="Glassdoor-style rating (1–5)"
                      hint="Optional employer rating for display — whole numbers 1–5."
                    />
                    <input
                      className={inputPanelClass}
                      type="number"
                      min={1}
                      max={5}
                      value={vacancy.insights.glassdoorRating ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        setVacancy((v) => ({
                          ...v,
                          insights: {
                            ...v.insights,
                            glassdoorRating:
                              raw === ""
                                ? null
                                : (() => {
                                    const n = parseInt(raw, 10);
                                    if (!Number.isFinite(n)) return null;
                                    return Math.min(5, Math.max(1, n));
                                  })(),
                          },
                        }));
                      }}
                      placeholder="Leave empty or 1–5"
                    />
                  </label>
                </div>
              </FieldGroup>

              {!showFundingDetails ? (
                <div className="rounded-xl border border-dashed border-zinc-300/90 bg-white/50 px-4 py-4">
                  <p className="text-sm text-zinc-600">
                    Funding rounds and total are optional. If your upload or API already included them, open this
                    section to review or edit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFundingDetails(true)}
                    className={`${addButtonClass} mt-3`}
                  >
                    <Plus className="h-4 w-4" weight="bold" aria-hidden />
                    Add funding details
                  </button>
                </div>
              ) : (
                <FieldGroup title="Funding">
                  <label className="block sm:col-span-2">
                    <FieldLabel
                      label="Total funding label"
                      hint="Headline funding figure for the company block — e.g. total raised or last round."
                    />
                    <input
                      className={inputPanelClass}
                      value={vacancy.totalFunding}
                      onChange={(e) => setVacancy((v) => ({ ...v, totalFunding: e.target.value }))}
                      placeholder="e.g. £79.7m or — if not disclosed"
                    />
                  </label>
                  <div className="mt-4 space-y-3 sm:col-span-2">
                    <p className="text-xs font-medium text-zinc-600">
                      Funding rounds (shown newest first on the job page, up to {MAX_FUNDING_ROUNDS})
                    </p>
                    {vacancy.funding.length === 0 ? (
                      <p className={emptyStateClass}>No rounds yet — add one below or leave empty.</p>
                    ) : (
                      vacancy.funding.map((row, i) => (
                        <div
                          key={i}
                          className="grid gap-2 border-b border-zinc-200/70 pb-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                        >
                          <label className="block min-w-0">
                            <span className={labelClass}>Date</span>
                            <input
                              className={inputPanelClass}
                              value={row.date}
                              onChange={(e) => setFundingRound(i, { date: e.target.value })}
                              placeholder="e.g. May 2025"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className={labelClass}>Amount</span>
                            <input
                              className={inputPanelClass}
                              value={row.amount}
                              onChange={(e) => setFundingRound(i, { amount: e.target.value })}
                              placeholder="e.g. £28.4m"
                            />
                          </label>
                          <label className="block min-w-0">
                            <span className={labelClass}>Round</span>
                            <input
                              className={inputPanelClass}
                              value={row.round}
                              onChange={(e) => setFundingRound(i, { round: e.target.value })}
                              placeholder="e.g. SERIES C"
                            />
                          </label>
                          <button
                            type="button"
                            title="Remove round"
                            onClick={() => removeFundingRoundAt(i)}
                            className="flex h-10 shrink-0 items-center justify-center self-end rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      ))
                    )}
                    {vacancy.funding.length < MAX_FUNDING_ROUNDS ? (
                      <button type="button" onClick={addFundingRound} className={addButtonClass}>
                        <Plus className="h-4 w-4" weight="bold" aria-hidden />
                        Add round
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFundingDetails(false)}
                    className="mt-3 text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline"
                  >
                    Hide funding details
                  </button>
                </FieldGroup>
              )}
            </div>
          </SectionPanel>
        )}

        {cat === 3 && (
          <div className="space-y-8">
            <SectionPanel>
              <FieldGroup>
                <FieldLabel
                  label="Skills"
                  hint="Add each skill as a chip. On the public site, emphasis can follow the visitor’s filters — you don’t set emphasis here."
                />
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
                  placeholder="e.g. TypeScript — Enter to add"
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
              </FieldGroup>
            </SectionPanel>

            <SectionPanel>
              <FieldGroup>
                <FieldLabel
                  label="Industries"
                  hint="Industry tags for the company column — add as many as you need for filters and context."
                />
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
                  placeholder="e.g. SaaS — Enter to add"
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
              </FieldGroup>
            </SectionPanel>
          </div>
        )}

        {cat === 4 && (
          <div className="space-y-8">
            <SectionPanel>
              <FieldGroup title="Introduction">
                <label className="block">
                  <FieldLabel
                    label="Our take (intro)"
                    hint="Meridian’s short intro at the top of the story — your angle on the role and company, not the employer’s raw JD."
                  />
                  <textarea
                    className={`${textareaPanelClass} min-h-[100px]`}
                    value={vacancy.ourTake}
                    onChange={(e) => setVacancy((v) => ({ ...v, ourTake: e.target.value }))}
                    placeholder="e.g. A rare mix of hands-on coding and team leadership at a team that ships weekly."
                  />
                </label>
              </FieldGroup>
            </SectionPanel>
            <BulletListField
              label="Who you are"
              hint="Ideal candidate profile — one requirement or trait per row. Edit inline or remove with ×."
              items={vacancy.whoYouAre}
              onChange={(whoYouAre) => setVacancy((v) => ({ ...v, whoYouAre }))}
              addLabel="Add bullet"
              emptyHint="No bullets yet — add candidate requirements below."
              rowPlaceholder="e.g. 5+ years in product engineering"
              addPlaceholder="e.g. 5+ years in product engineering — Enter to add"
            />
            <BulletListField
              label="What the job involves"
              hint="Responsibilities and outcomes — one concrete bullet per row."
              items={vacancy.whatJobInvolves}
              onChange={(whatJobInvolves) => setVacancy((v) => ({ ...v, whatJobInvolves }))}
              addLabel="Add bullet"
              emptyHint="No bullets yet — describe the role below."
              rowPlaceholder="e.g. Lead design reviews for core services"
              addPlaceholder="e.g. Lead design reviews for core services — Enter to add"
            />
            <BulletListField
              label="Desirable (nice to have)"
              hint="Nice-to-haves — optional bullets that strengthen a fit but aren’t mandatory."
              items={vacancy.desirable}
              onChange={(desirable) => setVacancy((v) => ({ ...v, desirable }))}
              addLabel="Add bullet"
              emptyHint="Optional — add extras that strengthen a fit."
              rowPlaceholder="e.g. Experience in regulated industries"
              addPlaceholder="e.g. Experience in regulated industries — Enter to add"
            />
          </div>
        )}

        {cat === 5 && (
          <div className="space-y-8">
            <BulletListField
              label="Company benefits"
              hint="Perks and compensation extras — health, remote policy, learning budget, etc. One benefit per bullet."
              items={vacancy.companyBenefits}
              onChange={(companyBenefits) => setVacancy((v) => ({ ...v, companyBenefits }))}
              addLabel="Add benefit"
              emptyHint="No benefits listed yet."
              rowPlaceholder="e.g. Private health · dental · vision"
              addPlaceholder="e.g. Private health · dental · vision — Enter to add"
            />
            <SectionPanel>
              <FieldGroup title="Recruiter contact">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <FieldLabel
                        label="Recruiter name"
                        hint="Who candidates see as the Meridian contact on this listing."
                      />
                      <input
                        className={inputPanelClass}
                        value={vacancy.specialist.name}
                        onChange={(e) =>
                          setVacancy((v) => ({
                            ...v,
                            specialist: { ...v.specialist, name: e.target.value },
                          }))
                        }
                        placeholder="e.g. Nina Kovac"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <FieldLabel
                        label="Recruiter title"
                        hint="Role line under the recruiter name — e.g. team and firm."
                      />
                      <input
                        className={inputPanelClass}
                        value={vacancy.specialist.title}
                        onChange={(e) =>
                          setVacancy((v) => ({
                            ...v,
                            specialist: { ...v.specialist, title: e.target.value },
                          }))
                        }
                        placeholder="e.g. Lead recruiter · Meridian Talent"
                      />
                    </label>
                  </div>
                </FieldGroup>
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
