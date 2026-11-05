"use client";

import { useEffect, useState } from "react";
import { usePortalApi, type AdminUserOversightItem } from "@/lib/api/portal-api";

export function AdminUsersView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [users, setUsers] = useState<AdminUserOversightItem[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load users oversight.");
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
      setSuccessMessage(`Account ${res.data.email} successfully created with role ${createRole}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
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
      setSuccessMessage(`Granted ${role} role successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant role");
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
      setSuccessMessage(`Revoked ${role} role successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke role");
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
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Users & Roles Governance</h2>
          <p className="text-xs text-slate-400">
            Platform accounts, assigned global roles, and account provisioning oversight
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
          >
            <span>+ Create Account / Admin</span>
          </button>
          <input
            type="text"
            placeholder="Search email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="student">Student</option>
            <option value="mentor_candidate">Mentor Candidate</option>
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create New Account / Admin</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@experiencebridge.org"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Role Assignment</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="platform_admin">Platform Admin (Full Administration)</option>
                  <option value="mentor_candidate">Mentor Candidate</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Display Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Global Roles</th>
                <th className="py-2.5 px-3">Joined Platform</th>
                <th className="py-2.5 px-3">User ID</th>
                <th className="py-2.5 px-3 text-right">Role Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading users directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No users found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-semibold text-white">{u.display_name}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      {u.email || "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {u.roles.length === 0 ? (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                            standard_user
                          </span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                r === "platform_admin"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : r === "student"
                                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                                  : "border-teal-500/30 bg-teal-500/10 text-teal-300"
                              }`}
                            >
                              {r}
                              <button
                                type="button"
                                title={`Revoke ${r}`}
                                disabled={actionUserId === u.id}
                                onClick={() => handleRevokeRole(u.id, r)}
                                className="hover:text-red-400 text-slate-400 text-[10px] font-bold ml-0.5"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {u.id.slice(0, 8)}...
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!u.roles.includes("platform_admin") && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => handleGrantRole(u.id, "platform_admin")}
                            className="rounded px-1.5 py-0.5 text-[10px] border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                          >
                            + Admin
                          </button>
                        )}
                        {!u.roles.includes("mentor_candidate") && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => handleGrantRole(u.id, "mentor_candidate")}
                            className="rounded px-1.5 py-0.5 text-[10px] border border-teal-500/40 text-teal-300 hover:bg-teal-950/40"
                          >
                            + Mentor
                          </button>
                        )}
                        {!u.roles.includes("student") && (
                          <button
                            type="button"
                            disabled={actionUserId === u.id}
                            onClick={() => handleGrantRole(u.id, "student")}
                            className="rounded px-1.5 py-0.5 text-[10px] border border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
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
