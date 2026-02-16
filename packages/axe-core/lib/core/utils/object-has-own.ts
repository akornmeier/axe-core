// Wrapper to prevent throwing for non-objects & null
export default function objectHasOwn(obj: unknown, prop: string): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
