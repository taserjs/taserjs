import { getQueryParams } from "hono/utils/url";
import { describe, expect, it } from "vitest";

import { parseQueryString, type ParsedQuery } from "../src/query.js";

/** The behaviour parseQueryString replaces: Hono's parser reshaped to string-or-array values. */
function parseWithHono(url: string): ParsedQuery {
  const query: ParsedQuery = {};
  for (const [key, values] of Object.entries(getQueryParams(url) ?? {})) {
    if (values.length === 1) query[key] = values[0]!;
    else if (values.length > 1) query[key] = values;
  }
  return query;
}

const BASE = "http://localhost/path";

const CORPUS = [
  "",
  "?",
  "?a=1",
  "?a=1&b=2",
  "?a",
  "?a=",
  "?=x",
  "?&&a=1&&",
  "?a=1&a=2",
  "?a=1&a=2&a=3",
  "?a=&a=",
  "?a=1&b",
  "?a=1=2",
  "?a==",
  "?a=%20b",
  "?a=b+c",
  "?a%20b=c",
  "?a+b=c",
  "?a=%26b%3Dc",
  "?a=%E0%A4%A",
  "?a=%zz",
  "?a=%",
  "?a=100%&b=%41",
  "?name=%E4%BD%A0%E5%A5%BD",
  "?name=你好&emoji=😀",
  "?a[]=1&a[]=2",
  "?a[b]=1",
  "?toString=1",
  "?constructor=a&constructor=b",
  "?hasOwnProperty=1",
  "?2=b&1=a&x=c",
  "?a=1#fragment",
  "?a=1&b=2#c=3&d=4",
  "#a=1",
  "#?a=1",
  "?a=1?b=2",
  "?a=%23hash",
];

describe("parseQueryString", () => {
  it.each(CORPUS)("matches the Hono parser for %j", (search) => {
    const url = BASE + search;
    expect(parseQueryString(url)).toEqual(parseWithHono(url));
    expect(Object.keys(parseQueryString(url))).toEqual(Object.keys(parseWithHono(url)));
  });

  it("matches the Hono parser when the path contains encoded characters", () => {
    for (const path of ["/p%20q", "/p+q", "/p%"]) {
      const url = `http://localhost${path}?a=b+c&d=%20`;
      expect(parseQueryString(url)).toEqual(parseWithHono(url));
    }
  });

  it("matches the Hono parser for generated inputs", () => {
    const alphabet = ["a", "b", "1", "=", "&", "%", "+", "#", "?", "2", "E", "0", " ", "-"];
    let seed = 42;
    const nextIndex = (limit: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed % limit;
    };

    for (let round = 0; round < 2000; round++) {
      let search = "";
      const length = nextIndex(24);
      for (let position = 0; position < length; position++) {
        search += alphabet[nextIndex(alphabet.length)];
      }
      const url = `${BASE}?${search}`;
      expect(parseQueryString(url), url).toEqual(parseWithHono(url));
    }
  });

  it("returns a shared empty object when there is no query string", () => {
    expect(parseQueryString(BASE)).toEqual({});
    expect(parseQueryString(`${BASE}#a=1`)).toBe(parseQueryString(BASE));
  });

  it("ignores a __proto__ key instead of rewriting the result prototype", () => {
    const query = parseQueryString(`${BASE}?__proto__=x&__proto__=y&a=1`);
    expect(Object.getPrototypeOf(query)).toBe(Object.prototype);
    expect(Object.keys(query)).toEqual(["a"]);
  });

  it("keeps Object.prototype method names usable as ordinary keys", () => {
    const query = parseQueryString(`${BASE}?toString=1&hasOwnProperty=a&hasOwnProperty=b`);
    expect(query.toString).toBe("1");
    expect(query.hasOwnProperty).toEqual(["a", "b"]);
  });

  it("returns an object that supports prototype methods", () => {
    expect(parseQueryString(`${BASE}?a=1`).hasOwnProperty("a")).toBe(true);
  });
});
