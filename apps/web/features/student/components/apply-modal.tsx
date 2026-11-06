"use client";

import { useRef, useState } from "react";
import { usePortalResource, requireData } from "@/lib/api/use-portal-resource";
import { mapApplication, termsSnapshot, loadOpportunities } from "../lib/api-records";

import type { StudentApplicationDetails } from "../lib/types";

interface ApplyModalProps {
  isOpen: boolean;
  initialProjectId?: string;
  preview?: boolean;
  onClose: () => void;
  onApplicationCreated: (application: StudentApplicationDetails) => void;
  existingApplications?: StudentApplicationDetails[];
}

function getApplicantInfo() {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("experiencebridge_student_profile_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.displayName || parsed.email) {
          return {
            name: parsed.displayName || "Stella Appiok",
            email: parsed.email || "stella@demo.experiencebridge.internal",
          };
        }
      }
    } catch {
      // Fallback
    }
  }
  return { name: "Stella Appiok", email: "stella@demo.experiencebridge.internal" };
}

export function ApplyModal({
  isOpen,
  initialProjectId,
  onClose,
  onApplicationCreated,
  existingApplications = [],
  preview = false,
}: ApplyModalProps) {
  const [projectChoice, setProjectChoice] = useState(initialProjectId ?? "proj-smartgrid");
  const [motivation, setMotivation] = useState("");
  const [skills, setSkills] = useState(preview ? "React 19, TypeScript, Next.js" : "");
  const [githubUrl, setGithubUrl] = useState(preview ? "https://github.com/stellaappiok" : "");
  const [portfolioUrl, setPortfolioUrl] = useState(preview ? "https://stellaappiok.dev" : "");
  const [hasAcknowledgedTerms, setHasAcknowledgedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const live = usePortalResource(loadOpportunities, isOpen && !preview);
  const [error, setError] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(1);
  const saving = useRef(false);
  const savedId = useRef<string | null>(null);
  const applicant = preview ? getApplicantInfo() : { name: live.data?.me.display_name ?? "Signed-in student", email: live.data?.me.email ?? "" };

  const sampleOptions: Record<
    string,
    {
      title: string;
      org: string;
      termsVersion: string;
      weeklyHours: number;
      durationWeeks: number;
      ipTerms: string;
      confidentiality: string;
    }
  > = {
    "proj-smartgrid": {
      title: "Smart Grid Energy Optimizer",
      org: "Volta Power Labs",
      termsVersion: "terms-voltapower-v1.0",
      weeklyHours: 15,
      durationWeeks: 8,
      ipTerms: "Permissive Open Source (MIT License). Student retains verifiable passport demonstration rights.",
      confidentiality: "Simulated load distribution data; no customer billing records exposed.",
    },
    "proj-irrigation": {
      title: "Micro-Irrigation Sensor Gateway",
      org: "GreenFields Tech",
      termsVersion: "terms-greenfields-v1.1",
      weeklyHours: 12,
      durationWeeks: 6,
      ipTerms: "Open Hardware Documentation (CERN OHL) & MIT License.",
      confidentiality: "Field soil moisture logs are open data.",
    },
    "proj-healthnet-dir": {
      title: "Community Clinic Locator & Offline Map",
      org: "HealthNet Africa",
      termsVersion: "terms-healthnet-v1.3",
      weeklyHours: 15,
      durationWeeks: 8,
      ipTerms: "Public health open source (Apache 2.0).",
      confidentiality: "De-identified public clinic locations only.",
    },
  };

  const projectOptions = preview ? sampleOptions : live.data?.opportunities ?? {};
  const choice = preview ? projectChoice : (initialProjectId || projectChoice in projectOptions ? projectChoice : Object.keys(projectOptions)[0] ?? "");
  const selectedProject = projectOptions[choice] ?? { title: "No available projects", org: "", termsVersion: "", weeklyHours: 0, durationWeeks: 0, ipTerms: "", confidentiality: "" };
  if (!isOpen) return null;

  // Duplicate Application Guard (§5.4 ALREADY_APPLIED error contract)
  const isAlreadyApplied = existingApplications.some(
    (a) => a.projectId === choice && (!preview || a.status !== "withdrawn")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyApplied) {
      alert("You have already submitted an active application for this project opportunity.");
      return;
    }

    if (!hasAcknowledgedTerms) {
      alert("Please review the pre-submit project terms disclosure and confirm the acknowledgment checkbox.");
      return;
    }

    if (!motivation.trim()) {
      alert("Please provide a brief motivation / statement of fit.");
      return;
    }

    if (!preview) {
      if (saving.current) return;
      saving.current = true; setIsSubmitting(true); setError("");
      try {
        const opportunity = live.data?.opportunities[choice];
        if (!opportunity) throw new Error("Select an available published project.");
        const api = await live.getApi();
        if (!savedId.current) {
          const created = requireData(await api.submitApplication(choice, {
            seen_terms_version_id: opportunity.terms.id, motivation: motivation.trim(),
            declared_skills: skills.split(",").map(s => s.trim()).filter(Boolean),
            links: [{ label: "GitHub", url: githubUrl.trim() }, { label: "Portfolio", url: portfolioUrl.trim() }].filter(l => l.url),
            weekly_minutes_available: Math.round(weeklyHours * 60),
          }, opportunity.project.row_version));
          savedId.current = created.id;
        }
        const recorded = requireData(await api.getApplication(savedId.current));
        onApplicationCreated(mapApplication(recorded)); savedId.current = null; onClose();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not confirm the application. Refresh records before retrying."); }
      finally { saving.current = false; setIsSubmitting(false); }
      return;
    }
    setIsSubmitting(true);

    setTimeout(() => {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const timestamp = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

      const newApplication: StudentApplicationDetails = {
        id: `app-${Date.now()}`,
        projectId: projectChoice,
        projectTitle: selectedProject.title,
        organizationName: selectedProject.org,
        organizationVerified: true,
        status: "submitted",
        appliedAt: timestamp,
        motivationStatement: motivation.trim(),
        declaredSkills: skillsArray.length > 0 ? skillsArray : ["React", "TypeScript"],
        externalLinks: [
          ...(githubUrl.trim() ? [{ label: "GitHub Profile", url: githubUrl.trim() }] : []),
          ...(portfolioUrl.trim() ? [{ label: "Portfolio Website", url: portfolioUrl.trim() }] : []),
        ],
        observedTermsSnapshot: {
          termsVersionId: selectedProject.termsVersion,
          weeklyHours: selectedProject.weeklyHours,
          durationWeeks: selectedProject.durationWeeks,
          ipConditions: selectedProject.ipTerms,
          confidentialitySummary: selectedProject.confidentiality,
          snapshotDate: timestamp,
        },
        timeline: [
          {
            id: `evt-${Date.now()}`,
            status: "submitted",
            title: "Application Submitted",
            description: `Application sent.`,
            timestamp: "Just now",
          },
        ],
        isSyntheticDemo: true,
      };

      onApplicationCreated(newApplication);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Apply to a project
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tell the organisation why you want this project, and check its terms.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Dynamic Applicant Contact Banner (From Student Profile) */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Applying as:</span>
            <span className="font-bold text-slate-900">{applicant.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
            <span>{applicant.email}</span>
            <span className="rounded bg-teal-50 text-teal-800 px-1.5 py-0.2 text-[10px] font-semibold border border-teal-200">
              {preview ? "Preview" : "Signed in"}
            </span>
          </div>
        </div>

        {/* Duplicate Application Guard Banner (§5.4) */}
        {isAlreadyApplied && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
            <span className="text-base shrink-0">⚠️</span>
            <div className="space-y-0.5">
              <span className="font-bold">You&apos;ve already applied</span>
              <p className="text-amber-900 leading-relaxed">
                You already have an application for &quot;{selectedProject.title}&quot;. You can follow it on the Find projects page.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || (!preview && live.error)) && <p role="alert" className="text-red-700">{error || live.error}</p>}
          {!preview && live.loading && <p role="status" className="text-sm text-ink-500">Loading open projects…</p>}
          {!preview && <label className="block text-xs font-semibold text-slate-700">Hours per week you can give this project<input type="number" required min="1" max="168" value={weeklyHours} onChange={e => setWeeklyHours(Number(e.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>}
          {/* Project Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Project *
            </label>
            <select
              value={choice}
              onChange={(e) => { setProjectChoice(e.target.value); setHasAcknowledgedTerms(false); savedId.current = null; }}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
            >
              {Object.entries(projectOptions).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.title} — {opt.org} {preview ? `(${opt.weeklyHours} hrs/week)` : ""}
                </option>
              ))}
            </select>
          </div>

          {!preview && live.data?.opportunities[choice] && <div className="text-xs text-slate-700"><p>{termsSnapshot(live.data.opportunities[choice].terms).scope.scope_in}</p><p>Pay: {termsSnapshot(live.data.opportunities[choice].terms).terms.currency} {termsSnapshot(live.data.opportunities[choice].terms).terms.fee_amount} · {termsSnapshot(live.data.opportunities[choice].terms).terms.payment_terms}</p><p>Confidentiality: {selectedProject.confidentiality}</p><p>Mentorship: {termsSnapshot(live.data.opportunities[choice].terms).terms.mentor_plan}</p></div>}
          {/* REQUIRED PRE-SUBMIT TERMS DISCLOSURE (§5.4) */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-teal-100 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                Project terms
              </span>
              <span className="text-[10px] font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                {selectedProject.termsVersion}
              </span>
            </div>

            <div className="grid gap-2 grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Organisation</span>
                <p className="font-bold text-slate-800">{selectedProject.org}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Time</span>
                <p className="font-bold text-slate-800">
                  {preview ? selectedProject.weeklyHours : weeklyHours} hours/week available over {selectedProject.durationWeeks} weeks
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Who owns the work</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">{selectedProject.ipTerms}</p>
              </div>
            </div>

            {/* Acknowledgment Checkbox (§5.4 Acceptance criteria: Unchecked by default) */}
            <div className="pt-2 flex items-start gap-2 border-t border-teal-100">
              <input
                id="termsAcknowledgment"
                type="checkbox"
                checked={hasAcknowledgedTerms}
                onChange={(e) => setHasAcknowledgedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-800 cursor-pointer"
                required
              />
              <label htmlFor="termsAcknowledgment" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                <strong>I have reviewed the project terms shown above.</strong>{" "}
                <span className="text-[11px] text-slate-500">
                  (This isn&apos;t a contract or an offer. You&apos;ll see the final terms again if you get an offer.)
                </span>
              </label>
            </div>
          </div>

          {/* Motivation / Statement of Fit */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Why you want this project *
              </label>
              <span className={`text-[10px] ${motivation.length > 550 ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                {motivation.length}/600 characters
              </span>
            </div>
            <textarea
              rows={3}
              minLength={20}
              maxLength={600}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Explain why you are interested in this project, relevant coursework, and how you plan to contribute to milestone objectives..."
              className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800 leading-relaxed"
              required
            />
          </div>

          {/* Declared Skills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Key Relevant Skills (comma-separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React 19, TypeScript, Next.js, SQLite"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
            />
          </div>

          {/* Links */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                GitHub Profile URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Portfolio or Code Sample URL
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://yoursite.dev"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={(!preview && (live.loading || !choice || Boolean(live.error))) || isSubmitting || !hasAcknowledgedTerms || isAlreadyApplied || !motivation.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Sending…</span>
                </>
              ) : isAlreadyApplied ? (
                <span>Already applied</span>
              ) : (
                <span>Send application</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
