import test from "node:test";
import assert from "node:assert/strict";
import "./register-typescript.mjs";
const { syncProjectToBackend, mapProjectReadToDemo } = await import("../lib/organization-api-sync.ts");
import { createDemoState } from "../data/portal-fixtures.ts";

function fixture(overrides = {}) {
  const brief = createDemoState().projects[0];
  const calls = [];
  let project = { id: "backend-project-id", organization_id: "org", title: brief.title, description: brief.problem, capacity: brief.seats, row_version: 1, status: "draft", scope: {}, data_origin: "synthetic" };
  const ok = data => ({ data, error: null, status: 200 });
  const api = {
    getMe: async () => ok({ id: "owner" }),
    getMyOrganizations: async () => ok([{ id: "org", row_version: 7, verification_status: "verified" }]),
    createProject: async (org, body, version) => { calls.push(["create", org, body, version]); project = { ...project, scope: { scope_in: body.scope_in, scope_out: body.scope_out, estimated_minutes: body.estimated_minutes, start_on: body.start_on, due_on: body.due_on, milestones: body.milestones } }; return ok(project); },
    updateProject: async (id, body, version) => { calls.push(["update", id, body, version]); project = { ...project, row_version: version + 1 }; return ok(project); },
    createTermsVersion: async (id, body, version) => { calls.push(["terms", id, body, version]); project = { ...project, row_version: version + 1 }; return ok({ id: "terms-id", project_row_version: project.row_version }); },
    submitProjectReview: async (id, termsId, version) => { calls.push(["submit", id, termsId, version]); project = { ...project, status: "pending_review", row_version: version + 1 }; return ok(project); },
    getProject: async id => { calls.push(["get", id]); return ok({ ...project }); },
    ...overrides,
  };
  return { api, brief, calls };
}
test("save retrieves the exact backend ID, and editing does not create another project", async () => {
  const { api, brief, calls } = fixture();
  assert.deepEqual(await syncProjectToBackend(api, "org", brief, false), { projectId: "backend-project-id" });
  assert.equal(calls[0][3], 7, "create uses organization version");
  assert.deepEqual(calls.at(-1), ["get", "backend-project-id"]);
  await syncProjectToBackend(api, "org", brief, false, "backend-project-id");
  assert.equal(calls.filter(c => c[0] === "create").length, 1);
  assert.equal(calls.filter(c => c[0] === "update").length, 1);
});
test("moderation uses decimal-string fee and the post-terms project version", async () => {
  const { api, brief, calls } = fixture();
  assert.deepEqual(await syncProjectToBackend(api, "org", brief, true), { projectId: "backend-project-id" });
  const terms = calls.find(c => c[0] === "terms");
  assert.equal(terms[2].fee_amount, "1200.00");
  assert.equal(terms[3], 1);
  assert.deepEqual(calls.find(c => c[0] === "submit"), ["submit", "backend-project-id", "terms-id", 2]);
});
test("terms and submission failures never produce a success result, retaining the saved ID", async () => {
  for (const method of ["createTermsVersion", "submitProjectReview"]) {
    const { api, brief, calls } = fixture({ [method]: async () => ({ data: null, error: "Rejected by API", status: 422 }) });
    const result = await syncProjectToBackend(api, "org", brief, true);
    assert.equal(result.projectId, "backend-project-id");
    assert.match(result.error, /Rejected by API/);
    if (method === "createTermsVersion") assert.ok(!calls.some(c => c[0] === "submit"));
  }
});
test("unverified organizations save drafts but cannot submit; auth failures never create", async () => {
  const unverified = fixture({ getMyOrganizations: async () => ({ data: [{ id: "org", row_version: 1, verification_status: "draft" }] }) });
  const result = await syncProjectToBackend(unverified.api, "org", unverified.brief, true);
  assert.equal(result.projectId, "backend-project-id");
  assert.match(result.error, /independent Admin approval/);
  assert.ok(!unverified.calls.some(c => c[0] === "terms"));
  const unauthorized = fixture({ getMe: async () => ({ data: null, error: "Unauthorized", status: 401 }) });
  assert.match((await syncProjectToBackend(unauthorized.api, "org", unauthorized.brief, false)).error, /Unauthorized/);
  assert.equal(unauthorized.calls.length, 0);
});
test("project adapter reads canonical scope without inventing fees, dates, or milestones", async () => {
  const { api, brief } = fixture();
  await syncProjectToBackend(api, "org", brief, false);
  const mapped = mapProjectReadToDemo((await api.getProject("backend-project-id")).data);
  assert.equal(mapped.deliverables, brief.deliverables);
  assert.equal(mapped.start, brief.start);
  assert.equal(mapped.due, brief.due);
  assert.equal(mapped.fee, "");
  assert.equal(mapped.milestones.length, 1);
  assert.equal(mapped.milestones[0].done, false);
});


test("invalid project fields are caught before creating a draft, with errors for the wizard", async () => {
  for (const invalid of [{problem:"Short"},{exclusions:"None"},{milestonePlan:"m".repeat(181)},{criteria:"OK"},{criteria:Array(21).fill("Valid criterion").join("\n")}]) {
    const {api,brief,calls} = fixture();
    const result = await syncProjectToBackend(api,"org",{...brief,...invalid},false);
    assert.equal(result.projectId, "");
    assert.ok(result.fieldErrors[Object.keys(invalid)[0]]);
    assert.equal(calls.length,0);
  }
});

test("invalid terms stop submission before creating a project", async () => {
  const {api,brief,calls} = fixture();
  const result = await syncProjectToBackend(api,"org",{...brief,paymentTerms:"Later",fee:"1234567890123.00"},true);
  assert.ok(result.fieldErrors.paymentTerms);
  assert.ok(result.fieldErrors.fee);
  assert.equal(calls.length,0);
});

test("wizard-generated project and terms payloads validate against the actual Python DTOs", async t => {
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { spawnSync } = await import("node:child_process");
  const root = fileURLToPath(new URL("../../../../../",import.meta.url));
  const python = fileURLToPath(new URL(process.platform === "win32" ? "../../../../api/.venv/Scripts/python.exe" : "../../../../api/.venv/bin/python",import.meta.url));
  if (!existsSync(python)) { t.skip("Backend virtual environment is unavailable"); return; }
  const {api,brief,calls} = fixture({getMe:async () => ({data:{id:"00000000-0000-4000-8000-000000000001"},error:null,status:200})});
  const result = await syncProjectToBackend(api,"org",brief,true);
  assert.equal(result.error,undefined);
  const payloads = {project:calls.find(c => c[0] === "create")[2],terms:calls.find(c => c[0] === "terms")[2]};
  const validation = spawnSync(python,["-B","-c","import sys,json; sys.path.insert(0,'apps/api'); from app.projects.schemas import ProjectCreate,TermsCreate; data=json.load(sys.stdin); ProjectCreate.model_validate(data['project']); TermsCreate.model_validate(data['terms']); print('DTOs valid')"],{cwd:root,input:JSON.stringify(payloads),encoding:"utf8"});
  assert.equal(validation.status,0,validation.stderr);
  assert.match(validation.stdout,/DTOs valid/);
});

test("loadOrganizationRecords loads mentor invitations, accepted milestones, YYYY-MM-DD dates, and activity events", async () => {
  const { loadOrganizationRecords } = await import("../lib/live-records.ts");
  const { formatDashboardDate } = await import("../lib/dashboard-selectors.ts");
  const ok = data => ({ data, error: null, status: 200 });
  const projects = [{
    id: "proj-1",
    organization_id: "org-1",
    title: "Health Tracker",
    description: "Build an offline health tracker for community clinics.",
    capacity: 2,
    status: "in_progress",
    created_at: "2026-11-01T10:00:00Z",
    row_version: 3,
    scope: {
      scope_in: "Offline form and sync",
      scope_out: "SMS gateway",
      estimated_minutes: 600,
      start_on: "2026-11-02",
      due_on: "2026-12-01",
      milestones: [{ title: "Milestone 1", acceptance_criteria: ["Criterion A"], due_on: "2026-12-01" }],
    },
    data_origin: "synthetic",
  }];
  const api = {
    getProjectApplications: async () => ok([{
      id: "app-1",
      project_id: "proj-1",
      student_user_id: "student-12345678",
      declared_skills: ["React", "TypeScript"],
      motivation: "Excited to contribute to rural health tooling.",
      links: [{ label: "Repo", url: "https://example.com/repo" }],
      weekly_minutes_available: 600,
      status: "submitted",
      created_at: "2026-11-02T09:00:00Z",
      row_version: 1,
    }]),
    getApplication: async () => ok({ observed_terms: { version_no: 1 } }),
    getProjectParticipations: async () => ok([{
      id: "part-1",
      project_id: "proj-1",
      student_user_id: "student-87654321",
      status: "active",
      row_version: 1,
    }]),
    getParticipationAssignments: async () => ok([{
      id: "assign-1",
      participation_id: "part-1",
      project_id: "proj-1",
      mentor_user_id: "mentor-11223344",
      status: "proposed",
      context: "Weekly code review",
      expires_at: "2026-11-15T23:59:59Z",
      created_at: "2026-11-02T11:00:00Z",
      row_version: 1,
    }]),
    getParticipation: async () => ok({
      id: "part-1",
      agreed_terms: {
        snapshot: {
          title: "Health Tracker",
          description: "Desc",
          capacity: 2,
          scope: {
            scope_in: "In",
            scope_out: "Out",
            estimated_minutes: 600,
            start_on: "2026-11-02",
            due_on: "2026-12-01",
            milestones: [{ title: "Milestone 1", acceptance_criteria: ["Criterion A"], due_on: "2026-12-01" }],
          },
          terms: {
            compensation_type: "paid_fixed",
            currency: "GHS",
            fee_amount: "1200.00",
            payment_terms: "Upon completion",
            ip_ownership_terms: "MIT",
            confidentiality_terms: "Synthetic only",
            mentor_plan: "Weekly check-in",
          },
        },
      },
    }),
    getSubmissions: async () => ok([{
      id: "sub-1",
      participation_id: "part-1",
      milestone_index: 0,
      revision_no: 1,
      status: "submitted",
      summary: "Delivered offline sync",
      contribution_statement: "Built IndexedDB layer",
      submitted_at: "2026-11-03T14:30:00Z",
      created_at: "2026-11-03T14:00:00Z",
      row_version: 2,
      artifacts: [{ label: "PR", url: "https://example.com/pr/1" }],
    }]),
    getOrganizationReviews: async () => ok([{
      id: "org-rev-1",
      decision: "accepted",
      explanation: "Meets all acceptance criteria.",
      criteria_results: [{ criterion_text: "Criterion A", met: true, explanation: "Verified" }],
      reviewer_user_id: "reviewer-1",
      created_at: "2026-11-03T16:00:00Z",
    }]),
    getMentorReviews: async () => ok([{
      id: "men-rev-1",
      decision: "reviewed",
      manager_summary: "Strong offline architecture.",
    }]),
  };

  const records = await loadOrganizationRecords(api, projects);
  assert.equal(records.applications.length, 1);
  assert.equal(records.invitations.length, 1);
  assert.equal(records.invitations[0].status, "Pending");
  assert.equal(records.mentors.length, 1);
  assert.deepEqual(records.acceptedMilestones["proj-1"], [0]);
  assert.equal(records.submissions[0].versions[0].date, "2026-11-03");
  assert.equal(formatDashboardDate(records.submissions[0].versions[0].date), "3 Nov");
  assert.equal(formatDashboardDate("2026-11-03T14:30:00Z"), "3 Nov");
  assert.equal(formatDashboardDate(""), "Not scheduled");
  assert.ok(records.events.length >= 4);
});
