import constants from '../constants';

/**
 * Serializes an error to a JSON object
 * @param e - The error to serialize
 * @returns A JSON object representing the error
 */
export default function serializeError(
  err: unknown,
  iteration = 0
): Record<string, unknown> {
  if (typeof err !== 'object' || err === null) {
    return { message: String(err) };
  }
  const serial: Record<string, unknown> = {};
  for (const prop of constants.serializableErrorProps) {
    if (
      ['string', 'number', 'boolean'].includes(
        typeof (err as Record<string, unknown>)[prop]
      )
    ) {
      serial[prop] = (err as Record<string, unknown>)[prop];
    }
  }
  // Recursively serialize cause up to 10 levels deep
  if ((err as { cause?: unknown }).cause) {
    serial.cause =
      iteration < 10
        ? serializeError((err as { cause: unknown }).cause, iteration + 1)
        : '...';
  }
  return serial;
}
