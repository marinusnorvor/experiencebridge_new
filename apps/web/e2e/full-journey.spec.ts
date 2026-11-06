import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

/**
 * The "everything works together" journey across four browser contexts (org, admin, student, mentor):
 * org signs up → creates org → submits verification → admin verifies → org creates and submits a project →
 * admin approves → student finds it and applies → org shortlists and offers → student accepts →
 * mentor signs up, is approved, assigned and accepts → org starts → student submits → mentor reviews (UI, rubric) →
 * org accepts → student marks ready → org finalises → student's Passport shows a verified entry.
 * Plus: non-admin is blocked from admin endpoints and pages.
 *
 * Synthetic test accounts only (example.com), created on the development database.
 */

const PASSWORD = "E2E-Password-2026!";
const stamp = Date.now().toString(36);
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

type Actor = { context: BrowserContext; page: Page; api: Api };

class Api {
  private csrf = "";
  constructor(private request: APIRequestContext, private origin: string) {}
  private async token() {
    const r = await this.request.get("/api/v1/auth/csrf", { headers: { Origin: this.origin } });
    this.csrf = (await r.json()).csrf_token;
    return this.csrf;
  }
  async login(email: string, password: string) {
    const r = await this.request.post("/api/v1/auth/login", { headers: { Origin: this.origin, "X-CSRF-Token": await this.token() }, data: { email, password } });
    expect(r.status(), `login ${email}`).toBe(200);
    await this.token();
  }
  async get(path: string) {
    const r = await this.request.get(`/api/v1${path}`, { headers: { Origin: this.origin } });
    expect(r.ok(), `GET ${path} → ${r.status()} ${await r.text()}`).toBeTruthy();
    return r.json();
  }
  async status(method: "GET" | "POST", path: string) {
    const r = method === "GET"
      ? await this.request.get(`/api/v1${path}`, { headers: { Origin: this.origin } })
      : await this.request.post(`/api/v1${path}`, { headers: { Origin: this.origin, "X-CSRF-Token": this.csrf || (await this.token()), "Idempotency-Key": randomUUID() }, data: {} });
    return r.status();
  }
  async post(path: string, body: object, rowVersion?: number) {
    if (!this.csrf) await this.token();
    const headers: Record<string, string> = { Origin: this.origin, "X-CSRF-Token": this.csrf, "Idempotency-Key": randomUUID() };
    if (rowVersion !== undefined) headers["If-Match"] = `"${rowVersion}"`;
    const r = await this.request.post(`/api/v1${path}`, { headers, data: body });
    expect([200, 201], `POST ${path} → ${r.status()} ${await r.text()}`).toContain(r.status());
    return r.json();
  }
}

async function actor(browser: Browser, baseURL: string): Promise<Actor> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  return { context, page, api: new Api(context.request, baseURL) };
}

/** Real UI: role choice → details → onboarding path chosen by the role. */
async function signUp(page: Page, role: "student" | "organization" | "mentor", name: string, email: string) {
  await page.goto(`/sign-up?as=${role}`);
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/onboarding/);
}

test("full cross-role journey ends in a verified Passport entry", async ({ browser, baseURL }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (super admin on the development database).");
  const base = baseURL!;
  const [org, admin, student, mentor] = await Promise.all([actor(browser, base), actor(browser, base), actor(browser, base), actor(browser, base)]);
  const emails = { org: `e2e.org.${stamp}@example.com`, student: `e2e.student.${stamp}@example.com`, mentor: `e2e.mentor.${stamp}@example.com` };
  const title = `E2E Clinic Reminder ${stamp}`;
  const criteria = ["Form validates required fields", "List is keyboard accessible"];

  await test.step("organisation signs up and onboards (UI)", async () => {
    await signUp(org.page, "organization", `E2E Org Owner ${stamp}`, emails.org);
    await org.page.getByLabel("Organisation name").fill(`E2E Test Organisation ${stamp}`);
    await org.page.getByLabel("What does your organisation do?").fill("End-to-end test organisation (synthetic test data).");
    await org.page.getByRole("button", { name: "Create organisation" }).click();
    await org.page.getByRole("button", { name: "Submit for verification" }).click();
    await expect(org.page.getByText("Sent for verification").first()).toBeVisible();
    await org.api.login(emails.org, PASSWORD);
  });

  await test.step("admin verifies the organisation", async () => {
    await admin.api.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const pending = (await admin.api.get("/admin/organizations/pending")).items as { id: string; display_name: string; row_version: number }[];
    const record = pending.find((o) => o.display_name === `E2E Test Organisation ${stamp}`);
    expect(record, "organisation is in the admin queue").toBeTruthy();
    const verified = await admin.api.post(`/admin/organizations/${record!.id}/decisions`, { decision: "verify", explanation: "E2E verification of a synthetic test organisation." }, record!.row_version);
    expect(verified.verification_status).toBe("verified");
  });

  let project: { id: string; row_version: number; status: string };
  let terms: { id: string; content_hash: string };
  await test.step("organisation creates and submits a project; admin approves", async () => {
    const me = await org.api.get("/me");
    const orgRecord = (await org.api.get("/me/organizations")).items[0];
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    project = await org.api.post(`/organizations/${orgRecord.id}/projects`, {
      title, description: "End-to-end test project: an accessible appointment reminder page.", capacity: 2, org_reviewer_user_id: me.id,
      scope_in: "Form, validation and list view.", scope_out: "Real SMS delivery.", estimated_minutes: 900, start_on: today, due_on: due,
      milestones: [{ title: "Working prototype", acceptance_criteria: criteria, due_on: due }],
    }, orgRecord.row_version);
    terms = await org.api.post(`/projects/${project.id}/terms-versions`, {
      compensation_type: "paid_fixed", currency: "GHS", fee_amount: "500.00", payment_terms: "Test terms; no funds handled.",
      ip_ownership_terms: "Student keeps portfolio rights.", confidentiality_terms: "Synthetic data only.", mentor_plan: "One mentor review per milestone.",
    }, (await org.api.get(`/projects/${project.id}`)).row_version);
    project = await org.api.post(`/projects/${project.id}/submit-review`, { terms_version_id: terms.id }, (await org.api.get(`/projects/${project.id}`)).row_version);
    expect(project.status).toBe("pending_review");
    project = await admin.api.post(`/admin/projects/${project.id}/decisions`, { decision: "approve", explanation: "E2E approval of a synthetic test project.", terms_version_id: terms.id, snapshot_hash: terms.content_hash }, project.row_version);
    expect(project.status).toBe("open");
  });

  let participation: { id: string; row_version: number };
  await test.step("student signs up, finds the project in the UI and applies", async () => {
    await signUp(student.page, "student", `E2E Student ${stamp}`, emails.student);
    await student.api.login(emails.student, PASSWORD);
    await student.page.goto("/student/applications");
    await expect(student.page.getByText(title).first()).toBeVisible({ timeout: 120_000 });
    const application = await student.api.post(`/projects/${project.id}/applications`, {
      seen_terms_version_id: terms.id, motivation: "I build accessible forms and want real project experience.", declared_skills: ["React", "Accessibility"],
      links: [], weekly_minutes_available: 600,
    }, (await student.api.get(`/projects/${project.id}`)).row_version);
    const shortlisted = await org.api.post(`/applications/${application.id}/shortlist`, {}, application.row_version);
    const offer = await org.api.post(`/applications/${application.id}/offer`, { terms_version_id: terms.id, expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }, shortlisted.row_version);
    participation = await student.api.post(`/offers/${offer.id}/accept`, { terms_version_id: terms.id, terms_hash: terms.content_hash, consent_statement_version: "supervisor-v1", explicitly_accepted: true }, offer.row_version);
  });

  await test.step("mentor signs up and onboards (UI); admin approves; org assigns; mentor accepts", async () => {
    await signUp(mentor.page, "mentor", `E2E Mentor ${stamp}`, emails.mentor);
    await mentor.page.getByLabel("About you").fill("Engineer with eight years of web experience (test account).");
    await mentor.page.getByRole("button", { name: "Software engineering" }).click();
    await mentor.page.getByRole("button", { name: "Continue" }).click();
    await mentor.page.getByLabel("When are you usually available?").fill("Weekday evenings");
    await mentor.page.getByRole("button", { name: "Send for approval" }).click();
    await expect(mentor.page.getByText("Thanks for offering to mentor")).toBeVisible();
    await mentor.api.login(emails.mentor, PASSWORD);
    const me = await mentor.api.get("/me");
    const profile = await mentor.api.get("/me/mentor-profile");
    await admin.api.post(`/admin/mentors/${me.id}/eligibility`, { decision: "approve", explanation: "E2E approval of a synthetic test mentor." }, profile.row_version);
    const assignment = await org.api.post(`/participations/${participation.id}/mentor-assignments`, { mentor_user_id: me.id, context: "Review the prototype milestone.", expires_at: new Date(Date.now() + 7 * 864e5).toISOString() }, participation.row_version);
    await mentor.api.post(`/mentor-assignments/${assignment.id}/accept`, { conflict_declared: false, confidentiality_acknowledged: true }, assignment.row_version);
    await org.api.post(`/projects/${project.id}/start`, {}, (await org.api.get(`/projects/${project.id}`)).row_version);
  });

  let submissionId = "";
  await test.step("student submits work", async () => {
    const part = await student.api.get(`/participations/${participation.id}`);
    const submission = await student.api.post(`/participations/${participation.id}/submissions`, { milestone_index: 0, summary: "Prototype with validated form and accessible list.", contribution_statement: "I built the form, validation and list." }, part.row_version);
    await student.api.post(`/submissions/${submission.id}/external-artifacts`, { kind: "external_url", label: "Prototype repository", url: "https://example.com/e2e-repo" });
    await student.api.post(`/submissions/${submission.id}/submit`, {}, (await student.api.get(`/submissions/${submission.id}`)).row_version);
    submissionId = submission.id;
  });

  await test.step("mentor reviews with the rubric (UI)", async () => {
    await mentor.page.goto(`/mentor/participations/${participation.id}`);
    const form = mentor.page.locator("#review");
    await expect(form.getByRole("button", { name: "Send review" })).toBeVisible({ timeout: 180_000 });
    await form.getByRole("radio", { name: "4" }).first().click();
    await form.getByLabel(`Note for ${criteria[0]}`).fill("Every required field shows a clear message.");
    await form.getByLabel("Feedback for the student").fill("Clear structure and good keyboard support. Add more edge-case tests next time.");
    await form.getByRole("button", { name: "Send review" }).click();
    await expect(mentor.page.getByText("Review sent")).toBeVisible();
    const reviews = (await mentor.api.get(`/submissions/${submissionId}/mentor-reviews`)).items;
    expect(reviews[0].observations[0].score).toBe(4);
  });

  await test.step("organisation accepts and finalises", async () => {
    await org.api.post(`/submissions/${submissionId}/organization-reviews`, { decision: "accepted", criteria_results: criteria.map((c) => ({ criterion_text: c, met: true, explanation: "Checked in review." })), explanation: "Deliverable accepted after review." }, (await org.api.get(`/submissions/${submissionId}`)).row_version);
    const ready = await student.api.post(`/participations/${participation.id}/mark-ready-for-review`, { requested_outcome: "completed", explanation: "Milestone delivered and accepted." }, (await student.api.get(`/participations/${participation.id}`)).row_version);
    const final = await org.api.post(`/participations/${participation.id}/finalize`, { outcome: "completed", explanation: "Milestone criteria met with mentor review." }, ready.row_version);
    expect(final.status).toBe("completed");
  });

  await test.step("student's Passport shows the verified entry (UI)", async () => {
    await student.page.goto("/student/passport");
    const entry = student.page.locator("article").filter({ hasText: title });
    await expect(entry).toBeVisible({ timeout: 180_000 });
    await expect(entry.getByText("Verified", { exact: true })).toBeVisible();
    await expect(entry.getByText("Accepted by organisation")).toBeVisible();
    await expect(student.page.getByText(criteria[0]).first()).toBeVisible();
  });

  await test.step("a non-admin is blocked from admin endpoints and pages", async () => {
    expect(await student.api.status("GET", "/admin/organizations/pending")).toBe(403);
    expect(await student.api.status("GET", "/admin/stats")).toBe(403);
    const response = await student.page.goto("/admin/dashboard");
    if (response?.status() === 404) return; // unlisted admin path enabled
    await expect(student.page.getByText(/isn.t available|not available/i)).toBeVisible({ timeout: 60_000 });
  });

  await Promise.all([org, admin, student, mentor].map((a) => a.context.close()));
});
