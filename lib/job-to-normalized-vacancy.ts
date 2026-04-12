import type { JobDetail } from "@/data/job-types";
import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";

/** Maps a saved listing back into the portal editor shape (manual entry / edit). */
export function normalizedVacancyFromJobDetail(job: JobDetail): VacancyNormalizedFromDocument {
  return {
    title: job.title,
    companyName: job.companyName,
    companyTagline: job.companyTagline,
    companySize: job.companySize,
    clientLine: job.clientLine?.trim() || undefined,
    type: job.type,
    comp: job.comp,
    salaryHighlight: job.salaryHighlight,
    salaryMinK: job.salaryMinK,
    salaryMaxK: job.salaryMaxK,
    compensationCurrency: job.compensationCurrency,
    equityHighlight: job.equityHighlight,
    equityCurrency: job.equityCurrency,
    equityNote: job.equityNote,
    location: job.location,
    locationTag: job.locationTag,
    regions: [...job.regions],
    sizeBand: job.sizeBand,
    skills: job.skills.map((s) => ({ name: s.name })),
    experienceLevel: job.experienceLevel,
    industries: [...job.industries],
    ourTake: job.ourTake,
    whoYouAre: [...job.whoYouAre],
    desirable: [...job.desirable],
    whatJobInvolves: [...job.whatJobInvolves],
    insights: {
      tags: [...job.insights.tags],
      growthStat: job.insights.growthStat,
      glassdoorRating: job.insights.glassdoorRating,
    },
    companyBenefits: [...job.companyBenefits],
    funding: job.funding.map((f) => ({ ...f })),
    totalFunding: job.totalFunding,
    specialist: { ...job.specialist },
  };
}
