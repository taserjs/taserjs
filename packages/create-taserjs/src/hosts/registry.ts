import type { HostId } from "../core/types.js";
import { elysia } from "./elysia.js";
import { express } from "./express.js";
import { fastify } from "./fastify.js";
import { hono } from "./hono.js";
import type { HostDefinition } from "./types.js";

export const HOSTS: Record<Exclude<HostId, "none">, HostDefinition> = {
  express,
  fastify,
  hono,
  elysia,
};

export const HOST_IDS: HostId[] = ["none", ...(Object.keys(HOSTS) as Array<keyof typeof HOSTS>)];

/** Returns `undefined` for `none`, so callers only deal with real hosts. */
export function getHost(id: string): HostDefinition | undefined {
  if (id === "none") return undefined;
  const definition = HOSTS[id as keyof typeof HOSTS];
  if (!definition) {
    throw new Error(`Unknown host "${id}". Available: ${HOST_IDS.join(", ")}.`);
  }
  return definition;
}
