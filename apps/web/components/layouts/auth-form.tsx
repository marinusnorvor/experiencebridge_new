"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { useAuth } from "@/components/layouts/auth-provider";

type Mode = "login" | "register" | "forgot" | "reset";
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter(); const { refresh } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [token, setToken] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const fragment = useRef<{ mode: Mode; value: string } | null>(null);
  useEffect(() => {
    if (mode === "reset") {
      const value = window.location.hash.slice(1) || (fragment.current?.mode === mode ? fragment.current.value : "");
      fragment.current = { mode, value };
      window.history.replaceState(null, "", window.location.pathname);
      // The fragment is client-only and must be removed before rendering a usable form.
      setToken(value);
    }
  }, [mode]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "login") {
        await authClient.login(email, password);
        await refresh();
        router.push("/student/dashboard");
      } else if (mode === "register") {
        await authClient.register(email, password, name);
        await authClient.login(email, password);
        await refresh();
        router.push("/student/dashboard");
      } else if (mode === "forgot") {
        setMessage((await authClient.forgotPassword(email)).message);
      } else {
        setMessage((await authClient.resetPassword(token, password)).message);
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); } finally { setBusy(false); }
  }
  const titles: Record<Mode, string> = { login: "Sign in", register: "Create account", forgot: "Forgot password", reset: "Reset password" };
  return <main className="mx-auto max-w-md px-6 py-12"><h1 className="text-3xl font-semibold">{titles[mode]}</h1><form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    {mode === "register" && <label className="block">Display name<input className="mt-1 w-full rounded border p-2" required maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>}
    {["login", "register", "forgot"].includes(mode) && <label className="block">Email<input className="mt-1 w-full rounded border p-2" type="email" required maxLength={320} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
    {["login", "register", "reset"].includes(mode) && <label className="block">Password<input className="mt-1 w-full rounded border p-2" type="password" required minLength={mode === "login" ? 1 : 12} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} /></label>}
    {mode === "reset" && !token && <p role="alert">This link is missing its token. Request a new link.</p>}
    <button disabled={busy || (mode === "reset" && !token)} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50">{busy ? "Please wait…" : titles[mode]}</button>
    {message && <p role="status">{message}</p>}
  </form><nav className="mt-6 flex flex-wrap gap-4 text-sm text-teal-800"><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link><Link href="/forgot-password">Forgot password</Link></nav></main>;
}
