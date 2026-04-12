import type { FundingRound } from "@/data/job-types";

/** Coerce API / JSON values to the display string we store on jobs. */
function fundingFieldToString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "";
  return "";
}

/**
 * Normalizes one funding round. `amount` is always a string (callers may send numbers;
 * we stringify for display and UI).
 */
export function normalizeFundingRound(raw: unknown): FundingRound {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { date: "", amount: "", round: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    date: fundingFieldToString(o.date),
    amount: fundingFieldToString(o.amount),
    round: fundingFieldToString(o.round),
  };
}

/** Normalizes an array of funding rounds from vacancy JSON or remote APIs. */
export function normalizeFundingRounds(input: unknown): FundingRound[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeFundingRound);
}
