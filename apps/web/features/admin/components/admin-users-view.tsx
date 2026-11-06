"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminUserOversightItem } from "@/lib/api/portal-api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/primitives";

const ROLE_LABEL: Record<string, string> = { platform_admin: "Admin", mentor_candidate: "Mentor applicant", student: "Student" };
const roleLabel = (role: string) => ROLE_LABEL[role] ?? role.replace(/_/g, " ");

export function AdminUsersView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [users, setUsers] = useState<AdminUserOversightItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("platform_admin");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Role action state
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadUsers() {
      try {
        setError(null);
        const api = await getApi();
        const res = await api.getAdminOversightUsers(roleFilter === "all" ? undefined : roleFilter);
        if (res.error) throw new Error(res.error);
        if (active) setUsers(res.data ?? []);
      } catch {
        if (active) setError("We couldn't load people. Check your connection and refresh the page.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadUsers();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, roleFilter]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const api = await getApi();
      const res = await api.createAdminUser({
        email: createEmail.trim(),
        password: createPassword,
        display_name: createName.trim(),
        role: createRole || undefined,
      });
      if (res.error || !res.data) {
        throw new Error(res.error || "Failed to create user account.");
      }
      setUsers((prev) => [res.data!, ...prev]);
      setShowCreateModal(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreateName("");
      toast.success(`Account created for ${res.data.email}`);
    } catch (err) {
      setCreateError(err instanceof Error && /exist|409/i.test(err.message) ? "An account with this email already exists." : "We couldn't create that account. Check the details and try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleGrantRole(userId: string, role: string) {
    setActionUserId(userId);
    setError(null);
    try {
      const api = await getApi();
      const res = await api.grantUserRole(userId, role);
      if (res.error || !res.data) {
        throw new Error(res.error || `Failed to grant ${role} role.`);
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data! : u)));
      toast.success(`${roleLabel(role)} role added`);
    } catch {
      setError("That role change didn't save. Try again.");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleRevokeRole(userId: string, role: string) {
    setActionUserId(userId);
    setError(null);
    try {
      const api = await getApi();
      const res = await api.revokeUserRole(userId, role);
      if (res.error || !res.data) {
        throw new Error(res.error || `Failed to revoke ${role} role.`);
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.data! : u)));
      toast.success(`${roleLabel(role)} role removed`);
    } catch {
      setError("That role change didn't save. Try again.");
    } finally {
      setActionUserId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchEmail = u.email?.toLowerCase().includes(query);
      const matchName = u.display_name.toLowerCase().includes(query);
      const matchId = u.id.toLowerCase().includes(query);
      if (!matchEmail && !matchName && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader className="pb-0" eyebrow="Admin" title="People" description="Everyone with an account, and the platform roles they hold." />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-brand-600 hover:bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
          >
            <span>+ Create account</span>
          </button>
          <input
            type="text"
            placeholder="Search name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600/30 focus:outline-none"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 focus:border-brand-600/30 focus:outline-none"
          >
            <option value="all">All roles</option>
            <option value="platform_admin">Admin</option>
            <option value="student">Student</option>
            <option value="mentor_candidate">Mentor applicant</option>
          </select>
        </div>
      </div>


      {error && (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger-bg p-4 text-sm text-danger-text">
          {error}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="create-account-title" className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-3 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="create-account-title" className="text-base font-semibold text-ink-900">Create an account</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-full text-ink-500 hover:bg-canvas hover:text-ink-900 text-sm"
              >
                ×
              </button>
            </div>

            {createError && (
              <div className="rounded-lg border border-danger/25 bg-danger-bg p-2.5 text-xs text-danger-text">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label htmlFor="create-name" className="block text-xs font-medium text-ink-700 mb-1">Full name</label>
                <input
                  type="text"
                  required
                  id="create-name"
                  autoComplete="off"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600/30 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="create-email" className="block text-xs font-medium text-ink-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  id="create-email"
                  autoComplete="off"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600/30 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="create-password" className="block text-xs font-medium text-ink-700 mb-1">Temporary password</label>
                <input
                  type="password"
                  required
                  id="create-password"
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600/30 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="create-role" className="block text-xs font-medium text-ink-700 mb-1">Role</label>
                <select
                  id="create-role"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 focus:border-brand-600/30 focus:outline-none"
                >
                  <option value="platform_admin">Admin (full access)</option>
                  <option value="mentor_candidate">Mentor applicant</option>
                  <option value="student">Student</option>
                </select>
                <p className="mt-1 text-[11px] text-ink-500">Share the password privately. They can change it with &ldquo;Forgot password&rdquo;.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-700 hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-brand-600 hover:bg-brand-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-card sm:p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-line text-ink-500">
              <tr>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Platform roles</th>
                <th className="py-2.5 px-3">Joined</th>
                <th className="py-2.5 px-3 text-right">Add role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    Loading…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    No one matches this search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas">
                    <td className="py-2.5 px-3 font-semibold text-ink-900">{u.display_name}</td>
                    <td className="py-2.5 px-3 text-[12px] text-ink-700">
                      {u.email || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {u.roles.length === 0 ? (
                          <span className="text-[11px] text-ink-500">No extra roles</span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                r === "platform_admin"
                                  ? "border-gold-500/30 bg-gold-50 text-gold-text"
                                  : r === "student"
                                  ? "border-brand-600/30 bg-brand-50 text-brand-600"
                                  : "border-brand-600/25 bg-brand-50 text-brand-600"
                              }`}
                            >
                              {roleLabel(r)}
                              <button
                                type="button"
                                aria-label={`Remove ${roleLabel(r)} role from ${u.display_name}`}
                                title={`Remove ${roleLabel(r)} role`}
                                disabled={actionUserId === u.id}
                                onClick={() => { if (window.confirm(`Remove the ${roleLabel(r)} role from ${u.display_name}?`)) void handleRevokeRole(u.id, r); }}
                                className="hover:text-danger-text text-ink-500 text-[12px] font-bold ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!u.roles.includes("platform_admin") && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => handleGrantRole(u.id, "platform_admin")}
                            className="rounded-full px-2 py-0.5 text-[11px] border border-line-strong text-ink-700 hover:border-brand-600 hover:text-brand-700"
                          >
                            + Admin
                          </button>
                        )}
                        {!u.roles.includes("mentor_candidate") && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => handleGrantRole(u.id, "mentor_candidate")}
                            className="rounded-full px-2 py-0.5 text-[11px] border border-line-strong text-ink-700 hover:border-brand-600 hover:text-brand-700"
                          >
                            + Mentor
                          </button>
                        )}
                        {!u.roles.includes("student") && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => handleGrantRole(u.id, "student")}
                            className="rounded-full px-2 py-0.5 text-[11px] border border-line-strong text-ink-700 hover:border-brand-600 hover:text-brand-700"
                          >
                            + Student
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
