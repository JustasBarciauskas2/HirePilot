"use client";

import type { User } from "firebase/auth";
import { Key, Trash, UserPlus, UsersThree } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { portalAuthHeaders } from "@techrecruit/shared/lib/portal-auth";
import { FieldGroup, SectionPanel, addButtonClass, inputClass, labelClass } from "@/components/portal/portal-form-primitives";

type MeResponse = {
  isAdmin: boolean;
};

type TenantUserRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  portalAdmin: boolean;
};

export function PortalTeamPanel({ user, tenantId }: { user: User; tenantId: string }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [users, setUsers] = useState<TenantUserRow[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteAdmin, setInviteAdmin] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [resetOpenForUid, setResetOpenForUid] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPending, setResetPending] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/settings/me", {
        headers: await portalAuthHeaders(user),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as MeResponse & { error?: string };
      if (!res.ok) return;
      setMe({ isAdmin: data.isAdmin === true });
    } catch {
      /* ignore */
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    setListError(null);
    setListLoading(true);
    try {
      const res = await fetch("/api/portal/admin/tenant-users", {
        headers: await portalAuthHeaders(user),
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { users?: TenantUserRow[]; error?: string };
      if (!res.ok) {
        setUsers(null);
        setListError(typeof data.error === "string" ? data.error : `Could not load team (${res.status})`);
        return;
      }
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setUsers(null);
      setListError("Could not load team.");
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function onInviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviteMessage(null);
    setActionError(null);
    setActionSuccess(null);
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
        setActionError(typeof data.error === "string" ? data.error : `Could not add user (${res.status})`);
        return;
      }
      setInviteMessage(typeof data.message === "string" ? data.message : "User created.");
      setInviteEmail("");
      setInvitePassword("");
      setInviteAdmin(false);
      await loadUsers();
    } catch {
      setActionError("Could not add user.");
    } finally {
      setInvitePending(false);
    }
  }

  async function onResetPassword(e: React.FormEvent, uid: string) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setResetPending(true);
    try {
      const res = await fetch("/api/portal/admin/tenant-users", {
        method: "PATCH",
        headers: { ...(await portalAuthHeaders(user)), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uid, password: resetPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setActionError(typeof data.error === "string" ? data.error : `Could not reset password (${res.status})`);
        return;
      }
      setActionSuccess(
        typeof data.message === "string"
          ? data.message
          : "Password updated. They must set a new password on next sign-in.",
      );
      setResetPassword("");
      setResetOpenForUid(null);
    } catch {
      setActionError("Could not reset password.");
    } finally {
      setResetPending(false);
    }
  }

  async function onRemoveUser(uid: string, email: string | null) {
    const label = email ?? uid;
    if (!confirm(`Remove portal access for ${label}? This cannot be undone.`)) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/portal/admin/tenant-users?uid=${encodeURIComponent(uid)}`, {
        method: "DELETE",
        headers: await portalAuthHeaders(user),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(typeof data.error === "string" ? data.error : `Could not remove user (${res.status})`);
        return;
      }
      await loadUsers();
    } catch {
      setActionError("Could not remove user.");
    }
  }

  const isAdmin = me?.isAdmin === true;

  return (
    <div className="space-y-8">
      <SectionPanel>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:bg-sky-500/15 dark:text-sky-400">
            <UsersThree className="h-5 w-5" weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">Team</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
              People with access to this portal for organization{" "}
              <span className="font-mono text-xs text-zinc-700 dark:text-slate-300">{tenantId}</span>.
            </p>
          </div>
        </div>

        {listError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {listError}
          </p>
        ) : null}
        {actionError ? (
          <p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
            {actionError}
          </p>
        ) : null}
        {actionSuccess ? (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {actionSuccess}
          </p>
        ) : null}

        {listLoading ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-slate-400">Loading team…</p>
        ) : users && users.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-slate-400">No users found for this organization.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200/80 rounded-xl border border-zinc-200/80 bg-white/80 dark:divide-slate-600/50 dark:border-slate-500/25 dark:bg-slate-800/40">
            {(users ?? []).map((row) => (
              <li key={row.uid} className="px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-slate-100">{row.email ?? row.uid}</p>
                    {row.displayName ? (
                      <p className="truncate text-xs text-zinc-500 dark:text-slate-400">{row.displayName}</p>
                    ) : null}
                    {row.portalAdmin ? (
                      <p className="text-xs font-medium text-[#2563EB] dark:text-sky-400">Admin</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {row.uid === user.uid ? (
                      <span className="text-xs font-medium text-zinc-400 dark:text-slate-500">You</span>
                    ) : null}
                    {isAdmin && row.uid !== user.uid ? (
                      <>
                        {resetOpenForUid === row.uid ? (
                          <form
                            className="flex w-full min-w-[min(100%,18rem)] flex-col gap-2 sm:w-auto sm:flex-row sm:items-end"
                            onSubmit={(e) => void onResetPassword(e, row.uid)}
                          >
                            <label className={`${labelClass} min-w-0 flex-1`}>
                              New password
                              <input
                                className={`${inputClass} mt-1.5`}
                                type="password"
                                autoComplete="new-password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                required
                                minLength={8}
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="submit"
                                disabled={resetPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#2563EB]/35 bg-[#2563EB]/10 px-2.5 py-1.5 text-xs font-semibold text-[#1d4ed8] transition hover:bg-[#2563EB]/15 disabled:opacity-50 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-300"
                              >
                                {resetPending ? "Saving…" : "Save password"}
                              </button>
                              <button
                                type="button"
                                disabled={resetPending}
                                onClick={() => {
                                  setResetOpenForUid(null);
                                  setResetPassword("");
                                  setActionError(null);
                                }}
                                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-slate-500/35 dark:text-slate-200 dark:hover:bg-slate-800/60"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setResetOpenForUid(row.uid);
                              setResetPassword("");
                              setActionError(null);
                              setActionSuccess(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200/90 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-slate-500/35 dark:text-slate-200 dark:hover:bg-slate-800/50"
                          >
                            <Key className="h-3.5 w-3.5" aria-hidden />
                            Reset password
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void onRemoveUser(row.uid, row.email)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200/90 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <Trash className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>

      {isAdmin ? (
        <SectionPanel>
          <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-slate-100">Add user</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-slate-400">
            Creates a sign-in for the same organization. Share the initial password securely — on first login they must
            choose a new password before using the portal.
          </p>
          <form onSubmit={(e) => void onInviteUser(e)} className="mt-4 space-y-3">
            <FieldGroup>
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
                Portal admin (can add or remove users)
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
        </SectionPanel>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-slate-400">
          Only portal admins can add or remove users. Ask an admin if someone needs access.
        </p>
      )}
    </div>
  );
}
