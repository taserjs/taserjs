import { ZeroTraceError } from "./errors.js";

export type BodyMode = "json" | "form" | "urlencoded" | "text" | "raw";

export function unsupportedMediaType(data?: unknown, init?: number | ResponseInit): Response {
  const payload = data ?? { message: "Unsupported Media Type" };
  const resInit = typeof init === "number" ? { status: init } : { status: 415, ...init };
  return Response.json(payload, resInit);
}

export class UnsupportedMediaTypeError extends ZeroTraceError {
  readonly status = 415;
  readonly #data: unknown;

  constructor(message = "Unsupported Media Type", data?: unknown) {
    super(message);
    this.name = "UnsupportedMediaTypeError";
    this.#data = data ?? { message };
  }

  /** Built on demand: most of these errors are thrown for logging or tests, not answered. */
  get response(): Response {
    return unsupportedMediaType(this.#data);
  }
}
