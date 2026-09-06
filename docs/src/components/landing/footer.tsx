import Link from "next/link";
import { Logo } from "@/components/logo";
import { GithubIcon } from "@/components/icons/github-icon";
import { DiscordIcon } from "@/components/icons/discord-icon";
import { XIcon } from "@/components/icons/x-icon";
import { FileCode, FileText, Globe, Sparkles } from "lucide-react";
import { SectionSeparator } from "./section-separator";
import { gitConfig } from "@/lib/shared";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-fd-border bg-fd-card/30 backdrop-blur-sm">
      <SectionSeparator />
      <div className="mx-auto max-w-(--fd-layout-width) px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <Logo className="h-6" />
            </Link>
            <p className="text-xs leading-relaxed text-fd-muted-foreground">
              Deterministic, type-safe REST API framework for TypeScript. File-based routing,
              cascading layouts, and zero-drift client RPC.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
                target="_blank"
                rel="noreferrer"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                aria-label="GitHub"
              >
                <GithubIcon className="size-4" />
              </a>
              <a
                href="https://discord.gg/Q3AQUBKqt"
                target="_blank"
                rel="noreferrer"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                aria-label="Discord"
              >
                <DiscordIcon className="size-4" />
              </a>
              <a
                href="https://x.com/taserjs"
                target="_blank"
                rel="noreferrer"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
                aria-label="X (Twitter)"
              >
                <XIcon className="size-4" />
              </a>
            </div>
          </div>

          {/* Documentation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-fd-foreground uppercase">
              Documentation
            </h4>
            <ul className="space-y-2 text-xs text-fd-muted-foreground">
              <li>
                <Link
                  href="/docs/getting-started"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Quickstart Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/routing/defining-routes"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Defining Routes
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/routing/file-conventions"
                  className="transition-colors hover:text-fd-foreground"
                >
                  File Conventions
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/routing/layouts-and-middleware"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Middleware & Layouts
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/getting-started/migration"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Migration Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* AI & Developer Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-fd-foreground uppercase">
              AI & Automation
            </h4>
            <ul className="space-y-2 text-xs text-fd-muted-foreground">
              <li>
                <Link
                  href="/#skills"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-fd-foreground"
                >
                  <Sparkles className="size-3 text-orange-500" />
                  <span>Agent Skill</span>
                </Link>
              </li>
              <li>
                <a
                  href="/llms.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-fd-foreground"
                >
                  <FileText className="size-3 text-sky-500" />
                  <span>llms.txt</span>
                </a>
              </li>
              <li>
                <a
                  href="/llms-full.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-fd-foreground"
                >
                  <FileCode className="size-3 text-emerald-500" />
                  <span>llms-full.txt</span>
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-fd-foreground"
                >
                  <Globe className="size-3 text-violet-500" />
                  <span>Sitemap</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Ecosystem Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wider text-fd-foreground uppercase">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs text-fd-muted-foreground">
              <li>
                <Link href="/docs/client" className="transition-colors hover:text-fd-foreground">
                  Client RPC SDK
                </Link>
              </li>
              <li>
                <Link href="/docs/cli" className="transition-colors hover:text-fd-foreground">
                  Router CLI
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/plugins/vite"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Vite Plugin
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/frameworks/nextjs"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Next.js App Router
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/validation/standard-schema"
                  className="transition-colors hover:text-fd-foreground"
                >
                  Standard Schema
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-fd-border/60 pt-8 sm:flex-row">
          <p className="text-xs text-fd-muted-foreground">
            © {currentYear} Taser.js. Released under the MIT License.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-fd-muted-foreground">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-fd-foreground"
            >
              llms.txt
            </a>
            <span className="text-fd-border">•</span>
            <a
              href="/llms-full.txt"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-fd-foreground"
            >
              llms-full.txt
            </a>
            <span className="text-fd-border">•</span>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-fd-foreground"
            >
              sitemap.xml
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
