"use client";

import { useEffect, useState } from "react";
import { MentorDashboard } from "./mentor-dashboard";
import { sampleMentorDashboard, type MentorDashboardData } from "../lib/sample-dashboard-data";
import { usePortalApi } from "@/lib/api/portal-api";

export function MentorDashboardConnected() {
  const { getApi, isSignedIn } = usePortalApi();
  const [data, setData] = useState<MentorDashboardData>(sampleMentorDashboard);
  const [state] = useState<"loading" | "error" | "ready">("ready");

  useEffect(() => {
    async function loadMentorData() {
      if (!isSignedIn) return;
      try {
        const api = await getApi();
        const assignmentsRes = await api.getMyMentorAssignments();
        const profileRes = await api.getMentorProfile();

        if (assignmentsRes.data) {
          const liveAssignments = assignmentsRes.data;
          const proposals = liveAssignments
            .filter((a) => a.status === "proposed")
            .map((a) => ({
              id: a.id,
              projectTitle: `Project Assignment (${a.project_id.slice(0, 8)})`,
              organizationLabel: "Host Organization",
              learnerLabel: `Student (${a.participation_id.slice(0, 8)})`,
              projectSummary: a.context,
              expectedCommitment: "Weekly reviews and feedback",
              estimatedHours: "5 hours/week",
              participantCount: 1,
              reviewExpectations: "Independent rubric evaluation of milestone deliverables",
              confidentialitySummary: "Protected evidence: feedback visible only to student and organization reviewer.",
              responseDue: new Date(a.expires_at).toISOString().slice(0, 10),
            }));

          const acceptedAssignments = liveAssignments
            .filter((a) => a.status === "accepted")
            .map((a) => ({
              id: a.id,
              participationId: a.participation_id,
              projectTitle: `Project Assignment (${a.project_id.slice(0, 8)})`,
              organizationLabel: "Host Organization",
              learnerLabel: `Student (${a.participation_id.slice(0, 8)})`,
              projectSummary: a.context,
              participationStatus: "Active",
              nextMilestone: "Milestone Deliverable Evaluation",
              dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              milestones: [
                {
                  id: "m1",
                  title: "Milestone 1 Deliverable",
                  description: "Project architecture and initial working increment",
                  dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                  status: "Under Review",
                },
              ],
            }));

          setData((prev) => ({
            ...prev,
            proposals: proposals.length > 0 ? proposals : prev.proposals,
            acceptedAssignments: acceptedAssignments.length > 0 ? acceptedAssignments : prev.acceptedAssignments,
            reviewCapacity: {
              expectedReviewsThisWeek: acceptedAssignments.length,
              weeklyReviewCapacity: profileRes.data?.weekly_review_capacity ?? 5,
            },
          }));
        }
      } catch (err) {
        console.warn("Mentor dashboard live load notice:", err);
      }
    }

    void loadMentorData();
  }, [isSignedIn, getApi]);

  return <MentorDashboard data={data} state={state} />;
}
