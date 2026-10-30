/** Minimal inline SVG icons shared by the file tree and editor chrome. */

interface SvgProps {
  size?: number | undefined;
  className?: string | undefined;
}

// Conventional language colors (vscode-icons / linguist), tuned to the dark UI.
const FILE_COLORS: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#e5c558",
  mjs: "#e5c558",
  json: "#cbcb41",
  css: "#7a5fe0",
  html: "#e56b44",
  md: "#519aba",
};
const FILE_DEFAULT_COLOR = "#9aa4bf";

function PageGlyph({ color, className }: SvgProps & { color: string }): React.JSX.Element {
  return (
    <svg
      className={className === undefined ? "ficon" : className}
      width={13}
      height={13}
      viewBox="0 0 16 16"
      aria-hidden
      focusable={false}
    >
      <path d="M4 1.5h5.5L13 5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5z" fill={color} />
      <path d="M9.5 1.5 13 5H9.5z" fill="#0b0e15" opacity={0.35} />
    </svg>
  );
}

/** Colored page glyph for a file path; language colors, dim default. */
export function FileIcon({ path, className }: { path: string; className?: string }): React.JSX.Element {
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
  return <PageGlyph color={FILE_COLORS[ext] ?? FILE_DEFAULT_COLOR} className={className} />;
}

/** Chevron for folder rows; rotates open via the `.open` class. */
export function Chevron({ className }: SvgProps): React.JSX.Element {
  return (
    <svg
      className={`ficon fchev${className ? ` ${className}` : ""}`}
      width={11}
      height={11}
      viewBox="0 0 16 16"
      aria-hidden
      focusable={false}
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StrokeIcon(props: SvgProps & { d: string }): React.JSX.Element {
  const { d, size = 14, className } = props;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      focusable={false}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

/** Explorer-action icons (currentColor strokes, like the VS Code toolbar). */
export const NewFileIcon = (p: SvgProps = {}): React.JSX.Element => (
  <StrokeIcon
    {...p}
    d="M8.5 1.5H3.5v13h9V5.5zM8.5 1.5v4h4M10.5 8v4M8.5 10h4"
  />
);

export const NewFolderIcon = (p: SvgProps = {}): React.JSX.Element => (
  <StrokeIcon
    {...p}
    d="M2 13.5V3c0-.6.4-1 1-1h3.5l1.5 2h5c.6 0 1 .4 1 1v8.5M8 9.5v4M6 11.5h4"
  />
);

export const TrashIcon = (p: SvgProps = {}): React.JSX.Element => (
  <StrokeIcon {...p} d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9.5h5.6l.7-9.5" />
);

export const PencilIcon = (p: SvgProps = {}): React.JSX.Element => (
  <StrokeIcon {...p} d="M3 13l.9-3.4 6.3-6.3 2.5 2.5-6.3 6.3zM9.5 4l2.5 2.5" />
);

export const PlusIcon = (p: SvgProps = {}): React.JSX.Element => (
  <StrokeIcon {...p} d="M8 3.5v9M3.5 8h9" />
);
