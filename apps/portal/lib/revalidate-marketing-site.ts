import { VACANCIES_LIST_FETCH_TAG } from "@techrecruit/shared/lib/fetch-tenant-vacancies";
import {
  normalizeMarketingSiteOriginForPortalLinks,
  resolveMarketingSiteOriginForPortalLinks,
} from "@techrecruit/shared/lib/portal-tenant";

/**
 * When the portal and marketing site are deployed separately, Next.js cache revalidation on the
 * portal host does not update the marketing app. After publish/delete, call the marketing site's
 * POST /api/revalidate.
 *
 * Set `REVALIDATE_SECRET` and either `NEXT_PUBLIC_MARKETING_SITE_URL` or (local dev) `tenantId` so
 * {@link resolveMarketingSiteOriginForPortalLinks} can infer the marketing origin from
 * `NEXT_PUBLIC_PORTAL_URL` the same way as “View on site” links.
 */
export async function revalidateMarketingSite(opts: {
  jobSlug?: string;
  tenantId?: string;
}): Promise<void> {
  const fromEnv = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  const origin = fromEnv
    ? normalizeMarketingSiteOriginForPortalLinks(fromEnv)
    : opts.tenantId
      ? resolveMarketingSiteOriginForPortalLinks(opts.tenantId)
      : null;
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!origin || !secret) return;

  const base = origin.replace(/\/$/, "");
  const paths = ["/"];
  if (opts.jobSlug) {
    paths.push(`/jobs/${opts.jobSlug}`);
  }

  await fetch(`${base}/api/revalidate`, {
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
