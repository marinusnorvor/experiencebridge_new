"use client";

import { useEffect, useState } from "react";
import { usePortalApi } from "@/lib/api/portal-api";
import type { MentorProfileRead } from "@experiencebridge/api-client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [suspendTarget, setSuspendTarget] = useState<MentorProfileRead | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

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
    decision: "approve" | "reject" | "suspend",
    reasonOverride?: string
  ) => {
    const reason = (reasonOverride ?? decisionReasons[mentor.user_id] ?? "").trim();
    if (reason.length < 10) {
      setNotification({
        type: "error",
        message: "Write a short reason (at least 10 characters).",
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
        toast.success(decision === "approve" ? "Mentor approved" : decision === "suspend" ? "Mentor suspended" : "Mentor application declined");
        setSuspendTarget(null);
        setSuspendReason("");
        setDecisionReasons((prev) => ({ ...prev, [mentor.user_id]: "" }));
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      setNotification({ type: "error", message: "That decision didn't save. Check your connection and try again." });
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
      <PageHeader eyebrow="Admin" title="Mentors" description="Approve mentors before organisations can invite them to guide a student." />

      {notification && (
        <div
          role="alert" className={`rounded-xl border p-4 text-sm ${
            notification.type === "success"
              ? "border-success/25 bg-success-bg text-success-text"
              : "border-danger/25 bg-danger-bg text-danger-text"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Pending Vetting Queue */}
      <section aria-labelledby="mentor-vetting-queue-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 id="mentor-vetting-queue-title" className="text-sm font-bold text-ink-900">
              Awaiting approval
            </h3>
            <p className="text-xs text-ink-500">People who offered to mentor. Check their experience, then approve or decline.</p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-warning-bg text-warning-text border border-warning/30 px-2.5 py-0.5 text-xs font-semibold">
            {pendingMentors.length} waiting
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-ink-500">Loading…</p>
        ) : pendingMentors.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-500">
            Nothing waiting. New mentor applications appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingMentors.map((mentor) => (
              <div key={mentor.id} className="rounded-xl border border-line bg-canvas p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-ink-900 text-sm">Mentor application</h4>
                    <p className="text-xs text-ink-700 mt-1">{mentor.bio || "No biography provided."}</p>
                  </div>
                  <StatusBadge status="pending" />
                </div>

                <div className="flex flex-wrap gap-1 text-[11px]">
                  {(mentor.skills as string[] | undefined)?.map((s: string, idx: number) => (
                    <span key={idx} className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-ink-500">
                  Can review {mentor.weekly_review_capacity} submission{mentor.weekly_review_capacity === 1 ? "" : "s"} a week · {mentor.availability_text}
                </div>

                {/* Rationale input */}
                <div className="space-y-1.5 pt-2 border-t border-line">
                  <label htmlFor={`mentor-rationale-${mentor.user_id}`} className="block text-[11px] font-medium text-ink-700">
                    Reason for your decision
                  </label>
                  <textarea
                    id={`mentor-rationale-${mentor.user_id}`}
                    rows={2}
                    value={decisionReasons[mentor.user_id] ?? ""}
                    onChange={(e) =>
                      setDecisionReasons((prev) => ({ ...prev, [mentor.user_id]: e.target.value }))
                    }
                    placeholder="What you checked (experience, references, conflicts)"
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600 focus:outline-none"
                  />
                  {(decisionReasons[mentor.user_id]?.trim().length ?? 0) < 10 && <p className="text-[11px] text-ink-500">At least 10 characters to enable the buttons.</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[mentor.user_id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(mentor, "approve")}
                    className="rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy || (decisionReasons[mentor.user_id]?.trim().length ?? 0) < 10}
                    onClick={() => handleDecision(mentor, "reject")}
                    className="rounded-lg border border-danger/25 bg-danger-bg text-danger-text hover:bg-danger-bg disabled:opacity-50 px-3 py-1.5 text-xs font-semibold transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Complete Mentors Pool Registry */}
      <section aria-labelledby="all-mentors-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 id="all-mentors-title" className="text-sm font-bold text-ink-900">
              All mentors
            </h3>
            <p className="text-xs text-ink-500">Everyone who has offered to mentor, in every status.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search mentors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 placeholder-ink-400 focus:border-brand-600/30 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs text-ink-900 focus:border-brand-600/30 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Awaiting approval</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-line text-ink-500">
              <tr>
                <th className="py-2.5 px-3">About</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Skills</th>
                <th className="py-2.5 px-3">Reviews / week</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-700">
              {filteredMentors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-500">
                    No mentors match this search.
                  </td>
                </tr>
              ) : (
                filteredMentors.map((mentor) => (
                  <tr key={mentor.id} className="hover:bg-canvas">
                    <td className="py-2.5 px-3 max-w-xs truncate text-ink-900">{mentor.bio || "No bio"}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={mentor.eligibility_status} />
                    </td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {(mentor.skills ?? []).slice(0, 3).join(", ")}
                      {(mentor.skills ?? []).length > 3 ? "..." : ""}
                    </td>
                    <td className="py-2.5 px-3">{mentor.weekly_review_capacity}</td>
                    <td className="py-2.5 px-3 text-ink-500">
                      {new Date(mentor.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {mentor.eligibility_status === "approved" && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => { setSuspendReason(""); setSuspendTarget(mentor); }}
                          className="rounded-lg border border-danger/25 px-2.5 py-1 text-[11px] font-medium text-danger-text hover:bg-danger-bg transition"
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
      <Dialog open={!!suspendTarget} onOpenChange={(open) => { if (!open && !actionBusy) setSuspendTarget(null); }}
        title="Suspend this mentor?"
        description="They won't be invited to new projects until an admin approves them again. Current assignments are not ended automatically."
        footer={<>
          <Button variant="secondary" onClick={() => setSuspendTarget(null)} disabled={actionBusy}>Cancel</Button>
          <Button variant="danger" loading={actionBusy} disabled={suspendReason.trim().length < 10}
            onClick={() => { if (suspendTarget) void handleDecision(suspendTarget, "suspend", suspendReason); }}>Suspend mentor</Button>
        </>}>
        <label htmlFor="suspend-reason" className="block text-sm font-medium text-ink-900">Reason</label>
        <textarea id="suspend-reason" rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[16px] text-ink-900 focus:border-brand-600 focus:outline-none" />
        <p className="mt-1 text-[12px] text-ink-500">At least 10 characters. Recorded in the audit log.</p>
      </Dialog>
    </div>
  );
}
