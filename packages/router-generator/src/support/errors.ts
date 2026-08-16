export class ScanError extends Error {
  constructor(
    message: string,
    readonly filePath?: string,
  ) {
    super(filePath ? `${message} (${filePath})` : message);
    this.name = "ScanError";
  }
}

export class ScanErrorCollection extends Error {
  constructor(readonly errors: ScanError[]) {
    super(formatScanErrors(errors));
    this.name = "ScanErrorCollection";
  }
}

export function formatScanErrors(errors: ScanError[]): string {
  return errors.map((error) => `- ${error.message}`).join("\n");
}
