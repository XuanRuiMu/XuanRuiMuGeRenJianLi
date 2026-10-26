import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: string[] }

const 服务线程版本 = '1.1.0'

self.addEventListener('install', (事件) => {
  事件.waitUntil(
    (async () => {
      await self.skipWaiting()
      const 客户端表 = await self.clients.matchAll({ type: 'window' })
      客户端表.forEach((客户端) => {
        客户端.postMessage({ type: 'OFFLINE_READY' })
      })
    })()
  )
})

self.addEventListener('activate', (事件) => {
  事件.waitUntil(激活处理器())
})

async function 激活处理器(): Promise<void> {
  await self.clients.claim()
  await 检查存储配额()
}

precacheAndRoute(self.__WB_MANIFEST)

const 站点根路径 = new URL(self.registration.scope).pathname
const 首页路径 = `${站点根路径}index.html`

const 导航处理器 = createHandlerBoundToURL(首页路径)
registerRoute(new NavigationRoute(导航处理器))

registerRoute(
  ({ request, url }) =>
    request.destination === 'font' ||
    url.pathname.startsWith(`${站点根路径}fonts/`) ||
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
    url.pathname.startsWith(`${站点根路径}og-image`),
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
      const 已缓存 = await caches.match(首页路径)
      if (已缓存) return 已缓存
    } catch {}
  }
  return Response.error()
})

self.addEventListener('message', (事件) => {
  if (事件.data && 事件.data.type === 'SKIP_WAITING') {
    事件.waitUntil(self.skipWaiting())
  }
})

async function 检查存储配额(): Promise<void> {
  if (!('storage' in self) || !('estimate' in self.navigator.storage)) return
  try {
    const estimate = await self.navigator.storage.estimate()
    const usage = estimate.usage ?? 0
    const quota = estimate.quota ?? 1
    const 比例 = usage / quota
    if (比例 > 0.8) {
      const 客户端表 = await self.clients.matchAll({ type: 'window' })
      客户端表.forEach((客户端) => {
        客户端.postMessage({
          type: 'CACHE_QUOTA_WARNING',
          payload: { ratio: Math.round(比例 * 100) / 100 },
        })
      })
    }
  } catch {}
}

export { 服务线程版本 as SW_VERSION }
