import { createHash } from 'node:crypto';

// Generate the shell list from Vite's hashed filenames on every production build.
export function serviceWorkerPlugin() {
  return {
    name: 'skylens-service-worker',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => /\.(?:js|css)$/.test(name)).map(name => '/' + name);
      const revision = createHash('sha256').update(assets.join(',')).digest('hex').slice(0, 12);
      const shell = ['/', '/index.html', '/favicon.svg', '/site.webmanifest', '/assets/fonts/inter-variable.woff2', ...assets];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE_NAME = 'skylens-react-${revision}';
const APP_SHELL = ${JSON.stringify(shell)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('skylens-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('/index.html', copy))); }
      return response;
    }).catch(() => caches.match('/index.html')));
  } else if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
` });
    }
  };
}
