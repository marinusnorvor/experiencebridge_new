"use client";
import { MentorProfileForm } from "./mentor-profile-form";
import { useVisibleRefresh } from "@/lib/api/use-visible-refresh";
import { MentorDashboard } from "./mentor-dashboard";
import { sampleMentorDashboard } from "../lib/sample-dashboard-data";
import { emptyMentorDashboard, loadMentorDashboard } from "../lib/api-records";
import { usePortalResource } from "@/lib/api/use-portal-resource";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
export function MentorDashboardConnected() {
  const preview = isPortalPresentationMode();
  const live = usePortalResource(loadMentorDashboard, !preview);
  useVisibleRefresh(live.reload, !preview);
  return <>{!preview && <MentorProfileForm />}{live.error && !preview && <p role="alert" className="p-4 text-red-700">{live.error} <button onClick={() => void live.reload().catch(() => {})}>Retry</button></p>}
    <MentorDashboard data={preview ? sampleMentorDashboard : live.data ?? emptyMentorDashboard}
      state={preview ? "ready" : live.loading ? "loading" : live.error ? "error" : "ready"}
      onChanged={() => void live.reload().catch(() => {})} /></>;
}
