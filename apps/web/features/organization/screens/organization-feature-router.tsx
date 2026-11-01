"use client";

import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalError, PortalLoading } from "../components/ui/portal-states";
import { ActionLink, Empty, PortalPage } from "../components/ui/portal-ui";
import { OrganizationProjectsScreen, OrganizationProjectDetail } from "./organization-projects-screen";
import { OrganizationProjectWizard } from "./organization-project-wizard";
import { OrganizationApplicationsScreen } from "./organization-applications-screen";
import { OrganizationTeamScreen } from "./organization-team-screen";
import { OrganizationWorkspaceScreen } from "./organization-workspace-screen";
import { OrganizationReviewsScreen } from "./organization-reviews-screen";
import { OrganizationMessagesScreen, OrganizationNotificationsScreen } from "./organization-messages-screen";
import { OrganizationSettingsScreen } from "./organization-settings-screen";

export function OrganizationFeatureRouter({ slug }: { slug: string[] }) {
  const params = useSearchParams();
  const router = useRouter();
  if (!isPortalPresentationMode()) return <main className="p-8"><h1 className="text-2xl font-semibold">Organization access</h1><p className="mt-3 text-slate-600">Live organization workflows require an authorized backend integration. Synthetic actions are available only in local presentation mode.</p></main>;
  if (params.get("sample") === "loading") return <><ActionLink href={`/organization/${slug.join("/")}`}>Exit synthetic loading preview</ActionLink><PortalLoading /></>;
  if (params.get("sample") === "error") return <><p className="p-4 text-sm">Synthetic error preview</p><PortalError reset={() => router.replace(`/organization/${slug.join("/")}`)} /></>;
  if (slug.length === 1 && slug[0] === "projects") return <OrganizationProjectsScreen />;
  if (slug.join("/") === "applications") return <OrganizationApplicationsScreen />;
  if (slug.join("/") === "reviews") return <OrganizationReviewsScreen />;
  if (slug.join("/") === "messages") return <OrganizationMessagesScreen />;
  if (slug.join("/") === "notifications") return <OrganizationNotificationsScreen />;
  if (slug.join("/") === "settings") return <OrganizationSettingsScreen />;
  if (slug.length === 3 && slug[0] === "projects" && slug[2] === "team") return <OrganizationTeamScreen key={slug[1]} id={slug[1]} />;
  if (slug.length === 3 && slug[0] === "projects" && slug[2] === "workspace") return <OrganizationWorkspaceScreen key={slug[1]} id={slug[1]} />;
  if (slug.join("/") === "projects/new") return <OrganizationProjectWizard key="new" />;
  if (slug.length === 3 && slug[0] === "projects" && slug[2] === "edit") return <OrganizationProjectWizard key={slug[1]} id={slug[1]} />;
  if (slug.length === 2 && slug[0] === "projects" && slug[1] !== "new") return <OrganizationProjectDetail id={slug[1]} />;
  return <PortalPage title="Page unavailable" description="This address does not match an organization workspace screen."><Empty title="Let’s get you back to your work" action={<ActionLink href="/organization/projects">My projects</ActionLink>}>Choose a section from the navigation or return to your projects.</Empty></PortalPage>;
}
