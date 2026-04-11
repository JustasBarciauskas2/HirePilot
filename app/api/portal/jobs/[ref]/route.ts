import { removeJobByRef } from "@/lib/jobs-store";
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { getFirebaseUserFromRequest } from "@/lib/verify-firebase-request";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

type RouteContext = { params: Promise<{ ref: string }> };

export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<Response> {
  if (!isFirebaseAdminConfigured()) {
    return Response.json(
      {
        error:
          "Server auth not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
      },
      { status: 503 },
    );
  }

  const decoded = await getFirebaseUserFromRequest(req);
  if (!decoded) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const p = await ctx.params;
  const ref = p?.ref ?? "";
  if (!ref) {
    return Response.json({ error: "Missing ref" }, { status: 400 });
  }

  const slug = ref.toLowerCase();
  if (!removeJobByRef(ref)) {
    return Response.json({ error: "Vacancy not found" }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/portal");
  revalidatePath(`/jobs/${slug}`);

  return Response.json({ ok: true });
}
