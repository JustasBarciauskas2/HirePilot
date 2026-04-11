import { jobBase, type JobDetail, type JobSizeBand } from "@/data/job-types";

export function nextJobRef(existing: JobDetail[]): string {
  const year = new Date().getFullYear();
  let max = 0;
  for (const j of existing) {
    const m = j.ref.match(/-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `MT-${year}-${String(max + 1).padStart(3, "0")}`;
}

function parseList(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function splitDescription(description: string): {
  ourTake: string;
  whoYouAre: string[];
  whatJobInvolves: string[];
} {
  const paras = description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) {
    return {
      ourTake: "Role posted via Meridian Talent portal.",
      whoYouAre: ["Open to strong candidates who match the role expectations."],
      whatJobInvolves: ["Details to be refined with the hiring team."],
    };
  }
  const mid = Math.ceil(paras.length / 2);
  const who = paras.slice(0, mid);
  const what = paras.slice(mid);
  return {
    ourTake: paras[0] ?? "",
    whoYouAre: who.length ? who : [paras[0]],
    whatJobInvolves: what.length ? what : ["Partner with Meridian on scope and success metrics."],
  };
}

export type PortalJobFields = {
  title: string;
  companyName: string;
  type: string;
  comp: string;
  location: string;
  salaryHighlight?: string;
  equityNote?: string;
  clientLine?: string;
  locationTag?: string;
  experienceLevel?: string;
  companyTagline?: string;
  companySize?: string;
  regionsText?: string;
  industriesText?: string;
  skillsText?: string;
  sizeBand?: JobSizeBand;
  description: string;
};

export function buildJobFromPortalInput(existing: JobDetail[], input: PortalJobFields): JobDetail {
  const { ourTake, whoYouAre, whatJobInvolves } = splitDescription(input.description);
  const regions = parseList(input.regionsText);
  const industries = parseList(input.industriesText);
  const skillNames = parseList(input.skillsText);
  const skills = skillNames.length
    ? skillNames.map((name, i) => ({ name, highlight: i === 0 }))
    : [{ name: "Role-specific skills", highlight: true }];

  const compTrim = input.comp.trim();
  const firstComp = compTrim.split(/[–-]/)[0]?.trim() || "Competitive";

  return jobBase({
    ref: nextJobRef(existing),
    title: input.title.trim(),
    companyName: input.companyName.trim(),
    clientLine: input.clientLine?.trim() || "Posted via Meridian Talent portal",
    type: input.type.trim(),
    comp: compTrim,
    salaryHighlight: input.salaryHighlight?.trim() || firstComp,
    equityNote: input.equityNote?.trim() || "Discussed with shortlisted candidates.",
    location: input.location.trim(),
    locationTag: input.locationTag?.trim() || input.location.trim(),
    regions: regions.length ? regions : ["Remote"],
    sizeBand: input.sizeBand ?? "101-250",
    skills,
    experienceLevel: input.experienceLevel?.trim() || "Mid–senior level",
    industries: industries.length ? industries : ["Technology"],
    companyTagline: input.companyTagline?.trim() || "Growing team hiring through Meridian Talent.",
    companySize: input.companySize?.trim() || "51–200 employees",
    whoYouAre,
    desirable: [],
    whatJobInvolves,
    insights: {
      tags: ["New listing"],
      growthStat: "Growing team",
      glassdoorRating: 4,
    },
    companyBenefits: [
      "Package discussed at offer stage.",
      "Remote-first or hybrid options where applicable.",
    ],
    funding: [],
    totalFunding: "—",
    ourTake,
    specialist: { name: "Nina Kovac", title: "Lead recruiter · Meridian Talent" },
  });
}
