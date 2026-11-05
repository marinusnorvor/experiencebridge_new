import test from "node:test";
import assert from "node:assert/strict";
import "../features/organization/tests/register-typescript.mjs";
const { createPortalApi } = await import("../lib/api/portal-api.ts");

test("adapter uses same-origin cookies and preserves version/terms headers", async t => {
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => { globalThis.fetch = originalFetch; if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl; });
  const requests = [];
  globalThis.fetch = async request => {
    if (typeof request === "string") return Response.json({csrf_token:"synthetic"});
    requests.push({ url: request.url, method: request.method, headers: request.headers, body: request.method === "GET" ? null : await request.json() });
    return Response.json({ id: "fixture-id", row_version: 1 });
  };
  const api = createPortalApi("synthetic-test-token-not-a-Clerk-session");
  await api.getMe();
  await api.createProject("org", { title: "Fixture" }, 4);
  await api.createTermsVersion("project", { fee_amount: "1200.00" }, 8);
  await api.submitProjectReview("project", "terms", 9);
  await api.decideProject("project", 10, "approve", "Synthetic test approval.", "terms", "a".repeat(64));
  assert.equal(requests[0].url, "http://localhost/api/v1/me");
  for (const request of requests) assert.equal(request.headers.get("Authorization"), null);
  for (const request of requests.slice(1)) assert.equal(request.headers.get("X-CSRF-Token"), "synthetic");
  for (const [index, version] of [[1, 4], [2, 8], [3, 9], [4, 10]]) {
    assert.equal(requests[index].headers.get("If-Match"), `"${version}"`);
    assert.ok(requests[index].headers.get("Idempotency-Key").length >= 16);
    assert.equal(requests[index].method, "POST");
  }
  assert.deepEqual(requests[4].body, { decision: "approve", explanation: "Synthetic test approval.", terms_version_id: "terms", snapshot_hash: "a".repeat(64) });
});
test("API rejection remains an error and includes the backend explanation", async t => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => { globalThis.fetch = originalFetch; if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl; });
  globalThis.fetch = async request => typeof request === "string" ? Response.json({csrf_token:"synthetic"}) : Response.json({ error: { code: "ORG_NOT_VERIFIED", message: "Independent organization review required." } }, { status: 409 });
  const result = await createPortalApi("synthetic-token").submitProjectReview("project", "terms", 2);
  assert.equal(result.status, 409);
  assert.equal(result.data, null);
  assert.match(result.error, /Independent organization review required/);
});


test("application, offer, and assignment writes carry observed versions and explicit consent", async t => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => { globalThis.fetch = oldFetch; if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = oldUrl; });
  const requests = [];
  globalThis.fetch = async request => {
    if (typeof request === "string") return Response.json({csrf_token:"synthetic"});
    requests.push({ method: request.method, url: request.url, headers: request.headers, body: await request.json() });
    return Response.json({ id: "synthetic-record", row_version: 7 });
  };
  const api = createPortalApi("synthetic-test-token");
  await api.submitApplication("project", { seen_terms_version_id: "terms", motivation: "Synthetic application motivation", declared_skills: ["Testing"], links: [], weekly_minutes_available: 120 }, 4);
  await api.issueOffer("application", "terms", "2026-11-05T18:00:00Z", 5);
  await api.inviteMentor("participation", "mentor", "Synthetic mentoring context", "2026-11-05T18:00:00Z", 6);
  const declaration = { conflict_declared: false, confidentiality_acknowledged: true };
  await api.acceptMentorAssignment("assignment", 7, declaration);
  for (let index = 0; index < requests.length; index++) {
    assert.equal(requests[index].headers.get("If-Match"), `"${index + 4}"`);
    assert.ok(requests[index].headers.get("Idempotency-Key"));
  }
  assert.equal(requests[0].body.seen_terms_version_id, "terms");
  assert.deepEqual(requests[3].body, declaration);
});


test("422 errors expose the backend field guidance without echoing submitted data", async t => {
  const originalFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => { globalThis.fetch = originalFetch; if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl; });
  globalThis.fetch = async request => typeof request === "string" ? Response.json({csrf_token:"synthetic"}) : Response.json({error:{code:"VALIDATION_ERROR",message:"Submitted request data failed validation.",field_errors:{"scope_out":["String should have at least 10 characters"],"milestones.0.title":["String should have at most 180 characters"]}}},{status:422});
  const result = await createPortalApi("synthetic-token").createProject("org",{},1);
  assert.equal(result.status,422);
  assert.equal(result.data,null);
  assert.match(result.error,/scope_out: String should have at least 10 characters/);
  assert.match(result.error,/milestones.0.title: String should have at most 180 characters/);
});


test("student discovery loads every server page without using stale browser cache", async t => {
  const previousUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:8000";
  t.after(() => { globalThis.fetch = originalFetch; if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL; else process.env.NEXT_PUBLIC_API_BASE_URL = previousUrl; });
  const offsets = [];
  globalThis.fetch = async request => {
    if (typeof request === "string") return Response.json({csrf_token:"synthetic"});
    const offset = Number(new URL(request.url).searchParams.get("offset"));
    offsets.push(offset);
    assert.equal(request.cache,"no-store");
    return Response.json(offset === 0 ? {items:[{id:"first-published-project"}],next_offset:100} : {items:[{id:"older-published-project"}],next_offset:null});
  };
  const result = await createPortalApi("synthetic-token").getPublishedProjects();
  assert.deepEqual(offsets,[0,100]);
  assert.deepEqual(result.data.map(p => p.id),["first-published-project","older-published-project"]);
});


test("completion, withdrawal and offer-decline actions use distinct versioned endpoints", async t => {
  const oldFetch=globalThis.fetch, oldUrl=process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000";
  t.after(()=>{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_API_BASE_URL;else process.env.NEXT_PUBLIC_API_BASE_URL=oldUrl;});
  const calls=[];
  globalThis.fetch=async request=>{if(typeof request==="string")return Response.json({csrf_token:"synthetic"});calls.push({path:new URL(request.url).pathname,version:request.headers.get("If-Match"),body:await request.json()});return Response.json({id:"synthetic",row_version:9});};
  const api=createPortalApi("synthetic-test-token");
  await api.declineOffer("offer",2,"Synthetic decline reason.");
  await api.revokeOffer("offer",3,"Synthetic revoke reason.");
  await api.withdrawParticipation("part",4,"Synthetic withdrawal reason.");
  await api.markParticipationReady("part",5,"Synthetic completion request.");
  await api.finalizeParticipation("part",6,"Synthetic completion decision.");
  await api.endMentorAssignment("assignment",7,"Synthetic end reason.");
  assert.deepEqual(calls.map(c=>c.path),["/api/v1/offers/offer/decline","/api/v1/offers/offer/revoke","/api/v1/participations/part/withdraw","/api/v1/participations/part/mark-ready-for-review","/api/v1/participations/part/finalize","/api/v1/mentor-assignments/assignment/end"]);
  assert.deepEqual(calls.map(c=>c.version),['"2"','"3"','"4"','"5"','"6"','"7"']);
  assert.equal(calls[3].body.requested_outcome,"completed");assert.equal(calls[4].body.outcome,"completed");
});
