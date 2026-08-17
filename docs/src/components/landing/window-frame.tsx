import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface WindowFrameProps {
  title?: ReactNode;
  badge?: ReactNode;
  subHeader?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  tone?: "default" | "orange" | "rose" | "emerald" | "purple";
}

const toneStyles = {
  default: "border-fd-border",
  orange: "border-fd-border ring-1 ring-orange-500/25",
  rose: "border-rose-500/25 shadow-rose-500/5",
  emerald: "border-emerald-500/25 ring-1 ring-emerald-500/20",
  purple: "border-purple-500/25 ring-1 ring-purple-500/20",
};

const toneHeaderStyles = {
  default: "border-fd-border bg-fd-muted/40",
  orange: "border-fd-border bg-fd-muted/40",
  rose: "border-rose-500/15 bg-rose-500/5",
  emerald: "border-emerald-500/15 bg-emerald-500/5",
  purple: "border-purple-500/15 bg-purple-500/5",
};

export function WindowFrame({
  title,
  badge,
  subHeader,
  children,
  className,
  headerClassName,
  tone = "default",
}: WindowFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-fd-card shadow-lg shadow-black/5 dark:shadow-black/30 transition-all",
        toneStyles[tone],
        className,
      )}
    >
      {/* Window Top Chrome Bar */}
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-2.5 sm:py-3",
          toneHeaderStyles[tone],
          headerClassName,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="size-2.5 sm:size-3 rounded-full bg-red-500/80" />
            <span className="size-2.5 sm:size-3 rounded-full bg-yellow-500/80" />
            <span className="size-2.5 sm:size-3 rounded-full bg-green-500/80" />
          </div>
          {title ? (
            typeof title === "string" ? (
              <span className="ml-1.5 font-mono text-xs font-semibold text-fd-foreground truncate">
                {title}
              </span>
            ) : (
              <div className="ml-1.5 flex items-center min-w-0">{title}</div>
            )
          ) : null}
        </div>

        {badge ? <div className="shrink-0 ml-2">{badge}</div> : null}
      </div>

      {/* Optional Subheader (e.g. filename, column titles) */}
      {subHeader ? (
        <div className="border-b border-fd-border/60 bg-fd-muted/20">{subHeader}</div>
      ) : null}

      {/* Content */}
      {children}
    </div>
  );
}
