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
  const preview = isPortalPresentationMode();
  const route = slug.join("/");
  const integrated = route === "applications" || route === "reviews" || route === "settings" || route === "messages" || route === "notifications" || route === "projects" || route === "projects/new" || (slug[0] === "projects" && (slug.length === 2 || (slug.length === 3 && ["edit", "team", "workspace"].includes(slug[2]))));
  if (!preview && !integrated) return <PortalPage title="Integration pending" description="This section is not connected to the live API yet."><Empty title="No simulated changes in live mode" action={<ActionLink href="/organization/projects">My projects</ActionLink>}>Use projects and settings for the authenticated moderation workflow. The synthetic preview remains separate.</Empty></PortalPage>;
  if (preview && params.get("sample") === "loading") return <><ActionLink href={`/organization/${slug.join("/")}`}>Exit synthetic loading preview</ActionLink><PortalLoading /></>;
  if (preview && params.get("sample") === "error") return <><p className="p-4 text-sm">Synthetic error preview</p><PortalError reset={() => router.replace(`/organization/${slug.join("/")}`)} /></>;
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
