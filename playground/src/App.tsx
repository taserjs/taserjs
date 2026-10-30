import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { DEFAULT_ACTIVE, starterProject } from "./starter";
import { loadInitial, onExternalHash, setActivePathProvider, writeHash, writeMirror } from "./persist";
import { ensureModel, registerOpenFile, startModelSync } from "./monaco";
import { rebuild, syncManifest } from "./runner";
import { vfs } from "./vfs";
import { BrowserPane } from "./components/BrowserPane";
import { EditorPane } from "./components/EditorPane";
import { FileTree } from "./components/FileTree";
import "./global.css";

function useNarrowLayout(): boolean {
  const media = window.matchMedia("(max-width: 1099px)");
  return useSyncExternalStore(
    (callback) => {
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => media.matches,
    () => false,
  );
}

/** Divider dragged by absolute pointer positions (movementX is unreliable in some webviews). */
function Splitter(props: { onResize: (dx: number) => void }): React.JSX.Element {
  const [dragging, setDragging] = useState(false);
  const lastX = useRef(0);
  return (
    <div
      className={`splitter${dragging ? " dragging" : ""}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        lastX.current = event.clientX;
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (!dragging) return;
        props.onResize(event.clientX - lastX.current);
        lastX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onPointerCancel={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
    />
  );
}

let persistTimer: number | undefined;
function persistSoon(): void {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    writeHash();
    writeMirror();
  }, 200);
}

export function App(): React.JSX.Element {
  const narrow = useNarrowLayout();
  const [mode, setMode] = useState<"files" | "code" | "browser">("code");
  const [active, setActive] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active;

  // VFS version drives re-renders of panels that read the file list directly.
  useSyncExternalStore(
    (callback) => vfs.subscribe(() => callback()),
    () => vfs.version,
  );

  useEffect(() => {
    // --- boot ----------------------------------------------------------------
    setActivePathProvider(() => activeRef.current);
    const initial = loadInitial();
    vfs.hydrate(Object.keys(initial.files).length > 0 ? initial.files : starterProject(), "hydrate");

    let nextActive = initial.active;
    if (!nextActive || !vfs.has(nextActive)) nextActive = DEFAULT_ACTIVE;
    if (!vfs.has(nextActive)) nextActive = vfs.list()[0] ?? null;
    setActive(nextActive);
    setOpenFiles(nextActive ? [nextActive] : []);
    for (const path of vfs.list()) ensureModel(path);

    // --- watcher: codegen -> rebuild -> persistence ---------------------------
    let scanTimer: number | undefined;
    let buildTimer: number | undefined;
    let hashTimer: number | undefined;

    const stopWatch = vfs.watch((event) => {
      if (event.path.startsWith("/routes/")) {
        window.clearTimeout(scanTimer);
        scanTimer = window.setTimeout(() => syncManifest(), 150);
      }
      window.clearTimeout(buildTimer);
      buildTimer = window.setTimeout(() => {
        void rebuild();
      }, 300);
      window.clearTimeout(hashTimer);
      hashTimer = window.setTimeout(() => {
        writeHash();
        writeMirror();
      }, 300);
    });

    const stopModelSync = startModelSync((unlinked) => {
      setActive((current) => {
        if (current !== unlinked) return current;
        const next = vfs.list()[0] ?? null;
        setOpenFiles(next ? [next] : []);
        return next;
      });
    });

    syncManifest();
    void rebuild();
    writeHash();
    writeMirror();

    registerOpenFile((path) => {
      if (!vfs.has(path)) return false;
      openFile(path);
      return true;
    });

    const stopHash = onExternalHash((state) => {
      if (!state) {
        // Corrupt or empty external hash: keep the current project alive and
        // rewrite the URL to reflect it (also un-sticks stale corrupt hashes).
        persistSoon();
        return;
      }
      vfs.hydrate(Object.keys(state.files).length > 0 ? state.files : starterProject(), "hydrate");
      const swappedActive = state.active ?? vfs.list()[0] ?? null;
      setActive(swappedActive);
      setOpenFiles(swappedActive ? [swappedActive] : []);
      for (const path of vfs.list()) ensureModel(path);
    });

    const onReset = (): void => {
      vfs.hydrate(starterProject(), "ui");
      setActive(DEFAULT_ACTIVE);
      setOpenFiles([DEFAULT_ACTIVE]);
      for (const path of vfs.list()) ensureModel(path);
      syncManifest();
      writeHash();
      writeMirror();
      void rebuild();
    };
    window.addEventListener("playground:reset", onReset);

    return () => {
      stopWatch();
      stopModelSync();
      stopHash();
      window.removeEventListener("playground:reset", onReset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFile = useCallback((path: string): void => {
    ensureModel(path);
    setActive(path);
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]));
    persistSoon();
  }, []);

  const closeTab = useCallback(
    (path: string): void => {
      setOpenFiles((prev) => {
        const next = prev.filter((candidate) => candidate !== path);
        if (!next.includes(activeRef.current ?? "")) setActive(next.at(-1) ?? null);
        return next;
      });
    },
    [],
  );

  const [filesWidth, setFilesWidth] = useState(232);
  const [browserWidth, setBrowserWidth] = useState(() =>
    Math.max(340, Math.min(560, Math.round(window.innerWidth * 0.4))),
  );

  const filePanel = <FileTree active={active} onOpen={openFile} />;
  const editorPanel = <EditorPane active={active} openFiles={openFiles} onOpen={openFile} onCloseTab={closeTab} />;
  const browserPanel = <BrowserPane />;

  if (narrow) {
    return (
      <div className="app narrow">
        <div className="mode-switch">
          {(["files", "code", "browser"] as const).map((candidate) => (
            <button key={candidate} className={mode === candidate ? "active" : ""} onClick={() => setMode(candidate)}>
              {candidate === "files" ? "Files" : candidate === "code" ? "Code" : "Browser"}
            </button>
          ))}
        </div>
        <div className="workspace">
          {mode === "files" && filePanel}
          {mode === "code" && editorPanel}
          {mode === "browser" && browserPanel}
        </div>
      </div>
    );
  }

  // Grid chrome: fixed px tracks for the side panels, the editor track takes
  // exactly the remaining space, so the panels always fill the window and
  // content can never move a track. The template is set inline from state so
  // it can never desync from React.
  return (
    <div className="app">
      <div
        className="workspace"
        style={{
          gridTemplateColumns: `${filesWidth}px 5px minmax(120px, 1fr) 5px ${browserWidth}px`,
        }}
      >
        <div className="side-host">{filePanel}</div>
        <Splitter onResize={(dx) => setFilesWidth((width) => Math.min(480, Math.max(150, width + dx)))} />
        {editorPanel}
        <Splitter onResize={(dx) => setBrowserWidth((width) => Math.min(760, Math.max(280, width - dx)))} />
        <div className="side-host">{browserPanel}</div>
      </div>
    </div>
  );
}
