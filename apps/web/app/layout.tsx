import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/layouts/site-header";
import { AuthProvider } from "@/components/layouts/auth-provider";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExperienceBridge",
  description: "A foundation for evidence-backed experience.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const content = <><SiteHeader />{children}</>;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {isPortalPresentationMode() ? content : <AuthProvider>{content}</AuthProvider>}
      </body>
    </html>
  );
}
