import { NextRequest } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import {
  assertCvSizeOk,
  createJobApplicationDoc,
  isAllowedCvMime,
  setBackendPersonIdForApplication,
  uploadApplicationCv,
  getTenantIdForApplications,
} from "@/lib/job-applications";
import { forwardJobApplicationToBackend } from "@/lib/forward-job-application";
import { getPublicJobBySlug } from "@/lib/public-jobs";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string {
  return raw.trim().slice(0, 40);
}

function rawError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function storageSubmitError(e: unknown): string {
  const raw = rawError(e);
  if (/NOT_FOUND|^\s*5\s+NOT_FOUND/i.test(raw)) {
    return (
      "Firebase Storage: bucket not found or wrong name. In Console → Storage, copy the bucket id from the gs:// URL " +
      "(e.g. hirepilot-b38f3.firebasestorage.app) and set FIREBASE_STORAGE_BUCKET and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET to that value. " +
      "Restart the dev server after changing .env."
    );
  }
  return raw || "Could not upload the CV.";
}

function firestoreSubmitError(e: unknown, projectId: string): string {
  const raw = rawError(e);
  if (/PERMISSION_DENIED|Cloud Firestore API has not been used|firestore\.googleapis\.com|API has not been used.*disabled/i.test(raw)) {
    return (
      "The Cloud Firestore API is not enabled for this Google Cloud project. " +
      `Open https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${encodeURIComponent(projectId)} ` +
      "and click Enable. Wait 1–2 minutes, then try again. " +
      "After that, in Firebase Console → Firestore → create the database if you have not already."
    );
  }
  if (/NOT_FOUND|^\s*5\s+NOT_FOUND/i.test(raw)) {
    return (
      "Firestore: database missing or not accessible. Open Firebase Console → Firestore → Create database (start in production or test mode). " +
      "Then retry."
    );
  }
  return raw || "Could not save the application.";
}

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

  const jobSlug = String(formData.get("jobSlug") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const cv = formData.get("cv");

  if (!jobSlug) {
    return Response.json({ error: "jobSlug is required." }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return Response.json({ error: "First name and last name are required." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!(cv instanceof File) || cv.size === 0) {
    return Response.json({ error: "A CV file (PDF or Word) is required." }, { status: 400 });
  }

  const mime = cv.type || "application/octet-stream";
  if (!isAllowedCvMime(mime)) {
    return Response.json(
      { error: "CV must be a PDF or Word document (.pdf, .doc, .docx)." },
      { status: 400 },
    );
  }

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

  try {
    assertCvSizeOk(buffer.length);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid file size.";
    return Response.json({ error: msg }, { status: 400 });
  }

  let storagePath: string;
  let fileName: string;
  let contentType: string;
  try {
    const uploaded = await uploadApplicationCv({
      tenantId,
      jobRef: job.ref,
      buffer,
      originalName: cv.name || "cv.pdf",
      contentType: mime,
    });
    storagePath = uploaded.storagePath;
    fileName = uploaded.fileName;
    contentType = uploaded.contentType;
  } catch (e) {
    console.error("[job-applications] storage upload failed", e);
    const err = storageSubmitError(e);
    return Response.json(
      {
        error: err,
        ...(process.env.NODE_ENV === "development" ? { debug: rawError(e) } : {}),
      },
      { status: 500 },
    );
  }

  let id: string;
  try {
    id = await createJobApplicationDoc({
      tenantId,
      jobRef: job.ref,
      jobSlug: job.slug,
      jobTitle: job.title,
      companyName: job.companyName,
      vacancyId: job.id?.trim() ?? null,
      firstName,
      lastName,
      email,
      phone,
      cvStoragePath: storagePath,
      cvFileName: fileName,
      cvContentType: contentType,
    });
  } catch (e) {
    console.error("[job-applications] firestore write failed", e);
    const firebaseProjectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      process.env.FIREBASE_PROJECT_ID?.trim() ||
      "your-project-id";
    const err = firestoreSubmitError(e, firebaseProjectId);
    return Response.json(
      {
        error: err,
        ...(process.env.NODE_ENV === "development" ? { debug: rawError(e) } : {}),
      },
      { status: 500 },
    );
  }

  const webhook = await forwardJobApplicationToBackend({
    applicationId: id,
    tenantId,
    jobRef: job.ref,
    jobSlug: job.slug,
    jobTitle: job.title,
    companyName: job.companyName,
    vacancyId: job.id?.trim() ?? null,
    firstName,
    lastName,
    email,
    phone,
    cvStoragePath: storagePath,
    cvFileName: fileName,
    cvContentType: contentType,
  });
  if (!webhook.ok) {
    console.error("[job-applications] backend webhook failed", webhook.status, webhook.hint);
  }

  let backendPersonId: string | undefined =
    webhook.ok && "backendPersonId" in webhook ? webhook.backendPersonId : undefined;
  if (backendPersonId) {
    const saved = await setBackendPersonIdForApplication(id, tenantId, backendPersonId);
    if (!saved) {
      console.error("[job-applications] could not persist backendPersonId on application doc", id);
    }
  }

  return Response.json({
    ok: true,
    id,
    ...(backendPersonId ? { backendPersonId } : {}),
  });
}
