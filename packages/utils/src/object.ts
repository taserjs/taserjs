/**
 * Object inspection and classification helpers.
 */

/**
 * Returns true if the value is a plain JavaScript object (Object literal or Object.create(null)).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return (proto === null || proto === Object.prototype) && !(Symbol.toStringTag in value);
}

/**
 * Returns true if the value is a plain JavaScript object or an Array.
 */
export function isPlainObjectOrArray(value: unknown): value is Record<string, unknown> | unknown[] {
  if (value === null || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  return isPlainObject(value);
}
