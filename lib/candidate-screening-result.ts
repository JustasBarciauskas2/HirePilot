/**
 * Normalised **candidate screening** payload for the Candidate Card UI.
 * Your job-application webhook JSON (e.g. `JobApplicationResponse`) may include a `screening` property with this shape
 * (see `parseCandidateScreeningFromBackendPayload`).
 *
 * @see data/candidate-screening-response.example.json
 */

export const CANDIDATE_SCREENING_SCHEMA_VERSION = 1 as const;

/** Drives badge colour / emphasis (match vs not strong fit). */
export type CandidateMatchFitLabel = "strong_fit" | "moderate_fit" | "weak_fit" | "not_a_fit";

export type CandidateScreeningSkillAttribute = {
  name: string;
  /** Optional: how relevant this skill is to the vacancy */
  relevance?: "high" | "medium" | "low";
};

export type CandidateScreeningJobContext = {
  jobRef: string;
  jobTitle: string;
  companyName: string;
  /** Echo from the apply flow — useful for deep links */
  jobSlug?: string;
};

/** When `screening.jobAppliedFor` is null (e.g. Java DTO), fill from the parent application row. */
export type FallbackJobAppliedFor = {
  jobRef: string;
  jobTitle: string;
  companyName: string;
  jobSlug?: string;
};

/**
 * Core match block: overall score, experience-focused score, AI copy.
 * `score` is the primary number to highlight on the card (e.g. 0–100).
 */
export type CandidateScreeningMatch = {
  /** Primary match score for UI highlight (recommend 0–100). */
  score: number;
  /** Defaults to 100 in UI if omitted. */
  scoreMax?: number;
  /** Experience alignment with this vacancy’s seniority/stack (same scale as `score` unless you choose otherwise). */
  experienceScore: number;
  fitLabel: CandidateMatchFitLabel;
  /** One-line headline under the score (e.g. “Strong fit — backend leadership aligns”). */
  headline?: string;
  /** Main AI summary (2–6 sentences). */
  summary: string;
  /** Short bullets: pros/cons, gaps, or “why match / not strong fit”. */
  insights: string[];
  /** Optional longer recruiter-oriented rationale. */
  rationale?: string;
};

export type CandidateScreeningAttributes = {
  skills: CandidateScreeningSkillAttribute[];
  /** Free text, e.g. “8+ years backend; 3 years people management” */
  experience?: string;
  /** Normalised location line from CV vs job */
  location?: string;
};

export type CandidateScreeningMeta = {
  /** ISO-8601 when screening was produced */
  generatedAt?: string;
  model?: string;
  processingMs?: number;
};

/**
 * Full normalised screening — mirrors what the Candidate Card needs.
 * `candidateName` can be your enriched display name or “First Last” from the apply form.
 */
export type CandidateScreeningResult = {
  schemaVersion: typeof CANDIDATE_SCREENING_SCHEMA_VERSION;
  candidateName: string;
  jobAppliedFor: CandidateScreeningJobContext;
  match: CandidateScreeningMatch;
  attributes: CandidateScreeningAttributes;
  meta?: CandidateScreeningMeta;
};

const FIT_SET = new Set<string>(["strong_fit", "moderate_fit", "weak_fit", "not_a_fit"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v.trim() : undefined;
}

export function fallbackJobAppliedForFromApplicationRow(row: Record<string, unknown>): FallbackJobAppliedFor | undefined {
  const jobRef = asString(row.jobRef);
  const jobTitle = asString(row.jobTitle);
  const companyName = asString(row.companyName);
  if (!jobRef || !jobTitle || !companyName) return undefined;
  const jobSlug = asString(row.jobSlug);
  return jobSlug ? { jobRef, jobTitle, companyName, jobSlug } : { jobRef, jobTitle, companyName };
}

function asFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseSkills(raw: unknown): CandidateScreeningSkillAttribute[] {
  if (!Array.isArray(raw)) return [];
  const out: CandidateScreeningSkillAttribute[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name);
    if (!name) continue;
    const rel = item.relevance;
    const relevance =
      rel === "high" || rel === "medium" || rel === "low" ? rel : undefined;
    out.push(relevance ? { name, relevance } : { name });
  }
  return out;
}

/**
 * Validates and returns screening, or `undefined` if missing/invalid.
 * Accepts webhook root `{ screening: {...} }` or nested `{ data: { screening } }`.
 */
function schemaVersionOk(v: unknown): boolean {
  if (v === 1 || v === "1") return true;
  if (typeof v === "number" && Number.isFinite(v) && Math.round(v) === 1) return true;
  /** Legacy backends may send `0`; we normalise output to `CANDIDATE_SCREENING_SCHEMA_VERSION`. */
  if (v === 0 || v === "0") return true;
  if (typeof v === "number" && Number.isFinite(v) && Math.round(v) === 0) return true;
  return false;
}

export function parseCandidateScreeningResult(
  raw: unknown,
  fallbackJobAppliedFor?: FallbackJobAppliedFor | null,
): CandidateScreeningResult | undefined {
  if (!isRecord(raw)) return undefined;
  if (!schemaVersionOk(raw.schemaVersion)) return undefined;

  const candidateName = asString(raw.candidateName);
  if (!candidateName) return undefined;

  let job: Record<string, unknown> | null | undefined = raw.jobAppliedFor as Record<string, unknown> | null | undefined;
  if (!isRecord(job)) {
    if (fallbackJobAppliedFor) {
      job = {
        jobRef: fallbackJobAppliedFor.jobRef,
        jobTitle: fallbackJobAppliedFor.jobTitle,
        companyName: fallbackJobAppliedFor.companyName,
        ...(fallbackJobAppliedFor.jobSlug ? { jobSlug: fallbackJobAppliedFor.jobSlug } : {}),
      };
    } else {
      return undefined;
    }
  }
  const jobRef = asString(job.jobRef);
  const jobTitle = asString(job.jobTitle);
  const companyName = asString(job.companyName);
  if (!jobRef || !jobTitle || !companyName) return undefined;
  const jobSlug = asString(job.jobSlug);

  const m = raw.match;
  if (!isRecord(m)) return undefined;
  const score = asFiniteNumber(m.score);
  const experienceScore = asFiniteNumber(m.experienceScore);
  const fitLabel = asString(m.fitLabel);
  const summary = asString(m.summary);
  if (
    score === undefined ||
    experienceScore === undefined ||
    !fitLabel ||
    !FIT_SET.has(fitLabel) ||
    !summary
  ) {
    return undefined;
  }

  const insightsRaw = m.insights;
  const insights = Array.isArray(insightsRaw)
    ? insightsRaw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
    : [];

  const attrs = raw.attributes;
  const skills = isRecord(attrs) ? parseSkills(attrs.skills) : [];
  const experience = isRecord(attrs) ? asString(attrs.experience) : undefined;
  const location = isRecord(attrs) ? asString(attrs.location) : undefined;

  const scoreMax = asFiniteNumber(m.scoreMax);
  const headline = asString(m.headline);
  const rationale = asString(m.rationale);

  const metaIn = raw.meta;
  let meta: CandidateScreeningMeta | undefined;
  if (isRecord(metaIn)) {
    meta = {
      generatedAt: asString(metaIn.generatedAt),
      model: asString(metaIn.model),
      processingMs: asFiniteNumber(metaIn.processingMs),
    };
    if (!meta.generatedAt && !meta.model && meta.processingMs === undefined) meta = undefined;
  }

  return {
    schemaVersion: CANDIDATE_SCREENING_SCHEMA_VERSION,
    candidateName,
    jobAppliedFor: jobSlug
      ? { jobRef, jobTitle, companyName, jobSlug }
      : { jobRef, jobTitle, companyName },
    match: {
      score,
      ...(scoreMax !== undefined ? { scoreMax } : {}),
      experienceScore,
      fitLabel: fitLabel as CandidateMatchFitLabel,
      summary,
      insights,
      ...(headline ? { headline } : {}),
      ...(rationale ? { rationale } : {}),
    },
    attributes: {
      skills,
      ...(experience ? { experience } : {}),
      ...(location ? { location } : {}),
    },
    ...(meta ? { meta } : {}),
  };
}

/** Extract `screening` from common webhook envelope shapes. */
export function parseCandidateScreeningFromBackendPayload(envelope: unknown): CandidateScreeningResult | undefined {
  if (!isRecord(envelope)) return undefined;
  const direct = envelope.screening;
  if (direct !== undefined) return parseCandidateScreeningResult(direct);
  const data = envelope.data;
  if (isRecord(data) && data.screening !== undefined) {
    return parseCandidateScreeningResult(data.screening);
  }
  return undefined;
}
