#!/usr/bin/env node
/**
 * Set Firebase custom claim for portal tenancy (must match PORTAL_TENANT_FIREBASE_CLAIM, e.g. tenantId).
 *
 * Prerequisites: same project as the portal; service account (Firebase Console → Project settings → Service accounts).
 *
 * From repo root (Node 20+ loads env file):
 *   node --env-file=apps/portal/.env.local scripts/set-portal-tenant-claim.mjs <FIREBASE_USER_UID> <tenantId>
 *
 * Or export credentials in the shell:
 *   export FIREBASE_SERVICE_ACCOUNT_JSON='...'   # or GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *   node scripts/set-portal-tenant-claim.mjs <uid> <tenantId>
 *
 * Get UID: Firebase Console → Authentication → user row → copy User UID
 *
 * After running: user must sign out and back in (or getIdToken(true)) so the ID token includes the new claim.
 */

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const uid = process.argv[2];
const tenantId = process.argv[3];
const claimName = (process.env.PORTAL_TENANT_FIREBASE_CLAIM || "tenantId").trim() || "tenantId";

if (!uid?.trim() || !tenantId?.trim()) {
  console.error("Usage: node scripts/set-portal-tenant-claim.mjs <FIREBASE_USER_UID> <tenantId>");
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
  console.error("Missing credentials: set FIREBASE_SERVICE_ACCOUNT_JSON (portal .env) or GOOGLE_APPLICATION_CREDENTIALS=path/to.json");
  process.exit(1);
}

const claims = { [claimName]: tenantId };
await getAuth().setCustomUserClaims(uid, claims);
const user = await getAuth().getUser(uid);
console.log("OK. Custom claims for", uid, ":", user.customClaims);
console.log("User should sign out and back in to refresh the ID token.");
