import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, FileCode2, X } from "lucide-react";
import * as monaco from "monaco-editor";
import { useEffect, useMemo, useRef, useState } from "react";

import { LAYOUT_BADGE_CLASS, methodBadgeClass } from "../method-styles";
import {
  ensureModel,
  markerList,
  MONACO_THEMES,
  watchMarkers,
  type EditorDiagnostic,
} from "../monaco";
import { getFileMeta } from "../scaffold";
import type { Theme } from "../theme";
import { FileGlyph } from "./FileTree";

export interface JumpTarget {
  path: string;
  line: number;
  column: number;
  nonce: number;
}

interface EditorPaneProps {
  active: string | null;
  openFiles: string[];
  theme: Theme;
  inlayHints: boolean;
  jumpTarget: JumpTarget | null;
  onOpen: (path: string) => void;
  onCloseTab: (path: string) => void;
  onJumpTo: (path: string, line: number, column?: number) => void;
}

export function EditorPane({
  active,
  openFiles,
  theme,
  inlayHints,
  jumpTarget,
  onOpen,
  onCloseTab,
  onJumpTo,
}: EditorPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [diagnostics, setDiagnostics] = useState<EditorDiagnostic[]>([]);
  const [problemsOpen, setProblemsOpen] = useState(false);

  const errorCount = useMemo(
    () => diagnostics.filter((d) => d.severity === "error").length,
    [diagnostics],
  );
  const warningCount = diagnostics.length - errorCount;
  const activeMeta = active ? getFileMeta(active) : null;

  useEffect(() => {
    if (!hostRef.current) return;
    const instance = monaco.editor.create(hostRef.current, {
      theme: MONACO_THEMES[theme],
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontLigatures: true,
      fontSize: 13.5,
      lineHeight: 22,
      tabSize: 2,
      scrollBeyondLastLine: false,
      renderWhitespace: "selection",
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      padding: { top: 14, bottom: 14 },
      inlayHints: {
        enabled: inlayHints ? "on" : "off",
        fontSize: 11.5,
        padding: true,
        maximumLength: 60,
      },
      fixedOverflowWidgets: true,
      suggestFontSize: 12.5,
      suggestLineHeight: 24,
      suggest: {
        showIcons: true,
        showStatusBar: true,
        showInlineDetails: true,
        preview: true,
        filterGraceful: true,
        localityBonus: true,
        shareSuggestSelections: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      parameterHints: {
        enabled: true,
      },
    });
    editorRef.current = instance;
    const stopMarkers = watchMarkers(() => setDiagnostics(markerList()));
    setDiagnostics(markerList());
    return () => {
      stopMarkers.dispose();
      instance.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; theme/inlay updated below
  }, []);

  useEffect(() => {
    monaco.editor.setTheme(MONACO_THEMES[theme]);
  }, [theme]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) return;
    instance.setModel(active ? ensureModel(active) : null);
    instance.updateOptions({
      readOnly: false,
      inlayHints: {
        enabled: inlayHints ? "on" : "off",
        fontSize: 11.5,
        padding: true,
        maximumLength: 60,
      },
    });
  }, [active, inlayHints]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance || !jumpTarget || jumpTarget.path !== active) return;
    const position = { lineNumber: jumpTarget.line, column: jumpTarget.column };
    instance.setPosition(position);
    instance.revealPositionInCenter(position);
    instance.focus();
  }, [active, jumpTarget]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-pg-surface">
      {/* Tab bar */}
      <div className="flex h-9 flex-none items-stretch overflow-x-auto border-b border-pg-border bg-pg-panel">
        {openFiles.map((path) => {
          const isCurrent = path === active;
          const label = path.replace(/^\//, "");
          return (
            <div
              key={path}
              role="tab"
              aria-selected={isCurrent}
              onClick={() => onOpen(path)}
              className={`group relative flex shrink-0 cursor-pointer items-center gap-2 border-r border-pg-border px-3 font-mono text-xs transition-colors ${
                isCurrent
                  ? "bg-pg-surface font-medium text-pg-fg"
                  : "text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
              }`}
            >
              {isCurrent && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-pg-primary" aria-hidden />
              )}
              <FileGlyph path={path} className="size-3.5 shrink-0" />
              <span>{label}</span>
              <button
                type="button"
                aria-label={`Close ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(path);
                }}
                className={`ml-0.5 flex size-4 cursor-pointer items-center justify-center rounded transition-opacity hover:bg-pg-muted hover:text-pg-fg ${
                  isCurrent ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70"
                }`}
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor canvas */}
      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className={`h-full w-full ${active ? "visible" : "invisible"}`} />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl border border-pg-border bg-pg-panel text-pg-fg-muted">
              <FileCode2 className="size-5" />
            </div>
            <p className="text-sm font-medium text-pg-fg">No file open</p>
            <p className="max-w-xs text-xs text-pg-fg-muted">
              Select a route, layout, or <code className="font-mono">taser.ts</code> from the
              explorer to start editing.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Problems drawer */}
      {problemsOpen && (
        <div className="flex max-h-44 flex-none flex-col border-t border-pg-border bg-pg-panel">
          <div className="flex h-7 flex-none items-center justify-between border-b border-pg-border px-3">
            <span className="text-[11px] font-semibold tracking-wider text-pg-fg-muted uppercase">
              Problems ({diagnostics.length})
            </span>
            <button
              type="button"
              onClick={() => setProblemsOpen(false)}
              className="flex size-5 cursor-pointer items-center justify-center rounded text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {diagnostics.length === 0 ? (
              <p className="px-3 py-2 text-xs text-pg-fg-muted">
                No TypeScript diagnostics across project files.
              </p>
            ) : (
              diagnostics.map((item) => (
                <button
                  key={`${item.path}:${item.line}:${item.column}:${item.message}`}
                  type="button"
                  onClick={() => onJumpTo(item.path, item.line, item.column)}
                  className="flex w-full cursor-pointer items-start gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-pg-hover"
                >
                  {item.severity === "error" ? (
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  )}
                  <span className="min-w-0 flex-1 text-pg-fg">{item.message}</span>
                  <span className="shrink-0 font-mono text-[11px] text-pg-fg-muted">
                    {item.path.replace(/^\//, "")}:{item.line}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex h-7 flex-none items-center justify-between gap-3 border-t border-pg-border bg-pg-panel px-2.5 font-mono text-[11px] text-pg-fg-muted">
        <button
          type="button"
          onClick={() => setProblemsOpen((open) => !open)}
          className="inline-flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 transition-colors hover:bg-pg-hover hover:text-pg-fg"
        >
          <span
            className={`inline-flex items-center gap-1 ${
              errorCount > 0 ? "text-rose-500 font-medium" : ""
            }`}
          >
            <AlertCircle className="size-3" />
            {errorCount}
          </span>
          <span
            className={`inline-flex items-center gap-1 ${
              warningCount > 0 ? "text-amber-500 font-medium" : ""
            }`}
          >
            <AlertTriangle className="size-3" />
            {warningCount}
          </span>
          {problemsOpen ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </button>

        <div className="flex min-w-0 items-center gap-2">
          {activeMeta?.kind === "route" && (
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span
                className={`rounded border px-1.5 py-0 text-[10px] font-semibold ${methodBadgeClass(
                  activeMeta.method,
                )}`}
              >
                {activeMeta.method}
              </span>
              <span className="truncate text-pg-fg">{activeMeta.canonicalPath}</span>
              <span className="text-pg-border-strong" aria-hidden>
                ·
              </span>
            </span>
          )}
          {activeMeta?.kind === "layout" && (
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <span
                className={`rounded border px-1.5 py-0 text-[10px] font-semibold uppercase ${LAYOUT_BADGE_CLASS}`}
              >
                LAYOUT
              </span>
              <span className="truncate text-pg-fg">{activeMeta.layoutId}</span>
              <span className="text-pg-border-strong" aria-hidden>
                ·
              </span>
            </span>
          )}
          {active && (
            <span className="truncate text-pg-fg-muted/80">{active.replace(/^\//, "")}</span>
          )}
        </div>
      </div>
    </section>
  );
}
