export type BodyMode = "json" | "form" | "urlencoded" | "text" | "raw";

export function unsupportedMediaType(data?: unknown, init?: number | ResponseInit): Response {
  const payload = data ?? { message: "Unsupported Media Type" };
  const resInit = typeof init === "number" ? { status: init } : { status: 415, ...init };
  return Response.json(payload, resInit);
}

export class UnsupportedMediaTypeError extends Error {
  readonly status = 415;
  readonly response: Response;

  constructor(message = "Unsupported Media Type", data?: unknown) {
    super(message);
    this.name = "UnsupportedMediaTypeError";
    this.response = unsupportedMediaType(data ?? { message });
  }
}
