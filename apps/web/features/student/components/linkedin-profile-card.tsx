"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StudentProfileDetails } from "../lib/types";

interface LinkedinProfileCardProps {
  profile: StudentProfileDetails;
  onEditClick: () => void;
  onOpenPhotoModal: () => void;
  onOpenCoverModal: () => void;
}

export function LinkedinProfileCard({
  profile,
  onEditClick,
  onOpenPhotoModal,
  onOpenCoverModal,
}: LinkedinProfileCardProps) {
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/dev/student") ? "/dev/student" : "/student";
  const topProjects = profile.topProjects ?? [];
  // Extract initials for fallback avatar
  const initials = profile.displayName
    ? profile.displayName
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  const isCoverCustomImage =
    profile.coverUrl &&
    (profile.coverUrl.startsWith("data:") || profile.coverUrl.startsWith("http"));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. LinkedIn-style Hero Header Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Cover / Banner */}
        <div
          className="relative h-44 sm:h-56 w-full bg-gradient-to-r from-teal-950 via-teal-800 to-slate-900 transition-all duration-300"
          style={
            profile.coverUrl
              ? {
                  background: isCoverCustomImage
                    ? `url(${profile.coverUrl}) center/cover no-repeat`
                    : profile.coverUrl,
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-black/15" />
          
          {/* Edit Cover Photo Button on Banner */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCoverModal}
              className="rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs px-3 py-1.5 text-xs font-semibold shadow-md flex items-center gap-1.5 border border-white/20 transition"
              title="Edit cover photo"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>Edit Cover</span>
            </button>
          </div>
        </div>

        {/* Profile Info & Avatar Container */}
        <div className="relative px-6 pb-6 pt-0">
          {/* Overlapping Avatar */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            <div className="relative group w-28 h-28 sm:w-36 sm:h-36 shrink-0">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg bg-white"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-teal-800 border-4 border-white shadow-lg flex items-center justify-center text-white text-3xl font-bold tracking-wider">
                  {initials}
                </div>
              )}

              {/* Photo Edit Overlay Button */}
              <button
                type="button"
                onClick={onOpenPhotoModal}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold transition"
                title="Change & crop profile picture"
              >
                <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                <span>Edit Photo</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onEditClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 transition focus-visible:outline-2 focus-visible:outline-teal-800"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={onOpenPhotoModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Update Photo</span>
              </button>

              <Link
                href={`${basePath}/dashboard#experience-passport`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <span>Experience Passport</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Headline & Details */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {profile.displayName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                <svg className="h-3.5 w-3.5 text-teal-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Student
              </span>
            </div>

            <p className="text-sm font-medium text-slate-700 leading-snug max-w-3xl">
              {profile.headline}
            </p>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 pt-1">
              <span className="font-semibold text-slate-700">{profile.institution}</span>
              <span>•</span>
              <span>{profile.programOfStudy}</span>
              <span>•</span>
              <span>Class of {profile.graduationYear}</span>
              <span>•</span>
              <span className="text-teal-800 font-medium">
                {profile.weeklyHoursAvailable} hrs/week available
              </span>
            </div>
          </div>

          {/* External Links Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            {profile.githubUrl && (
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span>GitHub</span>
              </a>
            )}

            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 transition"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span>LinkedIn</span>
              </a>
            )}

            {profile.portfolioUrl && (
              <a
                href={profile.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Portfolio Website</span>
              </a>
            )}

            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-50/70 border border-teal-200/80 px-2.5 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100 transition sm:ml-auto"
                title={`Send email to ${profile.email}`}
              >
                <svg className="h-3.5 w-3.5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Contact: {profile.email}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. About Me Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">About &amp; Summary</h2>
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs font-semibold text-teal-800 hover:text-teal-900"
          >
            Edit
          </button>
        </div>
        <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">
          {profile.bio}
        </p>
      </div>

      {/* 3. Top & Featured Projects Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-base font-bold text-slate-900">
                Top &amp; Featured Projects ({topProjects.length})
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Verified organization engagements, software engineering initiatives, and technical contributions.
            </p>
          </div>
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs font-semibold text-teal-800 hover:text-teal-900 self-start sm:self-auto"
          >
            + Add or Manage Projects
          </button>
        </div>

        {topProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            No featured projects added yet. Click &ldquo;+ Add or Manage Projects&rdquo; to showcase your work.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {topProjects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3 hover:border-slate-300 hover:bg-slate-50 transition flex flex-col justify-between shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900">
                      {proj.title}
                    </h3>
                    {proj.isVerifiedOrgProject ? (
                      <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                        ✓ Verified Org Project
                      </span>
                    ) : (
                      <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        Personal / Academic
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                    <span className="font-semibold text-teal-900">{proj.role}</span>
                    {proj.organization && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{proj.organization}</span>
                      </>
                    )}
                    {proj.timeframe && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500">{proj.timeframe}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/70">
                    {proj.summary}
                  </p>

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {proj.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200/60 text-xs">
                  {proj.participationId && (
                    <Link
                      href={`${basePath}/projects/${proj.participationId}`}
                      className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-900 text-xs"
                    >
                      <span>View Project Workspace</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  )}

                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 text-[11px] ml-auto"
                    >
                      <svg className="h-3.5 w-3.5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      <span>Code ↗</span>
                    </a>
                  )}

                  {proj.projectUrl && (
                    <a
                      href={proj.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-900 text-[11px]"
                    >
                      <span>Demo ↗</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Mentor-Assessed Capabilities (Evidence-Backed) */}
      <div className="rounded-2xl border border-teal-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h2 className="text-base font-bold text-slate-900">
                Mentor-Assessed Capabilities ({profile.assessedSkills.length})
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Independently verified during genuine project milestones.
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 border border-teal-200">
            Immutable Evidence
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {profile.assessedSkills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                <span className="text-[10px] font-semibold uppercase text-teal-900 bg-teal-100 px-2 py-0.5 rounded">
                  {skill.level}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-teal-200/50">
                <div>Assessor: <strong className="text-slate-800">{skill.assessedByMentor}</strong></div>
                <div>Origin: {skill.projectOrigin}</div>
                <div className="text-slate-400">{skill.assessedAt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Self-Reported Skill Inventory */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Self-Reported Skill Inventory ({profile.selfReportedSkills.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Declared capabilities with stated proficiency and project demonstration context.
            </p>
          </div>
          <button
            type="button"
            onClick={onEditClick}
            className="text-xs font-semibold text-teal-800 hover:text-teal-900"
          >
            + Add or Edit Skills
          </button>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          {profile.selfReportedSkills.map((skill) => {
            const badgeColor =
              skill.proficiencyLevel === "advanced"
                ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                : skill.proficiencyLevel === "intermediate"
                ? "bg-teal-50 text-teal-900 border-teal-200"
                : "bg-sky-50 text-sky-900 border-sky-200";

            return (
              <div
                key={skill.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                      {skill.proficiencyLevel}
                    </span>
                  </div>
                  {skill.yearsOfExperience && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {skill.yearsOfExperience}
                    </span>
                  )}
                </div>

                {skill.contextOrProject ? (
                  <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/70 leading-relaxed">
                    {skill.contextOrProject}
                  </p>
                ) : (
                  <p className="text-[10px] italic text-slate-400">
                    No project context specified.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Preferred Technical Domains & Availability */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Target Project Domains &amp; Availability
        </h2>

        <div className="flex flex-wrap gap-2">
          {profile.preferredDomains.map((domain) => (
            <span
              key={domain}
              className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 border border-teal-200"
            >
              {domain}
            </span>
          ))}
        </div>

        <div className="pt-2 text-xs text-slate-600 flex items-center gap-2">
          <svg className="h-4 w-4 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Committed to <strong>{profile.weeklyHoursAvailable} hours per week</strong> for organization milestones.
          </span>
        </div>
      </div>
    </div>
  );
}
