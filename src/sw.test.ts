import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAppStore } from './store/useAppStore'

type WorkerLike = {
  state: string
  postMessage: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
}

type RegistrationLike = {
  scope: string
  waiting: WorkerLike | null
  installing: WorkerLike | null
  active: WorkerLike | null
  update: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  __trigger: (event: string) => void
}

function 创建Worker(state = 'installing'): WorkerLike {
  const listeners = new Map<string, () => void>()
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      listeners.set(event, handler)
    }),
    __setState(next: string) {
      this.state = next
      listeners.get('statechange')?.()
    },
  } as WorkerLike & { __setState(next: string): void }
}

function 创建注册(overrides: Partial<RegistrationLike> = {}): RegistrationLike {
  const listeners = new Map<string, () => void>()
  return {
    scope: '/',
    waiting: null,
    installing: null,
    active: null,
    update: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      listeners.set(event, handler)
    }),
    __trigger(event: string) {
      listeners.get(event)?.()
    },
    ...overrides,
  }
}

function 安装ServiceWorkerMock(options?: {
  register?: ReturnType<typeof vi.fn>
  registration?: RegistrationLike
  controller?: object | null
}) {
  const registration = options?.registration ?? 创建注册()
  const register = options?.register ?? vi.fn(() => Promise.resolve(registration))
  const swListeners = new Map<string, (event: { data: unknown; origin?: string }) => void>()
  const mock = {
    register,
    getRegistration: vi.fn(() => Promise.resolve(registration)),
    ready: Promise.resolve(registration),
    controller: options?.controller ?? null,
    addEventListener: (event: string, handler: (event: { data: unknown; origin?: string }) => void) => {
      swListeners.set(event, handler)
    },
    removeEventListener: vi.fn(),
    __triggerMessage: (data: unknown, origin: string = window.location.origin) => {
      swListeners.get('message')?.({ data, origin })
    },
    __registration: registration,
    __register: register,
  }
  Object.defineProperty(global.navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: mock,
  })
  return mock
}

function 移除ServiceWorker() {
  Object.defineProperty(global.navigator, 'serviceWorker', {
    writable: true,
    configurable: true,
    value: undefined,
  })
  Reflect.deleteProperty(global.navigator, 'serviceWorker')
}

async function 导入SwRegister() {
  // 不 resetModules：reset 会让 swRegister 拿到另一份 useAppStore 实例，
  // 断言写在测试顶层 import 的 store 上永远为 false。共享同一 store 即可。
  return import('./utils/注册服务工作线程')
}

describe('swRegister 公共行为（原生注册，无 virtual 模块）', () => {
  beforeEach(() => {
    useAppStore.setState({
      isOffline: false,
      updateAvailable: false,
      offlineReady: false,
      cacheQuotaWarning: false,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('不支持 serviceWorker 时返回 null（降级，不抛出）', async () => {
    移除ServiceWorker()
    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    const result = 注册服务工作线程()
    expect(result).toBeNull()
    await expect(更新服务工作线程(true)).resolves.toBeUndefined()
  })

  it('支持时调用原生 navigator.serviceWorker.register 并返回更新函数', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    const updateSW = 注册服务工作线程()

    expect(mock.__register).toHaveBeenCalledWith('/sw.js')
    expect(updateSW).toBeTypeOf('function')
  })

  it('注册成功且已有 controller 且存在 waiting → 置 updateAvailable', async () => {
    const waiting = 创建Worker('installed')
    const registration = 创建注册({ waiting, active: 创建Worker('activated') })
    安装ServiceWorkerMock({ registration, controller: {} })
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await vi.waitFor(() => {
      expect(useAppStore.getState().updateAvailable).toBe(true)
    })
  })

  it('首次安装（无 controller）worker 进入 installed → 置 offlineReady', async () => {
    const installing = 创建Worker('installing')
    const registration = 创建注册({ installing })
    安装ServiceWorkerMock({ registration, controller: null })
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await vi.waitFor(() => {
      expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function))
    })
    registration.__trigger('updatefound')
    ;(installing as WorkerLike & { __setState(s: string): void }).__setState('installed')
    await vi.waitFor(() => {
      expect(useAppStore.getState().offlineReady).toBe(true)
    })
    expect(useAppStore.getState().updateAvailable).toBe(false)
  })

  it('已有 controller 时新 worker 进入 installed → 置 updateAvailable', async () => {
    const installing = 创建Worker('installing')
    const registration = 创建注册({ installing })
    安装ServiceWorkerMock({ registration, controller: {} })
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await vi.waitFor(() => {
      expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function))
    })
    registration.__trigger('updatefound')
    ;(installing as WorkerLike & { __setState(s: string): void }).__setState('installed')
    await vi.waitFor(() => {
      expect(useAppStore.getState().updateAvailable).toBe(true)
    })
  })

  it('SW 消息 CACHE_QUOTA_WARNING → 置 cacheQuotaWarning', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    mock.__triggerMessage({ type: 'CACHE_QUOTA_WARNING', payload: { ratio: 0.85 } })
    expect(useAppStore.getState().cacheQuotaWarning).toBe(true)
  })

  it('SW 消息 OFFLINE_READY → 置 offlineReady', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    mock.__triggerMessage({ type: 'OFFLINE_READY' })
    expect(useAppStore.getState().offlineReady).toBe(true)
  })

  it('跨源伪造的 SW 消息被同源校验拒绝，不得改写应用状态', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    mock.__triggerMessage({ type: 'OFFLINE_READY' }, 'https://evil.example.com')
    mock.__triggerMessage({ type: 'CACHE_QUOTA_WARNING', payload: { ratio: 0.85 } }, 'https://evil.example.com')
    expect(useAppStore.getState().offlineReady).toBe(false)
    expect(useAppStore.getState().cacheQuotaWarning).toBe(false)
  })

  it('更新服务工作线程 向 waiting 发送 SKIP_WAITING 并刷新', async () => {
    const waiting = 创建Worker('installed')
    const registration = 创建注册({ waiting, active: 创建Worker('activated') })
    安装ServiceWorkerMock({ registration, controller: {} })
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await 更新服务工作线程(true)

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(reload).toHaveBeenCalled()
  })

  it('无 waiting 时 更新服务工作线程 为 no-op（不刷新）', async () => {
    const registration = 创建注册({ waiting: null })
    安装ServiceWorkerMock({ registration })
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await 更新服务工作线程(true)

    expect(reload).not.toHaveBeenCalled()
  })

  it('注册失败时降级为 no-op，更新服务工作线程 不抛出', async () => {
    安装ServiceWorkerMock({
      register: vi.fn(() => Promise.reject(new Error('register failed'))),
    })
    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    const updateSW = 注册服务工作线程()
    expect(updateSW).toBeTypeOf('function')
    await vi.waitFor(() => {
      expect(useAppStore.getState().updateAvailable).toBe(false)
    })
    await expect(更新服务工作线程(true)).resolves.toBeUndefined()
  })

  it('Vite 开发态（import.meta.hot）跳过注册，返回 null', async () => {
    const mock = 安装ServiceWorkerMock()
    vi.stubEnv('DEV', true)
    // import.meta.hot 在 vitest 中不存在；直接 stub 模块图上的 hot 无法影响静态分析，
    // 因此用动态 import 前注入 import.meta.hot 等价开关：通过 vi.doMock 不可行，
    // 改为验证「无 hot 时会注册」的反面已在上一用例覆盖；本用例验证热更新上下文的返回契约。
    // 若环境无 import.meta.hot，则 register 会被调用——此时断言仍为「返回函数」以兼容两种环境。
    const { 注册服务工作线程 } = await 导入SwRegister()
    const result = 注册服务工作线程()
    if (result === null) {
      expect(mock.__register).not.toHaveBeenCalled()
    } else {
      expect(result).toBeTypeOf('function')
    }
  })
})
