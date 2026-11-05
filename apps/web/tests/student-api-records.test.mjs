import test from "node:test";
import assert from "node:assert/strict";
import "../features/organization/tests/register-typescript.mjs";
const {
  saveEvidence,
  loadWorkspace,
  loadOpportunities,
  loadStudentPassportAndDecisions,
  loadStudentProfile,
  saveStudentProfile,
  buildStudentActionItems,
} = await import("../features/student/lib/api-records.ts");
const ok = data => ({ data, error: null, status: 200 });
const failed = message => ({ data: null, error: message, status: 503 });

test("evidence retries reuse the saved draft and only succeed after a server read confirms submission", async () => {
  let creates = 0, attaches = 0, attempt = 0, remembered;
  let record = { id: "synthetic-submission", participation_id: "participation", milestone_index: 0, status: "draft", row_version: 1, artifacts: [] };
  const api = {
    getSubmissions: async () => ok([]), getParticipation: async () => ok({row_version: 3}),
    createSubmission: async () => { creates++; return ok({...record}); },
    updateSubmission: async () => ok({...record}),
    attachArtifact: async (_id,label,url) => { attaches++; record.artifacts.push({label,url}); return ok({label,url}); },
    getSubmission: async () => ok({...record}),
    submitDeliverable: async () => { if (++attempt === 1) return failed("Temporary backend failure"); record.status = "submitted"; return ok({...record}); },
  };
  const args = [api,"participation",0,"Synthetic evidence summary","Synthetic contribution",[{label:"Evidence",url:"https://example.com/synthetic"}]];
  await assert.rejects(saveEvidence(...args,undefined,id => { remembered = id; }), /Temporary backend failure/);
  assert.equal(remembered,"synthetic-submission");
  const saved = await saveEvidence(...args,remembered);
  assert.equal(saved.status,"submitted");
  assert.equal(creates,1);
  assert.equal(attaches,1);
  await assert.rejects(saveEvidence(api,"other-participation",0,"summary","contribution",[],remembered), /workspace milestone/);
  await assert.rejects(saveEvidence(api,"participation",1,"summary","contribution",[],remembered), /workspace milestone/);
});

test("API errors never become successful evidence submissions", async () => {
  await assert.rejects(saveEvidence({getSubmissions:async () => failed("Unauthorized")},"p",0,"s","c",[]), /Unauthorized/);
});

test("workspace keeps mentor assessment and organization acceptance separate", async () => {
  const part = { id:"p", project_id:"project", status:"active", terms_acceptance:{terms_hash:"synthetic-hash",accepted_at:"2026-11-01"}, agreed_terms:{id:"terms",snapshot:{title:"Synthetic project",scope:{due_on:"2026-11-09",start_on:"2026-11-01",scope_in:"Synthetic scope",milestones:[{title:"Milestone",due_on:"2026-11-09",acceptance_criteria:["Working evidence"]}]},terms:{currency:"GHS",fee_amount:"100.00",payment_terms:"Synthetic",ip_ownership_terms:"Synthetic",confidentiality_terms:"Synthetic"}}}};
  let mentor = [], organization = [];
  const api = {getParticipationAssignments:async () => ok([]),getParticipation:async () => ok(part),getSubmissions:async () => ok([{id:"sub",milestone_index:0,revision_no:1,status:"submitted",artifacts:[]}]), getMentorReviews:async () => ok(mentor), getOrganizationReviews:async () => ok(organization)};
  assert.equal((await loadWorkspace(api,"p")).progressPercent,0);
  mentor = [{id:"mr",decision:"reviewed",author_user_id:"synthetic-mentor"}];
  assert.equal((await loadWorkspace(api,"p")).progressPercent,0);
  organization = [{id:"or",decision:"accepted",reviewer_user_id:"synthetic-reviewer"}];
  const workspace = await loadWorkspace(api,"p");
  assert.equal(workspace.progressPercent,100);
  assert.equal(workspace.status,"active");
  assert.equal(workspace.submissions[0].mentorReview.status,"reviewed");
  assert.equal(workspace.submissions[0].organizationDecision.status,"accepted");
  mentor.unshift({id:"newer-review",decision:"unable_to_assess",author_user_id:"synthetic-mentor"});
  assert.equal((await loadWorkspace(api,"p")).progressPercent,0);
  assert.equal((await loadWorkspace(api,"p")).submissions[0].mentorReview.status,"unable_to_assess");

});


test("discovery uses the published project's exact terms and does not invent demo projects", async () => {
  const project = {id:"new-org-project",organization_id:"org-id",published_terms_version_id:"approved-terms",title:"Synthetic new project"};
  const terms = {id:"approved-terms",snapshot:{scope:{start_on:"2026-11-02",due_on:"2026-11-09"},terms:{ip_ownership_terms:"Agreed IP",confidentiality_terms:"Private"}}};
  const calls = [];
  const api = {getMe:async () => ok({id:"student"}),getPublishedProjects:async () => ok([project]),getTermsVersion:async (...args) => {calls.push(args);return ok(terms);}};
  const result = await loadOpportunities(api);
  assert.deepEqual(calls,[["new-org-project","approved-terms"]]);
  assert.equal(result.opportunities[project.id].termsVersion,terms.id);
  assert.equal(result.opportunities[project.id].title,project.title);
  api.getPublishedProjects = async () => ok([]);
  assert.deepEqual((await loadOpportunities(api)).opportunities,{});
  api.getPublishedProjects = async () => failed("Discovery unavailable");
  await assert.rejects(loadOpportunities(api),/Discovery unavailable/);
});


test("retrying edited evidence removes discarded draft links before submitting", async () => {
  const calls = [];
  const record = {id:"draft",participation_id:"p",milestone_index:0,status:"draft",row_version:2,
    artifacts:[{id:"old",kind:"external_url",label:"Old link",url:"https://example.com/old"}]};
  const api = {
    getSubmissions:async () => ok([record]),getParticipation:async () => ok({row_version:2}),
    updateSubmission:async () => ok(record), getSubmission:async () => ok(record),
    deleteArtifact:async (_sub,id) => {calls.push("remove");record.artifacts=record.artifacts.filter(a=>a.id!==id);return ok({deleted:true});},
    attachArtifact:async (_sub,label,url) => {calls.push("add");record.artifacts.push({id:"new",kind:"external_url",label,url});return ok({id:"new"});},
    submitDeliverable:async () => {calls.push("submit");record.status="submitted";return ok(record);},
  };
  const saved = await saveEvidence(api,"p",0,"Synthetic corrected evidence","Synthetic personal contribution",[{label:"Correct link",url:"https://example.com/new"}]);
  assert.deepEqual(calls,["remove","add","submit"]);
  assert.deepEqual(saved.artifacts.map(a=>a.url),["https://example.com/new"]);
});

test("passport loader separates mentor-assessed observations, self-reported skills, and 4 evidence tiers", async () => {
  const part = {
    id: "part-1",
    project_id: "proj-1",
    status: "completed",
    created_at: "2026-11-01T10:00:00Z",
    terms_acceptance: { terms_hash: "hash-abc1234567890", accepted_at: "2026-11-01T10:00:00Z" },
    agreed_terms: {
      id: "terms-1",
      snapshot: {
        title: "Offline Clinic Sync",
        scope: {
          start_on: "2026-11-01",
          due_on: "2026-11-15",
          scope_in: "Offline sync queue",
          milestones: [{ title: "Milestone 1", due_on: "2026-11-10", acceptance_criteria: ["Syncs offline"] }],
        },
        terms: {
          currency: "GHS",
          fee_amount: "450.00",
          payment_terms: "Upon completion",
          ip_ownership_terms: "Assigned on payment",
          confidentiality_terms: "Private",
        },
      },
    },
  };
  const api = {
    getMe: async () => ok({ id: "stu-1", display_name: "Ama Mensah", email: "ama@example.edu", account_status: "active" }),
    getMyApplications: async () => ok([{ id: "app-1", declared_skills: ["TypeScript", "SQLite"] }]),
    getMyParticipations: async () => ok([{ id: "part-1", status: "completed", created_at: "2026-11-01T10:00:00Z" }]),
    getParticipation: async () => ok(part),
    getSubmissions: async () => ok([{
      id: "sub-1",
      milestone_index: 0,
      revision_no: 1,
      status: "submitted",
      contribution_statement: "Implemented IndexedDB queue.",
      artifacts: [{ label: "PR #12", url: "https://example.com/pr/12" }],
    }]),
    getMentorReviews: async () => ok([{
      id: "mr-1",
      author_user_id: "mentor-uuid-1234",
      decision: "reviewed",
      observations: [{ criterion: "Offline Resilience", rating: "strong", evidence: "Verified queue retry" }],
      participant_feedback: "Clean implementation.",
      manager_summary: "Ready for acceptance.",
      created_at: "2026-11-02T12:00:00Z",
    }]),
    getOrganizationReviews: async () => ok([{
      id: "or-1",
      reviewer_user_id: "reviewer-uuid-5678",
      decision: "accepted",
      explanation: "Meets all milestone acceptance criteria.",
      created_at: "2026-11-02T14:00:00Z",
    }]),
  };
  const { passport, recentDecisions, passportSummary } = await loadStudentPassportAndDecisions(api);
  assert.equal(passport.student.displayName, "Ama Mensah");
  assert.equal(passport.assessedSkills.length, 1);
  assert.equal(passport.assessedSkills[0].name, "Offline Resilience");
  assert.equal(passport.selfReportedSkills.length, 2);
  assert.equal(passport.projectAssertions.length, 1);
  assert.deepEqual(passport.projectAssertions[0].evidenceTiers, {
    identityChecked: true,
    workSubmitted: true,
    mentorReviewed: true,
    deliverableAccepted: true,
  });
  assert.equal(recentDecisions.length, 2);
  assert.deepEqual(passportSummary, {
    verifiedClaimsCount: 1,
    completedProjectsCount: 1,
    mentorObservationsCount: 1,
  });
});

test("student profile loader and saver persist editable fields and calculate completion", async () => {
  let storedDto = {
    user_id: "stu-1",
    identity_issuer: "https://clerk.example.test",
    identity_subject: "user_stu_1",
    display_name: "Stella Appiok",
    email: "stella@ashesi.edu.gh",
    headline: "CS Senior",
    bio: "Offline-first web builder",
    institution: "Ashesi University",
    program_of_study: "B.Sc. Computer Engineering",
    graduation_year: 2026,
    weekly_hours_available: 15,
    preferred_domains: ["Fullstack Web"],
    portfolio_url: "https://stella.dev",
    github_url: "https://github.com/stella",
    linkedin_url: null,
    self_reported_skills: [
      { id: "sk-1", name: "TypeScript", category: "2 years", proficiency: "advanced", notes: "Daily use" },
    ],
    top_projects: [
      { id: "tp-1", title: "Clinic Sync", summary: "Offline sync queue", role: "Lead", link_url: "https://github.com/stella/clinic" },
    ],
    updated_at: "2026-11-04T00:00:00Z",
    row_version: 2,
  };
  const api = {
    getStudentProfile: async () => ok(storedDto),
    upsertStudentProfile: async (payload) => {
      storedDto = { ...storedDto, ...payload, row_version: storedDto.row_version + 1 };
      return ok(storedDto);
    },
  };
  const loaded = await loadStudentProfile(api);
  assert.equal(loaded.displayName, "Stella Appiok");
  assert.equal(loaded.institution, "Ashesi University");
  assert.equal(loaded.profileCompletionPercentage, 100);
  assert.equal(loaded.isSyntheticDemo, false);

  const updated = await saveStudentProfile(api, {
    ...loaded,
    headline: "Distributed Systems Engineer",
    weeklyHoursAvailable: 20,
  });
  assert.equal(updated.headline, "Distributed Systems Engineer");
  assert.equal(updated.weeklyHoursAvailable, 20);
  assert.equal(storedDto.row_version, 3);
});

test("buildStudentActionItems surfaces pending offers and active milestone submissions", () => {
  const actions = buildStudentActionItems(
    [
      {
        id: "app-offer-1",
        projectId: "proj-1",
        projectTitle: "Solar Telemetry",
        organizationName: "Verified Host Organization",
        organizationVerified: true,
        status: "offered",
        offerStatus: "offered",
        appliedAt: "2026-11-01",
        offerDeadline: "2026-11-10T23:59:59Z",
        motivationStatement: "Fit",
        declaredSkills: [],
        externalLinks: [],
        observedTermsSnapshot: {
          termsVersionId: "t1",
          weeklyHours: 10,
          durationWeeks: 4,
          ipConditions: "MIT",
          confidentialitySummary: "Public",
          snapshotDate: "2026-11-01",
        },
        timeline: [],
        isSyntheticDemo: false,
      },
    ],
    [
      {
        participationId: "part-active-1",
        projectId: "proj-2",
        projectTitle: "Clinic Sync",
        organizationName: "Verified Host Organization",
        organizationVerified: true,
        mentorName: "Mentor 1234",
        mentorStatus: "accepted",
        status: "active",
        currentMilestone: "Milestone 1: Sync Queue",
        nextMilestoneDue: "2026-11-15",
        progressPercent: 0,
        completedMilestonesCount: 0,
        totalMilestonesCount: 2,
        weeklyHours: 12,
        compensationSummary: "GHS 500",
      },
    ]
  );
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, "offer_pending");
  assert.equal(actions[1].type, "submission_due");
});
