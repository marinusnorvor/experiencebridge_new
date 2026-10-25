import Link from "next/link";

const portals = [
  { label: "Student", href: "/student/dashboard" },
  { label: "Organization", href: "/organization/dashboard" },
  { label: "Mentor", href: "/mentor/dashboard" },
  { label: "Admin", href: "/admin/dashboard" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        Team JAMS · ExperienceBridge
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
        Real work. Demonstrated ability. Trusted experience.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        This foundation contains navigation placeholders only. No accounts,
        project activity, assessments, or verification are implemented.
      </p>
      <nav aria-label="Portal placeholders" className="mt-10 grid gap-4 sm:grid-cols-2">
        {portals.map((portal) => (
          <Link
            key={portal.href}
            href={portal.href}
            className="rounded-xl border border-slate-200 bg-white p-5 font-medium shadow-sm transition hover:border-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            {portal.label} portal <span aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>
      <p className="mt-10 text-sm text-slate-500">Build foundation · placeholder content</p>
    </main>
  );
}
