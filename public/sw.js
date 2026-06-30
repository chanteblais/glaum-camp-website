// Glåüm PWA service worker.
// Step 1 (installable shell): satisfies PWA installability and caches only
// immutable, content-hashed static assets for a small speed boost. It never
// caches HTML navigations or API requests, so authenticated (Clerk) content is
// always fetched fresh. Push handling will be added in step 2.

const CACHE = 'glaum-static-v1'

// Same-origin paths / extensions that are safe to cache (immutable assets).
const STATIC_PATH = /\/(?:_next\/static|favicon|fonts)\//
const STATIC_EXT = /\.(?:png|jpe?g|svg|gif|webp|ico|woff2?|ttf|otf|css|js)$/

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
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

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
