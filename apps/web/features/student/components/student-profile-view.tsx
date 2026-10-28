"use client";

import { useState } from "react";
import { syntheticStudentProfile } from "../lib/mock-data";
import type { SelfReportedSkill, StudentProfileDetails } from "../lib/types";
import { StudentPortalHeader } from "./student-portal-header";
import { LinkedinProfileCard } from "./linkedin-profile-card";
import { ProfilePhotoCropper } from "./profile-photo-cropper";
import { CoverPhotoModal } from "./cover-photo-modal";

const STORAGE_KEY = "experiencebridge_student_profile_data";
const STORAGE_TIMESTAMP_KEY = "experiencebridge_student_profile_saved_at";

function getInitialProfile(): StudentProfileDetails {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StudentProfileDetails;
        if (parsed && parsed.displayName) {
          return parsed;
        }
      }
    } catch {
      // Ignore read errors
    }
  }
  return syntheticStudentProfile ?? ({} as StudentProfileDetails);
}

function getInitialTimestamp(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

export function StudentProfileView() {
  const [profile, setProfile] = useState<StudentProfileDetails>(getInitialProfile);
  const [viewMode, setViewMode] = useState<"view" | "edit">("view");

  // Modals for Photo and Cover Photo
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

  // New Skill Form State
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [yearsOfExperience, setYearsOfExperience] = useState("1-2 years");
  const [contextOrProject, setContextOrProject] = useState("");

  // Saving / Loading Animation State
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(getInitialTimestamp);

  // Save changes to localStorage and transition directly to LinkedIn-style view
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      try {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile, null, 2));
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, timestamp);
        setLastSavedTime(timestamp);
      } catch (err) {
        console.error("Failed to save profile to localStorage:", err);
      }

      setIsSaving(false);
      setViewMode("view"); // Automatically switch to LinkedIn-style presentation view
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 4000);
    }, 600);
  };

  // Profile photo crop complete
  const handlePhotoCropComplete = (croppedDataUrl: string) => {
    const updatedProfile = { ...profile, avatarUrl: croppedDataUrl };
    setProfile(updatedProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile, null, 2));
    } catch {
      // Ignored
    }
  };

  // Cover photo apply
  const handleCoverApply = (newCoverUrl: string | undefined) => {
    const updatedProfile = { ...profile, coverUrl: newCoverUrl };
    setProfile(updatedProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile, null, 2));
    } catch {
      // Ignored
    }
  };

  // Add detailed self-reported skill
  const handleAddDetailedSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = skillName.trim();
    if (!trimmed) return;

    if (profile?.selfReportedSkills?.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      alert("A skill with this name already exists in your self-reported list.");
      return;
    }

    const newSkill: SelfReportedSkill = {
      id: `self-${Date.now()}`,
      name: trimmed,
      proficiencyLevel,
      yearsOfExperience: yearsOfExperience.trim() || undefined,
      contextOrProject: contextOrProject.trim() || undefined,
    };

    const updatedSkills = [...(profile?.selfReportedSkills ?? []), newSkill];
    const updatedProfile = { ...profile, selfReportedSkills: updatedSkills };
    setProfile(updatedProfile);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile, null, 2));
    } catch {
      // Ignored
    }

    setSkillName("");
    setProficiencyLevel("intermediate");
    setYearsOfExperience("1-2 years");
    setContextOrProject("");
    setIsAddingSkill(false);
  };

  // Remove self-reported skill
  const handleRemoveSkill = (id: string) => {
    const updatedSkills = (profile?.selfReportedSkills ?? []).filter((s) => s.id !== id);
    const updatedProfile = { ...profile, selfReportedSkills: updatedSkills };
    setProfile(updatedProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile, null, 2));
    } catch {
      // Ignored
    }
  };

  if (!profile || !profile.displayName) {
    return (
      <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex items-center justify-center p-6 text-sm text-slate-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 pb-16">
      {/* Sub-navigation & Header */}
      <StudentPortalHeader
        studentName={profile?.displayName}
        isSynthetic={profile?.isSyntheticDemo}
      />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 space-y-6">
        {/* Update Notification Banner */}
        {isSavedFeedback && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
              <span>
                <strong>Profile updated successfully!</strong> Here is how organizations see your profile.
              </span>
            </div>
            {lastSavedTime && (
              <span className="text-[11px] text-emerald-700">Saved at {lastSavedTime}</span>
            )}
          </div>
        )}

        {/* --- VIEW MODE: LinkedIn-style Presentation --- */}
        {viewMode === "view" ? (
          <LinkedinProfileCard
            profile={profile}
            onEditClick={() => setViewMode("edit")}
            onOpenPhotoModal={() => setIsPhotoModalOpen(true)}
            onOpenCoverModal={() => setIsCoverModalOpen(true)}
          />
        ) : (
          /* --- EDIT MODE: Form to update details --- */
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Edit Profile Information
                </h2>
                <p className="text-xs text-slate-500">
                  Make updates to your bio, photo, banner, and skills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("view")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
              >
                ← Back to Profile View
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Section 1: Basic Information & Photo/Cover Upload */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      1. Profile Visuals &amp; Personal Info
                    </h3>
                    <p className="text-xs text-slate-500">
                      Your photo, cover banner, display name, and academic institution.
                    </p>
                  </div>
                  <span className="text-xs text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                    Editable (API-ID-02)
                  </span>
                </div>

                {/* Profile Photo and Cover Banner Row */}
                <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  {/* Photo Edit */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-teal-800 bg-teal-800 shrink-0">
                      {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatarUrl}
                          alt={profile.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                          {profile.displayName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        Profile Picture
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      >
                        <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                        <span>{profile.avatarUrl ? "Change & Crop" : "Upload Photo"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Cover Edit */}
                  <div className="flex items-center justify-between sm:justify-start gap-4 sm:border-l sm:border-slate-200 sm:pl-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900">
                        Cover Banner
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Change the banner behind your profile photo.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCoverModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      >
                        <svg className="h-3.5 w-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Change Cover Banner</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="displayName" className="block text-xs font-semibold text-slate-700">
                      Full Name / Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                      Contact Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="e.g. yourname@university.edu"
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                      required
                    />
                    <span className="text-[10px] text-slate-500">
                      Organizations and mentors contact you at this address
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="headline" className="block text-xs font-semibold text-slate-700">
                      Professional Headline
                    </label>
                    <input
                      id="headline"
                      type="text"
                      value={profile.headline}
                      onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                      placeholder="e.g. Computer Science Student | Frontend &amp; Cloud Systems"
                    />
                  </div>

                  <div>
                    <label htmlFor="institution" className="block text-xs font-semibold text-slate-700">
                      Academic Institution
                    </label>
                    <input
                      id="institution"
                      type="text"
                      value={profile.institution}
                      onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="programOfStudy" className="block text-xs font-semibold text-slate-700">
                      Program of Study &amp; Year
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        id="programOfStudy"
                        type="text"
                        value={profile.programOfStudy}
                        onChange={(e) => setProfile({ ...profile, programOfStudy: e.target.value })}
                        className="col-span-2 mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                        placeholder="e.g. B.Sc. Computer Engineering"
                      />
                      <input
                        id="graduationYear"
                        type="text"
                        value={profile.graduationYear}
                        onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })}
                        className="col-span-1 mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                        placeholder="Grad 2027"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="bio" className="block text-xs font-semibold text-slate-700">
                      About Me / Technical Summary
                    </label>
                    <textarea
                      id="bio"
                      rows={3}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800 leading-relaxed"
                      placeholder="Describe your interests, experience with projects, and what kind of challenges you enjoy solving..."
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Skills - Strict Separation (Invariant STU-02) */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      2. Capability &amp; Skill Inventory
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Self-reported claims are explicitly distinguished from verified skills assessed by mentors.
                    </p>
                  </div>
                  <span className="text-xs text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded font-medium border border-amber-200 w-fit">
                    STU-02 Invariant: Provenance Separation
                  </span>
                </div>

                {/* Subsection A: Assessed Skills (Immutable, from mentors) */}
                <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                        Mentor-Assessed Skills ({profile.assessedSkills.length})
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                      Evidence-Backed · Immutable
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {profile.assessedSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="rounded-lg border border-teal-200 bg-white p-3.5 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                          <span className="text-[10px] font-semibold uppercase text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                            {skill.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                          <div>Assessed by: <strong className="text-slate-700">{skill.assessedByMentor}</strong></div>
                          <div>Origin: {skill.projectOrigin}</div>
                          <div>Date: {skill.assessedAt}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subsection B: Self-Reported Skills (Detailed with proficiency & context) */}
                <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Self-Reported Skills ({profile.selfReportedSkills.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Declared capabilities with stated proficiency, experience duration, and project context.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(!isAddingSkill)}
                      className="inline-flex items-center gap-1 self-start rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-900 transition"
                    >
                      <span>{isAddingSkill ? "Cancel" : "+ Add Skill with Details"}</span>
                    </button>
                  </div>

                  {/* Add Skill Form */}
                  {isAddingSkill && (
                    <div className="rounded-lg border border-teal-300 bg-white p-4 shadow-xs space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h5 className="text-xs font-bold text-slate-900">
                          Add New Self-Reported Skill
                        </h5>
                        <span className="text-[10px] text-teal-800 font-medium">STU-02 Self-Declaration</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Skill Name *
                          </label>
                          <input
                            type="text"
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                            placeholder="e.g. Next.js, Docker, Python"
                            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Proficiency Level *
                          </label>
                          <select
                            value={proficiencyLevel}
                            onChange={(e) =>
                              setProficiencyLevel(
                                e.target.value as "beginner" | "intermediate" | "advanced"
                              )
                            }
                            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                          >
                            <option value="beginner">Beginner (Foundations / Coursework)</option>
                            <option value="intermediate">Intermediate (Hands-on Projects)</option>
                            <option value="advanced">Advanced (Extensive / Production-ready)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Experience Duration
                          </label>
                          <select
                            value={yearsOfExperience}
                            onChange={(e) => setYearsOfExperience(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                          >
                            <option value="< 6 months">&lt; 6 months</option>
                            <option value="6-12 months">6–12 months</option>
                            <option value="1-2 years">1–2 years</option>
                            <option value="2-3 years">2–3 years</option>
                            <option value="3+ years">3+ years</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Context / How You Applied It
                          </label>
                          <textarea
                            rows={2}
                            value={contextOrProject}
                            onChange={(e) => setContextOrProject(e.target.value)}
                            placeholder="e.g. Built an offline caching layer using IndexedDB in a university capstone project..."
                            className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setIsAddingSkill(false)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddDetailedSkill}
                          className="rounded-md bg-teal-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 transition"
                        >
                          Save Skill to Profile
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cards for each Self-Reported Skill */}
                  <div className="grid gap-3 sm:grid-cols-2">
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
                          className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                                <span
                                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${badgeColor}`}
                                >
                                  {skill.proficiencyLevel}
                                </span>
                              </div>
                              {skill.yearsOfExperience && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  Experience: {skill.yearsOfExperience}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill.id)}
                              className="text-slate-400 hover:text-rose-600 transition p-1 text-sm leading-none"
                              title="Remove skill"
                            >
                              ×
                            </button>
                          </div>

                          {skill.contextOrProject ? (
                            <p className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                              {skill.contextOrProject}
                            </p>
                          ) : (
                            <p className="text-[10px] italic text-slate-400">
                              No project context provided yet.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Availability & Work Preferences */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    3. Availability &amp; Preferred Focus
                  </h3>
                  <p className="text-xs text-slate-500">
                    Indicate your capacity for real organization project milestones.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="weeklyHours" className="block text-xs font-semibold text-slate-700">
                      Weekly Commitment: <strong className="text-teal-800">{profile.weeklyHoursAvailable} hours/week</strong>
                    </label>
                    <input
                      id="weeklyHours"
                      type="range"
                      min={5}
                      max={40}
                      step={5}
                      value={profile.weeklyHoursAvailable}
                      onChange={(e) =>
                        setProfile({ ...profile, weeklyHoursAvailable: Number(e.target.value) })
                      }
                      className="mt-2 w-full accent-teal-800 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>5 hrs (Part-time)</span>
                      <span>15-20 hrs (Recommended)</span>
                      <span>40 hrs (Full-time)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Preferred Project Domains
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Frontend Development",
                        "Fullstack Web",
                        "UI/UX Architecture",
                        "Mobile Web",
                        "Distributed Systems",
                        "Backend APIs",
                      ].map((domain) => {
                        const isSelected = profile.preferredDomains.includes(domain);
                        return (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => {
                              setProfile({
                                ...profile,
                                preferredDomains: isSelected
                                ? profile.preferredDomains.filter((d) => d !== domain)
                                : [...profile.preferredDomains, domain],
                              });
                            }}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "bg-teal-800 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {domain} {isSelected && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Portfolio & Online Presence */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      4. Portfolio &amp; External Evidence Links
                    </h3>
                    <p className="text-xs text-slate-500">
                      Private by default. Disclosed to partner organizations only when you apply.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Private by Default
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="githubUrl" className="block text-xs font-semibold text-slate-700">
                      GitHub Profile URL
                    </label>
                    <input
                      id="githubUrl"
                      type="url"
                      value={profile.githubUrl}
                      onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                      placeholder="https://github.com/..."
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="portfolioUrl" className="block text-xs font-semibold text-slate-700">
                      Personal Portfolio / Website
                    </label>
                    <input
                      id="portfolioUrl"
                      type="url"
                      value={profile.portfolioUrl}
                      onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                      placeholder="https://yoursite.dev"
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                    />
                  </div>

                  <div>
                    <label htmlFor="linkedinUrl" className="block text-xs font-semibold text-slate-700">
                      LinkedIn URL
                    </label>
                    <input
                      id="linkedinUrl"
                      type="url"
                      value={profile.linkedinUrl}
                      onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-teal-800 focus:ring-1 focus:ring-teal-800"
                    />
                  </div>
                </div>
              </div>

              {/* Save Profile Button with Loading Indicator */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode("view")}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                >
                  ← Cancel &amp; Back to Profile View
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-teal-800 disabled:opacity-70 transition"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Saving profile changes...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Profile Photo Cropper Modal */}
      <ProfilePhotoCropper
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onCropComplete={handlePhotoCropComplete}
        currentAvatarUrl={profile.avatarUrl}
      />

      {/* Cover Photo Modal */}
      <CoverPhotoModal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        onApplyCover={handleCoverApply}
        currentCoverUrl={profile.coverUrl}
      />
    </div>
  );
}
