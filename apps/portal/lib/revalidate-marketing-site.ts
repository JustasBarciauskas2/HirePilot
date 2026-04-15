import { VACANCIES_LIST_FETCH_TAG } from "@techrecruit/shared/lib/fetch-tenant-vacancies";

/**
 * When the portal and marketing site are deployed separately, Next.js cache revalidation on the
 * portal host does not update the marketing app. After publish/delete, call the marketing site's
 * POST /api/revalidate (configure NEXT_PUBLIC_MARKETING_SITE_URL + REVALIDATE_SECRET on both apps).
 */
export async function revalidateMarketingSite(opts: {
  jobSlug?: string;
}): Promise<void> {
  const base = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!base || !secret) return;

  const origin = base.replace(/\/$/, "");
  const paths = ["/"];
  if (opts.jobSlug) {
    paths.push(`/jobs/${opts.jobSlug}`);
  }

  await fetch(`${origin}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      paths,
      tags: [VACANCIES_LIST_FETCH_TAG],
    }),
  }).catch(() => {});
}
