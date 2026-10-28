import { Suspense } from "react";

import { ParticipationContext } from "@/features/mentor/components/participation-context";
import { sampleMentorDashboard } from "@/features/mentor/lib/sample-dashboard-data";

type MentorParticipationPageProps = {
  params: Promise<{ id: string }>;
};

export default function MentorParticipationPage({ params }: MentorParticipationPageProps) {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <ParticipationPage params={params} />
    </Suspense>
  );
}

async function ParticipationPage({ params }: MentorParticipationPageProps) {
  const { id } = await params;
  const assignment = sampleMentorDashboard.acceptedAssignments.find(
    (item) => item.participationId === id,
  );

  if (!assignment) {
    return <MentorRecordNotFound />;
  }

  return <ParticipationContext assignment={assignment} />;
}

function RouteLoadingState() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p role="status" className="text-sm text-slate-600">
        Loading sample participation…
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
        <h1 className="text-xl font-semibold">Participation not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No temporary sample participation matches this ID.
        </p>
      </div>
    </main>
  );
}
