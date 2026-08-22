export type StoplightElementsOptions = {
  title?: string;
  specUrl?: string;
  spec?: Record<string, unknown>;
  router?: "history" | "hash" | "memory";
  layout?: "sidebar" | "stacked";
  hideTryIt?: boolean;
};

/**
 * Renders an interactive Stoplight Elements documentation HTML page.
 */
export function renderElementsUi(options: StoplightElementsOptions = {}): string {
  const title = options.title ?? "API Reference";
  const router = options.router ?? "hash";
  const layout = options.layout ?? "sidebar";
  const hideTryIt = options.hideTryIt ?? false;

  const specContent = options.spec
    ? `apiDescriptionDocument='${JSON.stringify(options.spec).replace(/'/g, "&#39;")}'`
    : options.specUrl
      ? `apiDescriptionUrl="${options.specUrl}"`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  <title>${title}</title>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
</head>
<body>
  <elements-api
    ${specContent}
    router="${router}"
    layout="${layout}"
    ${hideTryIt ? 'hideTryIt="true"' : ""}
  />
</body>
</html>`;
}
