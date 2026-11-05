import { Suspense, type ReactNode } from "react";

/** Keep the route segment rendered; each page applies its own auth boundary. */
export default function PortalsLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main role="status">Checking your session…</main>}>{children}</Suspense>;
}
