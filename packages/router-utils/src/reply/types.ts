export type ReplyInit = Omit<ResponseInit, 'status'> & { status?: number }

export type BinaryBody = Buffer | Uint8Array | ArrayBuffer

export type FileReplyInit = ReplyInit & {
  contentType?: string
  /** Required when path is relative. Resolved path must stay under this directory. */
  root?: string
}

export type RedirectInit = ReplyInit & {
  /** Allow absolute http(s) redirect URLs. Default false. */
  allowExternal?: boolean
}

export type BodyKind = | 'empty'
  | 'null'
  | 'string'
  | 'json'
  | 'bytes'
  | 'blob'
  | 'stream'
  | 'formData'
  | 'urlSearchParams'
