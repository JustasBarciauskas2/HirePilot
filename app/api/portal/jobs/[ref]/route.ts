import { auth0 } from "@/lib/auth0";
import { removeJobByRef } from "@/lib/jobs-store";
import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

type RouteContext = { params: Promise<{ ref: string }> };

export async function DELETE(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const session = await auth0.getSession(req);
  if (!session) {
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
