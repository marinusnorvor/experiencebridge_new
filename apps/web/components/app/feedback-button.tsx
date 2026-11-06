"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareHeart, Star } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import type { Portal } from "./portal-nav";

const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL;

/**
 * "Give feedback" on every signed-in page (TONIGHT-SPRINT §5.2). No backend: opens the team's form
 * (NEXT_PUBLIC_FEEDBACK_URL, e.g. Tally/Google Form) with the answers, page and role as query params.
 * Hidden when the URL isn't configured. The page path never includes secrets (admin path is replaced).
 */
export function FeedbackButton({ portal }: { portal: Portal }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [trying, setTrying] = useState("");
  const [wrong, setWrong] = useState("");
  const [email, setEmail] = useState("");
  if (!FEEDBACK_URL) return null;

  function send() {
    let url: URL;
    try { url = new URL(FEEDBACK_URL!); } catch { toast.error("Feedback isn't set up correctly yet."); return; }
    const page = portal === "admin" ? "/admin" + pathname.replace(/^\/[^/]+/, "") : pathname;
    const params = { page, role: portal, rating: rating ? String(rating) : "", trying: trying.trim(), wrong: wrong.trim(), email: email.trim() };
    for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value.slice(0, 1500));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
    toast.success("Thanks — your feedback form is open in a new tab");
    setOpen(false); setRating(0); setTrying(""); setWrong("");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-ink-900 px-4 text-sm font-medium text-white shadow-pop transition hover:-translate-y-0.5 hover:bg-ink-800 lg:bottom-6 lg:right-6 print:hidden">
        <MessageSquareHeart className="size-4 text-gold-400" aria-hidden />Give feedback
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="How's it going?" description="Your feedback helps us make ExperienceBridge better. It takes a minute."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={send} disabled={!rating && !trying.trim() && !wrong.trim()}>Send feedback</Button></>}>
        <div className="space-y-5">
          <fieldset>
            <legend className="text-sm font-medium text-ink-900">How easy was it to use?</legend>
            <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Rating from 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} out of 5`} onClick={() => setRating(n)}
                  className={cn("grid size-10 place-items-center rounded-lg border transition", rating >= n ? "border-gold-500/40 bg-gold-50 text-gold-500" : "border-line-strong text-ink-400 hover:border-gold-500/40")}>
                  <Star className={cn("size-5", rating >= n && "fill-current")} aria-hidden />
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="What were you trying to do?">{(a) => <Input {...a} value={trying} maxLength={500} onChange={(e) => setTrying(e.target.value)} />}</Field>
          <Field label="What went wrong, or what would you change?">{(a) => <Textarea {...a} rows={3} maxLength={1500} value={wrong} onChange={(e) => setWrong(e.target.value)} />}</Field>
          <Field label="Email" optional hint="Only if you're happy for us to follow up.">{(a) => <Input {...a} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        </div>
      </Dialog>
    </>
  );
}
