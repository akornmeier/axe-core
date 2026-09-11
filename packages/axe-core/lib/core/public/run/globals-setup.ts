import cache from '../../base/cache';

export function setupGlobals(context: unknown): void {
  // if window or document are not defined and context was passed in
  // we can use it to configure them
  // NOTE: because our polyfills run first, the global window object
  // always exists but may not have things we expect
  const hasWindow = window && 'Node' in window && 'NodeList' in window;
  const hasDoc = !!document;
  if (hasWindow && hasDoc) {
    return;
  }
  if (!context || !(context as Node).ownerDocument) {
    throw new Error(
      'Required "window" or "document" globals not defined and cannot be deduced from the context. ' +
        'Either set the globals before running or pass in a valid Element.'
    );
  }

  if (!hasDoc) {
    cache.set('globalDocumentSet', true);
    document = (context as Node).ownerDocument!;
  }

  if (!hasWindow) {
    cache.set('globalWindowSet', true);
    window = document.defaultView!;
  }
}

export function resetGlobals(): void {
  if (cache.get('globalDocumentSet')) {
    cache.set('globalDocumentSet', false);
    // These bindings are private to the bundle, not host globals.
    // @ts-expect-error - document is absent between Node runs
    document = undefined;
  }
  if (cache.get('globalWindowSet')) {
    cache.set('globalWindowSet', false);
    // @ts-expect-error - no DOM window exists between Node runs
    window = {};
  }
}
