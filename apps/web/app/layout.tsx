import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";

import { AuthProvider } from "@/components/layouts/auth-provider";
import { AppProviders } from "@/components/app/providers";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ExperienceBridge — Real work. Verified experience.", template: "%s · ExperienceBridge" },
  description: "Organisations post real projects. Students deliver them with a mentor. Every finished project becomes verified proof in an Experience Passport.",
};

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const content = <AppProviders>{children}</AppProviders>;
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {isPortalPresentationMode() ? content : <AuthProvider>{content}</AuthProvider>}
        <Analytics />
      </body>
    </html>
  );
}
