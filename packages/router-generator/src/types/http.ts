import { HTTP_VERBS } from '../constants.js'

export type HttpVerb = (typeof HTTP_VERBS)[number]
export type RouteFileMethod = HttpVerb | 'ANY' | 'ALL'

export { HTTP_VERBS, ROUTE_VERB_PATTERN } from '../constants.js'
