import Link from "next/link";
import { portalLinks } from "@/lib/portal-routes";
import { isPortalPresentationMode } from "@/lib/auth/portal-presentation";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        Team JAMS · ExperienceBridge
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
        Real work. Demonstrated ability. Trusted experience.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        Open the team’s Student, Mentor, Organization, and Admin workspaces.
        Interfaces under development use clearly labeled sample content.
      </p>

      {!isPortalPresentationMode() && <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link href="/sign-in" className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm text-white">Sign in</Link>
        <Link href="/sign-up" className="rounded-lg border px-5 py-2.5 text-sm">Create account</Link>
      </div>}

      <nav aria-label="Portal routes" className="mt-10 grid gap-4 sm:grid-cols-2">
        {portalLinks.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            className="rounded-xl border border-slate-200 bg-white p-5 font-medium shadow-sm transition hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            Open {portal.label} Portal <span aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>
      <p className="mt-10 text-sm text-slate-500">
        {isPortalPresentationMode()
          ? "Local development · No sign-in needed to view portal interfaces · Sample data only"
          : "Portal data and actions require server-authorized access."}
      </p>
    </main>
  );
}
