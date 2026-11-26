import { Popover } from "@base-ui/react/popover";
import type { DiscoveredRoute } from "@taserjs/cli/codegen";
import { Check, Ellipsis, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { methodBadgeClass, methodTextClass } from "../method-styles";

const PILL_GAP_PX = 6;
const SEARCH_THRESHOLD = 6;

/**
 * Compute how many leading route pills fit cleanly on one line without clipping.
 * Returns `pillWidths.length` when every pill fits without needing the overflow menu.
 */
export function computeVisibleRouteCount(
  pillWidths: readonly number[],
  availableWidth: number,
  overflowTriggerWidth: number,
  gapPx = PILL_GAP_PX,
): number {
  if (pillWidths.length === 0) return 0;
  if (availableWidth <= 0) return 0;

  let totalAll = 0;
  for (let i = 0; i < pillWidths.length; i += 1) {
    totalAll += (pillWidths[i] ?? 0) + (i > 0 ? gapPx : 0);
  }
  if (totalAll <= availableWidth) return pillWidths.length;

  const budget = availableWidth - overflowTriggerWidth;
  if (budget <= 0) return 0;

  let used = 0;
  let visible = 0;
  for (let i = 0; i < pillWidths.length; i += 1) {
    const next = used + (pillWidths[i] ?? 0) + gapPx;
    if (next > budget) break;
    used = next;
    visible += 1;
  }
  return visible;
}

interface RoutePickerBarProps {
  routes: DiscoveredRoute[];
  selectedMethod: string;
  selectedPath: string;
  samplePathFor: (canonicalPath: string) => string;
  onSelect: (method: string, canonicalPath: string) => void;
}

export function RoutePickerBar({
  routes,
  selectedMethod,
  selectedPath,
  samplePathFor,
  onSelect,
}: RoutePickerBarProps): React.JSX.Element | null {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const probeListRef = useRef<HTMLDivElement | null>(null);
  const probeOverflowRef = useRef<HTMLSpanElement | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(routes.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const routeSignature = useMemo(
    () => routes.map((route) => `${route.method} ${route.canonicalPath}`).join("|"),
    [routes],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = (): void => {
      const probeList = probeListRef.current;
      if (!probeList) return;
      const children = Array.from(probeList.children) as HTMLElement[];
      const widths = children.map((el) => Math.ceil(el.getBoundingClientRect().width));
      const overflowWidth = Math.ceil(
        probeOverflowRef.current?.getBoundingClientRect().width ?? 58,
      );
      const next = computeVisibleRouteCount(widths, track.clientWidth, overflowWidth, PILL_GAP_PX);
      setVisibleCount((prev) => (prev === next ? prev : next));
    };

    const rafId = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(track);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [routeSignature]);

  if (routes.length === 0) return null;

  const clampedVisible = Math.min(visibleCount, routes.length);
  const visibleRoutes = routes.slice(0, clampedVisible);
  const overflowRoutes = routes.slice(clampedVisible);

  const isRouteSelected = (route: DiscoveredRoute): boolean =>
    selectedMethod === route.method && selectedPath === samplePathFor(route.canonicalPath);

  const overflowHasSelected = overflowRoutes.some(isRouteSelected);
  const showSearch = overflowRoutes.length >= SEARCH_THRESHOLD;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOverflow = normalizedQuery
    ? overflowRoutes.filter(
        (route) =>
          route.canonicalPath.toLowerCase().includes(normalizedQuery) ||
          route.method.toLowerCase().includes(normalizedQuery),
      )
    : overflowRoutes;

  return (
    <div className="relative flex flex-none items-center gap-2 border-b border-pg-border bg-pg-panel/40 px-2.5 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold tracking-wider text-pg-fg-muted uppercase">
        Routes
      </span>

      <div
        ref={trackRef}
        className="relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
      >
        {/* Hidden single-line measurement probe matching exact pill typography */}
        <div
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-0 left-0 flex items-center whitespace-nowrap"
        >
          <div ref={probeListRef} className="flex items-center gap-1.5">
            {routes.map((route) => (
              <span
                key={`probe:${route.method} ${route.canonicalPath}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 font-mono text-[11px]"
              >
                <span className="text-[10px] font-bold">{route.method}</span>
                <span>{route.canonicalPath}</span>
              </span>
            ))}
          </div>
          <span
            ref={probeOverflowRef}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-transparent px-2 py-0.5 font-mono text-[11px] font-medium"
          >
            <span>+{routes.length}</span>
            <Ellipsis className="size-3.5" />
          </span>
        </div>

        {/* Visible single-line pills */}
        {visibleRoutes.map((route) => {
          const key = `${route.method} ${route.canonicalPath}`;
          const isSelected = isRouteSelected(route);
          return (
            <button
              key={key}
              type="button"
              title={`Send ${route.method} ${route.canonicalPath}`}
              onClick={() => onSelect(route.method, route.canonicalPath)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                isSelected
                  ? "border-orange-500/40 bg-pg-accent-soft text-pg-fg"
                  : "border-pg-border bg-pg-surface text-pg-fg-muted hover:border-pg-border-strong hover:text-pg-fg"
              }`}
            >
              <span className={`text-[10px] font-bold ${methodTextClass(route.method)}`}>
                {route.method}
              </span>
              <span>{route.canonicalPath}</span>
            </button>
          );
        })}

        {/* Overflow ellipsis dropdown */}
        {overflowRoutes.length > 0 && (
          <Popover.Root
            open={menuOpen}
            onOpenChange={(next) => {
              setMenuOpen(next);
              if (!next) setQuery("");
            }}
          >
            <Popover.Trigger
              aria-label={`Show ${overflowRoutes.length} more routes`}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium transition-colors ${
                overflowHasSelected
                  ? "border-orange-500/40 bg-pg-accent-soft text-pg-primary"
                  : "border-pg-border bg-pg-surface text-pg-fg-muted hover:border-pg-border-strong hover:text-pg-fg"
              }`}
            >
              <span>
                {clampedVisible === 0
                  ? `${overflowRoutes.length} ${overflowRoutes.length === 1 ? "route" : "routes"}`
                  : `+${overflowRoutes.length}`}
              </span>
              <Ellipsis className="size-3.5" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
                <Popover.Popup className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-pg-border-strong bg-pg-surface p-1.5 shadow-2xl">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-semibold tracking-wider text-pg-fg-muted uppercase">
                      {clampedVisible === 0
                        ? `Routes (${overflowRoutes.length})`
                        : `More routes (${overflowRoutes.length})`}
                    </span>
                    <span className="font-mono text-[10px] text-pg-fg-muted/75">
                      {routes.length} total
                    </span>
                  </div>

                  {showSearch && (
                    <div className="relative mb-1 px-1">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-3 -translate-y-1/2 text-pg-fg-muted" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Filter routes…"
                        spellCheck={false}
                        className="h-7 w-full rounded-lg border border-pg-border bg-pg-panel pr-2 pl-7 font-mono text-xs text-pg-fg outline-none placeholder:text-pg-fg-muted/60 focus:border-pg-primary"
                      />
                    </div>
                  )}

                  <div className="max-h-64 space-y-0.5 overflow-y-auto">
                    {filteredOverflow.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-pg-fg-muted">
                        No matching routes
                      </p>
                    ) : (
                      filteredOverflow.map((route) => {
                        const key = `${route.method} ${route.canonicalPath}`;
                        const isSelected = isRouteSelected(route);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              onSelect(route.method, route.canonicalPath);
                              setMenuOpen(false);
                              setQuery("");
                            }}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs transition-colors ${
                              isSelected
                                ? "bg-pg-accent-soft text-pg-fg"
                                : "text-pg-fg/90 hover:bg-pg-hover hover:text-pg-fg"
                            }`}
                          >
                            <span
                              className={`inline-flex w-13 shrink-0 justify-center rounded border px-1 py-0 text-[10px] font-bold uppercase ${methodBadgeClass(
                                route.method,
                              )}`}
                            >
                              {route.method}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{route.canonicalPath}</span>
                            {isSelected && <Check className="size-3.5 shrink-0 text-pg-primary" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
    </div>
  );
}
