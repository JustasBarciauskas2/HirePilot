import type { FundingRound, JobSizeBand, JobSkill } from "@/data/job-types";

/**
 * Expected shape of JSON returned from your backend after processing an uploaded job document.
 * Maps directly onto {@link JobDetail} for publishing — omit `ref` / `slug` here (assigned when saving).
 *
 * Wrap in an envelope, e.g. `{ "schemaVersion": 1, "vacancy": { ... } }`.
 */
export type VacancyNormalizedFromDocument = {
  /** Job title only (headline pairs with companyName on the vacancy page). */
  title: string;
  companyName: string;
  /** Short line under company name on the company column. */
  companyTagline: string;
  /** e.g. "21–100 employees" */
  companySize: string;
  /** e.g. "Posted for Acme · Series B" — optional line near top / metadata. */
  clientLine?: string;
  /** e.g. "FULL-TIME" */
  type: string;
  /**
   * Free-text compensation line when you are **not** sending structured `salaryMinK`/`salaryMaxK`, or extra
   * wording alongside them. If structured k is present, publish **replaces** `comp`/`salaryHighlight` with the
   * formatted band from min/max (same value = set salary; different = range).
   */
  comp: string;
  /**
   * Short pay line for the pill when using text only. With structured k, both fields are overwritten from numbers.
   */
  salaryHighlight: string;
  /**
   * Optional structured annual pay in **thousands** (e.g. `80` = $80k / £80k). Used for filters and salary UI;
   * publish copies them onto the saved job when both bounds are finite after merge.
   * - **Range:** set `salaryMinK` and `salaryMaxK` to the band (e.g. 80 and 100).
   * - **Single amount:** set both to the same number, or send **only** `salaryMinK` **or** only `salaryMaxK` → treated as one figure.
   */
  salaryMinK?: number;
  /** Upper bound in thousands; equals `salaryMinK` for a single published figure. */
  salaryMaxK?: number;
  /** Optional ISO 4217 (`USD` | `GBP` | `EUR`) for the pill icon when `salaryHighlight` has no currency symbol. */
  compensationCurrency?: string;
  /** Short equity pill (e.g. `£80k equity`); shown first in the hero. Overrides using short `equityNote` as the pill. */
  equityHighlight?: string;
  /** Optional for your API; the public job page uses a generic coin for equity. */
  equityCurrency?: string;
  /** Longer equity copy; short values also become the equity pill when `equityHighlight` is omitted. */
  equityNote: string;
  /** Broader location line. */
  location: string;
  /** Pill text with map pin, e.g. "SF Bay hybrid" */
  locationTag: string;
  regions: string[];
  sizeBand: JobSizeBand;
  skills: JobSkill[];
  experienceLevel: string;
  industries: string[];
  /** Intro / “our take” — often first paragraph or summary. */
  ourTake: string;
  /** Bullet-style sections (split from description). */
  whoYouAre: string[];
  desirable: string[];
  whatJobInvolves: string[];
  insights: {
    tags: string[];
    growthStat: string;
    /** 1–5 or omit / null when not provided. */
    glassdoorRating: number | null;
  };
  companyBenefits: string[];
  /** Each round’s `amount` is a string for display; merge/publish normalizes numbers from APIs. */
  funding: FundingRound[];
  totalFunding: string;
  /** Hiring-company leadership (e.g. hiring manager / exec), not the recruiting firm contact. */
  specialist: { name: string; title: string };
};

export type VacancyParseEnvelope = {
  schemaVersion: 1;
  vacancy: VacancyNormalizedFromDocument;
};
