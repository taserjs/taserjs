import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export function toPosixPath(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

export function ensureRelativePrefix(path: string): string {
  return path.startsWith(".") ? path : `./${path}`;
}

export type AliasImportRewriterOptions = {
  outputDir: string;
  routesDir: string;
  aliasBase: string;
  stripImportExtension?: boolean | undefined;
};

export function createAliasImportRewriter(
  options: AliasImportRewriterOptions,
): (spec: string) => string {
  const resolvedOutputDir = resolve(options.outputDir);
  const resolvedRoutesDir = resolve(options.routesDir);
  const aliasPrefix = `${options.aliasBase}/`;

  return (spec) => {
    const targetAbs = spec.startsWith(aliasPrefix)
      ? join(resolvedRoutesDir, spec.slice(aliasPrefix.length))
      : resolve(spec);
    let rel = toPosixPath(relative(resolvedOutputDir, targetAbs));
    if (options.stripImportExtension) {
      rel = rel.replace(/\.(js|mjs|cjs)$/, "");
    }
    return ensureRelativePrefix(rel);
  };
}

const COMMON_JS_EXTS = [".ts", ".js", ".tsx", ".jsx", ".mts", ".mjs"];

export function resolveServerDir(rootDir: string, serverDir?: string): string {
  const resolvedRoot = resolve(rootDir || process.cwd());
  if (serverDir) {
    const candidate = isAbsolute(serverDir) ? serverDir : resolve(resolvedRoot, serverDir);
    if (existsSync(candidate)) {
      return toPosixPath(candidate);
    }
    throw new Error(
      `[taserjs] Configured serverDir does not exist: "${toPosixPath(candidate)}". Please check your taser configuration.`,
    );
  }

  const srcDir = resolve(resolvedRoot, "src");
  if (existsSync(srcDir)) {
    return toPosixPath(srcDir);
  }
  return toPosixPath(resolvedRoot);
}

export function resolveServerEntry(
  rootDir: string,
  serverDir: string,
  serverEntry?: string,
): string | undefined {
  const resolvedRoot = resolve(rootDir || process.cwd());

  if (serverEntry) {
    const candidate = isAbsolute(serverEntry) ? serverEntry : resolve(serverDir, serverEntry);
    if (existsSync(candidate)) {
      return toPosixPath(candidate);
    }
    const withoutExt = candidate.replace(/\.[cm]?[jt]sx?$/, "");
    for (const ext of COMMON_JS_EXTS) {
      const withExt = `${withoutExt}${ext}`;
      if (existsSync(withExt)) {
        return toPosixPath(withExt);
      }
    }
    throw new Error(
      `[taserjs] Configured serverEntry does not exist: "${toPosixPath(candidate)}".`,
    );
  }

  const defaultNames = ["server.node.ts", "server.node.js", "server.ts", "server.js", "server.mjs"];
  for (const name of defaultNames) {
    const candidate = resolve(serverDir, name);
    if (existsSync(candidate)) {
      return toPosixPath(candidate);
    }
  }
  if (serverDir !== resolvedRoot) {
    for (const name of defaultNames) {
      const candidate = resolve(resolvedRoot, name);
      if (existsSync(candidate)) {
        return toPosixPath(candidate);
      }
    }
  }
  return undefined;
}

export function resolveRoutesDir(rootDir: string, serverDir: string, routesDir?: string): string {
  const resolvedRoot = resolve(rootDir || process.cwd());

  if (routesDir) {
    const candidate = isAbsolute(routesDir) ? routesDir : resolve(serverDir, routesDir);
    if (existsSync(candidate)) {
      return toPosixPath(candidate);
    }
    const rootCandidate = resolve(resolvedRoot, routesDir);
    if (existsSync(rootCandidate)) {
      return toPosixPath(rootCandidate);
    }
    return toPosixPath(candidate);
  }

  const serverRoutes = resolve(serverDir, "routes");
  if (existsSync(serverRoutes)) {
    return toPosixPath(serverRoutes);
  }
  const rootRoutes = resolve(resolvedRoot, "routes");
  if (existsSync(rootRoutes)) {
    return toPosixPath(rootRoutes);
  }
  return toPosixPath(serverRoutes);
}

export function resolveTaserEntryPath(
  rootDir: string,
  serverDir: string,
  entry?: string,
): string | undefined {
  const resolvedRoot = resolve(rootDir || process.cwd());

  if (entry && !entry.startsWith("#")) {
    const candidate = isAbsolute(entry) ? entry : resolve(serverDir, entry);
    if (existsSync(candidate)) return toPosixPath(resolve(candidate));
    const rootCandidate = resolve(resolvedRoot, entry);
    if (existsSync(rootCandidate)) return toPosixPath(resolve(rootCandidate));
  }
  const defaultCandidate = join(serverDir, "taser.ts");
  if (existsSync(defaultCandidate)) {
    return toPosixPath(resolve(defaultCandidate));
  }
  const rootSrcCandidate = join(resolvedRoot, "src", "taser.ts");
  if (existsSync(rootSrcCandidate)) {
    return toPosixPath(resolve(rootSrcCandidate));
  }
  const rootCandidate = join(resolvedRoot, "taser.ts");
  if (existsSync(rootCandidate)) {
    return toPosixPath(resolve(rootCandidate));
  }
  return undefined;
}
