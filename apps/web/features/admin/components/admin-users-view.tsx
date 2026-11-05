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

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-200">
          {error}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading users directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
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
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                            standard_user
                          </span>
                        ) : (
                          u.roles.map((r) => (
                            <span
                              key={r}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                r === "platform_admin"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : r === "student"
                                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                                  : "border-teal-500/30 bg-teal-500/10 text-teal-300"
                              }`}
                            >
                              {r}
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
