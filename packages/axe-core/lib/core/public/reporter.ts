export type ReporterCallback = (
  results: unknown,
  options: unknown,
  resolve: (result: unknown) => void,
  reject: (error: unknown) => void
) => unknown;

export const reporters: Record<string, ReporterCallback> = {};
let defaultReporter: ReporterCallback | undefined;

export function hasReporter(reporterName: string): boolean {
  return reporters.hasOwnProperty(reporterName);
}

export function getReporter(
  reporter: string | ReporterCallback | undefined
): ReporterCallback {
  if (typeof reporter === 'string' && reporters[reporter]) {
    return reporters[reporter];
  }

  if (typeof reporter === 'function') {
    return reporter;
  }

  return defaultReporter!;
}

export function addReporter(
  name: string,
  cb: ReporterCallback,
  isDefault?: boolean
): void {
  reporters[name] = cb;
  if (isDefault) {
    defaultReporter = cb;
  }
}
