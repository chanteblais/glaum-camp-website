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
