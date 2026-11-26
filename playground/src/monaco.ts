import { editor, MarkerSeverity, typescript as ts, Uri } from "monaco-editor";
// eslint-disable-next-line import/default -- side-effect language registration
import editorWorkerSource from "monaco-editor/esm/vs/editor/editor.worker.js?worker";
// eslint-disable-next-line import/default -- side-effect language registration
import cssWorkerSource from "monaco-editor/esm/vs/language/css/css.worker.js?worker";
// eslint-disable-next-line import/default -- side-effect language registration
import htmlWorkerSource from "monaco-editor/esm/vs/language/html/html.worker.js?worker";
// eslint-disable-next-line import/default -- side-effect language registration
import jsonWorkerSource from "monaco-editor/esm/vs/language/json/json.worker.js?worker";
// eslint-disable-next-line import/default -- side-effect language registration
import tsWorkerSource from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";
import taserDts from "virtual:taser-dts";

import type { Theme } from "./theme";
import { isGeneratedPath, isHiddenPath, vfs, type VfsEvent } from "./vfs";

// Workers: bundling them explicitly (Vite `?worker`) and handing them to monaco
// is the only mode that works in both dev and production builds.
self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case "typescript":
      case "javascript":
        return new tsWorkerSource();
      case "json":
        return new jsonWorkerSource();
      case "css":
        return new cssWorkerSource();
      case "html":
        return new htmlWorkerSource();
      default:
        return new editorWorkerSource();
    }
  },
};

ts.typescriptDefaults.setCompilerOptions({
  strict: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  allowNonTsExtensions: true,
  noEmit: true,
  esModuleInterop: true,
  lib: ["es2020", "dom", "dom.iterable"],
});
ts.typescriptDefaults.setEagerModelSync(true);
ts.typescriptDefaults.setInlayHintsOptions({
  includeInlayParameterNameHints: "literals",
  includeInlayParameterNameHintsWhenArgumentMatchesName: false,
  includeInlayFunctionParameterTypeHints: true,
  includeInlayVariableTypeHints: true,
  includeInlayPropertyDeclarationTypeHints: true,
  includeInlayFunctionLikeReturnTypeHints: true,
  includeInlayEnumMemberValueHints: true,
});

// Declaration files of taserjs packages + hono + @standard-schema/spec + zod,
// collected from the workspace at build time (see vite.config.ts).
for (const [relativePath, content] of Object.entries(taserDts)) {
  ts.typescriptDefaults.addExtraLib(content, `file:///${relativePath}`);
}

export const MONACO_THEMES: Record<Theme, string> = {
  dark: "taser-dark",
  light: "taser-light",
};

editor.defineTheme("taser-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6e6e73", fontStyle: "italic" },
    { token: "keyword", foreground: "fb923c" },
    { token: "string", foreground: "86efac" },
    { token: "number", foreground: "fdba74" },
    { token: "type.identifier", foreground: "93c5fd" },
    { token: "delimiter", foreground: "a1a1aa" },
  ],
  colors: {
    "editor.background": "#171717",
    "editor.foreground": "#ededed",
    "editorLineNumber.foreground": "#525252",
    "editorLineNumber.activeForeground": "#fb923c",
    "editorGutter.background": "#171717",
    "editorCursor.foreground": "#f97316",
    "editor.lineHighlightBackground": "#1f1f1f",
    "editor.selectionBackground": "#f9731633",
    "editor.inactiveSelectionBackground": "#f973161a",
    "editorIndentGuide.background1": "#262626",
    "editorIndentGuide.activeBackground1": "#404040",
    "editorWidget.background": "#1c1c1c",
    "editorWidget.border": "#2e2e2e",
    "editorSuggestWidget.background": "#1b1b1b",
    "editorSuggestWidget.border": "#2e2e2e",
    "editorSuggestWidget.foreground": "#ededed",
    "editorSuggestWidget.selectedBackground": "#f9731624",
    "editorSuggestWidget.selectedForeground": "#ffffff",
    "editorSuggestWidget.highlightForeground": "#fb923c",
    "editorSuggestWidget.focusHighlightForeground": "#fb923c",
    "editorSuggestWidgetStatus.foreground": "#8f8f8f",
    "editorHoverWidget.background": "#1b1b1b",
    "editorHoverWidget.border": "#2e2e2e",
    "editorHoverWidget.foreground": "#ededed",
    "editorInlayHint.background": "#262626",
    "editorInlayHint.foreground": "#a1a1aa",
    "scrollbarSlider.background": "#ffffff18",
    "scrollbarSlider.hoverBackground": "#ffffff28",
    "scrollbarSlider.activeBackground": "#ffffff38",
  },
});

editor.defineTheme("taser-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8e8e93", fontStyle: "italic" },
    { token: "keyword", foreground: "c2410c" },
    { token: "string", foreground: "15803d" },
    { token: "number", foreground: "b45309" },
    { token: "type.identifier", foreground: "0369a1" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#171717",
    "editorLineNumber.foreground": "#a3a3a3",
    "editorLineNumber.activeForeground": "#ea580c",
    "editorGutter.background": "#ffffff",
    "editorCursor.foreground": "#ea580c",
    "editor.lineHighlightBackground": "#f7f7f8",
    "editor.selectionBackground": "#f973162b",
    "editor.inactiveSelectionBackground": "#f9731614",
    "editorIndentGuide.background1": "#eeeeee",
    "editorIndentGuide.activeBackground1": "#d4d4d4",
    "editorWidget.background": "#ffffff",
    "editorWidget.border": "#e4e4e7",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.border": "#e4e4e7",
    "editorSuggestWidget.foreground": "#171717",
    "editorSuggestWidget.selectedBackground": "#ff7f041c",
    "editorSuggestWidget.selectedForeground": "#0a0a0b",
    "editorSuggestWidget.highlightForeground": "#ea580c",
    "editorSuggestWidget.focusHighlightForeground": "#ea580c",
    "editorSuggestWidgetStatus.foreground": "#737373",
    "editorHoverWidget.background": "#ffffff",
    "editorHoverWidget.border": "#e4e4e7",
    "editorHoverWidget.foreground": "#171717",
    "editorInlayHint.background": "#f4f4f5",
    "editorInlayHint.foreground": "#52525b",
  },
});

export function languageOf(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "mjs":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

const models = new Map<string, editor.ITextModel>();

export function getModel(path: string): editor.ITextModel | undefined {
  return models.get(path);
}

/** Creates (or reuses) the Monaco model for a VFS path and wires editor edits back into the VFS. */
export function ensureModel(path: string): editor.ITextModel {
  const existing = models.get(path);
  if (existing) return existing;
  const content = vfs.read(path) ?? "";
  const model = editor.createModel(content, languageOf(path), Uri.parse(`file://${path}`));
  model.updateOptions({ tabSize: 2 });
  model.onDidChangeContent(() => {
    if (isGeneratedPath(path)) return;
    const value = model.getValue();
    if (vfs.read(path) !== value) vfs.write(path, value, "editor");
  });
  models.set(path, model);
  return model;
}

let pumpTimer: number | undefined;

/**
 * Nudges a re-validate-all pass in the DiagnosticsAdapter so manifest updates
 * refresh markers on route files that did not change themselves.
 */
export function pumpDiagnostics(): void {
  window.clearTimeout(pumpTimer);
  pumpTimer = window.setTimeout(() => {
    ts.typescriptDefaults.setDiagnosticsOptions(ts.typescriptDefaults.getDiagnosticsOptions());
  }, 400);
}

/**
 * VFS -> Monaco model sync. Internal `/.taserjs/routes.gen.ts` is kept synced
 * as a hidden model so TS cross-file inference works without exposing it in UI.
 */
export function startModelSync(onUnlink?: (path: string) => void): () => void {
  const apply = (event: VfsEvent): void => {
    if (event.type === "add") {
      ensureModel(event.path);
    } else if (event.type === "change") {
      if (event.origin !== "editor") {
        const model = models.get(event.path);
        const content = vfs.read(event.path) ?? "";
        if (model && model.getValue() !== content) model.setValue(content);
      }
    } else {
      const model = models.get(event.path);
      models.delete(event.path);
      model?.dispose();
      if (!isHiddenPath(event.path)) onUnlink?.(event.path);
    }
    if (event.origin !== "editor") pumpDiagnostics();
  };
  return vfs.watch(apply);
}

export interface EditorDiagnostic {
  path: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export function watchMarkers(callback: () => void): IDisposableLike {
  return editor.onDidChangeMarkers(() => callback());
}

/** Returns user-facing diagnostics (errors & warnings, excluding hidden generated files). */
export function markerList(): EditorDiagnostic[] {
  const out: EditorDiagnostic[] = [];
  for (const marker of editor.getModelMarkers({})) {
    const path = marker.resource?.path ?? "";
    if (!path || isHiddenPath(path)) continue;
    if (marker.severity !== MarkerSeverity.Error && marker.severity !== MarkerSeverity.Warning) {
      continue;
    }
    out.push({
      path,
      line: marker.startLineNumber,
      column: marker.startColumn,
      message: marker.message,
      severity: marker.severity === MarkerSeverity.Error ? "error" : "warning",
    });
  }
  out.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
    if (a.path !== b.path) return a.path < b.path ? -1 : 1;
    return a.line - b.line || a.column - b.column;
  });
  return out;
}

export interface IDisposableLike {
  dispose(): void;
}

/** Intercepts Cmd/Ctrl+click navigation so go-to-definition switches VFS files (ignoring hidden files). */
export function registerOpenFile(
  open: (path: string, line?: number, column?: number) => boolean,
): IDisposableLike {
  return editor.registerEditorOpener({
    openCodeEditor: (_source, resource, selectionOrPosition) => {
      const path = decodeURIComponent(resource.path);
      if (isHiddenPath(path)) return false;
      const line =
        selectionOrPosition && "startLineNumber" in selectionOrPosition
          ? selectionOrPosition.startLineNumber
          : selectionOrPosition?.lineNumber;
      const column =
        selectionOrPosition && "startColumn" in selectionOrPosition
          ? selectionOrPosition.startColumn
          : selectionOrPosition?.column;
      return open(path, line, column);
    },
  });
}

export { editor, isGeneratedPath, ts, Uri };
