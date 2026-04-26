import { NextRequest } from "next/server";

export const runtime = "nodejs";

const noStoreJson = { "Cache-Control": "no-store" } as const;

/** Must match `RECAPTCHA_V3_ACTION` in `components/portal/PortalLogin.tsx`. */
const RECAPTCHA_V3_ACTION = "portal_login";

function parseMinScore(): number {
  const raw = process.env.RECAPTCHA_MIN_SCORE?.trim();
  if (!raw) return 0.5;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.5;
  return n;
}

/**
 * Verifies a Google reCAPTCHA v3 token (score + action) before Firebase email/password sign-in.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    return Response.json(
      { error: "reCAPTCHA is not configured. Set RECAPTCHA_SECRET_KEY on the server." },
      { status: 503, headers: noStoreJson },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400, headers: noStoreJson });
  }
  const token =
    typeof body === "object" && body !== null && "token" in body && typeof (body as { token: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";
  if (!token) {
    return Response.json({ error: "Missing CAPTCHA token." }, { status: 400, headers: noStoreJson });
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);

  type SiteVerify = {
    success?: boolean;
    score?: number;
    action?: string;
    "error-codes"?: string[];
  };

  let data: SiteVerify;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    data = (await res.json()) as SiteVerify;
  } catch {
    return Response.json({ error: "Could not reach CAPTCHA service." }, { status: 502, headers: noStoreJson });
  }

  if (data.success !== true) {
    return Response.json({ error: "CAPTCHA verification failed." }, { status: 400, headers: noStoreJson });
  }

  if (typeof data.action === "string" && data.action !== RECAPTCHA_V3_ACTION) {
    return Response.json({ error: "CAPTCHA verification failed." }, { status: 400, headers: noStoreJson });
  }

  const minScore = parseMinScore();
  if (typeof data.score !== "number" || data.score < minScore) {
    return Response.json({ error: "CAPTCHA verification failed." }, { status: 400, headers: noStoreJson });
  }

  return Response.json({ ok: true }, { headers: noStoreJson });
}
