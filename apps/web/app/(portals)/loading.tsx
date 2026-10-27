export default function PortalsLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[calc(100vh-4.5rem)] w-full max-w-4xl flex-col justify-center px-6 py-16"
    >
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">
        ExperienceBridge · Verifying session
      </p>
      <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-5 h-6 w-full max-w-xl animate-pulse rounded bg-slate-200" />
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-16 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
      <p className="mt-6 text-sm text-slate-600">
        Checking your ExperienceBridge authentication session…
      </p>
    </main>
  );
}
