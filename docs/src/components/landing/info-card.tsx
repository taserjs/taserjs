import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

interface CheckListProps {
  items: string[];
  className?: string;
  icon?: ReactNode;
}

export function CheckList({ items, className, icon }: CheckListProps) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm text-fd-muted-foreground">
          {icon ?? (
            <Check
              className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface InfoCardProps {
  icon: ReactNode;
  iconTone?: import("./feature-card").IconTone;
  title: string;
  children: ReactNode;
  className?: string;
}

const badgeTones = {
  violet: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  orange:
    "border-[color-mix(in_oklab,var(--landing-accent)_25%,transparent)] bg-[color-mix(in_oklab,var(--landing-accent)_12%,transparent)] text-landing-accent",
} as const;

export function InfoCard({ icon, iconTone = "violet", title, children, className }: InfoCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-fd-border bg-fd-card p-6 shadow-sm transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg hover:border-fd-primary/25",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-10 items-center justify-center rounded-lg border shadow-sm [&_svg]:size-5",
          badgeTones[iconTone],
        )}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

interface CalloutCardProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CalloutCard({ icon, children, className }: CalloutCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-fd-border bg-fd-muted/25 p-6",
        icon && "flex gap-4",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-fd-border bg-fd-card text-landing-accent [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-sm leading-relaxed text-fd-muted-foreground">{children}</p>
    </div>
  );
}
