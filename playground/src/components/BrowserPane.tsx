import { useEffect, useRef, useState } from "react";

import {
  getBuildStatus,
  request,
  subscribeBuildStatus,
  type BuildStatus,
  type RunResult,
} from "../runner";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const HOST_PREFIX = "http://localhost";

/**
 * Accepts a typed path and tolerates a pasted absolute URL pointing at the
 * local mock origin, returning the editable suffix for the input.
 */
function pathSuffixOf(text: string): string {
  const pasted = text.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?<rest>\/.*)?$/i);
  return pasted?.groups?.rest ?? text;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return "s2";
  if (status < 400) return "s3";
  if (status < 500) return "s4";
  return "s5";
}

export function BrowserPane(): React.JSX.Element {
  const [dial, setDial] = useState<BuildStatus>(getBuildStatus());
  const [method, setMethod] = useState("GET");
  const [pathText, setPathText] = useState("/");
  const [bodyText, setBodyText] = useState("");
  const [viewSource, setViewSource] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [sending, setSending] = useState(false);
  const autoRan = useRef(false);

  useEffect(() => subscribeBuildStatus(setDial), []);

  const submit = async (): Promise<void> => {
    setSending(true);
    try {
      // if a rebuild from a recent file change is still running, wait it out so
      // a Go right after creating a route doesn't hit the stale worker (404)
      for (let i = 0; i < 150 && getBuildStatus().phase !== "ready"; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // eslint-disable-line no-await-in-loop -- serial polling by design
      }
      // the prefix is fixed chrome; the input holds only the path/query part
      const suffix = pathSuffixOf(pathText);
      const href = new URL(suffix.startsWith("/") ? suffix : `/${suffix}`, `${HOST_PREFIX}/`).href;
      const body = method !== "GET" && bodyText.trim() !== "" ? bodyText : undefined;
      const response = await request(body ? { method, url: href, body } : { method, url: href });
      if (response.kind === "timeout") {
        void import("../runner").then(({ requestRebuild }) => requestRebuild());
      }
      setResult(response);
    } catch (err) {
      setResult({ kind: "error", error: String((err as Error)?.message ?? err), ms: 0 });
    } finally {
      setSending(false);
    }
  };

  // first successful build: run GET / automatically
  useEffect(() => {
    if (dial.phase === "ready" && !autoRan.current) {
      autoRan.current = true;
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial.phase]);

  const contentType =
    result?.kind === "response"
      ? (result.headers.find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? "")
      : "";
  const isJson = contentType.includes("json");
  const isHtml = contentType.includes("text/html");

  return (
    <aside className="panel browser">
      <div className="panel-head">
        <span className="title">Browser</span>
        <span className="spacer" />
        {dial.phase !== "ready" && (
          <span>{dial.phase === "booting" ? "loading compiler…" : dial.phase}</span>
        )}
        {result && <span className="resp-ms">{result.ms.toFixed(0)}ms</span>}
      </div>
      <form
        className="browser-controls"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <select
          className="method-select"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          {METHODS.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
        <div className="urlbar-wrap">
          <span className="urlbar-prefix">{HOST_PREFIX}</span>
          <input
            className="text urlbar"
            value={pathText}
            placeholder="/users/1?full=true"
            spellCheck={false}
            onChange={(event) => setPathText(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
        <button className="btn primary run-btn" type="submit" disabled={sending}>
          {sending ? "…" : "Go"}
        </button>
      </form>
      {method !== "GET" && (
        <div className="req-body">
          <textarea
            value={bodyText}
            placeholder='request body, e.g. {"name": "Ada"}'
            onChange={(event) => setBodyText(event.target.value)}
          />
        </div>
      )}
      <div className="browser-body">
        {dial.errors.length > 0 && (
          <div className="error-list">
            {dial.errors.map((error) => (
              <div key={`${error.file}:${error.message}`}>
                <span className="err-file">
                  {error.file}
                  {error.line !== undefined
                    ? `:${error.line}${error.column !== undefined ? `:${error.column}` : ""}`
                    : ""}
                </span>
                {error.message}
              </div>
            ))}
          </div>
        )}
        {result?.kind === "response" && (
          <>
            <div className={`resp-head resp-${statusClass(result.status)}`}>
              <span className={`resp-status ${statusClass(result.status)}`}>
                {result.status} {result.statusText}
              </span>
              <span className="spacer" />
              <span className="resp-ms">{result.ms.toFixed(1)}ms</span>
            </div>
            <details className="headers">
              <summary>Headers ({result.headers.length})</summary>
              <table>
                <tbody>
                  {result.headers.map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            {isHtml && (
              <div className="view-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={viewSource}
                    onChange={(event) => setViewSource(event.target.checked)}
                  />
                  View source
                </label>
              </div>
            )}
            <div className="body-view">
              {isHtml && !viewSource ? (
                <iframe sandbox="" srcDoc={result.body} title="response" />
              ) : isJson ? (
                <pre>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(result.body), null, 2);
                    } catch {
                      return result.body;
                    }
                  })()}
                </pre>
              ) : (
                <pre>{result.body}</pre>
              )}
            </div>
          </>
        )}
        {result?.kind === "error" && (
          <div className="notice error">
            <span>{result.error}</span>
          </div>
        )}
        {result?.kind === "timeout" && (
          <div className="notice error">
            <span>
              Request timed out after {(result.ms / 1000).toFixed(1)}s (possible infinite loop). The
              worker was terminated; the next request rebuilds it.
            </span>
          </div>
        )}
        {!result && dial.errors.length === 0 && dial.phase !== "booting" && (
          <div className="notice">
            <span>
              Type a path like <code>/users/1</code> and press Go.
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
