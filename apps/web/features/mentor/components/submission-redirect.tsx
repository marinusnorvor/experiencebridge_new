"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePortalApi } from "@/lib/api/portal-api";
import { PageSkeleton } from "@/components/ui/primitives";

/** Live mode: reviews happen on the participation page; send old links there. */
export function SubmissionRedirect({ id }: { id: string }) {
  const router = useRouter();
  const { getApi, isSignedIn } = usePortalApi();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!isSignedIn) return;
    let active = true;
    (async () => {
      const result = await (await getApi()).getSubmission(id);
      if (!active) return;
      if (result.data) router.replace(`/mentor/participations/${result.data.participation_id}#review`);
      else setMissing(true);
    })();
    return () => { active = false; };
  }, [getApi, id, isSignedIn, router]);
  if (missing) return <div className="py-16 text-center"><p className="text-lg font-semibold text-ink-900">We couldn&rsquo;t find that submission</p><Link className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline" href="/mentor/dashboard">Back to my mentor home</Link></div>;
  return <PageSkeleton />;
}
