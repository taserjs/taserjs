import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export function toPosixPath(filePath: string): string {
  return filePath.split(sep).join("/");
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

export function routesImportPrefix(routesDir: string, outputFile: string): string {
  const outputDir = dirname(outputFile);
  const relativeRoutes = toPosixPath(relative(outputDir, routesDir));
  if (relativeRoutes === "") {
    return ".";
  }
  return ensureRelativePrefix(relativeRoutes);
}

const COMMON_JS_EXTS = [".ts", ".js", ".tsx", ".jsx", ".mts", ".mjs"];

export function resolveServerDir(rootDir: string, serverDir?: string): string {
  const resolvedRoot = resolve(rootDir || process.cwd());
  if (serverDir) {
    const candidate = isAbsolute(serverDir) ? serverDir : resolve(resolvedRoot, serverDir);
    if (existsSync(candidate)) {
      return candidate;
    }
    throw new Error(
      `[taser] Configured serverDir does not exist: "${candidate}". Please check your taser configuration.`,
    );
  }

  const srcDir = resolve(resolvedRoot, "src");
  if (existsSync(srcDir)) {
    return srcDir;
  }
  return resolvedRoot;
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
      return candidate;
    }
    const withoutExt = candidate.replace(/\.[cm]?[jt]sx?$/, "");
    for (const ext of COMMON_JS_EXTS) {
      const withExt = `${withoutExt}${ext}`;
      if (existsSync(withExt)) {
        return withExt;
      }
    }
    throw new Error(`[taser] Configured serverEntry does not exist: "${candidate}".`);
  }

  const defaultNames = ["server.node.ts", "server.node.js", "server.ts", "server.js", "server.mjs"];
  for (const name of defaultNames) {
    const candidate = resolve(serverDir, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  if (serverDir !== resolvedRoot) {
    for (const name of defaultNames) {
      const candidate = resolve(resolvedRoot, name);
      if (existsSync(candidate)) {
        return candidate;
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
      return candidate;
    }
    const rootCandidate = resolve(resolvedRoot, routesDir);
    if (existsSync(rootCandidate)) {
      return rootCandidate;
    }
    return candidate;
  }

  const serverRoutes = resolve(serverDir, "routes");
  if (existsSync(serverRoutes)) {
    return serverRoutes;
  }
  const rootRoutes = resolve(resolvedRoot, "routes");
  if (existsSync(rootRoutes)) {
    return rootRoutes;
  }
  return serverRoutes;
}
