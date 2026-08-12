export const METHOD_MAP = {
  GET: '$get',
  POST: '$post',
  PUT: '$put',
  PATCH: '$patch',
  DELETE: '$delete',
  OPTIONS: '$options',
  HEAD: '$head',
} as const

export type HttpMethodName = keyof typeof METHOD_MAP

export const CLIENT_METHODS = new Set<string>(Object.values(METHOD_MAP))
