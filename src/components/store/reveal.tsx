"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a section so it fades/slides in the first time it scrolls into
 * view, instead of just appearing. Cheap (one IntersectionObserver per
 * instance, no animation library) — used around the storefront's major
 * sections for a less "static page" feel.
 */
export function Reveal({ children, className, delayMs = 0, id }: { children: ReactNode; className?: string; delayMs?: number; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Users who scroll fast / prefer-reduced-motion still see the content —
    // this only ever adds a class, it never hides anything by default.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div id={id} ref={ref} className={`reveal ${visible ? "reveal-visible" : ""} ${className ?? ""}`} style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}>
      {children}
    </div>
  );
}
