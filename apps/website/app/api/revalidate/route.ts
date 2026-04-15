import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";

type Body = {
  paths?: unknown;
  tags?: unknown;
};

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 501 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];

  for (const p of paths) {
    if (p.startsWith("/")) {
      revalidatePath(p);
    }
  }
  for (const t of tags) {
    revalidateTag(t, "max");
  }

  return Response.json({ ok: true, revalidated: { paths, tags } });
}
