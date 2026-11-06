import type { LucideIcon } from "lucide-react";
import {
  Briefcase, ClipboardCheck, FileText, FolderKanban, GraduationCap, Building2, History, Home, Inbox,
  LayoutDashboard, ListChecks, PlusCircle, Search, Settings, ShieldCheck, UserRound, Users,
} from "lucide-react";

export type Portal = "student" | "organization" | "mentor" | "admin";
export type NavItem = { label: string; href: string; icon: LucideIcon; badgeKey?: string; exact?: boolean };

export const PORTAL_LABEL: Record<Portal, string> = {
  student: "Student",
  organization: "Organisation",
  mentor: "Mentor",
  admin: "Admin",
};

export const PORTAL_HOME: Record<Portal, string> = {
  student: "/student/dashboard",
  organization: "/organization/dashboard",
  mentor: "/mentor/dashboard",
  admin: "/app?to=admin",
};

/** Admin links are rewritten onto the unlisted base path at render time. */
export function portalNav(portal: Portal): NavItem[] {
  switch (portal) {
    case "student":
      return [
        { label: "Home", href: "/student/dashboard", icon: Home },
        { label: "Find projects", href: "/student/applications", icon: Search },
        { label: "My projects", href: "/student/projects", icon: Briefcase },
        { label: "Passport", href: "/student/passport", icon: ShieldCheck },
        { label: "Profile", href: "/student/profile", icon: UserRound },
      ];
    case "organization":
      return [
        { label: "Home", href: "/organization/dashboard", icon: LayoutDashboard },
        { label: "Projects", href: "/organization/projects", icon: FolderKanban, exact: true },
        { label: "New project", href: "/organization/projects/new", icon: PlusCircle },
        { label: "Applications", href: "/organization/applications", icon: Inbox },
        { label: "Reviews", href: "/organization/reviews", icon: ClipboardCheck },
        { label: "Settings", href: "/organization/settings", icon: Settings },
      ];
    case "mentor":
      return [{ label: "Home", href: "/mentor/dashboard", icon: Home }];
    case "admin":
      return [
        { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Organisations", href: "/admin/organizations", icon: Building2, badgeKey: "orgs" },
        { label: "Projects", href: "/admin/projects", icon: FolderKanban, badgeKey: "projects" },
        { label: "Mentors", href: "/admin/mentors", icon: GraduationCap, badgeKey: "mentors" },
        { label: "Users", href: "/admin/users", icon: Users },
        { label: "Applications", href: "/admin/applications", icon: FileText },
        { label: "Participations", href: "/admin/participations", icon: ListChecks },
        { label: "Audit log", href: "/admin/audit", icon: History },
      ];
  }
}
