import type { RequestHeader } from 'hono/utils/headers'

export type TaserHeaders = {
  get(name: RequestHeader | (string & {})): string | undefined
  getAll(): Record<string, string>
}

export function createTaserHeaders(headers: Headers): TaserHeaders {
  return {
    get(name) {
      return headers.get(name) ?? undefined
    },
    getAll() {
      const record: Record<string, string> = Object.create(null)
      headers.forEach((value, key) => {
        record[key] = value
      })
      return record
    },
  }
}
