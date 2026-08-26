import type { TSESTree } from "@typescript-eslint/types";

export type NodeFields = "parent" | "loc" | "range";

export function asNode<T extends TSESTree.Node>(node: Omit<T, NodeFields>): T {
  return node as T;
}
