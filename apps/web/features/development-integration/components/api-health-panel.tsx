"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/layouts/auth-provider";

export function ApiHealthPanel() {
  const { state, user, refresh } = useAuth();
  const [health, setHealth] = useState("Not checked");

  async function check() {
    try {
      const response = await fetch("/api/v1/health", { cache: "no-store" });
      setHealth(response.ok ? "Available" : `HTTP ${response.status}`);
    } catch {
      setHealth("Unavailable");
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">API health and identity</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Health: <strong className="text-slate-900">{health}</strong></span>
        <button
          type="button"
          onClick={() => void check()}
          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Check health
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Session: <strong className="text-slate-900">{state}</strong></span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Refresh identity
        </button>
      </div>

      {user && (
        <p className="text-sm text-slate-700">
          Signed in as <strong className="font-semibold text-slate-900">{user.display_name}</strong> ({user.email})
        </p>
      )}
    </section>
  );
}
