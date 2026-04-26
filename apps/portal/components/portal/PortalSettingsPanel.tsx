"use client";

import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { friendlySignInError } from "@techrecruit/shared/lib/auth-error-message";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { FieldGroup, SectionPanel, addButtonClass, inputClass, labelClass } from "@/components/portal/portal-form-primitives";

type MeResponse = {
  email: string | null;
  emailNotificationsEnabled: boolean;
  applicationNotificationEmail: string | null;
};

export function PortalSettingsPanel({ user }: { user: User }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [savingNotify, setSavingNotify] = useState(false);
  const [notifyEmailDraft, setNotifyEmailDraft] = useState("");
  const [savingNotifyEmail, setSavingNotifyEmail] = useState(false);
  const [notifyEmailSaved, setNotifyEmailSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const loadMe = useCallback(async () => {
    setMeError(null);
    try {
      const res = await fetch("/api/portal/settings/me", {
        headers: await portalAuthHeaders(user),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as MeResponse & { error?: string };
      if (!res.ok) {
        setMeError(typeof data.error === "string" ? data.error : `Could not load settings (${res.status})`);
        return;
      }
      const applicationNotificationEmail =
        typeof data.applicationNotificationEmail === "string" && data.applicationNotificationEmail.trim()
          ? data.applicationNotificationEmail.trim()
          : null;
      setMe({
        email: data.email ?? null,
        emailNotificationsEnabled: data.emailNotificationsEnabled !== false,
        applicationNotificationEmail,
      });
      setNotifyEmailDraft(applicationNotificationEmail ?? "");
    } catch {
      setMeError("Could not load settings.");
    }
  }, [user]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function onToggleNotifications(next: boolean) {
    if (!me) return;
    setSavingNotify(true);
    setMeError(null);
    try {
      const res = await fetch("/api/portal/settings/me", {
        method: "PUT",
        headers: { ...(await portalAuthHeaders(user)), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailNotificationsEnabled: next }),
      });
      const data = (await res.json().catch(() => ({}))) as MeResponse & { error?: string };
      if (!res.ok) {
        setMeError(typeof data.error === "string" ? data.error : "Could not save preference.");
        return;
      }
      const applicationNotificationEmail =
        typeof data.applicationNotificationEmail === "string" && data.applicationNotificationEmail.trim()
          ? data.applicationNotificationEmail.trim()
          : null;
      setMe({
        ...me,
        emailNotificationsEnabled: next,
        applicationNotificationEmail: applicationNotificationEmail ?? me.applicationNotificationEmail ?? null,
      });
    } catch {
      setMeError("Could not save preference.");
    } finally {
      setSavingNotify(false);
    }
  }

  async function onSaveNotifyEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setNotifyEmailSaved(false);
    setMeError(null);
    setSavingNotifyEmail(true);
    try {
      const trimmed = notifyEmailDraft.trim();
      const res = await fetch("/api/portal/settings/me", {
        method: "PUT",
        headers: { ...(await portalAuthHeaders(user)), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          applicationNotificationEmail: trimmed === "" ? null : trimmed,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as MeResponse & { error?: string };
      if (!res.ok) {
        setMeError(typeof data.error === "string" ? data.error : "Could not save email.");
        return;
      }
      const applicationNotificationEmail =
        typeof data.applicationNotificationEmail === "string" && data.applicationNotificationEmail.trim()
          ? data.applicationNotificationEmail.trim()
          : null;
      setMe({
        ...me,
        applicationNotificationEmail,
        emailNotificationsEnabled: data.emailNotificationsEnabled !== false,
      });
      setNotifyEmailDraft(applicationNotificationEmail ?? "");
      setNotifyEmailSaved(true);
      window.setTimeout(() => setNotifyEmailSaved(false), 2500);
    } catch {
      setMeError("Could not save email.");
    } finally {
      setSavingNotifyEmail(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    const email = user.email?.trim();
    if (!email) {
      setPasswordError("Your account has no email; password change is not available.");
      return;
    }
    setPasswordPending(true);
    try {
      const auth = getAuth(getApp());
      const cred = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setPasswordMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(friendlySignInError(err));
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {meError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {meError}
        </p>
      ) : null}

      <SectionPanel>
        <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">Notifications</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
          Choose whether you want email notifications when new candidates apply. Pick which inbox receives alerts — this
          only affects your account.
        </p>
        <div className="mt-4 flex items-center gap-3">
          {!me ? (
            <p className="text-sm text-zinc-500 dark:text-slate-400">Loading…</p>
          ) : (
            <>
              <button
                type="button"
                disabled={savingNotify}
                role="switch"
                aria-label="Application notification emails"
                aria-checked={me.emailNotificationsEnabled !== false}
                onClick={() => void onToggleNotifications(!me.emailNotificationsEnabled)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  me.emailNotificationsEnabled !== false ? "bg-[#2563EB]" : "bg-zinc-300 dark:bg-slate-600"
                } disabled:opacity-50`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    me.emailNotificationsEnabled !== false ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-zinc-800 dark:text-slate-200">
                {me.emailNotificationsEnabled === false ? "Application emails off" : "Application emails on"}
              </span>
            </>
          )}
        </div>
        {me ? (
          <form onSubmit={(e) => void onSaveNotifyEmail(e)} className="mt-5 space-y-2">
            <label className={labelClass}>
              Send application alerts to
              <input
                className={`${inputClass} mt-1.5`}
                type="email"
                name="applicationNotificationEmail"
                autoComplete="email"
                placeholder={me.email ? `Default: ${me.email}` : "Sign-in email"}
                value={notifyEmailDraft}
                onChange={(e) => {
                  setNotifyEmailDraft(e.target.value);
                  setNotifyEmailSaved(false);
                }}
              />
            </label>
            <p className="text-xs text-zinc-500 dark:text-slate-400">
              Leave blank to use your sign-in email ({me.email ?? "—"}). You can send alerts to a different inbox if you
              prefer.
            </p>
            <button
              type="submit"
              disabled={savingNotifyEmail}
              className={`${addButtonClass} disabled:opacity-50`}
            >
              {savingNotifyEmail ? "Saving…" : "Save email"}
            </button>
            {notifyEmailSaved ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                Saved.
              </p>
            ) : null}
          </form>
        ) : null}
      </SectionPanel>

      <SectionPanel>
        <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">Password</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
          Signed in as <span className="font-medium text-zinc-800 dark:text-slate-200">{me?.email ?? user.email ?? "—"}</span>
        </p>
        <form onSubmit={(e) => void onChangePassword(e)} className="mt-4 space-y-4">
          <FieldGroup>
            <label className={labelClass}>
              Current password
              <input
                className={`${inputClass} mt-1.5`}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              New password
              <input
                className={`${inputClass} mt-1.5`}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label className={labelClass}>
              Confirm new password
              <input
                className={`${inputClass} mt-1.5`}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
          </FieldGroup>
          {passwordError ? (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              {passwordError}
            </p>
          ) : null}
          {passwordMessage ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {passwordMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={passwordPending}
            className={`${addButtonClass} disabled:opacity-50`}
          >
            Update password
          </button>
        </form>
      </SectionPanel>
    </div>
  );
}
