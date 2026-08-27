// Glåüm PWA service worker.
// Step 1 (installable shell): satisfies PWA installability and caches only
// immutable, content-hashed static assets for a small speed boost. It never
// caches HTML navigations or API requests, so authenticated (Clerk) content is
// always fetched fresh. Push handling will be added in step 2.

const CACHE = 'glaum-static-v4'

// Local dev is exempt from caching entirely: dev chunk paths are stable across
// edits (no content hashes), so cache-first would keep serving stale code after
// every change. The version bump above also purges caches already poisoned this
// way (activate deletes all other cache keys).
const IS_DEV_HOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

// Cache-first is reserved for content-hashed build output — the ONLY paths
// whose bytes can never change under a given URL. Everything in public/
// (fonts, hands rasters, asset-library art) is served with HTTP cache headers
// from next.config.js instead: versioned filenames get long immutable
// lifetimes, re-struck-in-place art gets a short SWR window. The old broad
// extension match cached non-hashed files forever and pinned stale art/fonts
// in installed PWAs until a manual CACHE bump (see the v3 incident) — don't
// widen this again.
const STATIC_PATH = /\/_next\/static\//

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

  if (!STATIC_PATH.test(url.pathname)) return // HTML, API, public/ assets → network + HTTP cache

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
