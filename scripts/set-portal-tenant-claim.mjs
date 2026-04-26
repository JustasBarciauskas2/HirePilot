#!/usr/bin/env node
/**
 * Set Firebase custom claim for portal tenancy (must match PORTAL_TENANT_FIREBASE_CLAIM, e.g. tenantId).
 * Optionally set or clear portal admin (`portalAdmin` claim) for team management in the portal.
 *
 * Prerequisites: same project as the portal; service account (Firebase Console → Project settings → Service accounts).
 *
 * From repo root (Node 20+ loads env file):
 *   node --env-file=apps/portal/.env.local scripts/set-portal-tenant-claim.mjs <FIREBASE_USER_UID> <tenantId> [admin]
 *
 * Admin (4th argument, optional):
 *   true  — set portalAdmin (e.g. true, 1, yes, admin, y)
 *   false — remove portalAdmin (e.g. false, 0, no, n)
 *   omit  — leave portalAdmin unchanged; other existing custom claims are preserved
 *
 * Or export credentials in the shell:
 *   export FIREBASE_SERVICE_ACCOUNT_JSON='...'   # or GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   node scripts/set-portal-tenant-claim.mjs <uid> <tenantId> true
 *
 * Get UID: Firebase Console → Authentication → user row → copy User UID
 *
 * After running: user must sign out and back in (or getIdToken(true)) so the ID token includes the new claims.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PORTAL_ADMIN_CLAIM = "portalAdmin";

const uid = process.argv[2]?.trim();
const tenantId = process.argv[3]?.trim();
const adminRaw = typeof process.argv[4] === "string" ? process.argv[4].trim().toLowerCase() : "";
const claimName = (process.env.PORTAL_TENANT_FIREBASE_CLAIM || "tenantId").trim() || "tenantId";

function parseAdminFlag(raw) {
  if (raw === "") return null;
  if (["1", "true", "yes", "admin", "y"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  console.error(`Invalid admin flag "${process.argv[4]}". Use true|false, or omit to leave portalAdmin unchanged.`);
  process.exit(1);
}

const admin = parseAdminFlag(adminRaw);

if (!uid || !tenantId) {
  console.error("Usage: node scripts/set-portal-tenant-claim.mjs <FIREBASE_USER_UID> <tenantId> [admin]");
  console.error("  admin: true | false (optional — if omitted, portalAdmin is not changed)");
  console.error("Optional env: PORTAL_TENANT_FIREBASE_CLAIM (default: tenantId) — must match portal .env");
  process.exit(1);
}

const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

if (jsonRaw) {
  const sa = JSON.parse(jsonRaw);
  initializeApp({ credential: cert(sa) });
} else if (gacPath) {
  const sa = JSON.parse(readFileSync(gacPath, "utf8"));
  initializeApp({ credential: cert(sa) });
} else {
  console.error(
    "Missing credentials: set FIREBASE_SERVICE_ACCOUNT_JSON (portal .env) or GOOGLE_APPLICATION_CREDENTIALS=path/to.json",
  );
  process.exit(1);
}

const auth = getAuth();
const existing = await auth.getUser(uid);
const prev = { ...(existing.customClaims ?? {}) };
const next = { ...prev, [claimName]: tenantId };

if (admin === true) {
  next[PORTAL_ADMIN_CLAIM] = true;
} else if (admin === false) {
  delete next[PORTAL_ADMIN_CLAIM];
}

await auth.setCustomUserClaims(uid, next);
const user = await auth.getUser(uid);
console.log("OK. Custom claims for", uid, ":", user.customClaims);
console.log("User should sign out and back in to refresh the ID token.");
