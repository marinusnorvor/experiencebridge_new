"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/layouts/auth-provider";
import { Logo } from "@/components/app/logo";
import { AccountMenu } from "@/components/app/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "For students", href: "/how-it-works#students" },
  { label: "For organisations", href: "/how-it-works#organisations" },
  { label: "About", href: "/about" },
];

const HIDDEN = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/onboarding"];

/** Marketing header: sticky blurred glass. Auth and onboarding pages use their own layouts. */
export function SiteHeader() {
  const pathname = usePathname();
  const { state } = useAuth();
  const [open, setOpen] = useState(false);
  if (HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const signedIn = state === "authenticated";
  const preview = isPortalPresentationMode();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="ExperienceBridge home"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}
              className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", pathname === link.href ? "text-ink-900" : "text-ink-500 hover:text-ink-900")}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!preview && (signedIn ? (
            <>
              <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "hidden rounded-full sm:inline-flex")}>Open app</Link>
              <AccountMenu />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 hover:text-ink-900 sm:inline-flex">Sign in</Link>
              <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }), "rounded-full px-4")}>Get started</Link>
            </>
          ))}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="size-5" /></Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Menu">
        <nav aria-label="Main" className="flex flex-col">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 text-[16px] font-medium text-ink-900 hover:bg-canvas">{link.label}</Link>
          ))}
          {!preview && (
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {signedIn ? (
                <Link href="/app" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })}>Open app</Link>
              ) : (
                <>
                  <Link href="/sign-up" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg" })}>Get started</Link>
                  <Link href="/sign-in" onClick={() => setOpen(false)} className={buttonVariants({ size: "lg", variant: "secondary" })}>Sign in</Link>
                </>
              )}
            </div>
          )}
        </nav>
      </Dialog>
    </header>
  );
}
