"use client";

import { useEffect, useState } from "react";
import { usePortalApi } from "@/lib/api/portal-api";
import type { MentorProfileRead } from "@experiencebridge/api-client";

export function AdminMentorsView() {
  const { getApi, isSignedIn } = usePortalApi();
  const [mentors, setMentors] = useState<MentorProfileRead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    async function fetchMentors() {
      try {
        const api = await getApi();
        const res = await api.getMentorProfilesForAdmin();
        if (!active) return;
        if (res.data) setMentors(res.data);
      } catch (e) {
        if (!active) return;
        setNotification({
          type: "error",
          message: e instanceof Error ? e.message : "Failed to load mentor directory.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchMentors();
    return () => {
      active = false;
    };
  }, [getApi, isSignedIn, refreshTrigger]);

  const handleDecision = async (
    mentor: MentorProfileRead,
    decision: "approve" | "reject" | "suspend"
  ) => {
    const reason = decisionReasons[mentor.user_id]?.trim() ?? "";
    if (reason.length < 10) {
      setNotification({
        type: "error",
        message: "A rationale of at least 10 characters is required for mentor eligibility decisions.",
      });
      return;
    }

    setActionBusy(true);
    setNotification(null);
    try {
      const api = await getApi();
      const res = await api.decideMentorEligibility(mentor.user_id, mentor.row_version, decision, reason);
      if (res.error) {
        setNotification({ type: "error", message: res.error });
      } else {
        setNotification({
          type: "success",
          message: `Mentor decision recorded: ${decision}.`,
        });
        setDecisionReasons((prev) => ({ ...prev, [mentor.user_id]: "" }));
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (e) {
      setNotification({ type: "error", message: e instanceof Error ? e.message : "Mentor decision failed." });
    } finally {
      setActionBusy(false);
    }
  };

  const filteredMentors = mentors.filter((m) => {
    if (statusFilter !== "all" && m.eligibility_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const bioMatch = m.bio?.toLowerCase().includes(query);
      const userMatch = m.user_id.toLowerCase().includes(query);
      if (!bioMatch && !userMatch) return false;
    }
    return true;
  });

  const pendingMentors = mentors.filter((m) => m.eligibility_status === "pending");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Mentor Directory Eligibility & Vetting</h2>
        <p className="text-xs text-slate-400">
          Ensure mentor candidates meet independence, safeguarding, and expertise standards before assignment.
        </p>
      </div>

      {notification && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            notification.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
              : "border-red-500/30 bg-red-950/20 text-red-200"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Pending Vetting Queue */}
      <section aria-labelledby="mentor-vetting-queue-title" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h3 id="mentor-vetting-queue-title" className="text-sm font-bold text-white">
              Mentor Candidates Awaiting Vetting
            </h3>
            <p className="text-xs text-slate-400">Candidates who submitted self-service profiles for eligibility</p>
          </div>
          <span className="rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 text-xs font-bold">
            {pendingMentors.length} pending
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading mentor candidates...</p>
        ) : pendingMentors.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No mentor candidates currently awaiting eligibility decision.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingMentors.map((mentor) => (
              <div key={mentor.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-sm">Mentor Profile</h4>
                    <p className="text-xs text-slate-300 mt-1">{mentor.bio || "No biography provided."}</p>
                  </div>
                  <span className="rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono px-2 py-0.5">
                    pending
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 text-[11px]">
                  {(mentor.skills as string[] | undefined)?.map((s: string, idx: number) => (
                    <span key={idx} className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Weekly Capacity: {mentor.weekly_review_capacity} | User ID: {mentor.user_id.slice(0, 8)}...
                </div>

                {/* Rationale input */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <label htmlFor={`mentor-rationale-${mentor.user_id}`} className="block text-[11px] font-medium text-slate-300">
                    Eligibility Rationale (min 10 characters):
                  </label>
                  <textarea
                    id={`mentor-rationale-${mentor.user_id}`}
                    rows={2}
                    value={decisionReasons[mentor.user_id] ?? ""}
                    onChange={(e) =>
                      setDecisionReasons((prev) => ({ ...prev, [mentor.user_id]: e.target.value }))
                    }
                    placeholder="Document domain expertise and background verification..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[mentor.user_id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(mentor, "approve")}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    Approve as Eligible
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[mentor.user_id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(mentor, "reject")}
                    className="rounded-lg border border-red-600/40 bg-red-950/30 text-red-300 hover:bg-red-900/40 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                  >
                    Reject Candidate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Complete Mentors Pool Registry */}
      <section aria-labelledby="all-mentors-title" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
          <div>
            <h3 id="all-mentors-title" className="text-sm font-bold text-white">
              All Mentors Directory
            </h3>
            <p className="text-xs text-slate-400">Registered mentors and candidates across all statuses</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search mentors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved (Active)</option>
              <option value="pending">Pending Vetting</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Bio / Focus</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Skills</th>
                <th className="py-2.5 px-3">Weekly Capacity</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filteredMentors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No mentor records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredMentors.map((mentor) => (
                  <tr key={mentor.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 max-w-xs truncate text-white">{mentor.bio || "No bio"}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          mentor.eligibility_status === "approved"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : mentor.eligibility_status === "pending"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : mentor.eligibility_status === "suspended"
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {mentor.eligibility_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {(mentor.skills ?? []).slice(0, 3).join(", ")}
                      {(mentor.skills ?? []).length > 3 ? "..." : ""}
                    </td>
                    <td className="py-2.5 px-3">{mentor.weekly_review_capacity}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(mentor.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {mentor.eligibility_status === "approved" && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => {
                            const reason = prompt("Enter suspension reason (minimum 10 characters):");
                            if (reason && reason.trim().length >= 10) {
                              setDecisionReasons((prev) => ({ ...prev, [mentor.user_id]: reason }));
                              void handleDecision(mentor, "suspend");
                            }
                          }}
                          className="rounded border border-purple-500/30 px-2 py-0.5 text-[10px] text-purple-300 hover:bg-purple-900/30 transition"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
