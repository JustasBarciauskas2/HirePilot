import { after, NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@techrecruit/shared/lib/firebase-admin";
import {
  parseJobApplicationFormFields,
  runJobApplicationIntake,
} from "@techrecruit/shared/lib/job-application-intake";
import { getTenantIdForApplications } from "@techrecruit/shared/lib/job-applications";
import { getPublicJobBySlug } from "@techrecruit/shared/lib/public-jobs";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      { error: "Applications are not configured (Firebase Admin required)." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const parsed = parseJobApplicationFormFields(formData);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { jobSlug, firstName, lastName, email, phone, cv } = parsed;
  const mime = cv.type || "application/octet-stream";

  const job = await getPublicJobBySlug(jobSlug);
  if (!job) {
    return Response.json({ error: "This vacancy is not open for applications." }, { status: 404 });
  }

  const tenantId = getTenantIdForApplications();
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await cv.arrayBuffer());
  } catch {
    return Response.json({ error: "Could not read the uploaded file." }, { status: 400 });
  }

  const result = await runJobApplicationIntake({
    tenantId,
    job,
    firstName,
    lastName,
    email,
    phone,
    cv: {
      buffer,
      originalName: cv.name || "cv.pdf",
      contentType: mime,
    },
    runAfter: after,
  });

  if (!result.ok) {
    return Response.json(result.body, { status: result.status });
  }
  return Response.json(result.body, { status: result.status });
}
