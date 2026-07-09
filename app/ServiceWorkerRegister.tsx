'use client'

import { useEffect } from 'react'

// Registers the PWA service worker (/sw.js) after the page loads so it never
// blocks first paint. Renders nothing.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Dev: never register, and tear down any previously registered worker.
    // sw.js caches same-origin .js cache-first, which is safe against prod's
    // content-hashed chunk names but poisons dev, where chunk paths are stable
    // across edits — a cached stale bundle keeps serving old code after every
    // change (the classic "page renders but clicks die" symptom).
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then(rs => rs.forEach(r => r.unregister()))
        .catch(() => {})
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {})
      }
      return
    }

    // Auto-heal the "reload twice to see changes" case. sw.js already calls
    // skipWaiting() + clients.claim(), so a freshly-deployed worker takes control
    // of open pages immediately — but the page in front of the member was still
    // assembled by the OLD worker (with old caches), so its new rules only bite
    // on the next load. Instead of asking members to refresh a second time, we
    // reload once, automatically, the moment control changes hands.
    //
    // Two guards keep it safe:
    //   • `refreshing` ensures at most one reload (never a loop).
    //   • We only arm this when a worker ALREADY controls the page at load time.
    //     A member's first-ever visit has no controller; skipping the reload
    //     there avoids a pointless refresh on their very first paint. Only an
    //     existing member picking up an update triggers the auto-reload.
    if (navigator.serviceWorker.controller) {
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      })
    }
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register)
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
