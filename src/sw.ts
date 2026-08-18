import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: string[] }

const SW_VERSION = '1.1.0'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await self.skipWaiting()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => {
        client.postMessage({ type: 'OFFLINE_READY' })
      })
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      cleanupOutdatedCaches()
      await checkStorageQuota()
    })()
  )
})

precacheAndRoute(self.__WB_MANIFEST)

const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(navigationHandler))

registerRoute(
  ({ request, url }) =>
    request.destination === 'font' ||
    url.pathname.startsWith('/fonts/') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com'),
  new StaleWhileRevalidate({
    cacheName: 'xrm-fonts-v2',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 90,
      }),
    ],
  })
)

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname) ||
    url.pathname.startsWith('/og-image'),
  new StaleWhileRevalidate({
    cacheName: 'xrm-media-v2',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
)

registerRoute(
  ({ url }) => url.hostname !== self.location.hostname,
  new NetworkFirst({
    cacheName: 'xrm-api-v1',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
)

setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    try {
      const cached = await caches.match('/index.html')
      if (cached) return cached
    } catch {
      // fall through to error response
    }
  }
  return Response.error()
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting())
  }
})

async function checkStorageQuota(): Promise<void> {
  if (!('storage' in self) || !('estimate' in self.navigator.storage)) return
  try {
    const estimate = await self.navigator.storage.estimate()
    const usage = estimate.usage ?? 0
    const quota = estimate.quota ?? 1
    const ratio = usage / quota
    if (ratio > 0.8) {
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((client) => {
        client.postMessage({
          type: 'CACHE_QUOTA_WARNING',
          payload: { ratio: Math.round(ratio * 100) / 100 },
        })
      })
    }
  } catch {
    // ignore quota check errors
  }
}

export { SW_VERSION }
