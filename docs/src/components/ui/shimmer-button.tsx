import type { AnchorHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface ShimmerButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
}

/**
 * Animated perimeter-shimmer CTA link styled in Taser.js's warm orange accent.
 */
export function ShimmerButton({ children, className, ...props }: ShimmerButtonProps) {
  return (
    <a
      {...props}
      className={cn(
        "group relative inline-flex overflow-hidden rounded-xl p-[1.5px] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_-4px_var(--landing-accent-40)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring",
        className,
      )}
    >
      {/* Subtle static border fallback so the outline stays crisp where the beam is transparent */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl bg-fd-border/90 transition-colors duration-300 group-hover:bg-orange-500/35"
      />
      {/* Rotating warm shimmer beam */}
      <span
        aria-hidden
        className="landing-shimmer-beam pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[260%]"
      />
      {/* Inner button surface */}
      <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-[calc(0.75rem-1.5px)] bg-fd-background/95 px-5 py-[11px] text-sm font-medium text-fd-foreground backdrop-blur-sm transition-colors duration-300 group-hover:bg-fd-background dark:bg-neutral-950/95 dark:group-hover:bg-neutral-950">
        <span
          aria-hidden
          className="landing-shimmer-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-50"
        />
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </span>
    </a>
  );
}
