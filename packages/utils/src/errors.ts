/**
 * Base for errors that are caught and translated into responses.
 * Skipping stack capture keeps those expected failures cheap.
 */
export class ZeroTraceError extends Error {
  constructor(message?: string) {
    const errorConstructor = Error as unknown as { stackTraceLimit?: number };
    const previousLimit = errorConstructor.stackTraceLimit;
    if (typeof previousLimit === "number") {
      errorConstructor.stackTraceLimit = 0;
    }
    try {
      super(message);
    } finally {
      if (typeof previousLimit === "number") {
        errorConstructor.stackTraceLimit = previousLimit;
      }
    }
  }
}
