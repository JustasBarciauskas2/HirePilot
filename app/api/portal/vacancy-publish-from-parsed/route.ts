import { forwardVacancyToBackend, type VacancyUser } from "@/lib/forward-vacancy";
import { jobFromNormalized } from "@/lib/job-from-normalized";
import { mergeVacancyDefaults } from "@/lib/merge-vacancy-defaults";
import { addJob, readJobs } from "@/lib/jobs-store";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { getBackendVacancyPublishUrl } from "@/lib/backend-url";
import { getTenantInstancePayload } from "@/lib/tenant-instance";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";
import type { VacancyNormalizedFromDocument } from "@/data/vacancy-normalized-from-document";
import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { VACANCIES_LIST_FETCH_TAG } from "@/lib/fetch-tenant-vacancies";

function bearerFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  const m = header?.match(/^Bearer\s+(.+)$/i);
  const t = m?.[1]?.trim();
  return t || null;
}

function isVacancyBody(v: unknown): v is { vacancy: VacancyNormalizedFromDocument } {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.vacancy !== undefined && typeof o.vacancy === "object";
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json({ error: "Server auth not configured." }, { status: 503 });
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body" }, { status: 400 });
  }

  if (!isVacancyBody(body)) {
    return Response.json({ error: "Expected { vacancy: { ... } }" }, { status: 400 });
  }

  const vacancy = mergeVacancyDefaults(body.vacancy as Partial<VacancyNormalizedFromDocument>);
  if (!vacancy.title.trim() || !vacancy.companyName.trim()) {
    return Response.json({ error: "Title and company name are required." }, { status: 400 });
  }

  const existing = readJobs();
  const job = jobFromNormalized(existing, vacancy);
  const idToken = bearerFromRequest(req);

  const vacancyUser: VacancyUser = {
    sub: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
  };

  const publishUrl = getBackendVacancyPublishUrl();
  const backend = await forwardVacancyToBackend(vacancyUser, job, idToken, { url: publishUrl });

  const backendOptional =
    process.env.BACKEND_OPTIONAL === "true" || process.env.BACKEND_OPTIONAL === "1";

  if (!backend.ok) {
    if (!backendOptional) {
      const hint = "hint" in backend && typeof backend.hint === "string" ? backend.hint : "";
      return Response.json(
        {
          error: `Your backend did not accept this vacancy.${hint ? ` ${hint}` : ""} Or set BACKEND_OPTIONAL=true to save locally anyway.`,
          backend,
        },
        { status: 502 },
      );
    }
  }

  const jobToSave =
    backend.ok && "vacancyId" in backend && typeof backend.vacancyId === "string" && backend.vacancyId.trim()
      ? { ...job, id: backend.vacancyId.trim() }
      : job;
  addJob(jobToSave);

  revalidateTag(VACANCIES_LIST_FETCH_TAG, "max");
  revalidatePath("/");
  revalidatePath("/portal");
  revalidatePath(`/jobs/${jobToSave.slug}`);

  const tenant = getTenantInstancePayload();
  return Response.json({ ok: true, job: jobToSave, backend, tenant });
}
