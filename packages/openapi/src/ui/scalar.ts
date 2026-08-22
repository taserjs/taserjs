export type ScalarTheme =
  | "alternate"
  | "default"
  | "moon"
  | "purple"
  | "solarized"
  | "bluePlanet"
  | "saturn"
  | "kepler"
  | "mars"
  | "deepSpace"
  | "none";

export type ScalarUiOptions = {
  title?: string;
  specUrl?: string;
  spec?: Record<string, unknown>;
  theme?: ScalarTheme;
  proxyUrl?: string;
  layout?: "modern" | "classic";
  showSidebar?: boolean;
  searchHotKey?: string;
  customCss?: string;
};

/**
 * Renders an interactive Scalar API Reference HTML page.
 */
export function renderScalarUi(options: ScalarUiOptions = {}): string {
  const title = options.title ?? "API Reference";
  const theme = options.theme ?? "default";
  const layout = options.layout ?? "modern";
  const showSidebar = options.showSidebar ?? true;

  const specContent = options.spec
    ? `<script id="api-reference" type="application/json">${JSON.stringify(options.spec)}</script>`
    : "";

  const config = {
    theme,
    layout,
    showSidebar,
    ...(options.proxyUrl ? { proxyUrl: options.proxyUrl } : {}),
    ...(options.searchHotKey ? { searchHotKey: options.searchHotKey } : {}),
    ...(options.customCss ? { customCss: options.customCss } : {}),
  };

  const dataUrlAttr = options.specUrl ? `data-url="${options.specUrl}"` : "";
  const dataConfigAttr = `data-configuration='${JSON.stringify(config)}'`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${specContent}
  <script
    ${dataUrlAttr}
    ${dataConfigAttr}
    src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
  ></script>
</body>
</html>`;
}
