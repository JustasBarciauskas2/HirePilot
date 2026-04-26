"use client";

import { getApp } from "firebase/app";
import type { User } from "firebase/auth";
import { EmailAuthProvider, getAuth, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { Trash, UserPlus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { friendlySignInError } from "@techrecruit/shared/lib/auth-error-message";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { FieldGroup, SectionPanel, addButtonClass, inputClass, labelClass } from "@/components/portal/portal-form-primitives";

type MeResponse = {
  email: string | null;
  emailNotificationsEnabled: boolean;
  isAdmin: boolean;
  teamManagementAvailable: boolean;
};

type TenantUserRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  portalAdmin: boolean;
};

export function PortalSettingsPanel({ user }: { user: User }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [savingNotify, setSavingNotify] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const [teamUsers, setTeamUsers] = useState<TenantUserRow[] | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteAdmin, setInviteAdmin] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

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
      setMe({
        email: data.email ?? null,
        emailNotificationsEnabled: data.emailNotificationsEnabled !== false,
        isAdmin: data.isAdmin === true,
        teamManagementAvailable: data.teamManagementAvailable === true,
      });
    } catch {
      setMeError("Could not load settings.");
    }
  }, [user]);

  const loadTeam = useCallback(async () => {
    setTeamError(null);
    setTeamLoading(true);
    try {
      const res = await fetch("/api/portal/admin/tenant-users", {
        headers: await portalAuthHeaders(user),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { users?: TenantUserRow[]; error?: string };
      if (!res.ok) {
        setTeamUsers(null);
        setTeamError(typeof data.error === "string" ? data.error : `Could not load team (${res.status})`);
        return;
      }
      setTeamUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setTeamUsers(null);
      setTeamError("Could not load team.");
    } finally {
      setTeamLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (me?.isAdmin && me.teamManagementAvailable) void loadTeam();
  }, [me?.isAdmin, me?.teamManagementAvailable, loadTeam]);

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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMeError(typeof data.error === "string" ? data.error : "Could not save preference.");
        return;
      }
      setMe({ ...me, emailNotificationsEnabled: next });
    } catch {
      setMeError("Could not save preference.");
    } finally {
      setSavingNotify(false);
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

  async function onInviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviteMessage(null);
    setTeamError(null);
    setInvitePending(true);
    try {
      const res = await fetch("/api/portal/admin/tenant-users", {
        method: "POST",
        headers: { ...(await portalAuthHeaders(user)), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          password: invitePassword,
          portalAdmin: inviteAdmin,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setTeamError(typeof data.error === "string" ? data.error : `Could not add user (${res.status})`);
        return;
      }
      setInviteMessage(typeof data.message === "string" ? data.message : "User created.");
      setInviteEmail("");
      setInvitePassword("");
      setInviteAdmin(false);
      await loadTeam();
    } catch {
      setTeamError("Could not add user.");
    } finally {
      setInvitePending(false);
    }
  }

  async function onRemoveUser(uid: string, email: string | null) {
    const label = email ?? uid;
    if (!confirm(`Remove portal access for ${label}? This cannot be undone.`)) return;
    setTeamError(null);
    try {
      const res = await fetch(`/api/portal/admin/tenant-users?uid=${encodeURIComponent(uid)}`, {
        method: "DELETE",
        headers: await portalAuthHeaders(user),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setTeamError(typeof data.error === "string" ? data.error : `Could not remove user (${res.status})`);
        return;
      }
      await loadTeam();
    } catch {
      setTeamError("Could not remove user.");
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
          Choose whether you want email notifications when new candidates apply. This only affects your account.
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

      {me?.isAdmin && me.teamManagementAvailable ? (
        <SectionPanel>
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">Team</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
            Add or remove recruiter accounts for your organization. New users get the same tenant as you and can sign in
            immediately with the password you set (they should change it under Password).
          </p>

          {teamError ? (
            <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
              {teamError}
            </p>
          ) : null}

          <form onSubmit={(e) => void onInviteUser(e)} className="mt-4 space-y-3">
            <FieldGroup title="Add user">
              <label className={labelClass}>
                Email
                <input
                  className={`${inputClass} mt-1.5`}
                  type="email"
                  autoComplete="off"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </label>
              <label className={labelClass}>
                Initial password
                <input
                  className={`${inputClass} mt-1.5`}
                  type="password"
                  autoComplete="new-password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={inviteAdmin}
                  onChange={(e) => setInviteAdmin(e.target.checked)}
                  className="rounded border-zinc-300 text-[#2563EB] focus:ring-[#2563EB]"
                />
                Portal admin (can manage team)
              </label>
              {inviteMessage ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
                  {inviteMessage}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={invitePending}
                className={`mt-2 inline-flex items-center gap-2 ${addButtonClass} disabled:opacity-50`}
              >
                <UserPlus className="h-4 w-4" weight="duotone" aria-hidden />
                {invitePending ? "Adding…" : "Add user"}
              </button>
            </FieldGroup>
          </form>

          <div className="mt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-slate-500">
              People in your organization
            </h3>
            {teamLoading ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">Loading…</p>
            ) : teamUsers && teamUsers.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-slate-400">No users found.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200/80 rounded-xl border border-zinc-200/80 bg-white/80 dark:divide-slate-600/50 dark:border-slate-500/25 dark:bg-slate-800/40">
                {(teamUsers ?? []).map((row) => (
                  <li
                    key={row.uid}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-slate-100">{row.email ?? row.uid}</p>
                      {row.portalAdmin ? (
                        <p className="text-xs font-medium text-[#2563EB] dark:text-sky-400">Admin</p>
                      ) : null}
                    </div>
                    {row.uid !== user.uid ? (
                      <button
                        type="button"
                        onClick={() => void onRemoveUser(row.uid, row.email)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200/90 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <Trash className="h-3.5 w-3.5" aria-hidden />
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-slate-500">You</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionPanel>
      ) : null}

      {me && me.isAdmin && !me.teamManagementAvailable ? (
        <SectionPanel>
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">Team</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
            User management needs{" "}
            <span className="font-mono text-xs">PORTAL_TENANT_FIREBASE_CLAIM</span> so accounts are tied to an organization.
            Set that env var and give admins the{" "}
            <span className="font-mono text-xs">portalAdmin</span> custom claim (Firebase Admin SDK).
          </p>
        </SectionPanel>
      ) : null}
    </div>
  );
}
