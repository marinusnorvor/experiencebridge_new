type PortalPlaceholderProps = {
  title: string;
  description: string;
};

export function PortalPlaceholder({ title, description }: PortalPlaceholderProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        ExperienceBridge · Portal placeholder
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">{title} dashboard</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
      <p className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Navigation scaffold only. Authentication, authorization, and business workflows are not implemented.
      </p>
    </main>
  );
}
