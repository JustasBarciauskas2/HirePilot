import fs from "node:fs";
import path from "node:path";
import type { JobDetail } from "@/data/job-types";
import { seedJobs } from "@/data/seed-jobs";

const DATA_PATH = path.join(process.cwd(), "data", "jobs.json");

function ensureFile(): void {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(seedJobs, null, 2), "utf-8");
  }
}

export function readJobs(): JobDetail[] {
  ensureFile();
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw) as JobDetail[];
}

export function writeJobs(jobs: JobDetail[]): void {
  ensureFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(jobs, null, 2), "utf-8");
}

export function addJob(job: JobDetail): void {
  const jobs = readJobs();
  jobs.push(job);
  writeJobs(jobs);
}

export function removeJobByRef(ref: string): boolean {
  const jobs = readJobs();
  const norm = ref.toLowerCase();
  const next = jobs.filter((j) => j.ref.toLowerCase() !== norm);
  if (next.length === jobs.length) return false;
  writeJobs(next);
  return true;
}
