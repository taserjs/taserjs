import { serialize, type Options as FormBodySerializeOptions } from "object-to-formdata";

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
 * Typed to satisfy the route `$Infer.Input` body shape at call sites.
 */
export function formBody<T extends Record<string, FormBodyField>>(
  value: T,
  options?: FormBodySerializeOptions,
): FormBody<T> {
  return serialize(value, options) as FormBody<T>;
}
