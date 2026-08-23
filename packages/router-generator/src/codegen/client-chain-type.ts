import type { TSESTree } from "@typescript-eslint/types";

import type { HttpVerb } from "../types/http.js";
import {
  id,
  str,
  tsIndexedAccessType,
  tsLiteralType,
  tsPropertySignature,
  tsTypeAlias,
  tsTypeLiteral,
  tsTypeReference,
} from "./ast/builders.js";

const HTTP_METHOD_TO_CLIENT_KEY: Record<HttpVerb, string> = {
  GET: "$get",
  POST: "$post",
  PUT: "$put",
  PATCH: "$patch",
  DELETE: "$delete",
  OPTIONS: "$options",
  HEAD: "$head",
};

interface ChainNode {
  methods: Map<string, { urlPath: string; method: HttpVerb }>;
  children: Map<string, ChainNode>;
}

function createChainNode(): ChainNode {
  return {
    methods: new Map(),
    children: new Map(),
  };
}

function segmentToKey(segment: string): string {
  if (segment === "*") return "_splat";
  if (segment.startsWith(":")) return `_${segment.slice(1)}`;
  if (segment.startsWith(".")) {
    return `$${segment.slice(1).replaceAll("-", "_")}`;
  }
  return segment.replaceAll("-", "_");
}

function urlPathToSegments(urlPath: string): string[] {
  if (urlPath === "/" || urlPath === "") {
    return [];
  }
  const parts = urlPath.split("/").filter((s) => s.length > 0);
  return parts.map(segmentToKey);
}

function propertyKey(name: string): TSESTree.PropertyNameNonComputed {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? id(name) : str(name);
}

function buildNodeMembers(node: ChainNode): TSESTree.TypeElement[] {
  const members: TSESTree.TypeElement[] = [];

  // 1. Add methods first (sorted by client method name for determinism)
  const sortedMethods = [...node.methods.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [clientMethodKey, { urlPath, method }] of sortedMethods) {
    const indexedType = tsIndexedAccessType(
      tsIndexedAccessType(tsTypeReference("RouteByPathMethodGen"), tsLiteralType(urlPath)),
      tsLiteralType(method),
    );
    members.push(tsPropertySignature(propertyKey(clientMethodKey), indexedType));
  }

  // 2. Add child nodes (sorted by key for determinism)
  const sortedChildren = [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [childKey, childNode] of sortedChildren) {
    const childMembers = buildNodeMembers(childNode);
    members.push(tsPropertySignature(propertyKey(childKey), tsTypeLiteral(childMembers)));
  }

  return members;
}

export function buildClientChainType(
  routesByPath: Map<
    string,
    Array<{
      method: HttpVerb;
      parentLayout: string | null;
      importName: string;
      layoutChain: string[];
    }>
  >,
): TSESTree.TSTypeAliasDeclaration {
  const root = createChainNode();

  for (const [urlPath, entries] of routesByPath) {
    const segments = urlPathToSegments(urlPath);
    let current = root;
    for (const segment of segments) {
      let child = current.children.get(segment);
      if (!child) {
        child = createChainNode();
        current.children.set(segment, child);
      }
      current = child;
    }

    for (const entry of entries) {
      const clientKey = HTTP_METHOD_TO_CLIENT_KEY[entry.method];
      if (clientKey) {
        current.methods.set(clientKey, { urlPath, method: entry.method });
      }
    }
  }

  const members = buildNodeMembers(root);
  return tsTypeAlias("ClientChainGen", tsTypeLiteral(members));
}
