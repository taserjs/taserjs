import { CLIENT_METHOD_MAP, type ClientMethodKey, type HttpMethod } from "@taserjs/router-utils";

export const METHOD_MAP = CLIENT_METHOD_MAP;

export type HttpMethodName = keyof typeof METHOD_MAP;

export const CLIENT_METHODS = new Set<string>(Object.values(METHOD_MAP));

export const CLIENT_TO_HTTP: Record<ClientMethodKey, HttpMethod> = {
  $get: "GET",
  $post: "POST",
  $put: "PUT",
  $patch: "PATCH",
  $delete: "DELETE",
  $options: "OPTIONS",
  $head: "HEAD",
  $query: "QUERY",
};
