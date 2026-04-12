import type { JobDetail } from "@/data/job-types";
import { normalizeFundingRounds } from "@/lib/funding-round";
import { jobBase } from "@/data/job-types";
import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";
import { nextJobRef } from "@/lib/create-job-from-input";
import { normalizeSizeBand } from "@/lib/merge-vacancy-defaults";
import { inferPayCurrencyFromText, structuredSalaryFromRangeK, type PayCurrency } from "@/lib/portal-salary-form";

function payCurrencyForStructured(n: VacancyNormalizedFromDocument): PayCurrency {
  const c = n.compensationCurrency?.trim().toUpperCase();
  if (c === "USD" || c === "GBP" || c === "EUR") return c;
  return inferPayCurrencyFromText(n.comp + n.salaryHighlight);
}

/**
 * Rebuilds a job from the editor while keeping **ref**, **slug**, and **id** from an existing listing (portal edit).
 */
export function jobFromNormalizedUpdate(
  allJobs: JobDetail[],
  n: VacancyNormalizedFromDocument,
  previous: JobDetail,
): JobDetail {
  const others = allJobs.filter(
    (j) => !(j.ref === previous.ref && (j.id?.trim() ?? "") === (previous.id?.trim() ?? "")),
  );
  const draft = jobFromNormalized(others, n);
  return {
    ...draft,
    ref: previous.ref,
    slug: previous.slug,
    id: previous.id,
  };
}

export function jobFromNormalized(existing: JobDetail[], n: VacancyNormalizedFromDocument): JobDetail {
  const skills =
    n.skills.length > 0 ? n.skills.map((s) => ({ name: s.name })) : [{ name: "Role-specific skills" }];

  let comp = n.comp.trim();
  let salaryHighlight = n.salaryHighlight.trim() || comp;

  const minK = n.salaryMinK;
  const maxK = n.salaryMaxK;
  const hasStructuredK =
    typeof minK === "number" &&
    Number.isFinite(minK) &&
    typeof maxK === "number" &&
    Number.isFinite(maxK);

  if (hasStructuredK) {
    const built = structuredSalaryFromRangeK(minK, maxK, payCurrencyForStructured(n));
    comp = built.comp;
    salaryHighlight = built.salaryHighlight;
  }

  return jobBase({
    ref: nextJobRef(existing),
    title: n.title.trim(),
    companyName: n.companyName.trim(),
    clientLine: n.clientLine?.trim() || "Posted via TechRecruit portal",
    type: n.type.trim(),
    comp,
    salaryHighlight: salaryHighlight || comp,
    ...(typeof n.salaryMinK === "number" &&
    typeof n.salaryMaxK === "number" &&
    Number.isFinite(n.salaryMinK) &&
    Number.isFinite(n.salaryMaxK)
      ? {
          salaryMinK: Math.min(n.salaryMinK, n.salaryMaxK),
          salaryMaxK: Math.max(n.salaryMinK, n.salaryMaxK),
        }
      : {}),
    ...(n.compensationCurrency?.trim()
      ? { compensationCurrency: n.compensationCurrency.trim() }
      : hasStructuredK
        ? { compensationCurrency: payCurrencyForStructured(n) }
        : {}),
    ...(n.equityHighlight?.trim() ? { equityHighlight: n.equityHighlight.trim() } : {}),
    ...(n.equityCurrency?.trim() ? { equityCurrency: n.equityCurrency.trim() } : {}),
    equityNote: n.equityNote.trim(),
    location: n.location.trim(),
    locationTag: n.locationTag.trim() || n.location.trim(),
    regions: n.regions.length ? n.regions : ["Remote"],
    sizeBand: normalizeSizeBand(n.sizeBand),
    skills,
    experienceLevel: n.experienceLevel.trim() || "Mid–senior level",
    industries: n.industries.length ? n.industries : ["Technology"],
    companyTagline: n.companyTagline.trim() || "Growing team hiring through TechRecruit.",
    companySize: n.companySize.trim() || "51–200 employees",
    whoYouAre: n.whoYouAre.length ? n.whoYouAre : ["Open to strong candidates who match the role expectations."],
    desirable: n.desirable,
    whatJobInvolves: n.whatJobInvolves.length
      ? n.whatJobInvolves
      : ["Details to be refined with the hiring team."],
    insights: n.insights,
    companyBenefits: n.companyBenefits.length
      ? n.companyBenefits
      : ["Package discussed at offer stage.", "Remote-first or hybrid options where applicable."],
    funding: normalizeFundingRounds(n.funding),
    totalFunding: n.totalFunding || "—",
    ourTake: n.ourTake.trim() || "Role posted via TechRecruit portal.",
    specialist: n.specialist,
  });
}
