import { Popover } from "@base-ui/react/popover";
import { parseFilePath } from "@taserjs/cli/codegen";
import {
  ChevronRight,
  FileCode2,
  FileJson,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LAYOUT_TEXT_CLASS, methodTextClass } from "../method-styles";
import {
  buildFileTree,
  getFileMeta,
  resolveCreateTarget,
  scaffoldFor,
  type TreeNode,
} from "../scaffold";
import { isHiddenPath, vfs } from "../vfs";
import { ConfirmDialog } from "./ConfirmDialog";

type CreateKind = "file" | "folder";

const CONVENTIONS = [
  { pattern: "users.get.ts", desc: "GET /users route" },
  { pattern: "users/$id.get.ts", desc: "Dynamic param → /users/:id" },
  { pattern: "{-$id}.get.ts", desc: "Optional param → /:id?" },
  { pattern: "files/$.get.ts", desc: "Splat wildcard → /files/*" },
  { pattern: "$.ts / admin.ts", desc: "Scoped layout middleware" },
  { pattern: "_auth/...", desc: "Pathless route group" },
  { pattern: "health_.get.ts", desc: "Layout breakout (trailing _)" },
  { pattern: "-helper.ts", desc: "Ignored non-route file" },
] as const;

export function FileGlyph({
  path,
  className = "size-3.5 shrink-0",
}: {
  path: string;
  className?: string;
}): React.JSX.Element {
  const meta = getFileMeta(path);
  if (meta.kind === "config") {
    return <Settings2 className={`${className} text-orange-500 dark:text-orange-400`} />;
  }
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
  if (ext === "json") {
    return <FileJson className={`${className} text-amber-500 dark:text-amber-400`} />;
  }
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "mjs") {
    return <FileCode2 className={`${className} text-sky-500 dark:text-sky-400`} />;
  }
  return <FileText className={`${className} text-pg-fg-muted`} />;
}

interface NameInputProps {
  depth: number;
  initial?: string;
  placeholder: string;
  isFolder: boolean;
  onCommit: (name: string) => boolean;
  onCancel: () => void;
}

function NameInput({
  depth,
  initial,
  placeholder,
  isFolder,
  onCommit,
  onCancel,
}: NameInputProps): React.JSX.Element {
  const [value, setValue] = useState(initial ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (initial) {
      const dot = isFolder ? -1 : initial.indexOf(".");
      el.setSelectionRange(0, dot > 0 ? dot : initial.length);
    }
  }, [initial, isFolder]);

  const submit = (raw: string): void => {
    if (done.current) return;
    const trimmed = raw.trim();
    if (!trimmed) {
      done.current = true;
      onCancel();
      return;
    }
    if (onCommit(trimmed)) {
      done.current = true;
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-7 items-center gap-1.5 pr-2" style={{ paddingLeft: 10 + depth * 14 }}>
      {isFolder ? (
        <Folder className="size-3.5 shrink-0 text-amber-500" />
      ) : (
        <FileCode2 className="size-3.5 shrink-0 text-sky-500/80" />
      )}
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            done.current = true;
            onCancel();
          } else if (event.key === "Enter") {
            event.preventDefault();
            submit(value);
          }
        }}
        onBlur={() => {
          if (!done.current) submit(value);
        }}
        className="h-6 min-w-0 flex-1 rounded border border-pg-primary bg-pg-surface px-1.5 font-mono text-xs text-pg-fg outline-none placeholder:text-pg-fg-muted/60"
      />
    </div>
  );
}

interface PendingDelete {
  path: string;
  targets: string[];
  breakApp: boolean;
}

interface FileTreeProps {
  active: string | null;
  onOpen: (path: string) => void;
  onRenamePath: (oldPath: string, newPath: string, isFolder: boolean) => void;
}

export function FileTree({ active, onOpen, onRenamePath }: FileTreeProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [emptyFolders, setEmptyFolders] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<{ kind: CreateKind; parent: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const visibleFiles = vfs.listVisible();
  const tree = useMemo(
    () => buildFileTree(visibleFiles, emptyFolders),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vfs.version triggers parent re-render
    [vfs.version, emptyFolders],
  );

  const toggleFolder = (path: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandPath = (folderPath: string): void => {
    setCollapsed((prev) => {
      if (!prev.has(folderPath)) return prev;
      const next = new Set(prev);
      next.delete(folderPath);
      return next;
    });
  };

  const commitCreate =
    (kind: CreateKind, parent: string) =>
    (name: string): boolean => {
      try {
        const abs = resolveCreateTarget(parent, name, kind);
        if (!abs || abs === "/" || isHiddenPath(abs)) {
          setError("Enter a valid name (internal .taserjs paths are reserved).");
          return false;
        }
        if (kind === "folder") {
          setEmptyFolders((prev) => new Set(prev).add(abs));
          expandPath(parent);
          setCreating(null);
          setError(null);
          return true;
        }
        if (vfs.has(abs)) {
          setError(`"${abs}" already exists.`);
          return false;
        }
        const built = scaffoldFor(abs);
        vfs.write(built.path, built.content, "ui");
        // Drop any matching empty-folder marker once a real file lives inside it.
        setEmptyFolders((prev) => {
          const next = new Set(prev);
          for (const folder of prev) {
            if (built.path.startsWith(`${folder}/`)) next.delete(folder);
          }
          return next;
        });
        setCreating(null);
        setError(null);
        onOpen(built.path);
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    };

  const commitRename = (oldPath: string, isFolder: boolean, rawName: string): boolean => {
    const trimmed = rawName.trim().replace(/^\/+|\/+$/g, "");
    if (!trimmed) {
      setError("Enter a name.");
      return false;
    }
    const parentDir = oldPath.slice(0, oldPath.lastIndexOf("/"));
    const nextPath = `${parentDir}/${trimmed}`.replace(/\/{2,}/g, "/");
    if (isHiddenPath(nextPath)) {
      setError("Internal .taserjs paths are reserved.");
      return false;
    }
    if (nextPath === oldPath) {
      setRenaming(null);
      setError(null);
      return true;
    }
    try {
      if (isFolder) {
        for (const path of vfs.listVisible()) {
          if (path === oldPath || path.startsWith(`${oldPath}/`)) {
            vfs.rename(path, `${nextPath}${path.slice(oldPath.length)}`, "ui");
          }
        }
        setEmptyFolders((prev) => {
          const next = new Set<string>();
          for (const folder of prev) {
            if (folder === oldPath || folder.startsWith(`${oldPath}/`)) {
              next.add(`${nextPath}${folder.slice(oldPath.length)}`);
            } else {
              next.add(folder);
            }
          }
          return next;
        });
        setCollapsed((prev) => {
          const next = new Set<string>();
          for (const folder of prev) {
            if (folder === oldPath || folder.startsWith(`${oldPath}/`)) {
              next.add(`${nextPath}${folder.slice(oldPath.length)}`);
            } else {
              next.add(folder);
            }
          }
          return next;
        });
      } else {
        vfs.rename(oldPath, nextPath, "ui");
      }
      onRenamePath(oldPath, nextPath, isFolder);
      setRenaming(null);
      setError(null);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const executeDelete = (path: string, targets: string[]): void => {
    for (const target of targets) vfs.remove(target, "ui");
    setEmptyFolders((prev) => {
      const next = new Set(prev);
      for (const folder of prev) {
        if (folder === path || folder.startsWith(`${path}/`)) next.delete(folder);
      }
      return next;
    });
  };

  const requestDelete = (path: string, isFolder: boolean): void => {
    const targets = isFolder
      ? vfs.listVisible().filter((p) => p === path || p.startsWith(`${path}/`))
      : [path];
    if (targets.length === 0) {
      executeDelete(path, []);
      return;
    }
    const nonEmpty = targets.some((target) => (vfs.read(target) ?? "").trim() !== "");
    const breakApp = targets.some((target) => {
      if (target === "/taser.ts") return true;
      if (!isFolder && target.startsWith("/routes/")) {
        return parseFilePath(target.slice("/routes/".length)) !== null;
      }
      return false;
    });
    if (nonEmpty || breakApp) {
      setPendingDelete({ path, targets, breakApp });
      return;
    }
    executeDelete(path, targets);
  };

  const renderNode = (node: TreeNode, depth: number): React.JSX.Element[] => {
    const isCollapsed = collapsed.has(node.path);
    const isActive = !node.isFolder && active === node.path;
    const rows: React.JSX.Element[] = [];

    if (renaming === node.path) {
      rows.push(
        <NameInput
          key={`${node.path}::rename`}
          depth={depth}
          isFolder={node.isFolder}
          initial={node.name}
          placeholder="name"
          onCommit={(name) => commitRename(node.path, node.isFolder, name)}
          onCancel={() => {
            setRenaming(null);
            setError(null);
          }}
        />,
      );
    } else {
      const meta = node.isFolder ? null : getFileMeta(node.path);
      rows.push(
        <div
          key={node.path}
          role="treeitem"
          aria-selected={isActive}
          aria-expanded={node.isFolder ? !isCollapsed : undefined}
          onClick={() => (node.isFolder ? toggleFolder(node.path) : onOpen(node.path))}
          style={{ paddingLeft: 8 + depth * 14 }}
          className={`group flex h-7 cursor-pointer items-center gap-1.5 rounded-md mx-1.5 pr-1.5 select-none transition-colors ${
            isActive
              ? "bg-pg-accent-soft font-medium text-pg-primary"
              : "text-pg-fg/90 hover:bg-pg-hover hover:text-pg-fg"
          }`}
        >
          {node.isFolder ? (
            <>
              <ChevronRight
                className={`size-3 shrink-0 text-pg-fg-muted transition-transform duration-150 ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              />
              {isCollapsed ? (
                <Folder className="size-3.5 shrink-0 text-amber-500" />
              ) : (
                <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
              )}
            </>
          ) : (
            <>
              <span className="w-3 shrink-0" />
              <FileGlyph path={node.path} />
            </>
          )}

          <span className="min-w-0 flex-1 truncate font-mono text-xs">{node.name}</span>

          {/* Subtle route/layout indicator (hidden on hover when row actions appear) */}
          {meta?.kind === "route" && (
            <span
              className={`shrink-0 font-mono text-[9px] font-semibold tracking-tight uppercase group-hover:hidden ${methodTextClass(
                meta.method,
              )}`}
            >
              {meta.method}
            </span>
          )}
          {meta?.kind === "layout" && (
            <span
              className={`shrink-0 font-mono text-[9px] font-semibold tracking-tight uppercase group-hover:hidden ${LAYOUT_TEXT_CLASS}`}
            >
              LAYOUT
            </span>
          )}

          <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
            {node.isFolder && (
              <button
                type="button"
                title={`New file in ${node.path}`}
                onClick={(event) => {
                  event.stopPropagation();
                  expandPath(node.path);
                  setError(null);
                  setCreating({ kind: "file", parent: node.path });
                }}
                className="flex size-5 cursor-pointer items-center justify-center rounded text-pg-fg-muted hover:bg-pg-muted hover:text-pg-fg"
              >
                <Plus className="size-3" />
              </button>
            )}
            <button
              type="button"
              title="Rename"
              onClick={(event) => {
                event.stopPropagation();
                setError(null);
                setRenaming(node.path);
              }}
              className="flex size-5 cursor-pointer items-center justify-center rounded text-pg-fg-muted hover:bg-pg-muted hover:text-pg-fg"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={(event) => {
                event.stopPropagation();
                requestDelete(node.path, node.isFolder);
              }}
              className="flex size-5 cursor-pointer items-center justify-center rounded text-pg-fg-muted hover:bg-rose-500/15 hover:text-rose-500"
            >
              <Trash2 className="size-3" />
            </button>
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
          placeholder={creating.kind === "folder" ? "folder-name" : "users/$id.get.ts"}
          onCommit={commitCreate(creating.kind, node.path)}
          onCancel={() => {
            setCreating(null);
            setError(null);
          }}
        />,
      );
    }

    if (node.isFolder && !isCollapsed) {
      for (const child of node.children) {
        rows.push(...renderNode(child, depth + 1));
      }
    }

    return rows;
  };

  const topCreate = creating?.parent === "/" ? creating : null;

  return (
    <aside className="flex h-full min-h-0 flex-col bg-pg-panel">
      {/* Header */}
      <div className="flex h-9 flex-none items-center justify-between border-b border-pg-border px-3">
        <span className="text-[11px] font-semibold tracking-wider text-pg-fg-muted uppercase">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="New file"
            onClick={() => {
              setError(null);
              setCreating({ kind: "file", parent: "/" });
            }}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-pg-fg-muted transition-colors hover:bg-pg-hover hover:text-pg-fg"
          >
            <FilePlus className="size-3.5" />
          </button>
          <button
            type="button"
            title="New folder"
            onClick={() => {
              setError(null);
              setCreating({ kind: "folder", parent: "/" });
            }}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-pg-fg-muted transition-colors hover:bg-pg-hover hover:text-pg-fg"
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Tree list */}
      <div role="tree" className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {topCreate && (
          <NameInput
            depth={0}
            isFolder={topCreate.kind === "folder"}
            placeholder={topCreate.kind === "folder" ? "folder-name" : "routes/health.get.ts"}
            onCommit={commitCreate(topCreate.kind, "/")}
            onCancel={() => {
              setCreating(null);
              setError(null);
            }}
          />
        )}
        {tree.children.length === 0 ? (
          <p className="px-3 py-4 text-xs text-pg-fg-muted">
            No files yet. Click the new file icon above to create a route.
          </p>
        ) : (
          tree.children.map((child) => renderNode(child, 0))
        )}
      </div>

      {error && (
        <div className="flex-none border-t border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Conventions helper popover */}
      <div className="flex h-7 flex-none items-center border-t border-pg-border px-2.5">
        <Popover.Root>
          <Popover.Trigger className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-pg-fg-muted transition-colors hover:text-pg-fg">
            <HelpCircle className="size-3.5" />
            <span>Routing conventions</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="top" align="start" sideOffset={8} className="z-50">
              <Popover.Popup className="w-72 rounded-xl border border-pg-border-strong bg-pg-surface p-3.5 shadow-2xl">
                <Popover.Title className="text-xs font-semibold text-pg-fg">
                  Filesystem Route Conventions
                </Popover.Title>
                <Popover.Description className="mt-1 text-[11px] text-pg-fg-muted">
                  Create files under <code className="font-mono text-pg-primary">routes/</code> to
                  auto-scaffold endpoints and layouts.
                </Popover.Description>
                <div className="mt-2.5 space-y-1.5">
                  {CONVENTIONS.map((item) => (
                    <div
                      key={item.pattern}
                      className="flex items-baseline justify-between gap-2 text-[11px]"
                    >
                      <code className="shrink-0 rounded bg-pg-muted px-1.5 py-0.5 font-mono text-[10px] text-pg-fg">
                        {item.pattern}
                      </code>
                      <span className="truncate text-right text-pg-fg-muted">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Delete ${pendingDelete?.path ?? ""}?`}
        description={
          pendingDelete
            ? `This will remove ${pendingDelete.targets.length} ${
                pendingDelete.targets.length === 1 ? "file" : "files"
              }.${pendingDelete.breakApp ? " Deleting this file may stop routes from responding." : ""}`
            : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) executeDelete(pendingDelete.path, pendingDelete.targets);
          setPendingDelete(null);
        }}
      />
    </aside>
  );
}
