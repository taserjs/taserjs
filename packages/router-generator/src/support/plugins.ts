export function flattenPlugins(plugins: readonly unknown[]): unknown[] {
  const flat: unknown[] = [];
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      flat.push(...flattenPlugins(plugin));
    } else if (plugin) {
      flat.push(plugin);
    }
  }
  return flat;
}
