import type { RequestHeader } from "hono/utils/headers";

export type TaserHeaders = {
  get(name: RequestHeader | (string & {})): string | undefined;
  getAll(): Record<string, string>;
};

class TaserHeadersImpl implements TaserHeaders {
  constructor(private readonly headers: Headers) {}

  get(name: RequestHeader | (string & {})): string | undefined {
    return this.headers.get(name) ?? undefined;
  }

  getAll(): Record<string, string> {
    const record: Record<string, string> = Object.create(null);
    this.headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
}

export function createTaserHeaders(headers: Headers): TaserHeaders {
  return new TaserHeadersImpl(headers);
}
