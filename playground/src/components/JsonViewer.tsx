import { useMemo } from "react";

interface JsonToken {
  offset: number;
  type: "key" | "string" | "number" | "boolean" | "null" | "punct";
  value: string;
}

const TOKEN_PATTERN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

function tokenizeJson(pretty: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let cursor = 0;
  for (const match of pretty.matchAll(TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      tokens.push({ offset: cursor, type: "punct", value: pretty.slice(cursor, start) });
    }
    const raw = match[0];
    if (raw.startsWith('"')) {
      if (raw.endsWith(":")) {
        const keyPart = raw.slice(0, -1);
        tokens.push({ offset: start, type: "key", value: keyPart });
        tokens.push({ offset: start + keyPart.length, type: "punct", value: ":" });
      } else {
        tokens.push({ offset: start, type: "string", value: raw });
      }
    } else if (raw === "true" || raw === "false") {
      tokens.push({ offset: start, type: "boolean", value: raw });
    } else if (raw === "null") {
      tokens.push({ offset: start, type: "null", value: raw });
    } else {
      tokens.push({ offset: start, type: "number", value: raw });
    }
    cursor = start + raw.length;
  }
  if (cursor < pretty.length) {
    tokens.push({ offset: cursor, type: "punct", value: pretty.slice(cursor) });
  }
  return tokens;
}

const TOKEN_CLASS: Record<JsonToken["type"], string> = {
  key: "text-orange-600 dark:text-orange-300",
  string: "text-emerald-700 dark:text-emerald-300",
  number: "text-amber-700 dark:text-amber-300",
  boolean: "text-violet-600 dark:text-violet-400",
  null: "text-rose-600 dark:text-rose-400 italic",
  punct: "text-pg-fg-muted",
};

interface JsonViewerProps {
  source: string;
}

/** Lightweight syntax-highlighted JSON renderer with graceful plain-text fallback. */
export function JsonViewer({ source }: JsonViewerProps): React.JSX.Element {
  const parsed = useMemo(() => {
    try {
      const pretty = JSON.stringify(JSON.parse(source), null, 2);
      return { ok: true as const, tokens: tokenizeJson(pretty) };
    } catch {
      return { ok: false as const, raw: source };
    }
  }, [source]);

  if (!parsed.ok) {
    return (
      <pre className="m-0 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-pg-fg">
        {parsed.raw}
      </pre>
    );
  }

  return (
    <pre className="m-0 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
      {parsed.tokens.map((token) => (
        <span key={token.offset} className={TOKEN_CLASS[token.type]}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}
