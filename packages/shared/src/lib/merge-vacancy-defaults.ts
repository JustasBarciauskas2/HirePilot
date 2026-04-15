import { JOB_SIZE_BANDS, type JobSizeBand } from "@techrecruit/shared/data/job-types";
import { normalizeFundingRounds } from "@techrecruit/shared/lib/funding-round";
import type { VacancyNormalizedFromDocument } from "@techrecruit/shared/data/vacancy-normalized-from-document";

function coerceSalaryK(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replace(/,/g, "");
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Structured annual pay in **thousands** (e.g. `80` → £80k / $80k).
 * - Range: set both `salaryMinK` and `salaryMaxK` (min ≤ max).
 * - Single figure: set both to the same value, or send only one of the two — we mirror it to a point band.
 */
function mergeSalaryKPair(partial: Partial<VacancyNormalizedFromDocument>): {
  salaryMinK?: number;
  salaryMaxK?: number;
} {
  const lo = coerceSalaryK(partial.salaryMinK);
  const hi = coerceSalaryK(partial.salaryMaxK);
  if (lo !== undefined && hi !== undefined) return { salaryMinK: Math.min(lo, hi), salaryMaxK: Math.max(lo, hi) };
  if (lo !== undefined) return { salaryMinK: lo, salaryMaxK: lo };
  if (hi !== undefined) return { salaryMinK: hi, salaryMaxK: hi };
  return {};
}

/** Map older document/API values onto current bands */
const LEGACY_SIZE_BAND: Record<string, JobSizeBand> = {
  "1-100": "51-200",
  "101-250": "201-500",
};

/** Coerce parsed JSON / legacy portal values to a valid {@link JobSizeBand}. */
export function normalizeSizeBand(v: unknown): JobSizeBand {
  const s = typeof v === "string" ? v.trim() : "";
  if ((JOB_SIZE_BANDS as readonly string[]).includes(s)) return s as JobSizeBand;
  if (s in LEGACY_SIZE_BAND) return LEGACY_SIZE_BAND[s]!;
  return "51-200";
}

/** Fill missing fields so the editor always has a complete object. */
export function mergeVacancyDefaults(
  partial: Partial<VacancyNormalizedFromDocument>,
): VacancyNormalizedFromDocument {
  return {
    title: partial.title?.trim() || "",
    companyName: partial.companyName?.trim() || "",
    companyTagline: partial.companyTagline?.trim() || "",
    companySize: partial.companySize?.trim() || "",
    clientLine: partial.clientLine?.trim(),
    type: partial.type?.trim() || "",
    comp: partial.comp?.trim() || "",
    salaryHighlight: partial.salaryHighlight?.trim() || "",
    ...mergeSalaryKPair(partial),
    compensationCurrency: partial.compensationCurrency?.trim() || undefined,
    equityHighlight: partial.equityHighlight?.trim() || undefined,
    equityCurrency: partial.equityCurrency?.trim() || undefined,
    equityNote: partial.equityNote?.trim() || "",
    location: partial.location?.trim() || "",
    locationTag: partial.locationTag?.trim() || "",
    regions: Array.isArray(partial.regions) ? partial.regions.map((r) => String(r).trim()).filter(Boolean) : [],
    sizeBand: normalizeSizeBand(partial.sizeBand),
    skills: Array.isArray(partial.skills)
      ? partial.skills.map((s) =>
          typeof s === "object" && s !== null && "name" in s
            ? { name: String((s as { name: string }).name) }
            : { name: String(s) },
        )
      : [],
    experienceLevel: partial.experienceLevel?.trim() || "",
    industries: Array.isArray(partial.industries)
      ? partial.industries.map((x) => String(x).trim()).filter(Boolean)
      : [],
    ourTake: partial.ourTake?.trim() || "",
    whoYouAre: Array.isArray(partial.whoYouAre)
      ? partial.whoYouAre.map((x) => String(x).trim()).filter(Boolean)
      : [],
    desirable: Array.isArray(partial.desirable)
      ? partial.desirable.map((x) => String(x).trim()).filter(Boolean)
      : [],
    whatJobInvolves: Array.isArray(partial.whatJobInvolves)
      ? partial.whatJobInvolves.map((x) => String(x).trim()).filter(Boolean)
      : [],
    insights: {
      tags: Array.isArray(partial.insights?.tags)
        ? partial.insights!.tags.map((x) => String(x).trim()).filter(Boolean)
        : ["New listing"],
      growthStat: partial.insights?.growthStat?.trim() || "Growing team",
      glassdoorRating: (() => {
        const g = partial.insights?.glassdoorRating;
        if (typeof g !== "number" || !Number.isFinite(g)) return null;
        const r = Math.round(g);
        return r >= 1 && r <= 5 ? r : null;
      })(),
    },
    companyBenefits: Array.isArray(partial.companyBenefits)
      ? partial.companyBenefits.map((x) => String(x).trim()).filter(Boolean)
      : [],
    funding: normalizeFundingRounds(partial.funding),
    totalFunding: partial.totalFunding?.trim() || "—",
    specialist: {
      name: partial.specialist?.name?.trim() || "Jordan Lee",
      title: partial.specialist?.title?.trim() || "VP Engineering · Acme",
    },
  };
}
