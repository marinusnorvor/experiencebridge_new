"use client";
import { useCallback } from "react";
import { usePortalResource, requireData } from "@/lib/api/use-portal-resource";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { loadMentorParticipation, mapProposal } from "../lib/api-records";
import { sampleMentorDashboard } from "../lib/sample-dashboard-data";
import { AssignmentProposalDetail } from "./assignment-proposal-detail";
import { ParticipationContext } from "./participation-context";

export function MentorAssignmentConnected({ id }: { id: string }) {
  const preview = isPortalPresentationMode();
  const live = usePortalResource(useCallback(async api => mapProposal(requireData(await api.getMentorAssignment(id))), [id]), !preview);
  const proposal = preview ? sampleMentorDashboard.proposals.find(p => p.id === id) : live.data;
  if (!proposal) return <main className="mx-auto max-w-4xl p-8"><p role={live.error ? "alert" : "status"}>{live.error || (live.loading ? "Loading assignment..." : "Assignment unavailable.")}</p></main>;
  return <AssignmentProposalDetail proposal={proposal} onChanged={() => void live.reload().catch(() => {})} />;
}

export function MentorParticipationConnected({ id }: { id: string }) {
  const preview = isPortalPresentationMode();
  const live = usePortalResource(useCallback(api => loadMentorParticipation(api,id), [id]), !preview);
  const assignment = preview ? sampleMentorDashboard.acceptedAssignments.find(p => p.participationId === id) : live.data;
  if (!assignment) return <main className="mx-auto max-w-4xl p-8"><p role={live.error ? "alert" : "status"}>{live.error || (live.loading ? "Loading participation..." : "Participation unavailable.")}</p></main>;
  return <ParticipationContext assignment={assignment} preview={preview} />;
}
