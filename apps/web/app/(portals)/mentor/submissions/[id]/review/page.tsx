import { PortalBoundary } from "@/components/layouts/portal-boundary";
import { Suspense } from "react";

import { SubmissionReview } from "@/features/mentor/components/submission-review";
import { sampleMentorDashboard } from "@/features/mentor/lib/sample-dashboard-data";
import { SubmissionRedirect } from "@/features/mentor/components/submission-redirect";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

type MentorSubmissionReviewPageProps = {
  params: Promise<{ id: string }>;
};

export default function MentorSubmissionReviewPage({
  params,
}: MentorSubmissionReviewPageProps) {
  return <PortalBoundary>{(
    <Suspense fallback={<RouteLoadingState />}>
      <SubmissionReviewPage params={params} />
    </Suspense>
  )}</PortalBoundary>;
}

async function SubmissionReviewPage({ params }: MentorSubmissionReviewPageProps) {
  const { id } = await params;
  if (!isPortalPresentationMode()) return <SubmissionRedirect id={id} />;
  const reviewContext = sampleMentorDashboard.acceptedAssignments
    .flatMap((assignment) =>
      assignment.milestones.flatMap((milestone) =>
        milestone.submissions.map((submission) => ({
          assignment,
          milestone,
          submission,
          mentorReview: assignment.mentorReviews.find(
            (review) => review.submissionId === submission.id,
          ),
        })),
      ),
    )
    .find(({ submission }) => submission.id === id);

  if (!reviewContext) {
    return <SubmissionNotFound />;
  }

  return <SubmissionReview {...reviewContext} />;
}

function RouteLoadingState() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p role="status" className="text-sm text-slate-600">
        Loading submission…
      </p>
    </main>
  );
}

function SubmissionNotFound() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div
        role="status"
        className="rounded-xl border border-slate-300 bg-white p-5 text-slate-900"
      >
        <h1 className="text-xl font-semibold">Submission not found</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No submission matches this link.
        </p>
      </div>
    </main>
  );
}
