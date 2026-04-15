import type { JobDetail } from "@techrecruit/shared/data/job-types";
import { buildCompFromRangeK, inferPayCurrencyFromText, type PayCurrency } from "@techrecruit/shared/lib/portal-salary-form";

const SUPPRESS_SALARY_BOILERPLATE = /^competitive salary and benefits package$/i;

function payCurrencyFromJob(job: JobDetail): PayCurrency {
  const c = job.compensationCurrency?.trim().toUpperCase();
  if (c === "USD" || c === "GBP" || c === "EUR") return c;
  return inferPayCurrencyFromText(job.salaryHighlight + job.comp);
}

/**
 * Salary line for cards and hero.
 * When `salaryMinK` / `salaryMaxK` are set, they take priority (set salary if equal, range otherwise);
 * `comp` / `salaryHighlight` are treated as non-authoritative for that band.
 * Otherwise uses highlight → comp, and omits generic boilerplate.
 */
export function salaryDisplayLine(job: JobDetail): string {
  const a = job.salaryMinK;
  const b = job.salaryMaxK;
  if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
    const { salaryHighlight } = buildCompFromRangeK(Math.min(a, b), Math.max(a, b), payCurrencyFromJob(job));
    return salaryHighlight;
  }

  const raw = job.salaryHighlight.trim() || job.comp.trim();
  if (SUPPRESS_SALARY_BOILERPLATE.test(raw)) return "";
  return raw;
}
