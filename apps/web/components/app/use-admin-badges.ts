"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePortalApi } from "@/lib/api/portal-api";

/** Queue counts for the admin sidebar (moved from the old AdminShell). */
export function useAdminBadges() {
  const pathname = usePathname();
  const { getApi, isSignedIn } = usePortalApi();
  const [counts, setCounts] = useState({ orgs: 0, projects: 0, mentors: 0 });
  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSignedIn) return;
      try {
        const api = await getApi();
        const [orgs, projects, mentors] = await Promise.all([api.getPendingOrganizations(), api.getPendingProjects(), api.getMentorProfilesForAdmin()]);
        if (active) setCounts({
          orgs: orgs.data?.length ?? 0,
          projects: projects.data?.length ?? 0,
          mentors: (mentors.data ?? []).filter((m) => m.eligibility_status === "pending").length,
        });
      } catch { /* counts are a convenience */ }
    })();
    return () => { active = false; };
  }, [getApi, isSignedIn, pathname]);
  return counts;
}
