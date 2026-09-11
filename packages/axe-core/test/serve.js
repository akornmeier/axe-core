const http = require('node:http');
const path = require('node:path');
const handler = require('serve-handler');

// Preserve the legacy bundle URLs used by full-document and nested-frame
// fixtures while serving the current Vite output. No fixture rewriting.
http
  .createServer((request, response) =>
    handler(request, response, {
      public: path.resolve(__dirname, '..'),
      cleanUrls: false,
      rewrites: [
        { source: '/axe.js', destination: '/dist/axe.js' },
        { source: '/axe.min.js', destination: '/dist/axe.min.js' }
      ]
    })
  )
  .listen(9876, '127.0.0.1');
