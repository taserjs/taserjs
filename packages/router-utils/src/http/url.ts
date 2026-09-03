/**
 * High-performance URL pathname extractor.
 * Operates on raw URL strings with zero regex, zero URL object instantiation,
 * and handles scheme-relative paths, query strings, and hash fragments.
 */
export function extractPathname(url: string): string {
  const schemeEnd = url.indexOf("://");
  const pathStart = schemeEnd === -1 ? 0 : url.indexOf("/", schemeEnd + 3);
  if (pathStart === -1) {
    return "/";
  }
  const queryIndex = url.indexOf("?", pathStart);
  const hashIndex = url.indexOf("#", pathStart);
  const end =
    queryIndex === -1
      ? hashIndex === -1
        ? url.length
        : hashIndex
      : hashIndex === -1
        ? queryIndex
        : Math.min(queryIndex, hashIndex);
  const slice = url.slice(pathStart, end);
  if (!slice) return "/";
  return slice.charCodeAt(0) === 47 /* '/' */ ? slice : `/${slice}`;
}
