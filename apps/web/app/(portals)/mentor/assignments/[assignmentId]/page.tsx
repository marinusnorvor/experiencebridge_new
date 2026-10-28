import { Suspense } from "react";

import { AssignmentProposalDetail } from "@/features/mentor/components/assignment-proposal-detail";
import { sampleMentorDashboard } from "@/features/mentor/lib/sample-dashboard-data";

type MentorAssignmentPageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default function MentorAssignmentPage({ params }: MentorAssignmentPageProps) {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <AssignmentProposalPage params={params} />
    </Suspense>
  );
}

async function AssignmentProposalPage({ params }: MentorAssignmentPageProps) {
  const { assignmentId } = await params;
  const proposal = sampleMentorDashboard.proposals.find(
    (item) => item.id === assignmentId,
  );

  if (!proposal) {
    return <MentorRecordNotFound />;
  }

  return <AssignmentProposalDetail proposal={proposal} />;
}

function RouteLoadingState() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p role="status" className="text-sm text-slate-600">
        Loading sample assignment proposal…
      </p>
    </main>
  );
}

function MentorRecordNotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div
        role="status"
        className="rounded-xl border border-slate-300 bg-white p-5 text-slate-900"
      >
        <h1 className="text-xl font-semibold">Assignment proposal not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No temporary sample proposal matches this assignment ID.
        </p>
      </div>
    </main>
  );
}
