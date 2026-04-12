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
  /** Full compensation string for filters / detail. */
  comp: string;
  /**
   * Green salary pill text — include currency in the string, e.g. `"$228k"`, `"$215k–$260k"`, `"£142k"`,
   * or non-numeric copy. Optional `compensationCurrency` when the pill has no symbol.
   */
  salaryHighlight: string;
  /** Annual pay lower bound in **thousands** when you have structured figures (portal sets this with `salaryMaxK`). */
  salaryMinK?: number;
  /** Annual pay upper bound in **thousands**; same as `salaryMinK` for a single amount. */
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
  specialist: { name: string; title: string };
};

export type VacancyParseEnvelope = {
  schemaVersion: 1;
  vacancy: VacancyNormalizedFromDocument;
};
