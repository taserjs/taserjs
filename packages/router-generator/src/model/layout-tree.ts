import type { LayoutFile } from "../types/index.js";
import { toPosixPath } from "../support/paths.js";

function layoutDepth(layoutId: string): number {
  if (layoutId === "/$" || layoutId === "index") {
    return 0;
  }

  if (layoutId.endsWith("/$")) {
    const prefix = layoutId.slice(0, -2);
    return prefix === "" ? 0 : prefix.split("/").length + 1;
  }

  return layoutId.split("/").length;
}

function segmentBase(segment: string): string {
  return segment.endsWith("_") && segment.length > 1 ? segment.slice(0, -1) : segment;
}

export function layoutAppliesToRoute(layoutId: string, routeWithoutVerb: string): boolean {
  const route = toPosixPath(routeWithoutVerb);

  if (layoutId === "index") {
    return route === "index";
  }

  if (layoutId === "/$") {
    return true;
  }

  if (layoutId.endsWith("/$")) {
    const prefix = layoutId.slice(0, -2);
    if (prefix === "") {
      return true;
    }
    return route.startsWith(`${prefix}/`);
  }

  const layoutSegments = layoutId.split("/");
  const routeSegments = route.split("/");

  if (routeSegments.length < layoutSegments.length) {
    return false;
  }

  for (let i = 0; i < layoutSegments.length; i += 1) {
    const lSeg = layoutSegments[i]!;
    const rSeg = routeSegments[i]!;

    const lBase = segmentBase(lSeg);
    const rBase = segmentBase(rSeg);

    if (rSeg.endsWith("_") && rSeg.length > 1 && !lSeg.endsWith("_")) {
      if (i === layoutSegments.length - 1 && rBase === lBase) {
        return false;
      }
    }

    if (lBase !== rBase) {
      return false;
    }
  }

  return true;
}

export function routeLayoutChain(routeWithoutVerb: string, layouts: LayoutFile[]): string[] {
  return layouts
    .filter((layout) => layoutAppliesToRoute(layout.id, routeWithoutVerb))
    .sort((left, right) => layoutDepth(left.id) - layoutDepth(right.id))
    .map((layout) => layout.id);
}

export function layoutParentId(layoutId: string, layoutIds: Set<string>): string | null {
  if (layoutId === "/$") {
    return null;
  }

  if (layoutId === "index") {
    return layoutIds.has("/$") ? "/$" : null;
  }

  if (layoutId.endsWith("/$")) {
    const parent = layoutId.slice(0, -2);
    return layoutIds.has(parent) ? parent : layoutIds.has("/$") ? "/$" : null;
  }

  if (!layoutId.includes("/")) {
    return layoutIds.has("/$") ? "/$" : null;
  }

  let current = layoutId.slice(0, layoutId.lastIndexOf("/"));
  while (true) {
    if (layoutIds.has(current)) {
      return current;
    }
    if (!current.includes("/")) {
      break;
    }
    current = current.slice(0, current.lastIndexOf("/"));
  }

  return layoutIds.has("/$") ? "/$" : null;
}
