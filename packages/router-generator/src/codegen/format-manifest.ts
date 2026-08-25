export type EmitManifestOptions = {
  quotes?: "single" | "double" | undefined;
  header?: string[] | undefined;
  footer?: string[] | undefined;
  /**
   * Rewrites route/layout import specifiers at emit time (the model keeps its
   * canonical paths). Used to emit bundler aliases for runtime virtual modules
   * and typesDir-relative paths for ambient d.ts files.
   */
  rewriteImportPath?: ((spec: string) => string) | undefined;
};

export function joinManifestSections(
  header?: string[] | undefined,
  body?: string | undefined,
  footer?: string[] | undefined,
): string {
  const sections = [...(header ?? []), body ?? "", ...(footer ?? [])].filter(
    (section) => section.length > 0,
  );
  return `${sections.join("\n")}\n`;
}
