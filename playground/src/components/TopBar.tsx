import { Toast } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  Loader2,
  Moon,
  RotateCcw,
  Share2,
  Sun,
} from "lucide-react";
import { useState } from "react";

import { writeHash } from "../persist";
import type { BuildStatus } from "../runner";
import { shortenUrl } from "../shorten";
import type { Theme } from "../theme";
import { ConfirmDialog } from "./ConfirmDialog";
import { TaserLogo } from "./TaserLogo";

interface TopBarProps {
  buildStatus: BuildStatus;
  inlayHints: boolean;
  onToggleInlayHints: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  oversizedUrl: boolean;
  onReset: () => void;
}

function StatusPill({ status }: { status: BuildStatus }): React.JSX.Element {
  if (status.phase === "booting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <Loader2 className="size-3 animate-spin" />
        Loading compiler
      </span>
    );
  }
  if (status.phase === "building") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
        <Loader2 className="size-3 animate-spin" />
        Building
      </span>
    );
  }
  if (status.phase === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/35 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
        <span className="size-1.5 rounded-full bg-rose-500" />
        {status.errors.length === 1 ? "1 build error" : `${status.errors.length} build errors`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Ready · {status.routes.length} {status.routes.length === 1 ? "route" : "routes"}
    </span>
  );
}

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}): React.JSX.Element {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-50">
          <Tooltip.Popup className="rounded-md border border-pg-border-strong bg-pg-surface px-2.5 py-1 text-[11px] font-medium text-pg-fg shadow-lg">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function TopBar({
  buildStatus,
  inlayHints,
  onToggleInlayHints,
  theme,
  onToggleTheme,
  oversizedUrl,
  onReset,
}: TopBarProps): React.JSX.Element {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const toastManager = Toast.useToastManager();

  const handleShare = async (): Promise<void> => {
    if (sharing) return;
    setSharing(true);
    try {
      const hashStatus = writeHash();
      if (hashStatus === "hard-limit") {
        toastManager.add({
          title: "Project too large to share",
          description:
            "Project exceeds the 32 KB URL share limit. Trim files to generate a shareable link.",
        });
        return;
      }
      const result = await shortenUrl(location.href);

      try {
        await navigator.clipboard.writeText(result.url);
        setCopied(true);
        if (result.shortened) {
          toastManager.add({
            title: "Short link copied",
            description: `${result.url} (via ${result.provider})`,
          });
        } else {
          const fallbackNote =
            result.reason === "local-origin"
              ? "Shortening is skipped on localhost — full link copied."
              : result.reason === "too-long" || oversizedUrl
                ? "Project exceeds shortener limit — full link copied."
                : "Shortener unavailable — full project link copied.";
          toastManager.add({
            title: "Project link copied",
            description: fallbackNote,
          });
        }
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toastManager.add({
          title: result.shortened ? "Short link ready" : "Could not copy link",
          description: result.shortened
            ? `${result.url} — clipboard access was blocked.`
            : "Copy the URL directly from your browser address bar.",
        });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <header className="pg-header-glow relative flex h-12 flex-none items-center justify-between gap-3 border-b border-pg-border bg-pg-panel px-3.5">
      {/* Left: Brand & Status */}
      <div className="flex min-w-0 items-center gap-3">
        <a
          href="https://taserjs.dev"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
        >
          <TaserLogo className="h-5 w-auto shrink-0" />
        </a>
        <span className="rounded-full border border-orange-500/30 bg-pg-accent-soft px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-pg-primary uppercase">
          Playground
        </span>
        <div className="hidden sm:block">
          <StatusPill status={buildStatus} />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {oversizedUrl && (
          <ActionTooltip label="Project exceeds 8 KB URL share limit; saved locally">
            <span className="mr-1 inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
              <span className="hidden md:inline">Large project</span>
            </span>
          </ActionTooltip>
        )}

        <ActionTooltip
          label={inlayHints ? "Hide inline TypeScript hints" : "Show inline TypeScript hints"}
        >
          <button
            type="button"
            onClick={onToggleInlayHints}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              inlayHints
                ? "border-orange-500/35 bg-pg-accent-soft text-pg-primary"
                : "border-transparent text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
            }`}
          >
            <Code2 className="size-3.5" />
            <span className="hidden md:inline">Hints</span>
          </button>
        </ActionTooltip>

        <ActionTooltip label="Create and copy a short shareable link">
          <button
            type="button"
            disabled={sharing}
            onClick={() => void handleShare()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-pg-border bg-pg-surface px-2.5 py-1 text-xs font-medium text-pg-fg transition-colors hover:bg-pg-hover disabled:cursor-wait disabled:opacity-70"
          >
            {sharing ? (
              <Loader2 className="size-3.5 animate-spin text-pg-primary" />
            ) : copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Share2 className="size-3.5 text-pg-fg-muted" />
            )}
            <span className="hidden sm:inline">
              {sharing ? "Sharing…" : copied ? "Copied" : "Share"}
            </span>
          </button>
        </ActionTooltip>

        <ActionTooltip label="Reset to default starter project">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-pg-fg-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden lg:inline">Reset</span>
          </button>
        </ActionTooltip>

        <span className="mx-1 h-4 w-px bg-pg-border" aria-hidden />

        <ActionTooltip label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-pg-fg-muted transition-colors hover:bg-pg-hover hover:text-pg-fg"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </ActionTooltip>

        <ActionTooltip label="Taser.js Documentation">
          <a
            href="https://taserjs.dev/docs"
            target="_blank"
            rel="noreferrer"
            aria-label="Documentation"
            className="inline-flex size-7 items-center justify-center rounded-lg text-pg-fg-muted transition-colors hover:bg-pg-hover hover:text-pg-fg"
          >
            <BookOpen className="size-4" />
          </a>
        </ActionTooltip>

        <ActionTooltip label="GitHub Repository">
          <a
            href="https://github.com/taserjs/taserjs"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex size-7 items-center justify-center rounded-lg text-pg-fg-muted transition-colors hover:bg-pg-hover hover:text-pg-fg"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              className="size-4 shrink-0"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </ActionTooltip>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset playground project?"
        description="This will restore the default starter routes, layout, and taser.ts configuration. Your current edits will be replaced."
        confirmLabel="Reset project"
        destructive
        onConfirm={onReset}
      />
    </header>
  );
}
