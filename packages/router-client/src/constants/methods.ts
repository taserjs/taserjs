import { CLIENT_METHOD_MAP } from "@taserjs/router-utils";

export const METHOD_MAP = CLIENT_METHOD_MAP;

export type HttpMethodName = keyof typeof METHOD_MAP;

export const CLIENT_METHODS = new Set<string>(Object.values(METHOD_MAP));
