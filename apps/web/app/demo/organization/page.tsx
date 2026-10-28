import { DemoPortal } from "@/components/demo/demo-portal";
import { demoPortals } from "@/features/demo/demo-data";

export default function OrganizationDemoPage() {
  return <DemoPortal content={demoPortals.organization} />;
}
