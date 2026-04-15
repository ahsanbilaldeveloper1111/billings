"use client";

import type { ReactNode } from "react";

type SmoothCollapseProps = {
  open: boolean;
  children: ReactNode;
  /** Extra classes on the grid wrapper (e.g. spacing). */
  className?: string;
};

/**
 * Height animation via CSS grid `0fr` → `1fr` (content stays mounted).
 * Prefer over conditional mount so open/close feels smooth.
 */
export function SmoothCollapse({ open, children, className = "" }: SmoothCollapseProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
