"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudentPortalHeader } from "./student-portal-header";
import { syntheticStudentPassport } from "../lib/mock-data";
import type { StudentPassportDetails } from "../lib/types";

const PROFILE_STORAGE_KEY = "experiencebridge_student_profile_data";

export function StudentPassportView() {
  const pathname = usePathname();
  const isDevPreview = Boolean(pathname?.startsWith("/dev/student"));
  const basePath = isDevPreview ? "/dev/student" : "/student";

  const [passport] = useState<StudentPassportDetails>(syntheticStudentPassport);
  const [filter, setFilter] = useState<"all" | "accepted" | "in_progress" | "skills">("all");

  // Read student display name from profile localStorage if available
  const [studentDisplayName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.displayName) return parsed.displayName;
        }
      } catch {
        // Fallback
      }
    }
    return passport.student.displayName;
  });

  const filteredAssertions = passport.projectAssertions.filter((assertion) => {
    if (filter === "accepted") {
      return assertion.evidenceTiers.deliverableAccepted;
    }
    if (filter === "in_progress") {
      return !assertion.evidenceTiers.deliverableAccepted;
    }
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      <StudentPortalHeader studentName={studentDisplayName} isSynthetic={true} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Navigation Breadcrumb & Context */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                STU-10 · Private Record
              </span>
              <span className="text-xs text-slate-500">
                Experience Passport
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Experience Passport · {studentDisplayName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
              Immutable cryptographically verifiable record combining self-reported learning with mentor assessments and accepted deliverables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`${basePath}/applications`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Track Applications</span>
            </Link>

            <button
              type="button"
              onClick={() => typeof window !== "undefined" && window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / Export Passport</span>
            </button>
          </div>
        </div>

        {/* STATUTORY MANDATORY DISCLOSURE (§6.8 Visual Rule) */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4.5 sm:p-5 shadow-2xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-teal-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-teal-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                Experience Passport Disclosure &amp; Provenance Protocol
              </h2>
            </div>
            <span className="text-[10px] font-mono text-teal-800 bg-white/80 px-2.5 py-0.5 rounded border border-teal-200">
              {passport.overallAssertionHash.slice(0, 24)}...
            </span>
          </div>

          <p className="text-xs text-teal-950 leading-relaxed font-medium">
            &quot;This record combines self-reported information with recorded reviews. Each item shows its evidence level.&quot;
          </p>

          <p className="text-[11px] text-teal-900 leading-relaxed">
            Unlike unverifiable resumes, ExperienceBridge records separate stages of provenance. A self-reported skill does not gain review status because another project was accepted. Missing mentor assessments are plainly documented as unverified until rubric observations are filed.
          </p>
        </div>

        {/* 4 EVIDENCE TIERS LEDGER CARDS (Responsive: 1 col on mobile, 4 col on desktop) */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 1</span>
              <span className="h-2 w-2 rounded-full bg-teal-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Identity Checked</h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              Verified institutional email and candidate authorization on file.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 2</span>
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Work Submitted</h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              Cryptographic receipts of code commits, PRs, and milestone artifacts.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 3</span>
              <span className="h-2 w-2 rounded-full bg-amber-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Mentor Reviewed</h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              Faculty mentor evaluation logged against approved academic rubric.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tier 4</span>
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Deliverable Accepted</h3>
            <p className="text-[11px] text-slate-500 leading-snug">
              Official sign-off by organization technical director or lead engineer.
            </p>
          </div>
        </div>

        {/* FILTER BAR & VIEW TOGGLE (Responsive for mobile scroll) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { label: "All Assertions", value: "all" },
              { label: "Accepted Deliverables", value: "accepted" },
              { label: "In Progress / Screening", value: "in_progress" },
              { label: "Competencies Ledger", value: "skills" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value as typeof filter)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === tab.value
                    ? "bg-teal-800 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400">
            Last Verified: <strong className="text-slate-700">{passport.lastUpdated}</strong>
          </div>
        </div>

        {/* SECTION A: PROJECT ASSERTIONS */}
        {filter !== "skills" && (
          <section aria-labelledby="project-assertions-heading" className="space-y-5">
            <h2 id="project-assertions-heading" className="text-sm font-bold text-slate-900">
              Verified Project Assertions &amp; Deliverables ({filteredAssertions.length})
            </h2>

            <div className="grid gap-5">
              {filteredAssertions.map((assertion) => {
                const isAccepted = assertion.evidenceTiers.deliverableAccepted;

                return (
                  <article
                    key={assertion.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
                  >
                    {/* Project Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">
                            {assertion.organizationName}
                          </span>
                          {assertion.organizationVerified && (
                            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200">
                              ✓ Verified Org
                            </span>
                          )}
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {assertion.timeframe}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {assertion.projectTitle}
                        </h3>
                      </div>

                      {/* Evidence Tier Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            assertion.evidenceTiers.identityChecked
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          {assertion.evidenceTiers.identityChecked ? "✓ Identity Checked" : "○ Identity Pending"}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            assertion.evidenceTiers.workSubmitted
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          {assertion.evidenceTiers.workSubmitted ? "✓ Work Submitted" : "○ Work Awaiting"}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            assertion.evidenceTiers.mentorReviewed
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          {assertion.evidenceTiers.mentorReviewed ? "✓ Mentor Reviewed" : "○ No Mentor Review"}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            isAccepted
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold"
                              : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          {isAccepted ? "✓ Deliverable Accepted" : "○ Pending Acceptance"}
                        </span>
                      </div>
                    </div>

                    {/* Disputed / Under Review Warning if applicable (§6.8) */}
                    {assertion.disputeState === "under_review" && (
                      <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-950 flex items-center gap-2">
                        <span>⚠️ Dispute Notice: This assertion is currently under independent program review.</span>
                      </div>
                    )}

                    {/* Personal Contribution Statement */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Candidate Contribution Statement
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                        {assertion.contributionStatement}
                      </p>
                    </div>

                    {/* Deliverables & Evidence Links */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Deliverables On Record
                        </span>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {assertion.deliverables.map((del, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-teal-700 shrink-0">✓</span>
                              <span>{del}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Verified Artifact Links
                        </span>
                        <div className="space-y-1.5">
                          {assertion.evidenceLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs font-medium text-slate-700 hover:border-teal-700 hover:bg-teal-50/40 transition"
                            >
                              <span className="truncate">{link.label}</span>
                              <span className="text-[10px] text-teal-800 font-bold shrink-0">Link ↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* STRICT PROVENANCE: MENTOR REVIEW VS ORGANIZATION DECISION (§6.8 Visual Rule) */}
                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                      {/* Mentor Review Card */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                            Mentor Rubric Observation
                          </span>
                          {assertion.mentorReview && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {assertion.mentorReview.reviewedAt}
                            </span>
                          )}
                        </div>

                        {assertion.mentorReview ? (
                          <div className="space-y-2 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">{assertion.mentorReview.reviewerName}</p>
                              <p className="text-[11px] text-slate-500">{assertion.mentorReview.reviewerTitle}</p>
                            </div>

                            <p className="text-slate-700 leading-relaxed italic bg-white/80 p-2.5 rounded-lg border border-amber-100">
                              &quot;{assertion.mentorReview.feedbackExcerpt}&quot;
                            </p>

                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Evaluated Criteria:</span>
                              <div className="flex flex-wrap gap-1">
                                {assertion.mentorReview.rubricCriteriaObserved.map((crit, idx) => (
                                  <span key={idx} className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                                    {crit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Acceptance UX-STU-10 requirement: Missing review plainly reads "No mentor review recorded" */
                          <div className="py-4 text-center space-y-1">
                            <span className="text-xs font-semibold text-slate-600 block">
                              No mentor review recorded
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Work has not yet completed rubric evaluation by an assigned mentor.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Organization Acceptance Card */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            Organization Acceptance
                          </span>
                          {assertion.organizationDecision && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {assertion.organizationDecision.decidedAt}
                            </span>
                          )}
                        </div>

                        {assertion.organizationDecision ? (
                          <div className="space-y-2 text-xs">
                            <div>
                              <p className="font-bold text-slate-900">
                                {assertion.organizationDecision.reviewerName}
                              </p>
                              <span className="inline-block rounded bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-950 border border-emerald-300">
                                Deliverable Officially Accepted
                              </span>
                            </div>

                            <p className="text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                              {assertion.organizationDecision.formalStatement}
                            </p>
                          </div>
                        ) : (
                          <div className="py-4 text-center space-y-1">
                            <span className="text-xs font-semibold text-slate-600 block">
                              Awaiting organization decision
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Formal project acceptance decision pending delivery review.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cryptographic Assertion Receipt */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                      <span>Receipt: <strong>{assertion.assertionHash}</strong></span>
                      <span className="text-teal-800 font-sans font-semibold">Immutable Experience Assertion</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION B: COMPETENCIES & SKILLS LEDGER (STRICT SEPARATION UX-STU-10) */}
        {(filter === "all" || filter === "skills") && (
          <section aria-labelledby="skills-ledger-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Provable Skills Ledger
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Strict Provenance Separation (§6.8)
                </span>
              </div>
              <h2 id="skills-ledger-heading" className="text-base font-bold text-slate-900 mt-2">
                Demonstrated vs. Self-Reported Competencies
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated competencies are cryptographically tied to project deliverables. Self-reported coursework claims are distinguished to prevent false accreditation.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Column 1: Mentor-Assessed Skills (Tier 3 Verified) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Mentor-Assessed Competencies ({passport.assessedSkills.length})
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Rubric Verified
                  </span>
                </div>

                <div className="space-y-2.5">
                  {passport.assessedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-950 border border-emerald-300 capitalize">
                          {skill.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Origin: <strong className="text-slate-800">{skill.projectOrigin}</strong>
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-emerald-100">
                        <span>Assessed by: <strong>{skill.assessedByMentor}</strong></span>
                        <span>{skill.assessedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Self-Reported Skills (Unverified by Mentors) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Self-Reported Skills ({passport.selfReportedSkills.length})
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Self-Reported
                  </span>
                </div>

                <div className="space-y-2.5">
                  {passport.selfReportedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{skill.name}</span>
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize">
                          {skill.proficiencyLevel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {skill.contextOrProject || "General university coursework and independent study"}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        <span>{skill.yearsOfExperience || "Self-assessed"}</span>
                        <span className="text-amber-800 font-medium">No mentor evaluation on record</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECURITY & PRIVACY POLICY NOTE (§6.9) */}
        <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-700 block">Private Authenticated Preview (§6.8/§6.9)</span>
            <p className="text-[11px] text-slate-500">
              In accordance with ExperienceBridge security specifications, public capability URLs and unauthenticated token sharing are restricted to protect student privacy.
            </p>
          </div>
          <Link
            href={`${basePath}/dashboard`}
            className="text-xs font-semibold text-teal-800 hover:underline shrink-0"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
