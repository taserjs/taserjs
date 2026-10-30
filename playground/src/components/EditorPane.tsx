import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";

import { ensureModel, isGeneratedPath, markerCounts, watchMarkers } from "../monaco";
import { FileIcon } from "./icons";

interface EditorPaneProps {
  active: string | null;
  openFiles: string[];
  onOpen: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export function EditorPane({ active, openFiles, onOpen, onCloseTab }: EditorPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [inlay, setInlay] = useState(false);
  const [counts, setCounts] = useState({ errors: 0, warnings: 0 });

  useEffect(() => {
    if (!hostRef.current) return;
    const editor = monaco.editor.create(hostRef.current, {
      theme: "pg-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      tabSize: 2,
      scrollBeyondLastLine: false,
      renderWhitespace: "selection",
      smoothScrolling: true,
      padding: { top: 10 },
      inlayHints: { enabled: "off" },
    });
    editorRef.current = editor;
    const stopMarkers = watchMarkers(() => setCounts(markerCounts()));
    setCounts(markerCounts());
    return () => {
      stopMarkers.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setModel(active ? ensureModel(active) : null);
    editor.updateOptions({
      readOnly: active ? isGeneratedPath(active) : false,
      inlayHints: { enabled: inlay ? "on" : "off" },
    });
  }, [active, inlay]);

  return (
    <section className="panel editor">
      <div className="chrome-row">
        <div className="tabs">
          {openFiles.map((path) => (
            <div key={path} className={`tab${path === active ? " active" : ""}`} onClick={() => onOpen(path)}>
              <FileIcon path={path} />
              <span>{path.replace(/^\//, "")}</span>
              <button
                className="icon close"
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseTab(path);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="chrome-actions">
          <button
            className={`btn${inlay ? " toggled" : ""}`}
            title="Toggle inline type hints"
            onClick={() => setInlay((value) => !value)}
          >
            Hints
          </button>
          <button
            className="btn"
            onClick={() => {
              void navigator.clipboard.writeText(location.href).then(
                () => window.alert("Project link copied"),
                () => undefined,
              );
            }}
          >
            Copy link
          </button>
          <button
            className="btn warning"
            onClick={() => {
              if (window.confirm("Reset the project to the default starter? Your changes will be lost.")) {
                window.dispatchEvent(new CustomEvent("playground:reset"));
              }
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div ref={hostRef} className="editor-host" />
      <div className="statusbar">
        <span>
          {counts.errors} errors · {counts.warnings} warnings
        </span>
        {active && <span className="spacer">{active}</span>}
      </div>
    </section>
  );
}
