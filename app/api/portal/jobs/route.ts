import { forwardVacancyToBackend, type VacancyUser } from "@/lib/forward-vacancy";
import { JOB_SIZE_BANDS, type JobSizeBand } from "@/data/job-types";
import { buildJobFromPortalInput } from "@/lib/create-job-from-input";
import { addJob, readJobs } from "@/lib/jobs-store";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { getTenantInstancePayload } from "@/lib/tenant-instance";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";
import { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { VACANCIES_LIST_FETCH_TAG } from "@/lib/fetch-tenant-vacancies";

function parseSizeBand(v: FormDataEntryValue | null): JobSizeBand | undefined {
  const s = typeof v === "string" ? v : "";
  return (JOB_SIZE_BANDS as readonly string[]).includes(s) ? (s as JobSizeBand) : undefined;
}

function bearerFromRequest(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  const m = header?.match(/^Bearer\s+(.+)$/i);
  const t = m?.[1]?.trim();
  return t || null;
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      {
        error:
          "Server auth not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
      },
      { status: 503 },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const companyName = String(form.get("companyName") ?? "").trim();
  const type = String(form.get("type") ?? "").trim();
  const comp = String(form.get("comp") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  let description = String(form.get("description") ?? "").trim();

  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const max = 512 * 1024;
    if (file.size > max) {
      return Response.json({ error: "File too large (max 512KB)" }, { status: 400 });
    }
    const blobText = await file.text();
    description = [description, blobText].filter(Boolean).join("\n\n");
  }

  if (!title || !companyName || !type || !comp || !location) {
    return Response.json(
      {
        error:
          "Missing required fields: title, company, type, compensation, and location.",
      },
      { status: 400 },
    );
  }

  const existing = readJobs();
  const job = buildJobFromPortalInput(existing, {
    title,
    companyName,
    type,
    comp,
    location,
    description,
    salaryHighlight: String(form.get("salaryHighlight") ?? "").trim() || undefined,
    equityNote: String(form.get("equityNote") ?? "").trim() || undefined,
    clientLine: String(form.get("clientLine") ?? "").trim() || undefined,
    locationTag: String(form.get("locationTag") ?? "").trim() || undefined,
    experienceLevel: String(form.get("experienceLevel") ?? "").trim() || undefined,
    companyTagline: String(form.get("companyTagline") ?? "").trim() || undefined,
    companySize: String(form.get("companySize") ?? "").trim() || undefined,
    regionsText: String(form.get("regionsText") ?? "").trim() || undefined,
    industriesText: String(form.get("industriesText") ?? "").trim() || undefined,
    skillsText: String(form.get("skillsText") ?? "").trim() || undefined,
    sizeBand: parseSizeBand(form.get("sizeBand")),
  });

  const idToken = bearerFromRequest(req);

  if (process.env.DEBUG_PRINT_ACCESS_TOKEN === "true") {
    console.log(
      "[portal/jobs] Firebase ID token (sent as Authorization: Bearer when non-null):",
      idToken ?? "(null)",
    );
  }

  const vacancyUser: VacancyUser = {
    sub: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
  };

  const backend = await forwardVacancyToBackend(vacancyUser, job, idToken);

  const backendOptional =
    process.env.BACKEND_OPTIONAL === "true" || process.env.BACKEND_OPTIONAL === "1";

  if (!backend.ok) {
    if (!backendOptional) {
      const hint = "hint" in backend && typeof backend.hint === "string" ? backend.hint : "";
      return Response.json(
        {
          error: `Your backend did not accept this listing (or could not be reached).${hint ? ` ${hint}` : ""} Or set BACKEND_OPTIONAL=true to save locally anyway.`,
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

  return Response.json({ ok: true, job: jobToSave, backend, tenant: getTenantInstancePayload() });
}
