import type { JobDetail } from "@/data/job-types";
import { jobBase } from "@/data/job-types";
import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";
import { nextJobRef } from "@/lib/create-job-from-input";
import { normalizeSizeBand } from "@/lib/merge-vacancy-defaults";

export function jobFromNormalized(existing: JobDetail[], n: VacancyNormalizedFromDocument): JobDetail {
  const skills =
    n.skills.length > 0 ? n.skills.map((s) => ({ name: s.name })) : [{ name: "Role-specific skills" }];

  return jobBase({
    ref: nextJobRef(existing),
    title: n.title.trim(),
    companyName: n.companyName.trim(),
    clientLine: n.clientLine?.trim() || "Posted via Meridian Talent portal",
    type: n.type.trim(),
    comp: n.comp.trim(),
    salaryHighlight: n.salaryHighlight.trim() || n.comp.trim(),
    ...(n.compensationCurrency?.trim()
      ? { compensationCurrency: n.compensationCurrency.trim() }
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
    companyTagline: n.companyTagline.trim() || "Growing team hiring through Meridian Talent.",
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
    funding: n.funding,
    totalFunding: n.totalFunding || "—",
    ourTake: n.ourTake.trim() || "Role posted via Meridian Talent portal.",
    specialist: n.specialist,
  });
}
