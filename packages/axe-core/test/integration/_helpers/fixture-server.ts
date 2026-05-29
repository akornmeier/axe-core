// Static fixture server for the Vitest `integration` project. Replaces the
// legacy `serve-handler` + http-server pair used by `act-runner.js` and
// `apg.spec.js`. Pure node:http + node:fs — no runtime dependencies.
//
// Document root is the axe-core package directory, so fixtures can reference
// in-tree paths (`/test/...`, `/lib/...`, `/dist/...`) and `node_modules/`
// content directly. A small rewrite map handles the two legacy aliases:
//
//   /WAI/content-assets/wcag-act-rules/...  → node_modules/wcag-act-rules/content-assets/wcag-act-rules/...
//   /axe.js                                  → dist/axe.js
//
// Phase 3, Sprint 5c — Wave A harness.

import { createReadStream, statSync } from 'node:fs';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const PACKAGE_ROOT = resolve(here, '..', '..', '..');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.xhtml': 'application/xhtml+xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

// URL-prefix → filesystem-prefix (relative to PACKAGE_ROOT). Order matters:
// the first match wins, so put the most specific prefixes first.
const REWRITES: ReadonlyArray<readonly [string, string]> = [
  [
    '/WAI/content-assets/wcag-act-rules/',
    'node_modules/wcag-act-rules/content-assets/wcag-act-rules/'
  ],
  ['/axe.js', 'dist/axe.js']
];

function resolvePath(urlPath: string): string | null {
  const cleaned = urlPath.split('?')[0].split('#')[0];

  for (const [from, to] of REWRITES) {
    if (cleaned === from) {
      return safeJoin(to);
    }
    if (cleaned.startsWith(from)) {
      return safeJoin(to + cleaned.slice(from.length));
    }
  }

  return safeJoin(cleaned.replace(/^\/+/, ''));
}

function safeJoin(relative: string): string | null {
  const target = normalize(join(PACKAGE_ROOT, relative));
  // Reject path-traversal escapes outside PACKAGE_ROOT.
  if (target !== PACKAGE_ROOT && !target.startsWith(PACKAGE_ROOT + sep)) {
    return null;
  }
  return target;
}

function streamFile(filePath: string, res: ServerResponse): void {
  const ext = extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
  // Vitest browser tests run on a different origin; let them load fixtures.
  res.setHeader('Access-Control-Allow-Origin', '*');
  createReadStream(filePath)
    .on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end();
    })
    .pipe(res);
}

export interface FixtureServer {
  /** Base URL the server is listening on, e.g. `http://127.0.0.1:54123`. */
  readonly url: string;
  /** Stop accepting new connections and resolve when fully closed. */
  close(): Promise<void>;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server: Server = createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('bad request');
      return;
    }
    const filePath = resolvePath(req.url);
    if (!filePath) {
      res.statusCode = 403;
      res.end('forbidden');
      return;
    }
    let stat;
    try {
      stat = statSync(filePath);
    } catch {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    if (stat.isDirectory()) {
      const indexPath = join(filePath, 'index.html');
      try {
        statSync(indexPath);
        streamFile(indexPath, res);
      } catch {
        res.statusCode = 404;
        res.end('not found');
      }
      return;
    }
    streamFile(filePath, res);
  });

  await new Promise<void>(resolveListen => {
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const addr = server.address();
  if (typeof addr !== 'object' || addr === null) {
    throw new Error('fixture-server: failed to bind to an ephemeral port');
  }

  return {
    url: `http://127.0.0.1:${addr.port}`,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close(err => (err ? rejectClose(err) : resolveClose()));
      })
  };
}
