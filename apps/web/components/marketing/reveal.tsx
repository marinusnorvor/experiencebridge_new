"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Fade/slide-up once when scrolled into view (respects prefers-reduced-motion). */
export function Reveal({ children, delay = 0, className, as = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const Component = as === "li" ? motion.li : motion.div;
  if (reduce) return <Component className={className}>{children}</Component>;
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.28, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </Component>
  );
}
