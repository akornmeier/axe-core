/* eslint no-script-url:0 */
/**
 * Check if a string contains mostly numbers
 */
function isMostlyNumbers(str = ''): boolean {
  return (
    str.length !== 0 && (str.match(/[0-9]/g) || '').length >= str.length / 2
  );
}

/**
 * Spit a string into an array with two pieces, at a given index
 */
function splitString(str: string, splitIndex: number): [string, string] {
  return [str.substring(0, splitIndex), str.substring(splitIndex)];
}

function trimRight(str: string): string {
  return str.replace(/\s+$/, '');
}

function uriParser(url: string): {
  original: string;
  protocol: string;
  domain: string;
  port: string;
  path: string;
  query: string;
  hash: string;
} {
  const original = url;
  let protocol = '',
    domain = '',
    port = '',
    path = '',
    query = '',
    hash = '';
  if (url.includes('#')) {
    [url, hash] = splitString(url, url.indexOf('#'));
  }

  if (url.includes('?')) {
    [url, query] = splitString(url, url.indexOf('?'));
  }

  if (url.includes('://')) {
    [protocol, url] = url.split('://') as [string, string];
    [domain, url] = splitString(url, url.indexOf('/'));
  } else if (url.substr(0, 2) === '//') {
    url = url.substr(2);
    [domain, url] = splitString(url, url.indexOf('/'));
  }

  if (domain.substr(0, 4) === 'www.') {
    domain = domain.substr(4);
  }

  if (domain && domain.includes(':')) {
    [domain, port] = splitString(domain, domain.indexOf(':'));
  }

  path = url;
  return { original, protocol, domain, port, path, query, hash };
}

/**
 * Try to, at the end of the URI, find a string that a user can identify the URI by
 */
function getFriendlyUriEnd(
  uri = '',
  options: { currentDomain?: string; maxLength?: number } = {}
): string | undefined {
  if (
    uri.length <= 1 ||
    uri.substr(0, 5) === 'data:' ||
    uri.substr(0, 11) === 'javascript:' ||
    uri.includes('?')
  ) {
    return;
  }

  const { currentDomain, maxLength = 25 } = options;
  const { path, domain, hash } = uriParser(uri);
  const pathEnd = path.substr(
    path.substr(0, path.length - 2).lastIndexOf('/') + 1
  );

  if (hash) {
    if (pathEnd && (pathEnd + hash).length <= maxLength) {
      return trimRight(pathEnd + hash);
    } else if (
      pathEnd.length < 2 &&
      hash.length > 2 &&
      hash.length <= maxLength
    ) {
      return trimRight(hash);
    } else {
      return;
    }
  } else if (domain && domain.length < maxLength && path.length <= 1) {
    return trimRight(domain + path);
  }

  if (
    path === '/' + pathEnd &&
    domain &&
    currentDomain &&
    domain !== currentDomain &&
    (domain + path).length <= maxLength
  ) {
    return trimRight(domain + path);
  }

  const lastDotIndex = pathEnd.lastIndexOf('.');
  if (
    (lastDotIndex === -1 || lastDotIndex > 1) &&
    (lastDotIndex !== -1 || pathEnd.length > 2) &&
    pathEnd.length <= maxLength &&
    !pathEnd.match(/index(\.[a-zA-Z]{2-4})?/) &&
    !isMostlyNumbers(pathEnd)
  ) {
    return trimRight(pathEnd);
  }
}

export default getFriendlyUriEnd;
