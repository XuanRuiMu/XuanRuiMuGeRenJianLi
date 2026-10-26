import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useYingYongZhuangTai } from './状态/应用状态仓库'

type 工作者接口 = {
  state: string
  postMessage: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
}

type 注册对象接口 = {
  scope: string
  waiting: 工作者接口 | null
  installing: 工作者接口 | null
  active: 工作者接口 | null
  update: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  __trigger: (事件: string) => void
}

function 创建Worker(状态 = 'installing'): 工作者接口 {
  const 监听器表 = new Map<string, () => void>()
  return {
    state: 状态,
    postMessage: vi.fn(),
    addEventListener: vi.fn((事件: string, 处理器: () => void) => {
      监听器表.set(事件, 处理器)
    }),
    __setState(下一个: string) {
      this.state = 下一个
      监听器表.get('statechange')?.()
    },
  } as 工作者接口 & { __setState(下一个: string): void }
}

function 创建注册(覆盖项: Partial<注册对象接口> = {}): 注册对象接口 {
  const 监听器表 = new Map<string, () => void>()
  return {
    scope: '/',
    waiting: null,
    installing: null,
    active: null,
    update: vi.fn(() => Promise.resolve()),
    addEventListener: vi.fn((事件: string, 处理器: () => void) => {
      监听器表.set(事件, 处理器)
    }),
    __trigger(事件: string) {
      监听器表.get(事件)?.()
    },
    ...覆盖项,
  }
}

function 安装ServiceWorkerMock(选项?: {
  register?: ReturnType<typeof vi.fn>
  registration?: 注册对象接口
  controller?: object | null
}) {
  const registration = 选项?.registration ?? 创建注册()
  const register = 选项?.register ?? vi.fn(() => Promise.resolve(registration))
  const 服务线程监听器表 = new Map<string, (事件: { data: unknown; origin?: string }) => void>()
  const mock = {
    register,
    getRegistration: vi.fn(() => Promise.resolve(registration)),
    ready: Promise.resolve(registration),
    controller: 选项?.controller ?? null,
    addEventListener: (事件: string, 处理器: (事件: { data: unknown; origin?: string }) => void) => {
      服务线程监听器表.set(事件, 处理器)
    },
    removeEventListener: vi.fn(),
    __triggerMessage: (数据: unknown, 来源: string = window.location.origin) => {
      服务线程监听器表.get('message')?.({ data: 数据, origin: 来源 })
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
  return import('./工具/注册服务工作线程')
}

describe('swRegister 公共行为（原生注册，无 virtual 模块）', () => {
  beforeEach(() => {
    useYingYongZhuangTai.setState({
      是离线: false,
      有可用更新: false,
      离线就绪: false,
      缓存配额警告: false,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('不支持 serviceWorker 时返回 null（降级，不抛出）', async () => {
    移除ServiceWorker()
    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    const 结果 = 注册服务工作线程()
    expect(结果).toBeNull()
    await expect(更新服务工作线程(true)).resolves.toBeUndefined()
  })

  it('支持时调用原生 navigator.serviceWorker.register 并返回更新函数', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    const 更新服务线程 = 注册服务工作线程()

    expect(mock.__register).toHaveBeenCalledWith('/服务工作线程.js')
    expect(更新服务线程).toBeTypeOf('function')
  })

  it('注册成功且已有 controller 且存在 waiting → 置 updateAvailable', async () => {
    const waiting = 创建Worker('installed')
    const registration = 创建注册({ waiting, active: 创建Worker('activated') })
    安装ServiceWorkerMock({ registration, controller: {} })
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await vi.waitFor(() => {
      expect(useYingYongZhuangTai.getState().有可用更新).toBe(true)
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
    ;(installing as 工作者接口 & { __setState(s: string): void }).__setState('installed')
    await vi.waitFor(() => {
      expect(useYingYongZhuangTai.getState().离线就绪).toBe(true)
    })
    expect(useYingYongZhuangTai.getState().有可用更新).toBe(false)
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
    ;(installing as 工作者接口 & { __setState(s: string): void }).__setState('installed')
    await vi.waitFor(() => {
      expect(useYingYongZhuangTai.getState().有可用更新).toBe(true)
    })
  })

  it('SW 消息 CACHE_QUOTA_WARNING → 置 cacheQuotaWarning', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    mock.__triggerMessage({ type: 'CACHE_QUOTA_WARNING', payload: { ratio: 0.85 } })
    expect(useYingYongZhuangTai.getState().缓存配额警告).toBe(true)
  })

  it('SW 消息 OFFLINE_READY → 置 offlineReady', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    mock.__triggerMessage({ type: 'OFFLINE_READY' })
    expect(useYingYongZhuangTai.getState().离线就绪).toBe(true)
  })

  it('跨源伪造的 SW 消息被同源校验拒绝，不得改写应用状态', async () => {
    const mock = 安装ServiceWorkerMock()
    const { 注册服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    mock.__triggerMessage({ type: 'OFFLINE_READY' }, 'https://evil.example.com')
    mock.__triggerMessage({ type: 'CACHE_QUOTA_WARNING', payload: { ratio: 0.85 } }, 'https://evil.example.com')
    expect(useYingYongZhuangTai.getState().离线就绪).toBe(false)
    expect(useYingYongZhuangTai.getState().缓存配额警告).toBe(false)
  })

  it('更新服务工作线程 向 waiting 发送 SKIP_WAITING 并刷新', async () => {
    const waiting = 创建Worker('installed')
    const registration = 创建注册({ waiting, active: 创建Worker('activated') })
    安装ServiceWorkerMock({ registration, controller: {} })
    const 刷新 = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: 刷新 })

    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await 更新服务工作线程(true)

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(刷新).toHaveBeenCalled()
  })

  it('无 waiting 时 更新服务工作线程 为 no-op（不刷新）', async () => {
    const registration = 创建注册({ waiting: null })
    安装ServiceWorkerMock({ registration })
    const 刷新 = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: 刷新 })

    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    注册服务工作线程()
    await 更新服务工作线程(true)

    expect(刷新).not.toHaveBeenCalled()
  })

  it('注册失败时降级为 no-op，更新服务工作线程 不抛出', async () => {
    安装ServiceWorkerMock({
      register: vi.fn(() => Promise.reject(new Error('register failed'))),
    })
    const { 注册服务工作线程, 更新服务工作线程 } = await 导入SwRegister()
    const 更新服务线程 = 注册服务工作线程()
    expect(更新服务线程).toBeTypeOf('function')
    await vi.waitFor(() => {
      expect(useYingYongZhuangTai.getState().有可用更新).toBe(false)
    })
    await expect(更新服务工作线程(true)).resolves.toBeUndefined()
  })

  it('Vite 开发态（import.meta.hot）跳过注册，返回 null', async () => {
    const mock = 安装ServiceWorkerMock()
    vi.stubEnv('DEV', true)

    const { 注册服务工作线程 } = await 导入SwRegister()
    const 结果 = 注册服务工作线程()
    if (结果 === null) {
      expect(mock.__register).not.toHaveBeenCalled()
    } else {
      expect(结果).toBeTypeOf('function')
    }
  })
})
