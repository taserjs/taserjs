import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isIgnoredPath,
  layoutStub,
  middlewareContentStub,
  parseFilePath,
  routeStub,
} from "@taserjs/cli/codegen";
import { useEffect, useRef, useState } from "react";

import { vfs } from "../vfs";
import {
  Chevron,
  FileIcon,
  NewFileIcon,
  NewFolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "./icons";

// --- tree model -------------------------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFolder: true, children: [] };
  for (const path of paths) {
    let node = root;
    const segments = path.slice(1).split("/");
    segments.forEach((segment, index) => {
      const isFolder = index < segments.length - 1;
      const childPath = `/${segments.slice(0, index + 1).join("/")}`;
      let child = node.children.find(
        (existing) => existing.name === segment && existing.isFolder === isFolder,
      );
      if (!child) {
        child = { name: segment, path: childPath, isFolder, children: [] };
        node.children.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) =>
      a.isFolder !== b.isFolder
        ? a.isFolder
          ? -1
          : 1
        : a.name < b.name
          ? -1
          : a.name > b.name
            ? 1
            : 0,
    );
    for (const node of nodes) if (node.isFolder) sort(node.children);
  };
  sort(root.children);
  return root;
}

// --- entry scaffolds ----------------------------------------------------------

type CreateKind = "file" | "folder";

/**
 * VS Code-style creation: one inline name/path input, scaffolds inferred from
 * the typed path. `routes/foo.get.ts` scaffolds a route handler, a direct
 * `routes/<name>.ts` scaffolds a layout wrapper, `middlewares/<name>.ts`
 * scaffolds a middleware; everything else is a plain file.
 */
function scaffoldFor(absPath: string, kind: CreateKind): { path: string; content: string } | null {
  if (kind === "folder") return { path: `${absPath}/.gitkeep`, content: "" };
  const rel = absPath.startsWith("/") ? absPath.slice(1) : absPath;

  if (rel.startsWith("routes/")) {
    const routesRel = rel.slice("routes/".length);
    if (!routesRel || isIgnoredPath(routesRel)) {
      return { path: absPath, content: "" };
    }
    const parsed = parseFilePath(routesRel);
    if (!parsed) {
      return { path: absPath, content: "" };
    }
    if (parsed.verb !== null) {
      let canonicalPath = "/";
      try {
        canonicalPath = deriveCanonicalUrl(parsed.dir, parsed.stem).canonicalPath;
      } catch {
        // scanner diagnostics will explain the fix; fall through with the stub
      }
      return { path: absPath, content: routeStub(parsed.verb.toUpperCase(), canonicalPath) };
    }
    try {
      const info = deriveLayoutInfo(parsed.dir, parsed.stem);
      return { path: absPath, content: layoutStub(info.layoutId) };
    } catch {
      return { path: absPath, content: "" };
    }
  }

  if (rel.startsWith("middlewares/")) {
    const midRel = rel.slice("middlewares/".length);
    const match = midRel.match(/^([^/]+)\.(ts|tsx)$/);
    if (match) {
      const base = match[1]!;
      const camel = base
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((part, index) =>
          index === 0 ? part.toLowerCase() : part[0]!.toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join("");
      return { path: absPath, content: middlewareContentStub(camel || "middleware") };
    }
  }

  return { path: absPath, content: "" };
}

// --- inline name input (VS Code style row) ------------------------------------

interface NameInputProps {
  depth: number;
  /** Pre-filled for rename; empty for creation. */
  initial?: string;
  placeholder: string;
  isFolder: boolean;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

function NameInput(props: NameInputProps): React.JSX.Element {
  const [value, setValue] = useState(props.initial ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const finish = (name: string): void => {
    const trimmed = name.trim();
    if (trimmed) props.onCommit(trimmed);
    else props.onCancel();
  };

  return (
    <div className="row name-input" style={{ paddingLeft: 10 + props.depth * 12 }}>
      <span className="caret" />
      <FileIcon path={props.isFolder ? "" : "x.ts"} className="ficon placeholder" />
      <input
        ref={inputRef}
        value={value}
        placeholder={props.placeholder}
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelled.current = true;
            props.onCancel();
          } else if (event.key === "Enter") {
            event.preventDefault();
            finish(value);
          }
        }}
        onBlur={() => {
          if (!cancelled.current) finish(value);
          else cancelled.current = false;
        }}
      />
    </div>
  );
}

// --- main component ---------------------------------------------------------

interface FileTreeProps {
  active: string | null;
  onOpen: (path: string) => void;
}

const HINT =
  "$id (param), {-$name} (optional param), $.ts (splat), _name (pathless group), trailing _ (layout breakout)";

export function FileTree({ active, onOpen }: FileTreeProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<{ kind: CreateKind; parent: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleFolder = (path: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const commitCreate =
    (kind: CreateKind, parent: string) =>
    (name: string): void => {
      try {
        const clean = name.replace(/[^A-Za-z0-9_./$[\]{}-]/g, "-");
        let abs = `${parent}/${clean}`.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
        if (kind === "file" && !abs.includes(".", abs.lastIndexOf("/") + 1)) abs += ".ts";
        if (vfs.has(abs)) {
          setError(`"${abs}" already exists`);
          return;
        }
        const built = scaffoldFor(abs, kind);
        if (!built) {
          setError("Invalid path");
          return;
        }
        vfs.write(built.path, built.content, "ui");
        setCreating(null);
        setError(null);
        if (kind === "file") onOpen(built.path);
      } catch (err) {
        setError((err as Error).message);
      }
    };

  const commitRename = (oldPath: string, name: string): void => {
    const trim = name.trim();
    if (!trim) {
      setError("Enter a name");
      return;
    }
    const isFolder = !vfs.has(oldPath);
    const parentDir = oldPath.slice(0, oldPath.lastIndexOf("/"));
    const nextPath = isFolder
      ? `${parentDir}/${trim.replace(/^\/|\/$/g, "")}`
      : `${parentDir}/${trim}`;
    try {
      if (isFolder) {
        for (const path of vfs.list()) {
          if (path === oldPath || path.startsWith(`${oldPath}/`)) {
            vfs.rename(path, `${nextPath}${path.slice(oldPath.length)}`, "ui");
          }
        }
      } else {
        vfs.rename(oldPath, nextPath, "ui");
      }
      setRenaming(null);
      setError(null);
      if (active === oldPath) onOpen(nextPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeEntry = (path: string): void => {
    const isFolder = !vfs.has(path);
    const targets = isFolder
      ? vfs.list().filter((p) => p === path || p.startsWith(`${path}/`))
      : [path];
    const nonEmpty = targets.some((target) => (vfs.read(target) ?? "").trim() !== "");
    const breakApp = targets.some((target) => {
      if (target === "/taser.ts") return true;
      if (!isFolder && target.startsWith("/routes/")) {
        return parseFilePath(target.slice("/routes/".length)) !== null;
      }
      return false;
    });
    if (nonEmpty || breakApp) {
      const message = `Delete ${targets.length} item(s) under ${path}?${breakApp ? " The app may stop responding." : ""}`;
      if (!window.confirm(message)) return;
    }
    for (const target of targets) vfs.remove(target, "ui");
  };

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element[] => {
    const isCollapsed = collapsed.has(node.path);
    const showRename = renaming === node.path;
    const rows: React.JSX.Element[] = [];
    if (showRename) {
      rows.push(
        <NameInput
          key={`${node.path}::rename`}
          depth={depth}
          isFolder={!vfs.has(node.path)}
          initial={node.name}
          placeholder="name"
          onCommit={(name) => commitRename(node.path, name)}
          onCancel={() => setRenaming(null)}
        />,
      );
    } else {
      rows.push(
        <div
          key={node.path}
          className={`row${active === node.path ? " active" : ""}`}
          style={{ paddingLeft: 10 + depth * 12 }}
          onClick={() => (node.isFolder ? toggleFolder(node.path) : onOpen(node.path))}
        >
          {node.isFolder ? (
            <span className="caret" onClick={(event) => event.stopPropagation()}>
              <Chevron className={isCollapsed ? "" : "open"} />
            </span>
          ) : (
            <FileIcon path={node.path} />
          )}
          {node.path === "/.taserjs/routes.gen.ts" && <span className="gen-badge">generated</span>}
          <span className="name">{node.name}</span>
          <span className="actions">
            {node.isFolder && (
              <button
                className="icon"
                title={`New file in ${node.path}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    next.delete(node.path);
                    return next;
                  });
                  setCreating({ kind: "file", parent: node.path });
                }}
              >
                <PlusIcon size={12} />
              </button>
            )}
            {!node.isFolder && node.path !== "/.taserjs/routes.gen.ts" && (
              <button
                className="icon"
                title="Rename"
                onClick={(event) => {
                  event.stopPropagation();
                  setRenaming(node.path);
                }}
              >
                <PencilIcon size={12} />
              </button>
            )}
            {node.path !== "/.taserjs/routes.gen.ts" && (
              <button
                className="icon warn"
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  removeEntry(node.path);
                }}
              >
                <TrashIcon size={12} />
              </button>
            )}
          </span>
        </div>,
      );
    }
    if (creating?.parent === node.path && node.isFolder) {
      rows.push(
        <NameInput
          key={`${node.path}::create`}
          depth={depth + 1}
          isFolder={creating.kind === "folder"}
          placeholder={creating.kind === "folder" ? "name" : "name or path, e.g. users/id.get.ts"}
          onCommit={commitCreate(creating.kind, node.path)}
          onCancel={() => setCreating(null)}
        />,
      );
    }
    if (node.isFolder && !isCollapsed) {
      node.children.forEach((child) => rows.push(...renderNode(child, depth + 1)));
    }
    return rows;
  };

  const topCreate = creating && creating.parent === "/" ? creating : null;

  return (
    <aside className="panel files">
      <div className="panel-head">
        <span className="title">Files</span>
        <span className="spacer" />
        <button
          className="icon"
          title="New file (type a path, Enter to create)"
          onClick={() => setCreating({ kind: "file", parent: "/" })}
        >
          <NewFileIcon />
        </button>
        <button
          className="icon"
          title="New folder"
          onClick={() => setCreating({ kind: "folder", parent: "/" })}
        >
          <NewFolderIcon />
        </button>
      </div>
      <div className="tree">
        {topCreate && (
          <NameInput
            depth={0}
            isFolder={topCreate.kind === "folder"}
            placeholder={
              topCreate.kind === "folder" ? "name" : "name or path, e.g. routes/health.get.ts"
            }
            onCommit={commitCreate(topCreate.kind, "/")}
            onCancel={() => setCreating(null)}
          />
        )}
        {vfs.list().length === 0 && <p className="hint">No files yet — create one below.</p>}
        {buildTree(vfs.list()).children.map((child) => renderNode(child, 0))}
      </div>
      {error && <div className="form-error">{error}</div>}
      <details className="hint" style={{ padding: "4px 10px", opacity: 0.7 }}>
        <summary style={{ cursor: "pointer" }}>Segment conventions</summary>
        <span>{HINT}</span>
      </details>
    </aside>
  );
}
