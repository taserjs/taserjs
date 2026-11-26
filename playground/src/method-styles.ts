export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

const METHOD_BADGE_CLASSES: Record<string, string> = {
  GET: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/25",
  POST: "text-orange-600 dark:text-orange-400 bg-orange-500/12 border-orange-500/25",
  PUT: "text-sky-600 dark:text-sky-400 bg-sky-500/12 border-sky-500/25",
  PATCH: "text-violet-600 dark:text-violet-400 bg-violet-500/12 border-violet-500/25",
  DELETE: "text-rose-600 dark:text-rose-400 bg-rose-500/12 border-rose-500/25",
  OPTIONS: "text-amber-600 dark:text-amber-400 bg-amber-500/12 border-amber-500/25",
  QUERY: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/12 border-cyan-500/25",
  ALL: "text-pg-fg-muted bg-pg-muted border-pg-border",
  ANY: "text-pg-fg-muted bg-pg-muted border-pg-border",
};

const METHOD_TEXT_CLASSES: Record<string, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-orange-600 dark:text-orange-400",
  PUT: "text-sky-600 dark:text-sky-400",
  PATCH: "text-violet-600 dark:text-violet-400",
  DELETE: "text-rose-600 dark:text-rose-400",
  OPTIONS: "text-amber-600 dark:text-amber-400",
  QUERY: "text-cyan-600 dark:text-cyan-400",
  ALL: "text-pg-fg-muted",
  ANY: "text-pg-fg-muted",
};

export const LAYOUT_TEXT_CLASS = "text-fuchsia-600 dark:text-fuchsia-400";
export const LAYOUT_BADGE_CLASS =
  "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/12 border-fuchsia-500/25";

export function methodBadgeClass(method: string): string {
  return (
    METHOD_BADGE_CLASSES[method.toUpperCase()] ?? "text-pg-fg-muted bg-pg-muted border-pg-border"
  );
}

export function methodTextClass(method: string): string {
  return METHOD_TEXT_CLASSES[method.toUpperCase()] ?? "text-pg-fg-muted";
}

export function statusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/12 border-emerald-500/25";
  }
  if (status >= 300 && status < 400) {
    return "text-sky-700 dark:text-sky-400 bg-sky-500/12 border-sky-500/25";
  }
  if (status >= 400 && status < 500) {
    return "text-amber-700 dark:text-amber-400 bg-amber-500/12 border-amber-500/25";
  }
  return "text-rose-700 dark:text-rose-400 bg-rose-500/12 border-rose-500/25";
}
