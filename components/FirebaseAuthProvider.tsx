"use client";

import { getFirebaseWebConfig, isFirebaseClientConfigured } from "@/lib/firebase-public-config";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthState = {
  user: User | null;
  loading: boolean;
  configured: boolean;
};

const FirebaseAuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  configured: false,
});

function getOrCreateApp(): FirebaseApp | null {
  if (!isFirebaseClientConfigured()) return null;
  const c = getFirebaseWebConfig();
  if (!c.apiKey || !c.projectId) return null;
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: c.apiKey,
    authDomain: c.authDomain || undefined,
    projectId: c.projectId,
    storageBucket: c.storageBucket || undefined,
    messagingSenderId: c.messagingSenderId || undefined,
    appId: c.appId || undefined,
  });
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseClientConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const app = getOrCreateApp();
    if (!app) {
      setLoading(false);
      return;
    }
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [configured]);

  const value = useMemo(() => ({ user, loading, configured }), [user, loading, configured]);

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth() {
  return useContext(FirebaseAuthContext);
}
