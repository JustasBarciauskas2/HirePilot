import { createHash } from "node:crypto";

import {
  JOB_SIZE_BANDS,
  type JobDetail,
  type JobSizeBand,
  type JobSkill,
} from "@/data/job-types";

/** Call `revalidateTag(VACANCIES_LIST_FETCH_TAG)` after publish/delete so the list `fetch` is not stale. */
export const VACANCIES_LIST_FETCH_TAG = "vacancies";
import { getBackendVacanciesListUrl } from "@/lib/backend-url";
import { getTenantInstancePayload } from "@/lib/tenant-instance";

/** Full GET URL the server uses (tenant query appended when missing). For `/api/vacancies` debug JSON. */
export function getResolvedVacanciesListUrl(): string | null {
  const listBase = getBackendVacanciesListUrl();
  if (!listBase) return null;
  const { id: tenantId } = getTenantInstancePayload();
  try {
    const url = new URL(listBase);
    if (!url.searchParams.has("tenantId")) {
      url.searchParams.set("tenantId", tenantId);
    }
    return url.href;
  } catch {
    return null;
  }
}

function emptyJobDetail(): JobDetail {
  return {
    ref: "",
    slug: "",
    title: "",
    companyName: "",
    clientLine: "",
    type: "",
    comp: "",
    salaryHighlight: "",
    equityNote: "",
    location: "",
    locationTag: "",
    regions: [],
    sizeBand: JOB_SIZE_BANDS[0],
    skills: [],
    experienceLevel: "",
    industries: [],
    companyTagline: "",
    companySize: "",
    whoYouAre: [],
    desirable: [],
    whatJobInvolves: [],
    insights: { tags: [], growthStat: "", glassdoorRating: 0 },
    companyBenefits: [],
    funding: [],
    totalFunding: "",
    ourTake: "",
    specialist: { name: "", title: "" },
  };
}

function pickFirstString(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Public id / listing ref — many APIs use `id` (UUID) or snake_case instead of `ref`. */
function pickRef(o: Record<string, unknown>): string | null {
  const fromNamed = pickFirstString(o, [
    "ref",
    "reference",
    "referenceNumber",
    "reference_number",
    "refNumber",
    "vacancyRef",
    "vacancy_ref",
    "vacancyId",
    "vacancy_id",
    "jobRef",
    "job_ref",
    "publicId",
    "public_id",
    "jobNumber",
    "job_number",
    "number",
  ]);
  if (fromNamed) return fromNamed;
  const id = o.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

function pickTitle(o: Record<string, unknown>): string | null {
  return pickFirstString(o, [
    "title",
    "jobTitle",
    "job_title",
    "name",
    "position",
    "roleTitle",
    "role_title",
  ]);
}

function pickCompanyName(o: Record<string, unknown>): string | null {
  const direct = pickFirstString(o, [
    "companyName",
    "company_name",
    "company",
    "employerName",
    "employer_name",
    "organizationName",
    "organization_name",
    "clientName",
    "client_name",
  ]);
  if (direct) return direct;
  const company = o.company;
  if (company && typeof company === "object" && !Array.isArray(company)) {
    const c = company as Record<string, unknown>;
    return pickFirstString(c, ["name", "companyName", "company_name", "title", "legalName"]);
  }
  return null;
}

/** Merge root row with nested `vacancy` / `job` payload (common in document-normalized APIs). */
function unwrapVacancyRow(item: Record<string, unknown>): Record<string, unknown> {
  const nestedKeys = ["vacancy", "job", "payload", "data"] as const;
  let merged = { ...item };
  for (const key of nestedKeys) {
    const inner = item[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      merged = { ...merged, ...(inner as Record<string, unknown>) };
    }
  }
  return merged;
}

/** Drop `null` so spread does not overwrite `emptyJobDetail()` defaults (e.g. `specialist: null`). */
function omitNullKeys(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== null) out[k] = v;
  }
  return out;
}

function coerceSizeBand(v: unknown): JobSizeBand {
  if (typeof v === "string" && JOB_SIZE_BANDS.includes(v as JobSizeBand)) {
    return v as JobSizeBand;
  }
  return JOB_SIZE_BANDS[0];
}

function coerceSkills(v: unknown): JobSkill[] {
  if (!Array.isArray(v)) return [];
  const out: JobSkill[] = [];
  for (const x of v) {
    if (x && typeof x === "object" && typeof (x as { name?: unknown }).name === "string") {
      out.push({ name: (x as { name: string }).name });
    } else if (typeof x === "string" && x.trim()) {
      out.push({ name: x.trim() });
    }
  }
  return out;
}

function coerceStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function coerceInsights(v: unknown): JobDetail["insights"] {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return {
      tags: coerceStringArray(o.tags),
      growthStat: typeof o.growthStat === "string" ? o.growthStat : "",
      glassdoorRating: typeof o.glassdoorRating === "number" ? o.glassdoorRating : 0,
    };
  }
  return { tags: [], growthStat: "", glassdoorRating: 0 };
}

/**
 * Fetches vacancies for the configured tenant from your backend.
 *
 * @returns `null` if no list URL is configured **or** the request failed (network, timeout, non-OK HTTP) — callers should fall back to local `jobs.json`.
 * @returns `JobDetail[]` when the GET succeeded — possibly empty if the tenant truly has no vacancies or rows could not be mapped.
 */
export async function fetchTenantVacanciesFromBackend(): Promise<JobDetail[] | null> {
  const listBase = getBackendVacanciesListUrl();
  if (!listBase) return null;

  const { id: tenantId } = getTenantInstancePayload();
  let url: URL;
  try {
    url = new URL(listBase);
  } catch {
    return null;
  }
  if (!url.searchParams.has("tenantId")) {
    url.searchParams.set("tenantId", tenantId);
  }

  if (process.env.DEBUG_VACANCIES_FETCH === "1" || process.env.DEBUG_VACANCIES_FETCH === "true") {
    console.log("[vacancies] GET", url.href);
  }

  try {
    const res = await fetch(url.href, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: [VACANCIES_LIST_FETCH_TAG] },
      signal: AbortSignal.timeout(15_000),
    });
    if (process.env.DEBUG_VACANCIES_FETCH === "1" || process.env.DEBUG_VACANCIES_FETCH === "true") {
      console.log("[vacancies] status", res.status, res.statusText);
    }
    if (!res.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[vacancies] GET ${res.status} ${res.statusText} — using local jobs.json. Fix the API or set DEBUG_VACANCIES_FETCH=1.`,
        );
      }
      return null;
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return null;
    }
    /** Some APIs return a JSON string body (double-encoded). */
    if (typeof data === "string") {
      try {
        data = JSON.parse(data) as unknown;
      } catch {
        return null;
      }
    }
    return parseVacanciesResponse(data);
  } catch (e) {
    if (process.env.DEBUG_VACANCIES_FETCH === "1" || process.env.DEBUG_VACANCIES_FETCH === "true") {
      console.warn("[vacancies] fetch error", e);
    } else if (process.env.NODE_ENV === "development") {
      console.warn(
        "[vacancies] List request failed (backend down, wrong port, or timeout). Using local jobs.json. Set DEBUG_VACANCIES_FETCH=1 for the URL and full error.",
      );
    }
    return null;
  }
}

function parseVacanciesResponse(data: unknown): JobDetail[] {
  let raw: unknown[] | null = null;
  if (Array.isArray(data)) {
    raw = data;
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.jobs)) raw = o.jobs;
    else if (Array.isArray(o.vacancies)) raw = o.vacancies;
    else if (Array.isArray(o.data)) raw = o.data;
    /** Spring Data REST / Page */
    else if (Array.isArray(o.content)) raw = o.content;
    else if (Array.isArray(o.items)) raw = o.items;
    else if (Array.isArray(o.result)) raw = o.result;
    /** HAL _embedded */
    else if (o._embedded && typeof o._embedded === "object") {
      const emb = o._embedded as Record<string, unknown>;
      const first = Object.values(emb).find((v) => Array.isArray(v));
      if (Array.isArray(first)) raw = first;
    }
    /** Nested: { data: { content: [...] } } */
    if (!raw && o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
      const d = o.data as Record<string, unknown>;
      if (Array.isArray(d.content)) raw = d.content;
      else if (Array.isArray(d.items)) raw = d.items;
      else if (Array.isArray(d.vacancies)) raw = d.vacancies;
      else if (Array.isArray(d.jobs)) raw = d.jobs;
    }
  }
  if (!raw) return [];

  const out: JobDetail[] = [];
  for (let i = 0; i < raw.length; i++) {
    try {
      const job = normalizeVacancyItem(raw[i], i);
      if (job) out.push(job);
    } catch (err) {
      console.warn("[vacancies] row", i, "normalization failed:", err);
    }
  }
  if (raw.length > 0 && out.length === 0 && process.env.NODE_ENV === "development") {
    const sample = raw[0];
    const keys =
      sample && typeof sample === "object" && !Array.isArray(sample)
        ? Object.keys(sample as object).slice(0, 12)
        : [];
    console.warn(
      "[vacancies] API returned",
      raw.length,
      "row(s) but none could be mapped to JobDetail. First row keys:",
      keys.length ? keys : "(uninspectable)",
      "— need title and company name (and ideally ref or id).",
    );
  }
  return out;
}

/**
 * Map API row to JobDetail: unwraps nested `vacancy`/`job`, accepts snake_case and `id` as ref,
 * fills required UI fields with defaults when omitted.
 *
 * First-class shape: a JSON array of objects matching `JobDetail` (e.g. `title`, `companyName`,
 * `skills[].name`, optional `specialist` or `null`). Extra skill fields like `highlight` are ignored.
 *
 * **Stable id:** Prefer a real `ref` (or `id` / `vacancyId`) from your API. If all are missing but `title`
 * and `companyName` exist, a deterministic `AUTO-…` ref is generated so the row still lists (set a real ref in your API when possible).
 */
function syntheticListingRef(title: string, companyName: string, indexInPage: number): string {
  const digest = createHash("sha256")
    .update(`${companyName}\u0000${title}\u0000${indexInPage}`, "utf8")
    .digest("hex")
    .slice(0, 14);
  return `AUTO-${digest}`;
}

function normalizeVacancyItem(item: unknown, indexInPage = 0): JobDetail | null {
  if (!item || typeof item !== "object") return null;
  const row = omitNullKeys(unwrapVacancyRow(item as Record<string, unknown>));
  const title = pickTitle(row);
  const companyName = pickCompanyName(row);
  if (!title || !companyName) return null;

  let ref = pickRef(row);
  if (!ref) {
    ref = syntheticListingRef(title, companyName, indexInPage);
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[vacancies] Row",
        indexInPage,
        "has no ref/id — using synthetic",
        ref,
        "(return ref from your GET API to avoid this).",
      );
    }
  }

  const slugRaw =
    pickFirstString(row, ["slug", "urlSlug", "url_slug"]) ?? ref.toLowerCase();
  const slug = slugRaw.toLowerCase();

  const partial = row as Partial<JobDetail> & Record<string, unknown>;
  const base = emptyJobDetail();

  return {
    ...base,
    ...partial,
    ref,
    slug,
    title,
    companyName,
    id: typeof partial.id === "string" ? partial.id : base.id,
    regions: coerceStringArray(partial.regions),
    skills: coerceSkills(partial.skills),
    industries: coerceStringArray(partial.industries),
    whoYouAre: coerceStringArray(partial.whoYouAre),
    desirable: coerceStringArray(partial.desirable),
    whatJobInvolves: coerceStringArray(partial.whatJobInvolves),
    companyBenefits: coerceStringArray(partial.companyBenefits),
    sizeBand: coerceSizeBand(partial.sizeBand),
    insights: coerceInsights(partial.insights),
    funding: Array.isArray(partial.funding) ? (partial.funding as JobDetail["funding"]) : [],
    specialist:
      partial.specialist &&
      typeof partial.specialist === "object" &&
      !Array.isArray(partial.specialist)
        ? {
            name:
              typeof (partial.specialist as { name?: unknown }).name === "string"
                ? (partial.specialist as { name: string }).name
                : "",
            title:
              typeof (partial.specialist as { title?: unknown }).title === "string"
                ? (partial.specialist as { title: string }).title
                : "",
          }
        : base.specialist,
    compensationCurrency: (() => {
      if (typeof partial.compensationCurrency === "string" && partial.compensationCurrency.trim()) {
        return partial.compensationCurrency.trim();
      }
      const snake = row.compensation_currency;
      if (typeof snake === "string" && snake.trim()) return snake.trim();
      return undefined;
    })(),
    equityHighlight: (() => {
      if (typeof partial.equityHighlight === "string" && partial.equityHighlight.trim()) {
        return partial.equityHighlight.trim();
      }
      const h = row.equity_highlight;
      if (typeof h === "string" && h.trim()) return h.trim();
      return undefined;
    })(),
    equityCurrency: (() => {
      if (typeof partial.equityCurrency === "string" && partial.equityCurrency.trim()) {
        return partial.equityCurrency.trim();
      }
      const ec = row.equity_currency;
      if (typeof ec === "string" && ec.trim()) return ec.trim();
      return undefined;
    })(),
  };
}
