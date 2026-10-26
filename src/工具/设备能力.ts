import type { 画质档位值, 画质设置 } from '../领域/类型'
import { 画质档位 } from '../领域/常量'

export { 画质档位 } from '../领域/常量'

interface GPU适配器存根 {
  readonly 特性: unknown
}

interface 带GPU的导航器 {
  gpu?: {
    requestAdapter(): Promise<GPU适配器存根 | null>
  }
}

interface 网络信息 {
  saveData?: boolean
  effectiveType?: '2g' | '3g' | '4g'
}

interface 带连接的导航器 extends Navigator {
  connection?: 网络信息
  火狐连接?: 网络信息
  WebKit连接?: 网络信息
}

interface 带内存的导航器 extends Navigator {
  deviceMemory?: number
}

interface 电池管理器 {
  charging: boolean
  level: number
}

interface 带电池的导航器 extends Navigator {
  getBattery?(): Promise<电池管理器>
}

function 获取硬件档位(): 画质档位值 {
  const 核心数 = navigator.hardwareConcurrency || 4
  const 内存 = (navigator as 带内存的导航器).deviceMemory || 8

  if (核心数 >= 8 && 内存 >= 8) return 画质档位.极致
  if (核心数 >= 6 && 内存 >= 6) return 画质档位.高
  if (核心数 >= 4 && 内存 >= 4) return 画质档位.中
  return 画质档位.低
}

async function 获取电池档位(): Promise<画质档位值 | null> {
  const 导航器 = navigator as 带电池的导航器
  if (typeof 导航器.getBattery === 'function') {
    try {
      const 电池 = await 导航器.getBattery()
      if (!电池.charging && 电池.level < 0.25) return 画质档位.低
      if (!电池.charging && 电池.level < 0.5) return 画质档位.中
    } catch {}
  }
  return null
}

function 获取网络档位(): 画质档位值 | null {
  const 导航器 = navigator as 带连接的导航器
  const 连接 = 导航器.connection || 导航器.火狐连接 || 导航器.WebKit连接
  if (!连接) return null
  if (连接.saveData) return 画质档位.低
  if (连接.effectiveType === '4g') return 画质档位.高
  if (连接.effectiveType === '3g') return 画质档位.中
  return 画质档位.低
}

function 获取GPU档位(): 画质档位值 | null {
  try {
    const 画布 = document.createElement('canvas')
    const 上下文 = 画布.getContext('webgl2') || 画布.getContext('webgl')
    if (!上下文) return 画质档位.低

    const 调试信息 = 上下文.getExtension('WEBGL_debug_renderer_info')
    if (调试信息) {
      const 渲染器 = 上下文.getParameter(调试信息.UNMASKED_RENDERER_WEBGL)
      const 低端关键词 = /swiftshader|software|microsoft basic render|llvmpipe/i
      if (typeof 渲染器 === 'string' && 低端关键词.test(渲染器)) return 画质档位.低
    }
    return null
  } catch {
    return 画质档位.低
  }
}

export async function 检测WebGPU支持(): Promise<boolean> {
  const 导航器 = navigator as 带GPU的导航器
  if (!导航器.gpu) return false
  try {
    const 适配器 = await 导航器.gpu.requestAdapter()
    return 适配器 !== null
  } catch {
    return false
  }
}

export function 检测WebGL2支持(): boolean {
  try {
    const 画布 = document.createElement('canvas')
    return 画布.getContext('webgl2') !== null
  } catch {
    return false
  }
}

export async function 检测性能档位(): Promise<画质档位值> {
  const 硬件 = 获取硬件档位()
  const 电池 = await 获取电池档位()
  const 网络 = 获取网络档位()
  const GPU档位 = 获取GPU档位()

  const 档位集合: 画质档位值[] = [硬件]
  if (电池) 档位集合.push(电池)
  if (网络) 档位集合.push(网络)
  if (GPU档位) 档位集合.push(GPU档位)

  const 优先级: 画质档位值[] = [画质档位.低, 画质档位.中, 画质档位.高, 画质档位.极致]
  return 档位集合.reduce<画质档位值>((最差, 当前) => {
    return 优先级.indexOf(当前) < 优先级.indexOf(最差) ? 当前 : 最差
  }, 硬件)
}

export function 获取画质设置(档位: 画质档位值): 画质设置 {
  const 设置: Record<画质档位值, 画质设置> = {
    [画质档位.极致]: {
      dpr: [1, 2],
      粒子数量: 20000,
      泛光: { 层级数: 8, 分辨率比例: 1 },
      景深: { 分辨率比例: 0.75 },
      阴影: true,
      后处理: true,
      体积光: true,
    },
    [画质档位.高]: {
      dpr: [1, 1.5],
      粒子数量: 15000,
      泛光: { 层级数: 6, 分辨率比例: 0.75 },
      景深: { 分辨率比例: 0.5 },
      阴影: true,
      后处理: true,
      体积光: true,
    },
    [画质档位.中]: {
      dpr: [1, 1.25],
      粒子数量: 10000,
      泛光: { 层级数: 4, 分辨率比例: 0.5 },
      景深: { 分辨率比例: 0.5 },
      阴影: false,
      后处理: true,
      体积光: false,
    },
    [画质档位.低]: {
      dpr: [1, 1],
      粒子数量: 5000,
      泛光: { 层级数: 2, 分辨率比例: 0.5 },
      景深: { 分辨率比例: 0.5 },
      阴影: false,
      后处理: false,
      体积光: false,
    },
  }
  return 设置[档位] ?? 设置[画质档位.高]
}
