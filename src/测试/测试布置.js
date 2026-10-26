import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

class 模拟尺寸观察器 {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.ResizeObserver = 模拟尺寸观察器
if (typeof window !== 'undefined') {
  window.ResizeObserver = 模拟尺寸观察器
}

class 模拟交叉观察器 {
  constructor(回调) {
    this.回调 = 回调
  }

  observe(元素) {
    this.回调([{ isIntersecting: true, target: 元素 }])
  }

  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}
globalThis.IntersectionObserver = 模拟交叉观察器
if (typeof window !== 'undefined') {
  window.IntersectionObserver = 模拟交叉观察器
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const 原始获取上下文 = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (上下文标识, 选项) {
    if (上下文标识 === 'webgl' || 上下文标识 === 'webgl2' || 上下文标识 === 'experimental-webgl') {
      return {
        getExtension: vi.fn((名称) => {
          if (名称 === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9247,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            }
          }
          return null
        }),
        getParameter: vi.fn((参数) => {
          if (参数 === 0x9247) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11)'
          if (参数 === 0x9245) return 'Google Inc.'
          return 0
        }),
        createShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        getShaderInfoLog: vi.fn(() => ''),
        getProgramParameter: vi.fn(() => true),
        getProgramInfoLog: vi.fn(() => ''),
        createVertexArray: vi.fn(),
        bindVertexArray: vi.fn(),
        deleteProgram: vi.fn(),
        deleteShader: vi.fn(),
        deleteBuffer: vi.fn(),
        deleteVertexArray: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        viewport: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        drawArrays: vi.fn(),
        drawElements: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        blendFunc: vi.fn(),
        depthFunc: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        getAttribLocation: vi.fn(() => 0),
        getUniformLocation: vi.fn(() => ({})),
        uniformMatrix4fv: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
        uniform4f: vi.fn(),
        uniform1i: vi.fn(),
      }
    }
    if (上下文标识 === '2d') {
      return {
        canvas: this,
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        globalCompositeOperation: 'source-over',
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        strokeRect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),

        setTransform: vi.fn(),
        quadraticCurveTo: vi.fn(),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      }
    }
    return 原始获取上下文.call(this, 上下文标识, 选项)
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

if (typeof window !== 'undefined') {
  let 有本地存储 = false
  try {
    有本地存储 = window.localStorage != null
  } catch {
    有本地存储 = false
  }
  if (!有本地存储) {
    const 存储 = new Map()
    const 本地存储模拟 = {
      get length() {
        return 存储.size
      },
      key: (i) => Array.from(存储.keys())[i] ?? null,
      getItem: (k) => (存储.has(String(k)) ? 存储.get(String(k)) : null),
      setItem: (k, v) => {
        存储.set(String(k), String(v))
      },
      removeItem: (k) => {
        存储.delete(String(k))
      },
      clear: () => {
        存储.clear()
      },
    }
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      configurable: true,
      value: 本地存储模拟,
    })
    globalThis.localStorage = 本地存储模拟
  }
}

const 服务工作线程监听器 = new Map()
Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  configurable: true,
  value: {
    register: vi.fn(() =>
      Promise.resolve({
        scope: '/',
        update: vi.fn(),
        unregister: vi.fn(),
        waiting: null,
        installing: null,
        active: null,
        addEventListener: vi.fn(),
      })
    ),
    getRegistration: vi.fn(() => Promise.resolve(null)),
    ready: Promise.resolve({
      scope: '/',
      active: null,
    }),
    controller: null,
    addEventListener: (事件, 处理器) => {
      服务工作线程监听器.set(事件, 处理器)
    },
    __triggerMessage: (数据, 来源) => {
      const 处理器 = 服务工作线程监听器.get('message')
      if (处理器)
        处理器({ data: 数据, origin: 来源 ?? (typeof window !== 'undefined' ? window.location.origin : undefined) })
    },
  },
})

if (typeof globalThis.requestIdleCallback === 'undefined') {
  globalThis.requestIdleCallback = (回调) => setTimeout(() => 回调({ didTimeout: false, timeRemaining: () => 50 }), 0)
  globalThis.cancelIdleCallback = (句柄) => clearTimeout(句柄)
}
if (typeof window !== 'undefined') {
  window.requestIdleCallback = globalThis.requestIdleCallback
  window.cancelIdleCallback = globalThis.cancelIdleCallback
}
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
}
