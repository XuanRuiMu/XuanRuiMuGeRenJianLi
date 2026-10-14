import { useYingYongZhuangTai } from '../store/应用状态仓库'
import { 日志器实例 } from '../observability/日志器'
import { t } from '../i18n/翻译'

const { setOfflineReady, setUpdateAvailable, setCacheQuotaWarning } = useYingYongZhuangTai.getState()

export type 更新服务工作线程类型 = (重载页面?: boolean) => Promise<void>

const 服务工作线程路径 = `${import.meta.env.BASE_URL}服务工作线程.js`

let 服务线程更新实现: 更新服务工作线程类型 | null = null

export async function 更新服务工作线程(重载页面 = true): Promise<void> {
  if (!服务线程更新实现) return
  await 服务线程更新实现(重载页面)
}

function 绑定消息通道(): void {
  navigator.serviceWorker.addEventListener('message', (event) => {
    // 同源校验：只接受本站 Service Worker 的消息，拒绝跨窗口/跨源的伪造指令
    if (event.origin !== window.location.origin) return
    const 消息数据 = event.data as { type?: string; payload?: Record<string, unknown> } | undefined
    if (!消息数据?.type) return

    switch (消息数据.type) {
      case 'CACHE_QUOTA_WARNING':
        setCacheQuotaWarning(true)
        日志器实例.warn('Cache quota warning', 消息数据.payload)
        break
      case 'OFFLINE_READY':
        setOfflineReady(true)
        break
      default:
        break
    }
  })
}

function 监听更新(注册信息: ServiceWorkerRegistration): void {
  if (注册信息.waiting && navigator.serviceWorker.controller) {
    日志器实例.info('Service Worker update available')
    setUpdateAvailable(true)
    return
  }

  注册信息.addEventListener('updatefound', () => {
    const 安装中 = 注册信息.installing
    if (!安装中) return
    安装中.addEventListener('statechange', () => {
      if (安装中.state !== 'installed') return
      if (navigator.serviceWorker.controller) {
        日志器实例.info('Service Worker update available')
        setUpdateAvailable(true)
      } else {
        日志器实例.info('Service Worker offline ready')
        setOfflineReady(true)
      }
    })
  })
}

export function 注册服务工作线程(): 更新服务工作线程类型 | null {
  if (!('serviceWorker' in navigator)) {
    日志器实例.info('Service Worker not supported in this environment')
    return null
  }

  绑定消息通道()

  // Vite 开发服务器不注册 SW：开发期无 SW 产物，强行注册会因 MIME/404 在浏览器
  // 控制台留下无法消除的报错。用 MODE 判定：dev=development 跳过；build=production 与
  // vitest=TEST 走真实注册（import.meta.hot 在 vitest 下也为真，不能作判据）。
  if (import.meta.env.MODE === 'development') {
    return null
  }

  const 应用更新: 更新服务工作线程类型 = async (重载页面 = true) => {
    const 注册信息 = await navigator.serviceWorker.getRegistration().catch(() => undefined)
    const 等待中 = 注册信息?.waiting
    if (!等待中) return
    等待中.postMessage({ type: 'SKIP_WAITING' })
    if (重载页面) {
      window.location.reload()
    }
  }
  服务线程更新实现 = 应用更新

  navigator.serviceWorker
    .register(服务工作线程路径)
    .then((注册信息) => {
      日志器实例.info('Service Worker registered', { swUrl: 服务工作线程路径, scope: 注册信息.scope })
      监听更新(注册信息)
    })
    .catch((error: unknown) => {
      服务线程更新实现 = null
      日志器实例.warn(t('pwa.errorRegister'), { error: String(error) })
    })

  return 应用更新
}
