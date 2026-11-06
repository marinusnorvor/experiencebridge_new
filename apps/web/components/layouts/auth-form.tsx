"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Check, GraduationCap, MailCheck, UserRound, X } from "lucide-react";
import { authClient, AuthApiError } from "@/lib/auth/client";
import { useAuth } from "@/components/layouts/auth-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

type Mode = "login" | "register" | "forgot" | "reset";
type JoinAs = "student" | "organization" | "mentor";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only same-site relative paths are allowed as a post-sign-in destination. */
export function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

function humanError(error: unknown, mode: Mode): string {
  if (!(error instanceof AuthApiError)) return "Something went wrong. Please try again.";
  if (error.status === 0) return "We can't reach ExperienceBridge. Check your connection and try again.";
  if (error.status === 429) return "Too many attempts from this network. Wait a few minutes, then try again.";
  if (error.status === 401) return mode === "register"
    ? "An account with this email may already exist. Sign in instead, or reset your password."
    : "That email and password don't match. Check them and try again.";
  if (error.status === 403) return "Your page was open too long. Refresh the page and try again.";
  if (error.status === 422) return mode === "reset" ? "Choose a password with at least 12 characters." : "Check the details you entered and try again.";
  if (error.status === 400) return "This link has expired or was already used. Request a new one.";
  if (error.status >= 500) return "ExperienceBridge is having trouble right now. Please try again in a minute.";
  return error.message;
}

function strength(password: string) {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return { score, label: ["Too short", "Okay", "Good", "Strong", "Very strong"][score] };
}

const JOIN: { value: JoinAs; title: string; body: string; icon: typeof UserRound }[] = [
  { value: "student", title: "Student or graduate", body: "Find real projects and build your Passport.", icon: UserRound },
  { value: "organization", title: "Organisation", body: "Post projects and meet proven talent.", icon: Building2 },
  { value: "mentor", title: "Mentor", body: "Guide students and review their work.", icon: GraduationCap },
];

export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const { refresh } = useAuth();
  const initialAs = (["student", "organization", "mentor"] as const).find((v) => v === params.get("as"));
  const [step, setStep] = useState<"role" | "details">(mode === "register" && !initialAs ? "role" : "details");
  const [joinAs, setJoinAs] = useState<JoinAs>(initialAs ?? "student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [token, setToken] = useState("");
  const fragment = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "reset") return;
    const value = window.location.hash.slice(1) || fragment.current || "";
    fragment.current = value;
    window.history.replaceState(null, "", window.location.pathname);
    // The token lives only in the URL fragment and is removed before the form is usable.
    setToken(value);
  }, [mode]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (mode === "register" && !name.trim()) e.name = "Enter your full name.";
    if (mode !== "reset" && !EMAIL.test(email.trim())) e.email = "Enter a valid email address, like name@example.com.";
    if (mode === "login" && !password) e.password = "Enter your password.";
    if ((mode === "register" || mode === "reset") && password.length < 12) e.password = "Use at least 12 characters.";
    if ((mode === "register" || mode === "reset") && confirm !== password) e.confirm = "The passwords don't match.";
    if (mode === "register" && !consent) e.consent = "Please agree to continue.";
    return e;
  }, [mode, name, email, password, confirm, consent]);
  const show = (key: string) => (touched[key] || submitted ? errors[key] : undefined);
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    const relevant = { login: ["email", "password"], register: ["name", "email", "password", "confirm", "consent"], forgot: ["email"], reset: ["password", "confirm"] }[mode];
    if (relevant.some((k) => errors[k]) || busy) return;
    setBusy(true);
    try {
      if (mode === "login") {
        await authClient.login(email.trim(), password);
        await refresh();
        window.location.assign(safeNext(params.get("next")) ?? "/app");
        return;
      }
      if (mode === "register") {
        await authClient.register(email.trim(), password, name.trim());
        await authClient.login(email.trim(), password);
        await refresh();
        window.location.assign(`/onboarding?path=${joinAs}`);
        return;
      }
      if (mode === "forgot") {
        await authClient.forgotPassword(email.trim());
        setDone("If an account exists for that email, we've sent a link to reset your password. Check your inbox and spam folder.");
      } else {
        await authClient.resetPassword(token, password);
        setDone("Your password has been changed. You can sign in now.");
      }
    } catch (err) {
      setError(humanError(err, mode));
    } finally {
      setBusy(false);
    }
  }

  const s = strength(password);

  if (mode === "register" && step === "role") {
    return (
      <AuthShell title="Join ExperienceBridge" subtitle="Tell us how you'll use it. You can add another role later."
        footer={<>Already have an account? <Link className="font-medium text-brand-600 hover:underline" href="/sign-in">Sign in</Link></>}>
        <fieldset>
          <legend className="sr-only">I&apos;m joining as</legend>
          <div className="space-y-3">
            {JOIN.map((option) => {
              const Icon = option.icon;
              const selected = joinAs === option.value;
              return (
                <label key={option.value} className={cn("flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition", selected ? "border-brand-600 bg-brand-50 ring-4 ring-brand-100" : "border-line-strong hover:border-ink-400")}>
                  <input type="radio" name="join-as" value={option.value} checked={selected} onChange={() => setJoinAs(option.value)} className="sr-only" />
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", selected ? "bg-brand-600 text-white" : "bg-canvas text-ink-700")}><Icon className="size-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink-900">{option.title}</span>
                    <span className="block text-sm text-ink-500">{option.body}</span>
                  </span>
                  <span aria-hidden className={cn("grid size-5 place-items-center rounded-full border", selected ? "border-brand-600 bg-brand-600 text-white" : "border-line-strong")}>{selected && <Check className="size-3" strokeWidth={3} />}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Button size="lg" className="mt-6 w-full" onClick={() => setStep("details")}>Continue</Button>
      </AuthShell>
    );
  }

  const config = {
    login: { title: "Welcome back", subtitle: params.get("expired") ? "Your session ended. Sign in again to continue." : "Sign in to continue your work.", cta: "Sign in" },
    register: { title: "Create your account", subtitle: `Joining as ${JOIN.find((j) => j.value === joinAs)?.title.toLowerCase()}.`, cta: "Create account" },
    forgot: { title: "Reset your password", subtitle: "Enter your email and we'll send you a link to choose a new password.", cta: "Send reset link" },
    reset: { title: "Choose a new password", subtitle: "Use at least 12 characters. A short phrase is easy to remember.", cta: "Save new password" },
  }[mode];

  const footer = {
    login: <>New here? <Link className="font-medium text-brand-600 hover:underline" href="/sign-up">Create an account</Link></>,
    register: <>Already have an account? <Link className="font-medium text-brand-600 hover:underline" href="/sign-in">Sign in</Link></>,
    forgot: <>Remembered it? <Link className="font-medium text-brand-600 hover:underline" href="/sign-in">Back to sign in</Link></>,
    reset: <>Need a new link? <Link className="font-medium text-brand-600 hover:underline" href="/forgot-password">Request another</Link></>,
  }[mode];

  if (done) {
    return (
      <AuthShell title={mode === "forgot" ? "Check your email" : "Password changed"} footer={footer}>
        <div role="status" className="flex gap-3 rounded-2xl border border-brand-600/20 bg-brand-50 p-4 text-sm text-ink-700">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />{done}
        </div>
        {mode === "reset" && <Button asChild size="lg" className="mt-6 w-full"><Link href="/sign-in">Sign in</Link></Button>}
      </AuthShell>
    );
  }

  return (
    <AuthShell title={config.title} subtitle={config.subtitle} footer={footer}>
      {mode === "register" && (
        <button type="button" onClick={() => setStep("role")} className="-mt-4 mb-5 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft className="size-3.5" aria-hidden />Change role
        </button>
      )}
      <form noValidate onSubmit={submit} className="space-y-5">
        {mode === "register" && (
          <Field label="Full name" error={show("name")}>
            {(a) => <Input {...a} autoComplete="name" maxLength={160} value={name} onChange={(e) => setName(e.target.value)} onBlur={blur("name")} />}
          </Field>
        )}
        {mode !== "reset" && (
          <Field label="Email" error={show("email")}>
            {(a) => <Input {...a} type="email" inputMode="email" autoComplete="email" maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} onBlur={blur("email")} />}
          </Field>
        )}
        {mode !== "forgot" && (
          <div>
            <Field label={mode === "reset" ? "New password" : "Password"} error={show("password")}>
              {(a) => <PasswordInput {...a} autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={1024} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={blur("password")} />}
            </Field>
            {mode === "login" && <div className="mt-2 text-right"><Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">Forgot password?</Link></div>}
            {(mode === "register" || mode === "reset") && password && (
              <div className="mt-2.5" aria-live="polite">
                <div className="flex gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((i) => <span key={i} className={cn("h-1 flex-1 rounded-full", s.score >= i ? (s.score <= 1 ? "bg-warning" : "bg-brand-600") : "bg-line")} />)}
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-500">
                  {password.length >= 12 ? <Check className="size-3.5 text-success" aria-hidden /> : <X className="size-3.5 text-ink-400" aria-hidden />}
                  At least 12 characters · <span className="font-medium text-ink-700">{s.label}</span>
                </p>
              </div>
            )}
          </div>
        )}
        {(mode === "register" || mode === "reset") && (
          <Field label="Confirm password" error={show("confirm")}>
            {(a) => <PasswordInput {...a} autoComplete="new-password" maxLength={1024} value={confirm} onChange={(e) => setConfirm(e.target.value)} onBlur={blur("confirm")} />}
          </Field>
        )}
        {mode === "register" && (
          <div>
            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} onBlur={blur("consent")} aria-invalid={!!show("consent")}
                className="mt-0.5 size-4 rounded border-line-strong accent-brand-600" />
              <span>I agree to use ExperienceBridge honestly and to the{" "}<Link href="/how-it-works#faq" className="font-medium text-brand-600 hover:underline">terms and privacy notes</Link>.</span>
            </label>
            {show("consent") && <p role="alert" className="mt-1.5 text-[13px] text-danger-text">{show("consent")}</p>}
          </div>
        )}
        {mode === "reset" && !token && <p role="alert" className="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">This link is incomplete. Request a new reset link.</p>}
        {error && <p role="alert" className="rounded-xl border border-danger/20 bg-danger-bg p-3 text-sm text-danger-text">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={mode === "reset" && !token}>{busy ? "Please wait…" : config.cta}</Button>
      </form>
    </AuthShell>
  );
}
