import type { BodyKind } from "./reply/types.js";

export const TEXT_PLAIN = "text/plain; charset=utf-8";
export const APPLICATION_JSON = "application/json; charset=utf-8";
export const APPLICATION_OCTET_STREAM = "application/octet-stream";
export const APPLICATION_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded;charset=UTF-8";

export const STATUS_OK = 200;
export const STATUS_NO_CONTENT = 204;
export const STATUS_FOUND = 302;
export const STATUS_BAD_GATEWAY = 502;

export const ERROR_MESSAGES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
  502: "Bad Gateway",
  0: "An unexpected error occurred",
};

export const DEFAULT_HEADERS_BY_BODY_KIND: Record<
  BodyKind,
  Readonly<Record<string, string>> | null
> = {
  empty: null,
  null: null,
  string: { "content-type": TEXT_PLAIN },
  json: { "content-type": APPLICATION_JSON },
  bytes: { "content-type": APPLICATION_OCTET_STREAM },
  blob: null,
  stream: null,
  formData: null,
  urlSearchParams: { "content-type": APPLICATION_X_WWW_FORM_URLENCODED },
};
