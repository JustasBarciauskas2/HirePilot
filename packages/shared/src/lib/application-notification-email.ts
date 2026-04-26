/**
 * Transactional emails when a candidate applies (marketing site → POST /api/job-applications).
 * Uses the Resend HTTP API. `RESEND_API_KEY` only authenticates; each request must include `from` (Resend
 * does not apply a dashboard “default from” to the API). Override with `APPLICATION_EMAIL_FROM` to match
 * your verified domain/sender in Resend. Without that env, we use `DEFAULT_APPLICATION_EMAIL_FROM`.
 */

export type NewApplicationEmailPayload = {
  applicationId: string;
  tenantId: string;
  jobRef: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  firstName: string;
  lastName: string;
  applicantEmail: string;
  phone: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseNotifyList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

const DEFAULT_APPLICATION_EMAIL_FROM = "HirePilot <notifications@gethirepilot.com>";

/** HTML signature wordmark: Inter where supported (email clients fall back to system UI fonts). */
const HIREPILOT_WORDMARK_HTML = `<span style="font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">HirePilot</span>`;

/** "Name <a@b>" → a@b, else the whole string (for signature / mailto) */
function senderAddressForFooter(from: string): string {
  const m = from.match(/<([^>]+)>\s*$/);
  if (m?.[1]) return m[1].trim();
  return from.trim();
}

async function postResendEmail(params: {
  apiKey: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend ${res.status}: ${errBody || res.statusText}`);
  }
}

/**
 * Notifies the applicant and (when configured) the recruiter. Does not throw — logs on failure
 * so the apply flow is never broken by email.
 */
export async function sendNewApplicationNotificationEmails(payload: NewApplicationEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[application-email] RESEND_API_KEY is not set; skipping applicant/recruiter notification emails.");
    }
    return;
  }

  const from = process.env.APPLICATION_EMAIL_FROM?.trim() || DEFAULT_APPLICATION_EMAIL_FROM;
  const signatureEmail = senderAddressForFooter(from);
  const recruiterTos = parseNotifyList(process.env.RECRUITER_APPLICATION_NOTIFY_EMAIL);
  const portalBase = process.env.NEXT_PUBLIC_PORTAL_URL?.trim().replace(/\/$/, "");
  const jobPublicBase = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim().replace(/\/$/, "");
  const jobUrl =
    jobPublicBase && payload.jobSlug
      ? `${jobPublicBase}/jobs/${encodeURIComponent(payload.jobSlug)}`
      : null;

  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  const enc = (s: string) => escapeHtml(s);

  // --- Applicant ---
  const applicantSubject = `We received your application — ${payload.jobTitle}`;
  const applicantText = [
    `Hi ${payload.firstName},`,
    ``,
    `Thank you for applying for ${payload.jobTitle} at ${payload.companyName}.`,
    `We have received your application and will be in touch if your profile is a good match.`,
    ``,
    `Application reference: ${payload.applicationId}`,
    `Role reference: ${payload.jobRef}`,
    jobUrl ? `Job listing: ${jobUrl}` : null,
    ``,
    `If you did not submit this application, you can ignore this message.`,
    ``,
    `— HirePilot`,
    signatureEmail,
  ]
    .filter(Boolean)
    .join("\n");

  const applicantHtml = `<p>Hi ${enc(payload.firstName)},</p>
<p>Thank you for applying for <strong>${enc(payload.jobTitle)}</strong> at <strong>${enc(
    payload.companyName,
  )}</strong>.</p>
<p>We have received your application and will be in touch if your profile is a good match.</p>
<p><strong>Application reference:</strong> ${enc(payload.applicationId)}<br/>
<strong>Role reference:</strong> ${enc(payload.jobRef)}</p>
${jobUrl ? `<p><a href="${escapeHtml(jobUrl)}">View the job listing</a></p>` : ""}
<p style="color:#64748b;font-size:12px">If you did not submit this application, you can ignore this message.</p>
<p>— HirePilot<br/><a href="mailto:${encodeURIComponent(signatureEmail)}">${escapeHtml(
    signatureEmail,
  )}</a></p>`;

  try {
    await postResendEmail({
      apiKey,
      from,
      to: [payload.applicantEmail],
      subject: applicantSubject,
      text: applicantText,
      html: applicantHtml,
    });
  } catch (e) {
    console.error("[application-email] applicant notification failed", e);
  }

  if (recruiterTos.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[application-email] RECRUITER_APPLICATION_NOTIFY_EMAIL not set; skipping recruiter copy.",
      );
    }
    return;
  }

  const portalLink = portalBase ? `${portalBase}/?tab=applications` : null;

  const recSubject = `New application: ${fullName} — ${payload.jobTitle} (${payload.jobRef})`;
  const recText = [
    `A new application was submitted for ${payload.jobTitle} at ${payload.companyName}.`,
    ``,
    `Candidate: ${fullName}`,
    `Email: ${payload.applicantEmail}`,
    `Phone: ${payload.phone || "—"}`,
    ``,
    `Job: ${payload.jobTitle} (${payload.jobRef})`,
    `Application id: ${payload.applicationId}`,
    `Tenant: ${payload.tenantId}`,
    jobUrl ? `Public job page: ${jobUrl}` : null,
    portalLink ? `Portal: ${portalLink}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const recHtml = `<p><strong>New application</strong> for <strong>${enc(
    payload.jobTitle,
  )}</strong> at <strong>${enc(payload.companyName)}</strong>.</p>
<table style="border-collapse:collapse;font-size:14px">
<tr><td style="padding:4px 12px 4px 0;color:#64748b">Candidate</td><td>${enc(fullName)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#64748b">Email</td><td><a href="mailto:${encodeURIComponent(
    payload.applicantEmail,
  )}">${enc(payload.applicantEmail)}</a></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#64748b">Phone</td><td>${enc(payload.phone || "—")}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#64748b">Job ref</td><td>${enc(payload.jobRef)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#64748b">Application id</td><td>${enc(
    payload.applicationId,
  )}</td></tr>
</table>
${jobUrl ? `<p><a href="${escapeHtml(jobUrl)}">View public job page</a></p>` : ""}
${
  portalLink
    ? `<p><a href="${escapeHtml(portalLink)}">Open recruiter portal (Applications)</a></p>`
    : ""
}
<p style="color:#64748b;font-size:12px">— ${HIREPILOT_WORDMARK_HTML}</p>`;

  try {
    await postResendEmail({
      apiKey,
      from,
      to: recruiterTos,
      subject: recSubject,
      text: recText,
      html: recHtml,
    });
  } catch (e) {
    console.error("[application-email] recruiter notification failed", e);
  }
}
