"use client";
import { PortalError } from "@/features/organization/components/ui/portal-states";
export default function OrganizationFeatureError({ reset }: { reset: () => void }) { return <PortalError reset={reset} />; }
