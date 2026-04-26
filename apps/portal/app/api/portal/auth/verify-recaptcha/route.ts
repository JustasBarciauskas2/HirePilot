import { NextRequest } from "next/server";

export const runtime = "nodejs";

const noStoreJson = { "Cache-Control": "no-store" } as const;

/**
 * Verifies a Google reCAPTCHA v2 (checkbox) token before Firebase email/password sign-in.
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

  let success = false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await res.json()) as { success?: boolean };
    success = data.success === true;
  } catch {
    return Response.json({ error: "Could not reach CAPTCHA service." }, { status: 502, headers: noStoreJson });
  }

  if (!success) {
    return Response.json({ error: "CAPTCHA verification failed." }, { status: 400, headers: noStoreJson });
  }

  return Response.json({ ok: true }, { headers: noStoreJson });
}
