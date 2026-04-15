/**
 * Identifies this frontend deployment when posting to a shared backend / DB.
 * Set via env (never trust client-supplied values for tenancy).
 */
export type TenantInstancePayload = {
  /** Stable id for DB scoping (UUID or slug), e.g. "techrecruit-prod" */
  id: string;
};

/**
 * `id` from `TENANT_ID` → `SITE_INSTANCE_ID` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID` → `local-dev` / `unknown-instance`.
 */
export function getTenantInstancePayload(): TenantInstancePayload {
  const id =
    process.env.TENANT_ID?.trim() ||
    process.env.SITE_INSTANCE_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    (process.env.NODE_ENV !== "production" ? "local-dev" : "unknown-instance");
  return { id };
}
