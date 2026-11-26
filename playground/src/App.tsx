import { Toast } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import { Code2, FolderTree, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { BrowserPane } from "./components/BrowserPane";
import { EditorPane, type JumpTarget } from "./components/EditorPane";
import { FileTree } from "./components/FileTree";
import { TopBar } from "./components/TopBar";
import { ensureModel, registerOpenFile, startModelSync } from "./monaco";
import {
  isOversized,
  loadInitial,
  onExternalHash,
  setActivePathProvider,
  subscribeOversized,
  writeHash,
  writeMirror,
} from "./persist";
import { getBuildStatus, rebuild, subscribeBuildStatus, syncManifest } from "./runner";
import { DEFAULT_ACTIVE, starterProject } from "./starter";
import { useTheme } from "./theme";
import { isHiddenPath, vfs } from "./vfs";

import "./global.css";

const NARROW_MEDIA_QUERY = "(max-width: 1023px)";
const narrowMedia = typeof window !== "undefined" ? window.matchMedia(NARROW_MEDIA_QUERY) : null;

function subscribeNarrow(callback: () => void): () => void {
  if (!narrowMedia) return () => undefined;
  narrowMedia.addEventListener("change", callback);
  return () => narrowMedia.removeEventListener("change", callback);
}

function useNarrowLayout(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => narrowMedia?.matches ?? false,
    () => false,
  );
}

const PERSIST_DEBOUNCE_MS = 200;
const SCAN_DEBOUNCE_MS = 150;
const BUILD_DEBOUNCE_MS = 300;

let persistTimer: number | undefined;
function persistSoon(): void {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    writeHash();
    writeMirror();
  }, PERSIST_DEBOUNCE_MS);
}

function ToastList(): React.JSX.Element {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="flex items-start justify-between gap-2 rounded-xl border border-pg-border-strong bg-pg-surface p-3 shadow-2xl"
          >
            <div className="min-w-0">
              {toast.title && (
                <Toast.Title className="text-xs font-semibold text-pg-fg">
                  {toast.title}
                </Toast.Title>
              )}
              {toast.description && (
                <Toast.Description className="mt-0.5 text-[11px] leading-relaxed text-pg-fg-muted">
                  {toast.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close
              aria-label="Dismiss notification"
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
            >
              <X className="size-3.5" />
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

let booted = false;

function ensureBooted(): string | null {
  if (!booted) {
    booted = true;
    const initial = loadInitial();
    vfs.hydrate(
      Object.keys(initial.files).length > 0 ? initial.files : starterProject(),
      "hydrate",
    );
    let nextActive = initial.active;
    if (!nextActive || isHiddenPath(nextActive) || !vfs.has(nextActive)) {
      nextActive = DEFAULT_ACTIVE;
    }
    if (!vfs.has(nextActive)) nextActive = vfs.listVisible()[0] ?? null;
    for (const path of vfs.list()) ensureModel(path);
    return nextActive;
  }
  const visible = vfs.listVisible();
  return vfs.has(DEFAULT_ACTIVE) ? DEFAULT_ACTIVE : (visible[0] ?? null);
}

function PlaygroundShell(): React.JSX.Element {
  const narrow = useNarrowLayout();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"files" | "code" | "runner">("code");
  const [initialActive] = useState<string | null>(() => ensureBooted());
  const [active, setActive] = useState<string | null>(initialActive);
  const [openFiles, setOpenFiles] = useState<string[]>(() =>
    initialActive ? [initialActive] : [],
  );
  const [inlayHints, setInlayHints] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);

  const activeRef = useRef<string | null>(initialActive);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // VFS version drives re-renders of panels that read the file list directly.
  useSyncExternalStore(
    (callback) => vfs.subscribe(() => callback()),
    () => vfs.version,
  );

  const buildStatus = useSyncExternalStore(subscribeBuildStatus, getBuildStatus, getBuildStatus);
  const oversizedUrl = useSyncExternalStore(subscribeOversized, isOversized, () => false);

  const openFile = useCallback((path: string): void => {
    if (isHiddenPath(path) || !vfs.has(path)) return;
    ensureModel(path);
    setActive(path);
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
    if (narrowMedia?.matches) setMode("code");
    persistSoon();
  }, []);

  const jumpTo = useCallback(
    (path: string, line = 1, column = 1): void => {
      if (isHiddenPath(path) || !vfs.has(path)) return;
      openFile(path);
      setJumpTarget({ path, line, column, nonce: Date.now() });
    },
    [openFile],
  );

  const closeTab = useCallback((path: string): void => {
    setOpenFiles((prev) => {
      const next = prev.filter((candidate) => candidate !== path);
      if (activeRef.current === path) {
        setActive(next.at(-1) ?? null);
      }
      return next;
    });
  }, []);

  const handleRenamePath = useCallback(
    (oldPath: string, newPath: string, isFolder: boolean): void => {
      const remap = (candidate: string): string => {
        if (!isFolder) return candidate === oldPath ? newPath : candidate;
        if (candidate === oldPath || candidate.startsWith(`${oldPath}/`)) {
          return `${newPath}${candidate.slice(oldPath.length)}`;
        }
        return candidate;
      };
      setOpenFiles((prev) => [...new Set(prev.map(remap))]);
      setActive((current) => (current ? remap(current) : current));
      persistSoon();
    },
    [],
  );

  const handleReset = useCallback((): void => {
    vfs.hydrate(starterProject(), "ui");
    setActive(DEFAULT_ACTIVE);
    setOpenFiles([DEFAULT_ACTIVE]);
    for (const path of vfs.list()) ensureModel(path);
    syncManifest();
    writeHash();
    writeMirror();
    void rebuild();
  }, []);

  useEffect(() => {
    setActivePathProvider(() => activeRef.current);

    let scanTimer: number | undefined;
    let buildTimer: number | undefined;
    let hashTimer: number | undefined;

    const stopWatch = vfs.watch((event) => {
      if (event.origin === "codegen") return;
      if (event.path.startsWith("/routes/")) {
        window.clearTimeout(scanTimer);
        scanTimer = window.setTimeout(() => syncManifest(), SCAN_DEBOUNCE_MS);
      }
      window.clearTimeout(buildTimer);
      buildTimer = window.setTimeout(() => {
        void rebuild();
      }, BUILD_DEBOUNCE_MS);
      window.clearTimeout(hashTimer);
      hashTimer = window.setTimeout(() => {
        writeHash();
        writeMirror();
      }, BUILD_DEBOUNCE_MS);
    });

    const stopModelSync = startModelSync((unlinked) => {
      setOpenFiles((prev) => {
        if (!prev.includes(unlinked)) return prev;
        const next = prev.filter((item) => item !== unlinked);
        if (activeRef.current === unlinked) {
          setActive(next.at(-1) ?? vfs.listVisible()[0] ?? null);
        }
        return next;
      });
    });

    syncManifest();
    void rebuild();
    writeHash();
    writeMirror();

    const stopOpener = registerOpenFile((path, line, column) => {
      if (isHiddenPath(path) || !vfs.has(path)) return false;
      if (line !== undefined) jumpTo(path, line, column ?? 1);
      else openFile(path);
      return true;
    });

    const stopHash = onExternalHash((state) => {
      if (!state) {
        persistSoon();
        return;
      }
      vfs.hydrate(Object.keys(state.files).length > 0 ? state.files : starterProject(), "hydrate");
      const visible = vfs.listVisible();
      const swappedActive =
        state.active && !isHiddenPath(state.active) && vfs.has(state.active)
          ? state.active
          : (visible[0] ?? null);
      setActive(swappedActive);
      setOpenFiles(swappedActive ? [swappedActive] : []);
      for (const path of vfs.list()) ensureModel(path);
      syncManifest();
      void rebuild();
    });

    return () => {
      window.clearTimeout(scanTimer);
      window.clearTimeout(buildTimer);
      window.clearTimeout(hashTimer);
      stopWatch();
      stopModelSync();
      stopOpener.dispose();
      stopHash();
    };
  }, [jumpTo, openFile]);

  const explorerPanel = (
    <FileTree active={active} onOpen={openFile} onRenamePath={handleRenamePath} />
  );
  const editorPanel = (
    <EditorPane
      active={active}
      openFiles={openFiles}
      theme={theme}
      inlayHints={inlayHints}
      jumpTarget={jumpTarget}
      onOpen={openFile}
      onCloseTab={closeTab}
      onJumpTo={jumpTo}
    />
  );
  const runnerPanel = <BrowserPane buildStatus={buildStatus} onJumpToError={jumpTo} />;

  return (
    <div className="flex h-full flex-col bg-pg-bg text-pg-fg">
      <TopBar
        buildStatus={buildStatus}
        inlayHints={inlayHints}
        onToggleInlayHints={() => setInlayHints((value) => !value)}
        theme={theme}
        onToggleTheme={toggleTheme}
        oversizedUrl={oversizedUrl}
        onReset={handleReset}
      />

      {narrow ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-none gap-1.5 border-b border-pg-border bg-pg-panel px-2.5 py-1.5">
            {(
              [
                { id: "files", label: "Files", icon: FolderTree },
                { id: "code", label: "Editor", icon: Code2 },
                { id: "runner", label: "Request", icon: Send },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  mode === id
                    ? "border-orange-500/40 bg-pg-accent-soft text-pg-primary"
                    : "border-pg-border bg-pg-surface text-pg-fg-muted hover:text-pg-fg"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mode === "files" && explorerPanel}
            {mode === "code" && editorPanel}
            {mode === "runner" && runnerPanel}
          </div>
        </div>
      ) : (
        <Group orientation="horizontal" className="min-h-0 flex-1">
          <Panel
            id="explorer"
            defaultSize={232}
            minSize={170}
            maxSize={400}
            groupResizeBehavior="preserve-pixel-size"
            className="min-h-0"
          >
            {explorerPanel}
          </Panel>
          <Separator className="pg-separator" />
          <Panel
            id="editor"
            minSize={260}
            groupResizeBehavior="preserve-relative-size"
            className="min-h-0"
          >
            {editorPanel}
          </Panel>
          <Separator className="pg-separator" />
          <Panel
            id="runner"
            defaultSize={440}
            minSize={300}
            maxSize={720}
            groupResizeBehavior="preserve-pixel-size"
            className="min-h-0"
          >
            {runnerPanel}
          </Panel>
        </Group>
      )}

      <ToastList />
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <Tooltip.Provider delay={350}>
      <Toast.Provider timeout={3200}>
        <PlaygroundShell />
      </Toast.Provider>
    </Tooltip.Provider>
  );
}
