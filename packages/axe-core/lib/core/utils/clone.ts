/**
 * Deeply clones an object or array. DOM nodes or collections of DOM nodes are not deeply cloned and are instead returned as is.
 * @param  {Mixed} obj The object/array to clone
 * @return {Mixed} A clone of the initial object or array
 */
export default function clone(obj: unknown): unknown {
  return cloneRecused(obj, new Map());
}

// internal function to hide non-user facing parameters
function cloneRecused(obj: unknown, seen: Map<unknown, unknown>): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // don't clone DOM nodes. since we can pass nodes from different window contexts
  // we'll also use duck typing to determine what is a DOM node
  if (
    (typeof window !== 'undefined' &&
      window?.Node &&
      obj instanceof window.Node) ||
    (typeof window !== 'undefined' &&
      window?.HTMLCollection &&
      obj instanceof window.HTMLCollection) ||
    ('nodeName' in (obj as object) &&
      'nodeType' in (obj as object) &&
      'ownerDocument' in (obj as object))
  ) {
    return obj;
  }

  // handle circular references by caching the cloned object and returning it
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  if (Array.isArray(obj)) {
    const out: unknown[] = [];
    seen.set(obj, out);
    obj.forEach(value => {
      out.push(cloneRecused(value, seen));
    });
    return out;
  }

  const out: Record<string, unknown> = {};
  seen.set(obj, out);
  // eslint-disable-next-line guard-for-in
  for (const key in obj as Record<string, unknown>) {
    out[key] = cloneRecused((obj as Record<string, unknown>)[key], seen);
  }
  return out;
}
