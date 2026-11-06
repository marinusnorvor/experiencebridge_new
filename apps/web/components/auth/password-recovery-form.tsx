"use client";

// Preserve the existing recovery routes separately from the participant portal.
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

type RecoveryMode = "forgot" | "reset";
export function PasswordRecoveryForm({ mode }: { mode: RecoveryMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fragment = useRef<string | null>(null);
  useEffect(() => {
    if (mode === "reset") {
      const value = window.location.hash.slice(1) || fragment.current || "";
      fragment.current = value;
      window.history.replaceState(null, "", window.location.pathname);
      setToken(value);
    }
  }, [mode]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "forgot"
        ? await authClient.forgotPassword(email)
        : await authClient.resetPassword(token, password);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const title = mode === "forgot" ? "Forgot password" : "Reset password";
  return <main className="mx-auto max-w-md px-6 py-12">
    <h1 className="text-3xl font-semibold">{title}</h1>
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {mode === "forgot" && <label className="block">Email<input className="mt-1 w-full rounded border p-2" type="email" required maxLength={320} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {mode === "reset" && <label className="block">Password<input className="mt-1 w-full rounded border p-2" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>}
      {mode === "reset" && !token && <p role="alert">This link is missing its token. Request a new link.</p>}
      <button disabled={busy || (mode === "reset" && !token)} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50">{busy ? "Please wait…" : title}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <nav className="mt-6 flex flex-wrap gap-4 text-sm text-teal-800"><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link><Link href="/forgot-password">Forgot password</Link></nav>
  </main>;
}
