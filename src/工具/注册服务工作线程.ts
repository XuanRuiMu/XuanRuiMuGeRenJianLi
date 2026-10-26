import { useYingYongZhuangTai } from '../状态/应用状态仓库'
import { 日志器实例 } from '../可观测/日志器'
import { t } from '../国际化/翻译'

const { 设置离线就绪, 设置有更新, 设置缓存配额警告 } = useYingYongZhuangTai.getState()

export type 更新服务工作线程类型 = (重载页面?: boolean) => Promise<void>

const 服务工作线程路径 = `${import.meta.env.BASE_URL}服务工作线程.js`

let 服务线程更新实现: 更新服务工作线程类型 | null = null

export async function 更新服务工作线程(重载页面 = true): Promise<void> {
  if (!服务线程更新实现) return
  await 服务线程更新实现(重载页面)
}

function 绑定消息通道(): void {
  navigator.serviceWorker.addEventListener('message', (事件) => {
    if (事件.origin !== window.location.origin) return
    const 消息数据 = 事件.data as { type?: string; 载荷?: Record<string, unknown> } | undefined
    if (!消息数据?.type) return

    switch (消息数据.type) {
      case 'CACHE_QUOTA_WARNING':
        设置缓存配额警告(true)
        日志器实例.warn('Cache quota warning', 消息数据.载荷)
        break
      case 'OFFLINE_READY':
        设置离线就绪(true)
        break
      default:
        break
    }
  })
}

function 监听更新(注册信息: ServiceWorkerRegistration): void {
  if (注册信息.waiting && navigator.serviceWorker.controller) {
    日志器实例.信息('Service Worker update available')
    设置有更新(true)
    return
  }

  注册信息.addEventListener('updatefound', () => {
    const 安装中 = 注册信息.installing
    if (!安装中) return
    安装中.addEventListener('statechange', () => {
      if (安装中.state !== 'installed') return
      if (navigator.serviceWorker.controller) {
        日志器实例.信息('Service Worker update available')
        设置有更新(true)
      } else {
        日志器实例.信息('Service Worker offline ready')
        设置离线就绪(true)
      }
    })
  })
}

export function 注册服务工作线程(): 更新服务工作线程类型 | null {
  if (!('serviceWorker' in navigator)) {
    日志器实例.信息('Service Worker not supported in this environment')
    return null
  }

  绑定消息通道()

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
      日志器实例.信息('Service Worker registered', { swUrl: 服务工作线程路径, scope: 注册信息.scope })
      监听更新(注册信息)
    })
    .catch((错误: unknown) => {
      服务线程更新实现 = null
      日志器实例.warn(t('pwa.errorRegister'), { error: String(错误) })
    })

  return 应用更新
}
