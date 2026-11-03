"use client";
import Link from "next/link";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { loadOpportunities, termsSnapshot } from "../lib/api-records";
import type { StudentApplicationDetails } from "../lib/types";

export function StudentOpportunities({ applications, onApply }: {
  applications: StudentApplicationDetails[];
  onApply: (projectId: string) => void;
}) {
  const live = usePortalResource(loadOpportunities);
  useVisibleRefresh(live.reload);
  const opportunities = Object.values(live.data?.opportunities ?? {});
  return <section id="opportunities" aria-labelledby="opportunities-title" className="space-y-4 scroll-mt-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 id="opportunities-title" className="text-xl font-bold text-slate-900">Open projects</h2>
        <p className="text-xs text-slate-600">Approved organization projects accepting applications. Development records are synthetic.</p></div>
      <button type="button" disabled={live.loading} onClick={() => void live.reload().catch(() => {})} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Refresh projects</button>
    </div>
    {live.loading && <p role="status" className="text-sm text-slate-600">Updating published projects...</p>}
    {live.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{live.error}</p>}
    {!live.loading && !live.error && !opportunities.length && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No published projects are accepting applications yet. Organization drafts and projects awaiting approval are not listed.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{opportunities.map(opportunity => {
      const { project, terms } = opportunity;
      const snapshot = termsSnapshot(terms);
      const application = applications.find(a => a.projectId === project.id);
      return <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <p className="text-xs font-semibold text-teal-800">Open for applications</p>
        <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{project.description}</p>
        <p className="text-sm font-semibold text-slate-800">{snapshot.terms.currency} {snapshot.terms.fee_amount} fixed fee</p>
        <p className="text-xs text-slate-600 whitespace-pre-wrap">{snapshot.terms.payment_terms}</p>
        <p className="text-xs text-slate-600">{snapshot.scope.start_on} to {snapshot.scope.due_on} | {project.capacity} project places</p>
        <details className="text-sm text-slate-700"><summary className="cursor-pointer font-semibold">View scope and terms</summary>
          <div className="mt-2 space-y-2 whitespace-pre-wrap"><p>{snapshot.scope.scope_in}</p><p>Out of scope: {snapshot.scope.scope_out}</p><p>IP: {snapshot.terms.ip_ownership_terms}</p><p>Confidentiality: {snapshot.terms.confidentiality_terms}</p><p>Mentor plan: {snapshot.terms.mentor_plan}</p><p>Terms version {terms.version_no}</p></div>
        </details>
        {application ? <Link href={`/student/applications/${application.id}`} className="inline-flex rounded-lg border border-teal-800 px-4 py-2 text-xs font-semibold text-teal-900">View application</Link>
          : <button type="button" onClick={() => onApply(project.id)} className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900">Apply for this project</button>}
      </article>;
    })}</div>
  </section>;
}
