"use client";

import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
} from "firebase/auth";
import Image from "next/image";
import { useState } from "react";
import { friendlySignInError } from "@techrecruit/shared/lib/auth-error-message";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB]/50 focus:ring-2 focus:ring-[#2563EB]/15";

export function PortalForcePasswordChange({
  user,
  onComplete,
}: {
  user: User;
  onComplete: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function onBackToSignIn() {
    setErr(null);
    setSigningOut(true);
    try {
      await signOut(getAuth(getApp()));
    } catch {
      setErr("Could not sign out. Try refreshing the page.");
    } finally {
      setSigningOut(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (newPassword.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("New password and confirmation do not match.");
      return;
    }
    const email = user.email?.trim();
    if (!email) {
      setErr("Your account has no email. Contact an administrator.");
      return;
    }

    setPending(true);
    try {
      const cred = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);

      const res = await fetch("/api/portal/auth/clear-must-change-password", {
        method: "POST",
        headers: await portalAuthHeaders(user, { forceRefreshToken: true }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : "Password was updated but the server could not finalize setup. Try refreshing the page.",
        );
        return;
      }

      await user.getIdToken(true);
      onComplete();
    } catch (e) {
      setErr(friendlySignInError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.15),0_0_0_1px_rgba(37,99,235,0.04)] backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
          <Image
            src="/brand-logo.png"
            alt=""
            width={48}
            height={48}
            className="h-10 w-10 object-contain"
            priority
            unoptimized
          />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-[#0B1F3A] sm:text-xl">Set your password</p>
          <p className="text-xs font-medium text-slate-500">First-time sign-in</p>
        </div>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">
        Choose a new password for your account. You will use it for all future sign-ins.
      </p>
      {err ? (
        <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800" role="alert">
          {err}
        </p>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
        <p className="text-xs font-medium text-slate-500">
          Signed in as <span className="text-slate-700">{user.email ?? "—"}</span>
        </p>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Current (temporary) password</span>
          <input
            className={inputClass}
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">New password</span>
          <input
            className={inputClass}
            type="password"
            name="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Confirm new password</span>
          <input
            className={inputClass}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button
          type="submit"
          disabled={pending || signingOut}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(37,99,235,0.5)] transition hover:bg-[#1d4ed8] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Continue to portal"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => void onBackToSignIn()}
        disabled={pending || signingOut}
        className="mt-4 w-full text-center text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 transition hover:text-[#2563EB] hover:decoration-[#2563EB]/40 disabled:opacity-50"
      >
        {signingOut ? "Signing out…" : "Back to sign in"}
      </button>
    </div>
  );
}
