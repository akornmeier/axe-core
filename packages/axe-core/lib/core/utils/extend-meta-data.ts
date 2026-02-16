/**
 * Extends metadata onto result object and executes any functions
 * @param  {Object} to   The target of the extend
 * @param  {Object} from Metadata to extend
 */
function extendMetaData(
  to: Record<string, unknown>,
  from: Record<string, unknown>
): void {
  Object.assign(to, from);
  Object.keys(from)
    .filter(prop => typeof from[prop] === 'function')
    .forEach(prop => {
      to[prop] = null;
      try {
        to[prop] = (from[prop] as (target: Record<string, unknown>) => unknown)(
          to
        );
      } catch {
        // Ignore
      }
    });
}

export default extendMetaData;
