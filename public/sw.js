// Glåüm PWA service worker.
// Step 1 (installable shell): satisfies PWA installability and caches only
// immutable, content-hashed static assets for a small speed boost. It never
// caches HTML navigations or API requests, so authenticated (Clerk) content is
// always fetched fresh. Push handling will be added in step 2.

const CACHE = 'glaum-static-v3'

// Local dev is exempt from caching entirely: dev chunk paths are stable across
// edits (no content hashes), so cache-first would keep serving stale code after
// every change. The version bump above also purges caches already poisoned this
// way (activate deletes all other cache keys).
const IS_DEV_HOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

// Same-origin paths / extensions that are safe to cache (immutable assets).
const STATIC_PATH = /\/(?:_next\/static|favicon|fonts)\//
const STATIC_EXT = /\.(?:png|jpe?g|svg|gif|webp|ico|woff2?|ttf|otf|css|js)$/
// Mutable art under stable names — the asset library gets re-struck in place
// (icons, medals), so cache-first would pin stale art forever (it did: the
// pre-normalization icons survived in every installed PWA until the v3 bump
// above purged them). Let the network + HTTP etags keep these fresh.
const MUTABLE_PATH = /^\/asset-library\//

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (IS_DEV_HOST) return
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (MUTABLE_PATH.test(url.pathname)) return // mutable art → always network

  const isStatic = STATIC_PATH.test(url.pathname) || STATIC_EXT.test(url.pathname)
  if (!isStatic) return // HTML, API, auth → always hit the network

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    })
  )
})
