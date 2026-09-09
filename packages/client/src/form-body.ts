declare const FormBodyBrand: unique symbol;

/** FormData tagged with the object shape passed to {@link formBody}. */
export type FormBody<T extends Record<string, FormBodyField>> = FormData & {
  readonly [FormBodyBrand]: T;
};

export type FormBodyField =
  | string
  | number
  | boolean
  | bigint
  | Date
  | Blob
  | File
  | null
  | undefined
  | FormBodyField[]
  | { readonly [key: string]: FormBodyField };

/** Route body input or a multipart payload built from that shape. */
export type FormBodyInput<T> = T | FormBody<T extends Record<string, FormBodyField> ? T : never>;

/**
 * Build multipart `FormData` from a plain object (files, strings, nested fields).
 * Typed to satisfy route body shapes at call sites.
 */
export function formBody<T extends Record<string, FormBodyField>>(fields: T): FormBody<T> {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        if (item instanceof Blob) {
          fd.append(key, item);
        } else if (item instanceof Date) {
          fd.append(key, item.toISOString());
        } else {
          fd.append(key, String(item));
        }
      }
    } else if (value instanceof Blob) {
      fd.append(key, value);
    } else if (value instanceof Date) {
      fd.append(key, value.toISOString());
    } else {
      fd.append(key, String(value));
    }
  }
  return fd as FormBody<T>;
}
