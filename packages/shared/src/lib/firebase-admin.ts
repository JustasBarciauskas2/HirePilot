import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let cachedAuth: Auth | null = null;
let cachedFirestore: Firestore | null = null;
let cachedStorage: Storage | null = null;

/**
 * Default GCS bucket name for Firebase Storage (no `gs://` prefix).
 * New projects use `{projectId}.firebasestorage.app`; older ones use `{projectId}.appspot.com`.
 * Set `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` / `FIREBASE_STORAGE_BUCKET` if yours differs.
 */
function resolveDefaultStorageBucketName(projectIdHint?: string): string | undefined {
  const explicit =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (explicit) return explicit;
  const pid =
    projectIdHint?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();
  if (pid) return `${pid}.firebasestorage.app`;
  return undefined;
}

function getAdminApp(): App {
  getFirebaseAdminAuth();
  return getApps()[0]!;
}

export function isFirebaseAdminConfigured(): boolean {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      json ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY),
  );
}

function looksLikeInlineServiceAccountJson(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") && t.includes('"type"') && t.includes("service_account");
}

function initializeAppFromServiceAccountJson(json: string): void {
  const raw = JSON.parse(json) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  const bucket = resolveDefaultStorageBucketName(raw.project_id);
  initializeApp({
    credential: cert({
      projectId: raw.project_id,
      clientEmail: raw.client_email,
      privateKey: raw.private_key,
    }),
    ...(bucket ? { storageBucket: bucket } : {}),
  });
}

export function getFirebaseAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;

  if (getApps().length === 0) {
    const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    const fsaJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

    if (fsaJson) {
      initializeAppFromServiceAccountJson(fsaJson);
    } else if (gac && looksLikeInlineServiceAccountJson(gac)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[firebase-admin] GOOGLE_APPLICATION_CREDENTIALS contains JSON, not a file path. Use a path to a .json file, or set FIREBASE_SERVICE_ACCOUNT_JSON instead.",
        );
      }
      initializeAppFromServiceAccountJson(gac);
    } else if (gac) {
      const bucket = resolveDefaultStorageBucketName();
      initializeApp({
        credential: applicationDefault(),
        ...(bucket ? { storageBucket: bucket } : {}),
      });
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      const pid = process.env.FIREBASE_PROJECT_ID;
      const bucket = resolveDefaultStorageBucketName(pid);
      initializeApp({
        credential: cert({
          projectId: pid,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        ...(bucket ? { storageBucket: bucket } : {}),
      });
    } else {
      throw new Error("Firebase Admin SDK is not configured");
    }
  }

  cachedAuth = getAuth(getApps()[0]!);
  return cachedAuth;
}

/** Firestore (job applications, etc.) — same credentials as Auth. */
export function getFirebaseAdminFirestore(): Firestore {
  if (cachedFirestore) return cachedFirestore;
  cachedFirestore = getFirestore(getAdminApp());
  return cachedFirestore;
}

/** Firebase Storage (CV uploads, etc.). */
export function getFirebaseAdminStorage(): Storage {
  if (cachedStorage) return cachedStorage;
  cachedStorage = getStorage(getAdminApp());
  return cachedStorage;
}

/**
 * Resolves the bucket passed to `storage.bucket(name)`. Defaults match `initializeApp` (`*.firebasestorage.app` for new projects).
 */
export function getFirebaseStorageBucket() {
  const name =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const storage = getFirebaseAdminStorage();
  return name ? storage.bucket(name) : storage.bucket();
}
