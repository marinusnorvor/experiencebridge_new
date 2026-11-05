import test from "node:test";
import assert from "node:assert/strict";
import "../features/organization/tests/register-typescript.mjs";

const { createPortalApi } = await import("../lib/api/portal-api.ts");

test("admin API client forwards auth and queries admin stats", async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl;
  });

  let capturedUrl = "";
  let capturedAuth = "";
  globalThis.fetch = async (req) => {
    capturedUrl = req.url;
    capturedAuth = req.headers.get("Authorization");
    return Response.json({
      organizations: { total: 10, verified: 6, submitted: 2 },
      projects: { total: 15, open: 8, pending_review: 3 },
      mentors: { total: 5, eligible: 4, pending: 1 },
      applications: { total: 20, submitted: 5 },
      participations: { total: 7, active: 4, completed: 3 },
      users: { total: 25, student: 18, platform_admin: 2 },
      total_audit_events: 42,
    });
  };

  const api = createPortalApi("admin-synthetic-jwt-token");
  const res = await api.getAdminStats();

  assert.equal(capturedUrl, "http://127.0.0.1:8000/api/v1/admin/stats");
  assert.equal(capturedAuth, "Bearer admin-synthetic-jwt-token");
  assert.equal(res.status, 200);
  assert.equal(res.data.organizations.total, 10);
  assert.equal(res.data.projects.total, 15);
  assert.equal(res.data.total_audit_events, 42);
});

test("admin audit logs query supports limit, offset, and event_type filters", async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl;
  });

  let capturedUrl = "";
  globalThis.fetch = async (req) => {
    capturedUrl = req.url;
    return Response.json({
      items: [
        {
          id: "event-1",
          actor_user_id: "user-1",
          actor_email: "admin@example.com",
          actor_name: "Admin",
          event_type: "organization.verification_decided",
          entity_id: "org-1",
          request_id: "req-1",
          details: { decision: "verify" },
          created_at: "2026-11-04T00:00:00Z",
          row_version: 1,
        },
      ],
      total: 1,
      limit: 10,
      offset: 0,
    });
  };

  const api = createPortalApi("admin-synthetic-jwt-token");
  const res = await api.getAdminAuditLogs({ limit: 10, offset: 0, event_type: "organization.verification_decided" });

  assert.match(capturedUrl, /\/api\/v1\/admin\/audit-logs/);
  assert.match(capturedUrl, /limit=10/);
  assert.match(capturedUrl, /event_type=organization\.verification_decided/);
  assert.equal(res.data.items.length, 1);
  assert.equal(res.data.items[0].event_type, "organization.verification_decided");
});

test("admin directory methods query organizations, projects, and users oversight", async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl;
  });

  const urls = [];
  globalThis.fetch = async (req) => {
    urls.push(req.url);
    if (req.url.includes("/admin/organizations")) {
      return Response.json({ items: [{ id: "org-1", display_name: "Tech Org", verification_status: "verified" }] });
    }
    if (req.url.includes("/admin/projects")) {
      return Response.json({ items: [{ project: { id: "proj-1", title: "Web System" } }] });
    }
    if (req.url.includes("/admin/oversight/users")) {
      return Response.json({ items: [{ id: "user-1", email: "student@test.com", roles: ["student"] }] });
    }
    return Response.json({ items: [] });
  };

  const api = createPortalApi("admin-jwt");
  const orgs = await api.getAllOrganizations("verified");
  const projects = await api.getAllProjects("open");
  const users = await api.getAdminOversightUsers("student");

  assert.ok(urls.some((u) => u.includes("/admin/organizations") && u.includes("status=verified")));
  assert.ok(urls.some((u) => u.includes("/admin/projects") && u.includes("status=open")));
  assert.ok(urls.some((u) => u.includes("/admin/oversight/users") && u.includes("role=student")));

  assert.equal(orgs.data.length, 1);
  assert.equal(projects.data.length, 1);
  assert.equal(users.data.length, 1);
});

test("admin moderation decisions include version precondition and explanation", async (t) => {
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl;
  });

  let capturedOrgDecision = null;
  let capturedProjectDecision = null;

  globalThis.fetch = async (req) => {
    if (req.url.includes("/admin/organizations/")) {
      capturedOrgDecision = {
        headers: req.headers,
        body: await req.json(),
      };
      return Response.json({ id: "org-1", verification_status: "verified", row_version: 3 });
    }
    if (req.url.includes("/admin/projects/")) {
      capturedProjectDecision = {
        headers: req.headers,
        body: await req.json(),
      };
      return Response.json({ id: "proj-1", status: "open", row_version: 4 });
    }
    return Response.json({});
  };

  const api = createPortalApi("admin-token");
  const orgRes = await api.decideOrganization("org-1", 2, "verify", "Organization meets all synthetic criteria.");
  assert.equal(orgRes.status, 200);
  assert.equal(capturedOrgDecision.headers.get("If-Match"), '"2"');
  assert.equal(capturedOrgDecision.body.decision, "verify");
  assert.equal(capturedOrgDecision.body.explanation, "Organization meets all synthetic criteria.");

  const projRes = await api.decideProject(
    "proj-1",
    3,
    "approve",
    "Scope and compensation verified.",
    "terms-1",
    "hash123"
  );
  assert.equal(projRes.status, 200);
  assert.equal(capturedProjectDecision.headers.get("If-Match"), '"3"');
  assert.equal(capturedProjectDecision.body.decision, "approve");
  assert.equal(capturedProjectDecision.body.terms_version_id, "terms-1");
  assert.equal(capturedProjectDecision.body.snapshot_hash, "hash123");
});
