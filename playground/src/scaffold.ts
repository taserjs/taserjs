import {
  deriveCanonicalUrl,
  deriveLayoutInfo,
  isIgnoredPath,
  layoutStub,
  parseFilePath,
  routeStub,
} from "@taserjs/cli/codegen";

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

export type FileMeta =
  | { kind: "route"; method: string; canonicalPath: string }
  | { kind: "layout"; layoutId: string }
  | { kind: "config" }
  | { kind: "other" };

export function sanitizeEntryName(name: string): string {
  return name.replace(/[^A-Za-z0-9_./$[\]{}-]/g, "-");
}

const VERB_SUFFIX_RE = /\.(get|post|put|patch|delete|options|query|all|any)$/i;

export function resolveCreateTarget(
  parent: string,
  rawName: string,
  kind: "file" | "folder",
): string {
  const clean = sanitizeEntryName(rawName.trim());
  let abs = `${parent}/${clean}`.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  if (kind === "file") {
    const hasDot = abs.includes(".", abs.lastIndexOf("/") + 1);
    if (!hasDot || VERB_SUFFIX_RE.test(abs)) abs += ".ts";
  }
  return abs;
}

/**
 * Infers initial file content from a VFS path:
 * - `/routes/foo.get.ts` -> route handler stub
 * - `/routes/admin.ts` or `/routes/admin/$.ts` -> layout stub
 * - anything else -> empty file
 */
export function scaffoldFor(absPath: string): { path: string; content: string } {
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
        // Scanner diagnostics will explain the fix; fall through with the stub.
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

  return { path: absPath, content: "" };
}

/** Classifies a VFS file path for explorer badges and status bar route info. */
export function getFileMeta(absPath: string): FileMeta {
  if (absPath === "/taser.ts") return { kind: "config" };
  if (!absPath.startsWith("/routes/")) return { kind: "other" };

  const routesRel = absPath.slice("/routes/".length);
  if (!routesRel || isIgnoredPath(routesRel)) return { kind: "other" };

  const parsed = parseFilePath(routesRel);
  if (!parsed) return { kind: "other" };

  if (parsed.verb !== null) {
    try {
      const { canonicalPath } = deriveCanonicalUrl(parsed.dir, parsed.stem);
      return { kind: "route", method: parsed.verb.toUpperCase(), canonicalPath };
    } catch {
      return { kind: "route", method: parsed.verb.toUpperCase(), canonicalPath: "/" };
    }
  }

  try {
    const info = deriveLayoutInfo(parsed.dir, parsed.stem);
    return { kind: "layout", layoutId: info.layoutId };
  } catch {
    return { kind: "other" };
  }
}

/** Builds a sorted folder-first tree from visible file paths and optional empty folder paths. */
export function buildFileTree(filePaths: string[], emptyFolders: Iterable<string> = []): TreeNode {
  const root: TreeNode = { name: "", path: "", isFolder: true, children: [] };

  const ensureFolder = (folderPath: string): void => {
    const segments = folderPath
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);
    let node = root;
    segments.forEach((segment, index) => {
      const childPath = `/${segments.slice(0, index + 1).join("/")}`;
      let child = node.children.find((existing) => existing.name === segment && existing.isFolder);
      if (!child) {
        child = { name: segment, path: childPath, isFolder: true, children: [] };
        node.children.push(child);
      }
      node = child;
    });
  };

  for (const folder of emptyFolders) ensureFolder(folder);

  for (const path of filePaths) {
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
