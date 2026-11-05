import { AdminUsersView } from "@/features/admin";

export const metadata = {
  title: "Users & Roles | Admin Portal",
  description: "Platform accounts, role grants, and authorization oversight.",
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
