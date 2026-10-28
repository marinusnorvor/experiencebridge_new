"use client";

import { useState } from "react";
import type { StudentApplicationDetails } from "../lib/types";

interface ApplyModalProps {
  isOpen: boolean;
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
  onClose,
  onApplicationCreated,
  existingApplications = [],
}: ApplyModalProps) {
  const [projectChoice, setProjectChoice] = useState("proj-smartgrid");
  const [motivation, setMotivation] = useState("");
  const [skills, setSkills] = useState("React 19, TypeScript, Next.js");
  const [githubUrl, setGithubUrl] = useState("https://github.com/stellaappiok");
  const [portfolioUrl, setPortfolioUrl] = useState("https://stellaappiok.dev");
  const [hasAcknowledgedTerms, setHasAcknowledgedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applicant = getApplicantInfo();

  if (!isOpen) return null;

  const projectOptions: Record<
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

  const selectedProject = projectOptions[projectChoice] ?? projectOptions["proj-smartgrid"];

  // Duplicate Application Guard (§5.4 ALREADY_APPLIED error contract)
  const isAlreadyApplied = existingApplications.some(
    (a) => a.projectId === projectChoice && a.status !== "withdrawn"
  );

  const handleSubmit = (e: React.FormEvent) => {
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
            description: `Application cryptographic receipt recorded with observed terms version ${selectedProject.termsVersion}.`,
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
                Apply for Project Opportunity
              </h3>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                API-APP-01 Application Entry
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your motivation statement and review immutable project terms.
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
              Verified
            </span>
          </div>
        </div>

        {/* Duplicate Application Guard Banner (§5.4) */}
        {isAlreadyApplied && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
            <span className="text-base shrink-0">⚠️</span>
            <div className="space-y-0.5">
              <span className="font-bold">Duplicate Application Guard (§5.4)</span>
              <p className="text-amber-900 leading-relaxed">
                You already have an active application submitted for &quot;{selectedProject.title}&quot;. ExperienceBridge policy blocks duplicate submissions for the same opportunity.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Select Approved Project Opportunity *
            </label>
            <select
              value={projectChoice}
              onChange={(e) => setProjectChoice(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
            >
              {Object.entries(projectOptions).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.title} — {opt.org} ({opt.weeklyHours} hrs/week)
                </option>
              ))}
            </select>
          </div>

          {/* REQUIRED PRE-SUBMIT TERMS DISCLOSURE (§5.4) */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-teal-100 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                Mandatory Pre-Submit Terms Disclosure
              </span>
              <span className="text-[10px] font-mono text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                {selectedProject.termsVersion}
              </span>
            </div>

            <div className="grid gap-2 grid-cols-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Organization</span>
                <p className="font-bold text-slate-800">{selectedProject.org}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Expected Time Commitment</span>
                <p className="font-bold text-slate-800">
                  {selectedProject.weeklyHours} hours/week over {selectedProject.durationWeeks} weeks
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">IP &amp; Evidence Sharing Rights</span>
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
                  (This checkbox is an acknowledgment of terms viewed, not an employment agreement or project offer.)
                </span>
              </label>
            </div>
          </div>

          {/* Motivation / Statement of Fit */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Motivation &amp; Statement of Fit *
              </label>
              <span className={`text-[10px] ${motivation.length > 550 ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                {motivation.length}/600 characters
              </span>
            </div>
            <textarea
              rows={3}
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
              disabled={isSubmitting || !hasAcknowledgedTerms || isAlreadyApplied || !motivation.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Submitting application...</span>
                </>
              ) : isAlreadyApplied ? (
                <span>Already Applied (§5.4)</span>
              ) : (
                <span>Submit Application (API-APP-01)</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
