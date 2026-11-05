import { test } from "node:test";
import assert from "node:assert/strict";
import { portalAccess } from "../lib/auth/portal-access.ts";

test("portal access retains session states and server-authoritative contexts", () => {
  for (const state of ["loading", "unauthenticated", "expired", "forbidden", "unavailable"]) {
    assert.equal(portalAccess(state, ["admin"], "admin", false), state);
  }
  assert.equal(portalAccess("authenticated", [], "student", false), "allowed");
  for (const portal of ["mentor", "organization", "admin"]) {
    assert.equal(portalAccess("authenticated", [], portal, false), "forbidden");
    assert.equal(portalAccess("authenticated", [portal], portal, false), "allowed");
    assert.equal(portalAccess("authenticated", ["student"], portal, false), "forbidden");
  }
  assert.equal(portalAccess("unexpected", ["admin"], "admin", false), "unauthenticated");
  assert.equal(portalAccess("unauthenticated", [], "admin", true), "preview");
});
