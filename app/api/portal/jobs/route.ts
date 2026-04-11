import { auth0 } from "@/lib/auth0";
import type { JobSizeBand } from "@/data/job-types";
import { buildJobFromPortalInput } from "@/lib/create-job-from-input";
import { addJob, readJobs } from "@/lib/jobs-store";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

const SIZE_BANDS: JobSizeBand[] = ["1-100", "101-250", "201-500"];

function parseSizeBand(v: FormDataEntryValue | null): JobSizeBand | undefined {
  const s = typeof v === "string" ? v : "";
  return SIZE_BANDS.includes(s as JobSizeBand) ? (s as JobSizeBand) : undefined;
}

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth0.getSession(req);
  if (!session) {
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

  if (!title || !companyName || !type || !comp || !location || !description) {
    return Response.json(
      {
        error:
          "Missing required fields: title, company, type, compensation, location, and description (or file).",
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

  addJob(job);

  revalidatePath("/");
  revalidatePath("/portal");
  revalidatePath(`/jobs/${job.slug}`);

  return Response.json({ ok: true, job });
}
