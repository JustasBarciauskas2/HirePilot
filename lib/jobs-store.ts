import fs from "node:fs";
import path from "node:path";
import type { JobDetail } from "@/data/job-types";
import { seedJobs } from "@/data/seed-jobs";

/**
 * Local dev: `data/jobs.json` under the project root.
 * Serverless (Netlify, Vercel, Lambda): only `/tmp` is writable — avoid ENOENT on `mkdir` under `/var/task`.
 * Optional override: `JOBS_DATA_PATH` (absolute path to `jobs.json`).
 */
function getJobsJsonPath(): string {
  if (process.env.JOBS_DATA_PATH) {
    return process.env.JOBS_DATA_PATH;
  }
  const serverless =
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.AWS_EXECUTION_ENV) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    Boolean(process.env.NETLIFY) ||
    Boolean(process.env.VERCEL);
  if (serverless) {
    return path.join("/tmp", "techrecruit-jobs", "jobs.json");
  }
  return path.join(process.cwd(), "data", "jobs.json");
}

function ensureFile(): void {
  const DATA_PATH = getJobsJsonPath();
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(seedJobs, null, 2), "utf-8");
  }
}

function dataPath(): string {
  return getJobsJsonPath();
}

export function readJobs(): JobDetail[] {
  ensureFile();
  const raw = fs.readFileSync(dataPath(), "utf-8");
  return JSON.parse(raw) as JobDetail[];
}

export function writeJobs(jobs: JobDetail[]): void {
  ensureFile();
  fs.writeFileSync(dataPath(), JSON.stringify(jobs, null, 2), "utf-8");
}

export function addJob(job: JobDetail): void {
  const jobs = readJobs();
  jobs.push(job);
  writeJobs(jobs);
}

/**
 * Remove from local `jobs.json`.
 * When `vacancyId` is set, only removes the row whose `id` matches (and `ref` matches).
 * When omitted, removes every row with that `ref` (legacy; avoid if refs can repeat).
 */
export function removeJobByRef(ref: string, vacancyId?: string | null): boolean {
  const jobs = readJobs();
  const norm = ref.toLowerCase();
  const vid = vacancyId?.trim();
  const next = jobs.filter((j) => {
    if (j.ref.toLowerCase() !== norm) return true;
    if (vid) {
      return j.id?.trim() !== vid;
    }
    return false;
  });
  if (next.length === jobs.length) return false;
  writeJobs(next);
  return true;
}
