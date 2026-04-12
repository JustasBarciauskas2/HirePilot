"use client";

import { getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { friendlySignInError } from "@/lib/auth-error-message";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#7107E7]/45 focus:ring-2 focus:ring-[#7107E7]/12";

export function PortalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      const auth = getAuth(getApp());
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setErr(friendlySignInError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-zinc-200/90 bg-white p-8 shadow-[0_24px_60px_-28px_rgba(24,24,27,0.12)]">
      <p className="font-display text-xl font-semibold text-zinc-950">Recruiter portal</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Sign in with your work email and password to manage vacancies.
      </p>
      {err ? (
        <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs text-zinc-500">Email</span>
          <input
            className={inputClass}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-zinc-500">Password</span>
          <input
            className={inputClass}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#7107E7] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(113,7,231,0.45)] transition hover:bg-[#5b06c2] disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Log in to portal"}
        </button>
      </form>
    </div>
  );
}
