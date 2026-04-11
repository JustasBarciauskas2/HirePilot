import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";
import { mergeVacancyDefaults } from "@/lib/merge-vacancy-defaults";

function hasVacancyKeys(o: Record<string, unknown>): boolean {
  return typeof o.title === "string" && typeof o.companyName === "string";
}

/**
 * Extract `vacancy` from various backend response shapes.
 */
export function parseVacancyFromUnknown(raw: unknown): VacancyNormalizedFromDocument | null {
  if (raw === null || raw === undefined) return null;

  if (typeof raw === "string") {
    try {
      return parseVacancyFromUnknown(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  if (typeof raw !== "object") return null;

  const o = raw as Record<string, unknown>;

  if (o.vacancy && typeof o.vacancy === "object") {
    return mergeVacancyDefaults(o.vacancy as Partial<VacancyNormalizedFromDocument>);
  }

  if (o.data && typeof o.data === "object") {
    const inner = parseVacancyFromUnknown(o.data);
    if (inner) return inner;
  }

  if (o.result && typeof o.result === "object") {
    const inner = parseVacancyFromUnknown(o.result);
    if (inner) return inner;
  }

  if (hasVacancyKeys(o)) {
    return mergeVacancyDefaults(o as Partial<VacancyNormalizedFromDocument>);
  }

  return null;
}
