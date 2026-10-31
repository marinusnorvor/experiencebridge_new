import { OrganizationFeatureRouter } from "@/features/organization/screens/organization-feature-router";
import { Suspense } from "react";
import { PortalLoading } from "@/features/organization/components/ui/portal-states";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

async function OrganizationRouteContent({
  params,
}: PageProps) {
  const resolvedParams = await params;
  return <OrganizationFeatureRouter slug={resolvedParams.slug ?? []} />;
}

export default function OrganizationDynamicRoutePage(props: PageProps) {
  return (
    <Suspense fallback={<PortalLoading />}>
      <OrganizationRouteContent {...props} />
    </Suspense>
  );
}

