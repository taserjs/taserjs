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

import { vfs, type VfsEvent } from "./vfs";

// Workers: bundling them explicitly (Vite `?worker`) and handing them to monaco
// is the only mode that works in both dev and production builds. Monaco's
// self-registration via `new Worker(new URL('...', import.meta.url))` resolves
// in the dev server but not from the bundled dist.
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

// Declaration files of taserjs packages + hono + @standard-schema/spec + zod,
// collected from the workspace at build time (see vite.config.ts). Registered
// under file:///node_modules/<name>/<path> so node-style resolution finds them.
for (const [relativePath, content] of Object.entries(taserDts)) {
  ts.typescriptDefaults.addExtraLib(content, `file:///${relativePath}`);
}

for (const [name, theme] of Object.entries({
  "pg-light": { base: "vs" as editor.BuiltinTheme, dark: false },
  "pg-dark": { base: "vs-dark" as editor.BuiltinTheme, dark: true },
})) {
  const { base, dark } = theme as { base: editor.BuiltinTheme; dark: boolean };
  editor.defineTheme(name, {
    base,
    inherit: true,
    rules: [
      { token: "comment", foreground: dark ? "6b7394" : "8a90a8", fontStyle: "italic" },
      { token: "string", foreground: dark ? "9ece6a" : "3a7a3a" },
    ],
    colors: {
      "editor.background": dark ? "#111420" : "#ffffff",
      "editor.foreground": dark ? "#e6e9f2" : "#17203a",
      "editorLineNumber.foreground": dark ? "#3a4054" : "#c3c7d4",
      "editorGutter.background": dark ? "#111420" : "#ffffff",
      "editor.lineHighlightBackground": dark ? "#1a1e2c" : "#f4f6fb",
      "editorSuggestWidget.background": dark ? "#141824" : "#ffffff",
      "editorSuggestWidget.border": dark ? "#232938" : "#e2e6f0",
      "editorSuggestWidget.foreground": dark ? "#e6e9f2" : "#17203a",
      "editorSuggestWidget.selectedBackground": dark ? "#222a3d" : "#eaf0fc",
      "editorSuggestWidget.selectedForeground": dark ? "#ffffff" : "#0b1020",
      "editorSuggestWidget.highlightForeground": dark ? "#7aa2ff" : "#3b82f6",
      "editorSuggestWidget.focusHighlightForeground": dark ? "#7aa2ff" : "#3b82f6",
      "editorSuggestWidgetStatus.foreground": dark ? "#8b93ab" : "#64748b",
      "editorHoverWidget.background": dark ? "#141824" : "#ffffff",
      "editorHoverWidget.border": dark ? "#232938" : "#e2e6f0",
      "editorHoverWidget.foreground": dark ? "#e6e9f2" : "#17203a",
    },
  });
}

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
const GENERATED_PREFIX = "/.taserjs/";

export function isGeneratedPath(path: string): boolean {
  return path.startsWith(GENERATED_PREFIX);
}

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
    const value = model.getValue();
    if (vfs.read(path) !== value) vfs.write(path, value, "editor");
  });
  models.set(path, model);
  return model;
}

let pumpTimer: number | undefined;

/**
 * Nudges a re-validate-all pass in the DiagnosticsAdapter. Monaco only
 * re-requested diagnostics for a file when *that file* changes, so a codegen
 * manifest rewrite leaves stale markers (e.g. `RoutePath` unions) on route
 * files that did not change themselves. `setDiagnosticsOptions` fires the
 * defaults' `onDidChange`, which revalidates every model.
 */
export function pumpDiagnostics(): void {
  window.clearTimeout(pumpTimer);
  pumpTimer = window.setTimeout(() => {
    ts.typescriptDefaults.setDiagnosticsOptions(ts.typescriptDefaults.getDiagnosticsOptions());
  }, 400);
}

/**
 * VFS -> Monaco model sync. External changes (hydrate, codegen) update the
 * models; editor-originated writes are ignored here to avoid echo loops.
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
      onUnlink?.(event.path);
    }
    if (event.origin !== "editor") pumpDiagnostics();
  };
  return vfs.watch(apply);
}

export function watchMarkers(callback: () => void): IDisposableLike {
  return editor.onDidChangeMarkers(() => callback());
}

export function markerCounts(): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const marker of editor.getModelMarkers({})) {
    if (marker.severity === MarkerSeverity.Error) errors += 1;
    else if (marker.severity === MarkerSeverity.Warning) warnings += 1;
  }
  return { errors, warnings };
}

/** Marker list for the status bar tooltip / debugging: which file, what message. */
export function markerDetails(): Array<{ resource: string; message: string }> {
  return editor.getModelMarkers({}).map((marker) => ({
    resource: marker.resource?.path ?? "?",
    message: `${marker.message} (line ${marker.startLineNumber})`,
  }));
}

export interface IDisposableLike {
  dispose(): void;
}

/** Intercepts Cmd/Ctrl+click navigation so go-to-definition switches VFS files. */
export function registerOpenFile(open: (path: string) => boolean): IDisposableLike {
  return editor.registerEditorOpener({
    openCodeEditor: (_source, resource) => {
      const path = decodeURIComponent(resource.path);
      return open(path);
    },
  });
}

export { editor, ts, Uri };
