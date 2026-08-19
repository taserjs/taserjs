import type { BodyKind } from "./reply/types.js";

export const TEXT_PLAIN = "text/plain; charset=utf-8";
export const TEXT_HTML = "text/html; charset=utf-8";
export const APPLICATION_JSON = "application/json; charset=utf-8";
export const APPLICATION_OCTET_STREAM = "application/octet-stream";
export const APPLICATION_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded;charset=UTF-8";

export const STATUS_OK = 200;
export const STATUS_CREATED = 201;
export const STATUS_ACCEPTED = 202;
export const STATUS_NO_CONTENT = 204;
export const STATUS_FOUND = 302;
export const STATUS_BAD_REQUEST = 400;
export const STATUS_UNAUTHORIZED = 401;
export const STATUS_FORBIDDEN = 403;
export const STATUS_NOT_FOUND = 404;
export const STATUS_CONFLICT = 409;
export const STATUS_PAYLOAD_TOO_LARGE = 413;
export const STATUS_UNSUPPORTED_MEDIA_TYPE = 415;
export const STATUS_UNPROCESSABLE_ENTITY = 422;
export const STATUS_TOO_MANY_REQUESTS = 429;
export const STATUS_INTERNAL_SERVER_ERROR = 500;
export const STATUS_NOT_IMPLEMENTED = 501;
export const STATUS_BAD_GATEWAY = 502;
export const STATUS_SERVICE_UNAVAILABLE = 503;
export const STATUS_GATEWAY_TIMEOUT = 504;

export const ERROR_MESSAGES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
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
