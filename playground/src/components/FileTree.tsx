import { useState } from "react";
import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
  layoutStub,
  middlewareContentStub,
  parseFilePath,
  routeStub,
} from "@taserjs/cli/codegen";

import { vfs } from "../vfs";

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
      let child = node.children.find((existing) => existing.name === segment && existing.isFolder === isFolder);
      if (!child) {
        child = { name: segment, path: childPath, isFolder, children: [] };
        node.children.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) =>
      a.isFolder !== b.isFolder ? (a.isFolder ? -1 : 1) : a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const node of nodes) if (node.isFolder) sort(node.children);
  };
  sort(root.children);
  return root;
}

// --- entry scaffolds --------------------------------------------------------

type NewKind = "file" | "folder" | "route" | "layout" | "middleware";

/** Builds content for scaffolded entries; returns null for plain files/folders. */
function scaffoldEntry(kind: NewKind, name: string, verb: string): { path: string; content: string } | null {
  const base = name.replace(/\.ts$/, "").replace(/[^A-Za-z0-9_./$[\]-]/g, "-");
  if (kind === "route") {
    const parsed = parseFilePath(`routes/${base}.${verb}.ts`);
    if (!parsed) return null;
    let canonicalPath = "/";
    try {
      canonicalPath = deriveCanonicalUrl(parsed.dir, parsed.stem).canonicalPath;
    } catch {
      // fall through with placeholder; scanner diagnostics will explain the fix
    }
    return { path: `/routes/${base}.${verb}.ts`, content: routeStub(verb.toUpperCase(), canonicalPath) };
  }
  if (kind === "layout") {
    const parsed = parseFilePath(`routes/${base}.ts`);
    if (!parsed) return null;
    const layout = deriveLayoutInfo(parsed.dir, parsed.stem);
    return { path: `/routes/${base}.ts`, content: layoutStub(layout.layoutId) };
  }
  if (kind === "middleware") {
    const camel = base
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((part, index) => (index === 0 ? part.toLowerCase() : part[0]!.toUpperCase() + part.slice(1).toLowerCase()))
      .join("");
    return { path: `/middlewares/${base}.ts`, content: middlewareContentStub(camel || "middleware") };
  }
  if (kind === "folder") return { path: `/${base}/.gitkeep`, content: "" };
  if (kind === "file") return { path: `/${base || "file"}.ts`, content: "" };
  return null;
}

// --- inline input -----------------------------------------------------------

interface InlineEntryInputProps {  depth: number;
  kind: NewKind;
  initialName?: string;
  verb?: string;
  submitLabel?: string;
  onSubmit: (name: string, verb: string) => void;
  onCancel: () => void;
  onError: (message: string | null) => void;
}

function InlineEntryInput(props: InlineEntryInputProps): React.JSX.Element {
  const [name, setName] = useState(props.initialName ?? "");
  const [verb, setVerb] = useState(props.verb ?? "get");
  const { onSubmit } = props;

  const commit = (): void => {
    onSubmit(name, verb);
  };

  return (
    <form
      className="inline-form"
      style={{ "--depth": `${props.depth}px` } as React.CSSProperties}
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <div className="inline-form-main">
        {props.kind === "route" && (
          <select value={verb} onChange={(event) => setVerb(event.target.value)}>
            {"get post put patch delete".split(" ").map((verbOption) => (
              <option key={verbOption} value={verbOption}>
                {verbOption.toUpperCase()}
              </option>
            ))}
          </select>
        )}
        <input
          className="text"
          autoFocus
          value={name}
          placeholder={props.kind === "folder" ? "folder name" : "name (use /, $id for params)"}
          onChange={(event) => {
            setName(event.target.value);
            props.onError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") props.onCancel();
          }}
        />
        <button className="btn primary" type="submit">
          {props.submitLabel ?? "Create"}
        </button>
        <button className="btn" type="button" onClick={props.onCancel}>
          ✕
        </button>
      </div>
      {props.kind !== "file" && props.kind !== "folder" && <span className="hint">{HINT}</span>}
      {props.kind === "route" && <span className={"inline-form hint"}>{`creates /routes/<name>.${verb}.ts`}</span>}
    </form>
  );
}

// --- main component ---------------------------------------------------------

interface FileTreeProps {
  active: string | null;
  onOpen: (path: string) => void;
}

const HINT = "segment conventions: $id (param), {-$name} (optional param), $.ts (splat), _name (pathless group), trailing _ (layout breakout)";

export function FileTree({ active, onOpen }: FileTreeProps): React.JSX.Element {
  const paths = vfs.list();
  const tree = buildTree(paths);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState<{ kind: NewKind; parent: string } | null>(null);
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

  const commitNew = (kind: NewKind, parent: string) => (name: string, verb: string): void => {
    try {
      const trimmed = name.trim().replace(/^\/|\/$/g, "");
      if (!trimmed) {
        setError("Enter a name");
        return;
      }
      if (kind === "file") {
        const clean = trimmed.includes(".") ? trimmed : `${trimmed}.ts`;
        const path = `${parent}/${clean}`;
        const bad = vfs.has(path) ? `A file already exists at "${path}"` : null;
        if (bad) {
          setError(bad);
          return;
        }
        vfs.write(path, "", "ui");
        onOpen(path);
        setCreating(null);
        return;
      }
      const scaffolded = scaffoldEntry(kind, trimmed, verb);
      if (!scaffolded) {
        setError("Invalid name for this entry type");
        return;
      }
      if (vfs.has(scaffolded.path)) {
        setError(`A file already exists at "${scaffolded.path}"`);
        return;
      }
      vfs.write(scaffolded.path, scaffolded.content, "ui");
      onOpen(scaffolded.path);
      setCreating(null);
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
    const nextPath = isFolder ? `${parentDir}/${trim.replace(/^\/|\/$/g, "")}` : `${parentDir}/${trim}`;
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
      onOpen(nextPath);
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
    const breakApp = targets.some(
      (target) => target === "/taser.ts" || (!isFolder && /^\/routes\/.*\.(get|post|put|patch|delete)\.ts$/.test(target)),
    );
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
    const icon = node.isFolder ? (isCollapsed ? "▸" : "▾") : "";
    rows.push(
      <div
        key={node.path}
        className={`row${active === node.path ? " active" : ""}${showRename ? " renaming" : ""}`}
        style={{ paddingLeft: 10 + depth * 12 }}
        onClick={() => (node.isFolder ? toggleFolder(node.path) : onOpen(node.path))}
      >
        {node.isFolder && <span className="caret">{icon}</span>}
        {showRename ? (
          <InlineEntryInput
            depth={depth * 12}
            kind="file"
            initialName={node.name}
            submitLabel="Rename"
            verb="get"
            onSubmit={(name) => commitRename(node.path, name)}
            onCancel={() => setRenaming(null)}
            onError={setError}
          />
        ) : (
          <>
            {node.path === "/.taserjs/routes.gen.ts" && <span className="gen-badge">generated</span>}
            <span className="name">{node.name}</span>
            <span className="actions">
              {node.isFolder && (
                <button
                  className="icon"
                  title={`New child in ${node.path}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCreating({ kind: "file", parent: node.path });
                  }}
                >
                  ＋
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
                  ✎
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
                  🗑
                </button>
              )}
            </span>
          </>
        )}
      </div>,
    );
    if (creating?.parent === node.path && node.isFolder) {
      rows.push(
        <InlineEntryInput
          key={`${node.path}::create`}
          depth={depth * 12 + 12}
          kind={creating.kind}
          verb="get"
          onSubmit={commitNew(creating.kind, node.path)}
          onCancel={() => setCreating(null)}
          onError={setError}
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
        <div className="menu">
          <button
            className="btn"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            ＋ New
          </button>
          {menuOpen && (
            <div className="menu-list" onMouseLeave={() => setMenuOpen(false)}>
              {(
                [
                  ["file", "File"],
                  ["folder", "Folder"],
                  ["route", "Route"],
                  ["layout", "Layout"],
                  ["middleware", "Middleware"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  onClick={() => {
                    setMenuOpen(false);
                    setCreating({ kind, parent: "/" });
                  }}
                >
                  {label === "Route" && "Route (.get.ts scaffolds a handler)"}
                  {label === "Layout" && "Layout (middleware wrapper)"}
                  {label === "Middleware" && "Middleware (custom, reusable)"}
                  {label !== "Route" && label !== "Layout" && label !== "Middleware" && label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="tree">
        {topCreate && (
          <InlineEntryInput
            depth={0}
            kind={topCreate.kind}
            verb="get"
            onSubmit={commitNew(topCreate.kind, "/")}
            onCancel={() => setCreating(null)}
            onError={setError}
          />
        )}
        {vfs.list().length === 0 && <p className="hint">No files yet — create one with “＋ New”.</p>}
        {tree.children.map((child) => renderNode(child, 0))}
      </div>
      {error && <div className="form-error">{error}</div>}
      <details className="hint" style={{ padding: "4px 10px", opacity: 0.7 }}>
        <summary style={{ cursor: "pointer" }}>Segment conventions</summary>
        <span>{HINT}</span>
      </details>
    </aside>
  );
}
