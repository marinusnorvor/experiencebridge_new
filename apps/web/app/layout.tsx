import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import { SiteHeader } from "@/components/layouts/site-header";
import {
  experienceBridgeClerkAppearance,
  getClerkPublishableKey,
} from "@/lib/auth/clerk-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExperienceBridge",
  description: "A foundation for evidence-backed experience.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const publishableKey = getClerkPublishableKey();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ClerkProvider
          publishableKey={publishableKey}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
          appearance={experienceBridgeClerkAppearance}
        >
          <SiteHeader />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
