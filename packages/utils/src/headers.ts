/** Fills in each default header the caller did not already provide. */
export function withDefaultHeaders(
  headers: HeadersInit | undefined,
  defaults: Record<string, string>,
): HeadersInit {
  // Response implementations such as srvx's FastResponse may keep or mutate a plain-object init,
  // so a shared defaults object must never be handed to them directly.
  if (!headers) return { ...defaults };

  const merged = new Headers(headers);
  for (const name in defaults) {
    if (!merged.has(name)) merged.set(name, defaults[name]!);
  }
  return merged;
}
