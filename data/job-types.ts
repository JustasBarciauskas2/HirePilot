export type JobSkill = { name: string; highlight?: boolean };

export type FundingRound = { date: string; amount: string; round: string };

/** Rough headcount bucket for filters */
export type JobSizeBand = "1-100" | "101-250" | "201-500";

export type JobDetail = {
  ref: string;
  slug: string;
  title: string;
  companyName: string;
  clientLine: string;
  type: string;
  comp: string;
  /** Single figure for hero pill */
  salaryHighlight: string;
  equityNote: string;
  location: string;
  locationTag: string;
  /** Geographic / location filters (job can match several) */
  regions: string[];
  /** Company size bucket for filters */
  sizeBand: JobSizeBand;
  skills: JobSkill[];
  experienceLevel: string;
  industries: string[];
  companyTagline: string;
  companySize: string;
  whoYouAre: string[];
  desirable: string[];
  whatJobInvolves: string[];
  insights: {
    tags: string[];
    growthStat: string;
    glassdoorRating: number;
  };
  companyBenefits: string[];
  funding: FundingRound[];
  totalFunding: string;
  ourTake: string;
  specialist: { name: string; title: string };
};

export function jobBase(j: Omit<JobDetail, "slug">): JobDetail {
  return { ...j, slug: j.ref.toLowerCase() };
}
