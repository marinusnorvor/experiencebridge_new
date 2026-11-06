"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: true } },
  }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
    </QueryClientProvider>
  );
}
