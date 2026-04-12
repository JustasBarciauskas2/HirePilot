/** Skill labels for display and filters — emphasis is applied in the UI when matching user preferences, not stored on the job. */
export type JobSkill = { name: string };

/** Per-round line on the job; `amount` is always a string for display (e.g. `"£28.4m"`). */
export type FundingRound = { date: string; amount: string; round: string };

/** Rough headcount bucket for filters (stored on jobs and used in portal / listings). */
export const JOB_SIZE_BANDS = [
  "1",
  "2-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001+",
] as const;

export type JobSizeBand = (typeof JOB_SIZE_BANDS)[number];

export const JOB_SIZE_BAND_LABELS: Record<JobSizeBand, string> = {
  "1": "1 employee",
  "2-10": "2–10 employees",
  "11-50": "11–50 employees",
  "51-200": "51–200 employees",
  "201-500": "201–500 employees",
  "501-1000": "501–1,000 employees",
  "1001-5000": "1,001–5,000 employees",
  "5001+": "5,001+ employees",
};

export type JobDetail = {
  /**
   * Human-readable listing code (e.g. MT-2026-014) for labels and legacy URLs — not guaranteed unique
   * across rows from your API. Prefer `id` for identity, keys, and delete; keep `ref` unique per role when possible.
   */
  ref: string;
  /**
   * Backend / DB primary key (e.g. UUID) from your API — use for stable keys, portal delete (path `/api/vacancy/{id}`), and row identity when `ref` repeats.
   */
  id?: string;
  slug: string;
  title: string;
  companyName: string;
  clientLine: string;
  type: string;
  /**
   * Full comp line for listings / meta / search. When `salaryMinK`/`salaryMaxK` are set, publish overwrites this
   * with the formatted band from those numbers; otherwise free text is OK.
   */
  comp: string;
  /**
   * Short line for the green salary pill when no structured k — same as `comp` when both are driven from text.
   * If `salaryMinK`/`salaryMaxK` are set, they take priority and this is replaced with the derived pill line on save.
   */
  salaryHighlight: string;
  /**
   * Annual pay in **thousands** — **authoritative** when both set: same value = set salary; different = range.
   * Drives filters, hero/card pay line, and normalized `comp`/`salaryHighlight` on publish.
   */
  salaryMinK?: number;
  /** Upper bound in thousands; equals `salaryMinK` for a single published figure. */
  salaryMaxK?: number;
  /**
   * Optional ISO 4217 code so the pill icon matches when `salaryHighlight` has no symbol (e.g. `"Competitive"` only).
   * If omitted, `$` / `£` / `€` are inferred from `salaryHighlight`.
   */
  compensationCurrency?: "USD" | "GBP" | "EUR" | string;
  /**
   * Short equity line for the hero pill (e.g. `"£80k equity"`). Shown first, same style as salary.
   * If omitted, a short `equityNote` (≤56 chars) is used as the equity pill instead.
   */
  equityHighlight?: string;
  /** Optional for APIs; the UI always uses a generic coin icon for equity (not currency-specific). */
  equityCurrency?: "USD" | "GBP" | "EUR" | string;
  /** Longer equity / bonus copy; shown below pills only when not redundant with the equity pill. */
  equityNote: string;
  /** Full location line for listings and detail (e.g. cities). */
  location: string;
  /** Short label for filters / badges (e.g. “Multiple locations”); listings use `location` for the full line. */
  locationTag: string;
  /** Geographic / location filters (job can match several) */
  regions: string[];
  /** Company size bucket for filters */
  sizeBand: JobSizeBand;
  skills: JobSkill[];
  experienceLevel: string;
  industries: string[];
  companyTagline: string;
  companySize: string;
  whoYouAre: string[];
  desirable: string[];
  whatJobInvolves: string[];
  insights: {
    tags: string[];
    growthStat: string;
    /** Whole stars 1–5, or `null` when not shown. */
    glassdoorRating: number | null;
  };
  companyBenefits: string[];
  funding: FundingRound[];
  totalFunding: string;
  ourTake: string;
  specialist: { name: string; title: string };
};

export function jobBase(j: Omit<JobDetail, "slug">): JobDetail {
  return { ...j, slug: j.ref.toLowerCase() };
}
