import type { JobDetail } from "@techrecruit/shared/data/job-types";

const EQUITY_PILL_MAX_LEN = 56;

/** Text for the green equity pill (first in the hero row). */
export function equityPillText(job: JobDetail): string | null {
  const h = job.equityHighlight?.trim();
  if (h) return h;
  const n = (job.equityNote ?? "").trim();
  if (n.length > 0 && n.length <= EQUITY_PILL_MAX_LEN) return n;
  return null;
}

/** Show the paragraph under the pills when equity copy is long or supplements the pill. */
export function showEquityNoteParagraph(job: JobDetail): boolean {
  const n = (job.equityNote ?? "").trim();
  if (!n) return false;
  const pill = equityPillText(job);
  if (!pill) return true;
  return n !== pill;
}
