import { Select } from "@base-ui/react/select";
import { Tabs } from "@base-ui/react/tabs";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Eye,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  HTTP_METHODS,
  methodBadgeClass,
  methodTextClass,
  statusBadgeClass,
} from "../method-styles";
import {
  getBuildStatus,
  request,
  requestRebuild,
  waitForBuild,
  type BuildStatus,
  type ConsoleLevel,
  type RunResult,
} from "../runner";
import { JsonViewer } from "./JsonViewer";
import { RoutePickerBar } from "./RoutePickerBar";

const HOST_PREFIX = "http://localhost";

interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

function pathSuffixOf(text: string): string {
  const pasted = text.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?<rest>\/.*)?$/i);
  return pasted?.groups?.rest ?? text;
}

function samplePathFor(canonicalPath: string): string {
  return canonicalPath
    .replace(/:([A-Za-z0-9_]+)\?/g, "1")
    .replace(/:([A-Za-z0-9_]+)/g, "1")
    .replace(/\*$/, "example");
}

function formatBytes(text: string): string {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const LOG_BADGE: Record<ConsoleLevel, string> = {
  log: "bg-pg-muted text-pg-fg-muted border-pg-border",
  info: "bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25",
  warn: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  error: "bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25",
};

interface BrowserPaneProps {
  buildStatus: BuildStatus;
  onJumpToError: (path: string, line?: number, column?: number) => void;
}

export function BrowserPane({ buildStatus, onJumpToError }: BrowserPaneProps): React.JSX.Element {
  const [method, setMethod] = useState<string>("GET");
  const [pathText, setPathText] = useState<string>("/");
  const [bodyText, setBodyText] = useState<string>("");
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: "h-1", key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [showRequestPanel, setShowRequestPanel] = useState(false);
  const [requestTab, setRequestTab] = useState<"body" | "headers">("body");
  const [responseTab, setResponseTab] = useState<"body" | "headers" | "console">("body");
  const [htmlMode, setHtmlMode] = useState<"preview" | "source">("preview");
  const [result, setResult] = useState<RunResult | null>(null);
  const [sending, setSending] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const autoRan = useRef(false);
  const pathInputRef = useRef<HTMLInputElement | null>(null);
  const requestSeqRef = useRef(0);

  const dispatchRequest = async (overrideMethod?: string, overridePath?: string): Promise<void> => {
    const seq = (requestSeqRef.current += 1);
    const activeMethod = overrideMethod ?? method;
    const activePath = overridePath ?? pathText;
    setSending(true);
    try {
      await waitForBuild();
      if (seq !== requestSeqRef.current) return;
      if (getBuildStatus().phase === "error") {
        setResult({
          kind: "error",
          error: "Build failed — fix the errors above and try again.",
          ms: 0,
          logs: [],
        });
        return;
      }

      const suffix = pathSuffixOf(activePath.trim() || "/");
      const href = new URL(suffix.startsWith("/") ? suffix : `/${suffix}`, `${HOST_PREFIX}/`).href;

      const reqHeaders: Record<string, string> = {};
      for (const row of headers) {
        if (!row.enabled) continue;
        const k = row.key.trim();
        if (!k) continue;
        // Skip default Content-Type on GET requests unless body is sent
        if (activeMethod === "GET" && k.toLowerCase() === "content-type") continue;
        reqHeaders[k] = row.value;
      }

      const body = activeMethod !== "GET" && bodyText.trim() !== "" ? bodyText : undefined;
      const response = await request(
        body !== undefined
          ? { method: activeMethod, url: href, headers: reqHeaders, body }
          : { method: activeMethod, url: href, headers: reqHeaders },
      );

      if (response.kind === "timeout") {
        requestRebuild();
      }
      if (seq !== requestSeqRef.current) return;
      setResult(response);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setResult({
        kind: "error",
        error: String((err as Error)?.message ?? err),
        ms: 0,
        logs: [],
      });
    } finally {
      if (seq === requestSeqRef.current) setSending(false);
    }
  };

  // Run GET / once after initial compiler boot.
  useEffect(() => {
    if (buildStatus.phase === "ready" && !autoRan.current) {
      autoRan.current = true;
      void dispatchRequest("GET", "/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time auto-run
  }, [buildStatus.phase]);

  const handlePickRoute = (routeMethod: string, canonicalPath: string): void => {
    const normalizedMethod =
      routeMethod === "ALL" || routeMethod === "ANY" ? "GET" : routeMethod.toUpperCase();
    const resolvedMethod = (HTTP_METHODS as readonly string[]).includes(normalizedMethod)
      ? normalizedMethod
      : "GET";
    const sample = samplePathFor(canonicalPath);
    setMethod(resolvedMethod);
    setPathText(sample);
    if (resolvedMethod !== "GET") {
      setShowRequestPanel(true);
      setRequestTab("body");
    }
    void dispatchRequest(resolvedMethod, sample);
  };

  const formatRequestBody = (): void => {
    try {
      setBodyText(JSON.stringify(JSON.parse(bodyText), null, 2));
    } catch {
      // Leave invalid JSON untouched.
    }
  };

  const addHeaderRow = (): void => {
    setHeaders((prev) => [
      ...prev,
      { id: `h-${Date.now()}-${Math.random()}`, key: "", value: "", enabled: true },
    ]);
  };

  const contentType =
    result?.kind === "response"
      ? (result.headers.find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? "")
      : "";
  const isJson = contentType.includes("json");
  const isHtml = contentType.includes("text/html");
  const logs = result?.logs ?? [];
  const activeHeaderCount = headers.filter((h) => h.enabled && h.key.trim() !== "").length;

  const copyResponseBody = async (): Promise<void> => {
    if (result?.kind !== "response") return;
    try {
      await navigator.clipboard.writeText(result.body);
      setCopiedBody(true);
      window.setTimeout(() => setCopiedBody(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-pg-bg">
      {/* Header */}
      <div className="flex h-9 flex-none items-center justify-between border-b border-pg-border bg-pg-panel px-3">
        <span className="text-[11px] font-semibold tracking-wider text-pg-fg-muted uppercase">
          Request Runner
        </span>
        <button
          type="button"
          onClick={() => setShowRequestPanel((open) => !open)}
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
            showRequestPanel
              ? "bg-pg-accent-soft text-pg-primary"
              : "text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
          }`}
        >
          <span>Headers & Body</span>
          {activeHeaderCount > 0 && (
            <span className="rounded-full bg-pg-muted px-1.5 font-mono text-[10px]">
              {activeHeaderCount}
            </span>
          )}
        </button>
      </div>

      {/* Request URL bar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void dispatchRequest();
        }}
        className="flex flex-none items-center gap-1.5 border-b border-pg-border bg-pg-panel/60 p-2.5"
      >
        <Select.Root
          value={method}
          onValueChange={(next) => {
            if (!next) return;
            setMethod(next);
            if (next !== "GET") {
              setShowRequestPanel(true);
              setRequestTab("body");
            }
          }}
        >
          <Select.Trigger
            aria-label="HTTP Method"
            className={`inline-flex h-8 w-[84px] shrink-0 cursor-pointer items-center justify-between gap-1 rounded-lg border border-pg-border bg-pg-surface px-2.5 font-mono text-xs font-semibold transition-colors hover:border-pg-border-strong focus:border-pg-primary focus:outline-none ${methodTextClass(
              method,
            )}`}
          >
            <Select.Value />
            <Select.Icon className="text-pg-fg-muted">
              <ChevronDown className="size-3.5" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50">
              <Select.Popup className="min-w-[110px] rounded-xl border border-pg-border-strong bg-pg-surface p-1 shadow-2xl">
                <Select.List>
                  {HTTP_METHODS.map((candidate) => (
                    <Select.Item
                      key={candidate}
                      value={candidate}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold outline-none data-[highlighted]:bg-pg-hover"
                    >
                      <Select.ItemText className={methodTextClass(candidate)}>
                        {candidate}
                      </Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="size-3.5 text-pg-primary" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <div className="flex h-8 min-w-0 flex-1 items-center rounded-lg border border-pg-border bg-pg-surface px-2.5 transition-colors focus-within:border-pg-primary">
          <span className="shrink-0 font-mono text-xs text-pg-fg-muted/75 select-none">
            {HOST_PREFIX}
          </span>
          <input
            ref={pathInputRef}
            value={pathText}
            placeholder="/users/1?full=true"
            spellCheck={false}
            onChange={(event) => setPathText(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void dispatchRequest();
              }
            }}
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-xs text-pg-fg outline-none placeholder:text-pg-fg-muted/50"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-pg-primary px-3 text-xs font-semibold text-pg-primary-fg shadow-xs transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3 fill-current" />
          )}
          <span>Send</span>
        </button>
      </form>

      {/* Adaptive discovered routes bar with overflow dropdown */}
      <RoutePickerBar
        routes={buildStatus.routes}
        selectedMethod={method}
        selectedPath={pathSuffixOf(pathText)}
        samplePathFor={samplePathFor}
        onSelect={handlePickRoute}
      />

      {/* Optional Request Body / Headers panel */}
      {showRequestPanel && (
        <div className="flex-none border-b border-pg-border bg-pg-panel/50">
          <div className="flex items-center justify-between border-b border-pg-border/70 px-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRequestTab("body")}
                className={`cursor-pointer border-b-2 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  requestTab === "body"
                    ? "border-pg-primary text-pg-fg"
                    : "border-transparent text-pg-fg-muted hover:text-pg-fg"
                }`}
              >
                Body
              </button>
              <button
                type="button"
                onClick={() => setRequestTab("headers")}
                className={`cursor-pointer border-b-2 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  requestTab === "headers"
                    ? "border-pg-primary text-pg-fg"
                    : "border-transparent text-pg-fg-muted hover:text-pg-fg"
                }`}
              >
                Headers ({activeHeaderCount})
              </button>
            </div>
            {requestTab === "body" && bodyText.trim() !== "" && (
              <button
                type="button"
                onClick={formatRequestBody}
                className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
              >
                <Sparkles className="size-3" />
                Format JSON
              </button>
            )}
            {requestTab === "headers" && (
              <button
                type="button"
                onClick={addHeaderRow}
                className="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-pg-fg-muted hover:bg-pg-hover hover:text-pg-fg"
              >
                <Plus className="size-3" />
                Add
              </button>
            )}
          </div>

          {requestTab === "body" ? (
            <div className="p-2.5">
              {method === "GET" && (
                <p className="mb-1.5 text-[11px] text-pg-fg-muted">
                  Switch method to POST, PUT, or PATCH to send a request body.
                </p>
              )}
              <textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                placeholder='{"name": "Ada"}'
                spellCheck={false}
                rows={4}
                className="w-full resize-y rounded-lg border border-pg-border bg-pg-surface p-2 font-mono text-xs text-pg-fg outline-none placeholder:text-pg-fg-muted/50 focus:border-pg-primary"
              />
            </div>
          ) : (
            <div className="max-h-36 space-y-1.5 overflow-y-auto p-2.5">
              {headers.map((row) => (
                <div key={row.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    aria-label="Enable header"
                    onChange={(event) =>
                      setHeaders((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, enabled: event.target.checked } : item,
                        ),
                      )
                    }
                    className="size-3.5 accent-orange-500"
                  />
                  <input
                    value={row.key}
                    placeholder="Header"
                    spellCheck={false}
                    onChange={(event) =>
                      setHeaders((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, key: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-7 min-w-0 flex-1 rounded-md border border-pg-border bg-pg-surface px-2 font-mono text-xs text-pg-fg outline-none focus:border-pg-primary"
                  />
                  <input
                    value={row.value}
                    placeholder="Value"
                    spellCheck={false}
                    onChange={(event) =>
                      setHeaders((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                    className="h-7 min-w-0 flex-1 rounded-md border border-pg-border bg-pg-surface px-2 font-mono text-xs text-pg-fg outline-none focus:border-pg-primary"
                  />
                  <button
                    type="button"
                    aria-label="Remove header"
                    onClick={() => setHeaders((prev) => prev.filter((item) => item.id !== row.id))}
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-pg-fg-muted hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Build / scanner errors */}
      {buildStatus.errors.length > 0 && (
        <div className="m-2.5 flex-none space-y-2 rounded-xl border border-rose-500/35 bg-rose-500/10 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>
              {buildStatus.errors.length === 1
                ? "Build Error"
                : `${buildStatus.errors.length} Build Errors`}
            </span>
          </div>
          <div className="space-y-1.5">
            {buildStatus.errors.map((error) => {
              const clickable = error.file.startsWith("/");
              return (
                <div
                  key={`${error.file}:${error.line ?? 0}:${error.column ?? 0}:${error.message}`}
                  className="font-mono text-xs leading-relaxed"
                >
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => onJumpToError(error.file, error.line, error.column)}
                      className="block cursor-pointer text-left text-[11px] font-medium text-rose-500 underline decoration-rose-500/40 underline-offset-2 hover:text-rose-400"
                    >
                      {error.file.replace(/^\//, "")}
                      {error.line !== undefined
                        ? `:${error.line}${error.column !== undefined ? `:${error.column}` : ""}`
                        : ""}
                    </button>
                  ) : (
                    <span className="block text-[11px] text-pg-fg-muted">{error.file}</span>
                  )}
                  <span className="text-pg-fg">{error.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Response section */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {result?.kind === "response" ? (
          <Tabs.Root
            value={responseTab}
            onValueChange={(value) => setResponseTab(value as "body" | "headers" | "console")}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Sticky response metadata + tab list */}
            <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-b border-pg-border bg-pg-panel px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${statusBadgeClass(
                    result.status,
                  )}`}
                >
                  {result.status} {result.statusText}
                </span>
                <span className="font-mono text-[11px] text-pg-fg-muted">
                  {result.ms.toFixed(1)} ms
                </span>
                <span className="font-mono text-[11px] text-pg-fg-muted">
                  {formatBytes(result.body)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {isHtml && responseTab === "body" && (
                  <div className="mr-1 inline-flex rounded-md border border-pg-border bg-pg-surface p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setHtmlMode("preview")}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 ${
                        htmlMode === "preview"
                          ? "bg-pg-accent-soft font-medium text-pg-primary"
                          : "text-pg-fg-muted hover:text-pg-fg"
                      }`}
                    >
                      <Eye className="size-3" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setHtmlMode("source")}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 ${
                        htmlMode === "source"
                          ? "bg-pg-accent-soft font-medium text-pg-primary"
                          : "text-pg-fg-muted hover:text-pg-fg"
                      }`}
                    >
                      <Code2 className="size-3" />
                      Source
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  title="Copy response body"
                  onClick={() => void copyResponseBody()}
                  className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-pg-border bg-pg-surface px-2 text-[11px] text-pg-fg-muted transition-colors hover:bg-pg-hover hover:text-pg-fg"
                >
                  {copiedBody ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span>{copiedBody ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <Tabs.List className="flex flex-none items-center gap-1 border-b border-pg-border bg-pg-panel/40 px-3">
              <Tabs.Tab
                value="body"
                className="cursor-pointer border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-pg-fg-muted transition-colors hover:text-pg-fg data-[selected]:border-pg-primary data-[selected]:text-pg-fg"
              >
                Body
              </Tabs.Tab>
              <Tabs.Tab
                value="headers"
                className="cursor-pointer border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-pg-fg-muted transition-colors hover:text-pg-fg data-[selected]:border-pg-primary data-[selected]:text-pg-fg"
              >
                Headers ({result.headers.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="console"
                className="inline-flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-pg-fg-muted transition-colors hover:text-pg-fg data-[selected]:border-pg-primary data-[selected]:text-pg-fg"
              >
                <Terminal className="size-3" />
                <span>Console</span>
                {logs.length > 0 && (
                  <span className="rounded-full bg-pg-accent-soft px-1.5 font-mono text-[10px] text-pg-primary">
                    {logs.length}
                  </span>
                )}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="body" className="min-h-0 flex-1 overflow-auto p-3">
              {isHtml && htmlMode === "preview" ? (
                <iframe
                  sandbox=""
                  srcDoc={result.body}
                  title="HTML Response Preview"
                  className="h-full min-h-[320px] w-full rounded-lg border border-pg-border bg-white"
                />
              ) : isJson ? (
                <JsonViewer source={result.body} />
              ) : result.body === "" ? (
                <p className="font-mono text-xs text-pg-fg-muted italic">(empty response body)</p>
              ) : (
                <pre className="m-0 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-pg-fg">
                  {result.body}
                </pre>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="headers" className="min-h-0 flex-1 overflow-auto p-3">
              {result.headers.length === 0 ? (
                <p className="text-xs text-pg-fg-muted">No response headers.</p>
              ) : (
                <div className="divide-y divide-pg-border rounded-lg border border-pg-border bg-pg-surface">
                  {result.headers.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[minmax(110px,auto)_1fr] gap-3 px-3 py-1.5 font-mono text-xs"
                    >
                      <span className="font-medium text-pg-fg">{key}</span>
                      <span className="break-all text-pg-fg-muted">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="console" className="min-h-0 flex-1 overflow-auto p-3">
              {logs.length === 0 ? (
                <p className="text-xs text-pg-fg-muted">
                  No <code className="font-mono">console.log</code> output captured for this
                  request.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-2 rounded-lg border border-pg-border bg-pg-surface px-2.5 py-1.5 font-mono text-xs"
                    >
                      <span
                        className={`mt-0.5 shrink-0 rounded border px-1.5 py-0 text-[10px] font-semibold uppercase ${LOG_BADGE[entry.level]}`}
                      >
                        {entry.level}
                      </span>
                      <pre className="m-0 min-w-0 flex-1 break-words whitespace-pre-wrap text-pg-fg">
                        {entry.args.join(" ")}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </Tabs.Panel>
          </Tabs.Root>
        ) : result?.kind === "error" ? (
          <div className="m-3 rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 font-mono text-xs text-rose-600 dark:text-rose-400">
            <pre className="m-0 break-words whitespace-pre-wrap">{result.error}</pre>
          </div>
        ) : result?.kind === "timeout" ? (
          <div className="m-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            Request timed out after {(result.ms / 1000).toFixed(1)}s (possible infinite loop). The
            worker was terminated and is rebuilding.
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            {buildStatus.phase === "booting" ? (
              <>
                <Loader2 className="size-5 animate-spin text-pg-primary" />
                <p className="text-xs font-medium text-pg-fg">Initializing browser runtime…</p>
                <p className="text-[11px] text-pg-fg-muted">
                  Loading esbuild-wasm and compiling your Taser.js routes.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${methodBadgeClass(
                      "GET",
                    )}`}
                  >
                    GET
                  </span>
                  <code className="font-mono text-xs text-pg-fg">/users/1?full=true</code>
                </div>
                <p className="text-xs text-pg-fg-muted">
                  Pick a route above or type any path and press{" "}
                  <span className="font-medium text-pg-fg">Send</span>.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
