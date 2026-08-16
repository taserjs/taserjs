/**
 * Validate redirect targets. Default: same-origin relative paths only (`/path`, not `//`).
 */
export function validateRedirectLocation(location: string, allowExternal = false): void {
  if (/[\r\n\0]/.test(location)) {
    throw new Error("Invalid redirect location");
  }

  if (allowExternal) {
    return;
  }

  if (location.startsWith("//")) {
    throw new Error("Protocol-relative redirect locations are not allowed");
  }

  if (/^https?:\/\//i.test(location)) {
    throw new Error("External redirect locations are not allowed");
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(location)) {
    throw new Error("External redirect locations are not allowed");
  }

  if (!location.startsWith("/")) {
    throw new Error("Redirect location must be a path starting with /");
  }
}
