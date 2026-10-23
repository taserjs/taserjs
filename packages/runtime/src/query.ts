import { tryDecodeURIComponent } from "hono/utils/url";

export type ParsedQuery = Record<string, string | string[]>;

const EMPTY_QUERY: ParsedQuery = Object.freeze({});

/** Past "scheme://", so a "?" or "#" in the scheme part can never be mistaken for the query. */
const URL_SEARCH_START = 8;
const CHAR_AMPERSAND = 38;
const CHAR_EQUALS = 61;
const CHAR_PERCENT = 37;
const CHAR_PLUS = 43;
/** Assigning this key to a plain object would rewrite its prototype instead of adding a key. */
const PROTOTYPE_KEY = "__proto__";

/** Matches Hono's query decoding: "+" is a space, then percent sequences are decoded leniently. */
function decodeQueryComponent(raw: string): string {
  const withSpaces = raw.indexOf("+") === -1 ? raw : raw.replace(/\+/g, " ");
  return tryDecodeURIComponent(withSpaces);
}

function sliceComponent(url: string, start: number, end: number, isEncoded: boolean): string {
  const raw = url.slice(start, end);
  return isEncoded ? decodeQueryComponent(raw) : raw;
}

function addQueryValue(query: ParsedQuery, name: string, value: string): void {
  if (name === PROTOTYPE_KEY) return;

  // Own values are only ever strings or arrays; anything else is inherited from Object.prototype.
  const existing = query[name];
  if (typeof existing === "string") {
    query[name] = [existing, value];
  } else if (Array.isArray(existing)) {
    existing.push(value);
  } else {
    query[name] = value;
  }
}

/**
 * Parses the query string of a request URL in a single pass.
 *
 * Output matches Hono's `c.req.queries()` reshaped to "one value -> string, several -> array", so
 * it can replace that call without changing what handlers see. The difference: a `__proto__` key
 * is ignored instead of being assigned onto the result.
 */
export function parseQueryString(url: string): ParsedQuery {
  const hashIndex = url.indexOf("#", URL_SEARCH_START);
  const end = hashIndex === -1 ? url.length : hashIndex;
  const questionMarkIndex = url.indexOf("?", URL_SEARCH_START);
  if (questionMarkIndex === -1 || questionMarkIndex >= end) {
    return EMPTY_QUERY;
  }

  const query: ParsedQuery = {};
  let segmentStart = questionMarkIndex + 1;
  let valueStart = -1;
  let isEncoded = false;

  for (let index = segmentStart; index <= end; index++) {
    const code = index === end ? CHAR_AMPERSAND : url.charCodeAt(index);

    if (code === CHAR_AMPERSAND) {
      const nameEnd = valueStart === -1 ? index : valueStart - 1;
      if (nameEnd > segmentStart) {
        const name = sliceComponent(url, segmentStart, nameEnd, isEncoded);
        const value = valueStart === -1 ? "" : sliceComponent(url, valueStart, index, isEncoded);
        addQueryValue(query, name, value);
      }
      segmentStart = index + 1;
      valueStart = -1;
      isEncoded = false;
    } else if (code === CHAR_EQUALS) {
      if (valueStart === -1) valueStart = index + 1;
    } else if (code === CHAR_PERCENT || code === CHAR_PLUS) {
      isEncoded = true;
    }
  }

  return query;
}
