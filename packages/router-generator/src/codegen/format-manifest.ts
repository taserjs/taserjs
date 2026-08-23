export type EmitManifestOptions = {
  quotes?: "single" | "double" | undefined;
  header?: string[] | undefined;
  footer?: string[] | undefined;
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
