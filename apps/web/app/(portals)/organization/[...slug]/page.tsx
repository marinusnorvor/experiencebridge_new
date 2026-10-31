import { OrganizationRouteSlot } from "@/features/organization";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{
    slug?: string[];
  }>;
};

async function OrganizationRouteContent({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const slugPath = resolvedParams.slug ? resolvedParams.slug.join("/") : undefined;

  return <OrganizationRouteSlot slugPath={slugPath} />;
}

export default function OrganizationDynamicRoutePage(props: PageProps) {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-slate-600" aria-busy="true"><p role="status">Loading organization section…</p></main>}>
      <OrganizationRouteContent {...props} />
    </Suspense>
  );
}

