"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient, AuthApiError } from "@/lib/auth/client";
import { useAuth } from "@/components/layouts/auth-provider";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";

type Mode = "login" | "register" | "admin" | "forgot" | "reset";
type Participant = "student" | "mentor" | "organization";
const roles = {
  student: { label: "Student", icon: "🎓", title: "Turn potential into proof.", description: "Discover projects, earn credentials, and build an evidence passport." },
  mentor: { label: "Mentor", icon: "🧭", title: "Help the next generation thrive.", description: "Guide talent, assess submissions, and evaluate industry milestones." },
  organization: { label: "Organization", icon: "🏢", title: "Build with proven talent.", description: "Post scoped deliverables, verify talent, and collaborate on meaningful work." },
};
const inputClass = "mt-2 block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60";

export function AuthForm({ mode }: { mode: Mode }) {
  if (mode === "forgot" || mode === "reset") return <PasswordRecoveryForm mode={mode} />;
  return <ParticipantAuthForm initialMode={mode} />;
}

function ParticipantAuthForm({ initialMode }: { initialMode: "login" | "register" | "admin" }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState<Participant>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const admin = mode === "admin";
  const registering = mode === "register";
  const selected = roles[role];

  function changeMode(next: typeof mode) {
    setMode(next);
    setMessage("");
    setPassword("");
    setVisible(false);
    // Keep the public route shareable without remounting the interactive form.
    window.history.replaceState(null, "", next === "register" ? "/sign-up" : "/sign-in");
  }

  function showError(text: string) {
    setMessage(text);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setMessage("");
    const cleanEmail = email.trim();
    if (registering && !name.trim()) return showError("Please enter your full name.");
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return showError("Please enter a valid email address.");
    if (password.length < 8) return showError("Your password must contain at least 8 characters.");
    submitting.current = true;
    setBusy(true);
    let created = false;
    let signedIn = false;
    try {
      if (registering) {
        await authClient.register(cleanEmail, password, name.trim());
        created = true;
      }
      await authClient.login(cleanEmail, password);
      signedIn = true;
      const user = await authClient.currentUser();
      const contexts = user.effective_contexts ?? [];
      const destination = contexts.includes("admin") ? "admin" : contexts.includes("organization") ? "organization" : contexts.includes("mentor") ? "mentor" : "student";
      await refresh();
      router.push(`/${destination}/dashboard`);
    } catch (error) {
      if (created) setMode("login");
      const detail = error instanceof AuthApiError && error.status === 401 && !signedIn
        ? "Invalid email or password"
        : error instanceof AuthApiError && error.status === 409
          ? "An account with this email already exists. Please sign in."
          : error instanceof Error ? error.message : "Unable to connect. Please try again.";
      showError(created ? `Your account was created, but sign-in could not finish. Please sign in. ${detail}` : detail);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 px-4 py-12 text-white sm:px-6 sm:py-16" style={{ colorScheme: "dark" }}>
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-[560px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-indigo-400"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm" aria-hidden="true">EB</span>Experience<span className="-ml-2 text-indigo-400">Bridge</span></Link>
          <p className="mt-3 text-xs tracking-[0.2em] text-slate-500 uppercase">Real experience. Lasting opportunity.</p>
        </div>
        <section aria-labelledby="auth-title" className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {admin ? <button type="button" disabled={busy} onClick={() => changeMode("login")} className="mb-6 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-50">← Back to Participant Sign In</button> : <>
            <div className="relative mb-7 flex rounded-xl bg-slate-950 p-1" aria-label="Authentication options">
              <span aria-hidden="true" className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-indigo-600 shadow-lg transition-transform duration-300 motion-reduce:transition-none ${registering ? "translate-x-full" : ""}`} />
              {(["login", "register"] as const).map(option => <button key={option} type="button" aria-pressed={mode === option} disabled={busy} onClick={() => changeMode(option)} className="relative flex-1 rounded-lg py-2.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-50">{option === "login" ? "Sign In" : "Create Account"}</button>)}
            </div>
            <p className="mb-3 text-xs font-medium tracking-widest text-slate-400 uppercase">Your path, your potential</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose your participant role">
              {(Object.keys(roles) as Participant[]).map(key => <button key={key} type="button" aria-pressed={role === key} disabled={busy} onClick={() => setRole(key)} className={`rounded-xl border px-1 py-3 text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-indigo-400 motion-reduce:transition-none sm:text-sm ${role === key ? "border-indigo-500 bg-indigo-500/15 text-indigo-200 shadow-md shadow-indigo-950/40" : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-600 hover:text-white"}`}><span aria-hidden="true" className={`mb-1 block text-xl transition-transform ${role === key ? "scale-110" : ""}`}>{roles[key].icon}</span>{roles[key].label}</button>)}
            </div>
          </>}
          <header className="mt-7 mb-6" aria-live="polite">
            <p className="mb-2 text-xs font-medium text-indigo-400">{admin ? "RESTRICTED ACCESS" : `${selected.label} portal`}</p>
            <h1 id="auth-title" className="text-2xl font-semibold tracking-tight">{admin ? "Platform Administration Portal" : registering ? "Start your next chapter." : "Welcome back."}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{admin ? "Restricted Access — sign in with your authorized administrator account." : <><span className="text-slate-300">{selected.title}</span> {selected.description}</>}</p>
          </header>
          <form onSubmit={submit} noValidate className="space-y-4" aria-busy={busy}>
            <fieldset disabled={busy} className="space-y-4">
              <legend className="sr-only">{registering ? "Create your account" : "Sign in with email and password"}</legend>
              {registering && <label className="block text-sm font-medium text-slate-300" htmlFor="auth-name">Full name<input id="auth-name" name="name" className={inputClass} required maxLength={160} autoComplete="name" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} /></label>}
              <label className="block text-sm font-medium text-slate-300" htmlFor="auth-email">Email address<input id="auth-email" name="email" className={inputClass} type="email" required maxLength={320} autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
              <div><label className="block text-sm font-medium text-slate-300" htmlFor="auth-password">Password</label><div className="relative"><input id="auth-password" name="password" className={`${inputClass} pr-12`} type={visible ? "text" : "password"} required minLength={8} autoComplete={registering ? "new-password" : "current-password"} placeholder="Enter your password" aria-describedby="password-hint" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-slate-400 transition-colors hover:text-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg></button></div><p id="password-hint" className="mt-2 text-xs text-slate-500">At least 8 characters. Keep it unique and secure.</p></div>
            </fieldset>
            {message && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-200 outline-none">{message}</div>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition-all hover:bg-indigo-500 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none">
              {busy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />}
              {busy ? registering ? "Creating Account..." : "Authenticating..." : registering ? "Create Account" : "Sign In"}{!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">{admin ? "Administrator access is verified by the server." : "One account. A world of meaningful connections."}</p>
        </section>
        {!admin && <p className="mt-6 text-center text-xs text-slate-500">Platform Administrator? <button type="button" disabled={busy} onClick={() => changeMode("admin")} className="rounded text-slate-400 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-400 disabled:opacity-50">Sign in here</button></p>}
        <p className="mt-8 text-center text-xs text-slate-600">Connecting ambition with real-world impact.</p>
      </div>
    </main>
  );
}
