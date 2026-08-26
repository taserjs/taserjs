import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <div className="relative min-h-screen">
      {/* Ambient top background glows matching home page (Desktop & Mobile) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-125 overflow-hidden z-0">
        <div
          className="landing-hero-glow-warm absolute inset-0 opacity-60 dark:opacity-40"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_0%,var(--landing-accent-22),transparent)] opacity-80"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--landing-accent-22),transparent)] sm:hidden opacity-70"
          aria-hidden
        />
      </div>

      <DocsLayout
        tree={source.getPageTree()}
        sidebar={{
          defaultOpenLevel: 2,
        }}
        {...baseOptions()}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
