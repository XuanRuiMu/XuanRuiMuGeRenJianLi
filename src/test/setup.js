import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom / node 测试环境均提供 ResizeObserver 最小实现，Three.js / R3F / recharts 依赖它
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.ResizeObserver = MockResizeObserver
if (typeof window !== 'undefined') {
  window.ResizeObserver = MockResizeObserver
}

// IntersectionObserver 在 jsdom 中不可用，提供最小实现以支持滚动触发动画测试
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }

  observe(element) {
    this.callback([{ isIntersecting: true, target: element }])
  }

  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.IntersectionObserver = MockIntersectionObserver
if (typeof window !== 'undefined') {
  window.IntersectionObserver = MockIntersectionObserver
}

// jsdom 不实现 Canvas getContext，提供最小 WebGL mock 以支持 Three.js 相关组件测试
if (typeof HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (contextId, options) {
    if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
      return {
        getExtension: vi.fn((name) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9247,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            }
          }
          return null
        }),
        getParameter: vi.fn((param) => {
          if (param === 0x9247) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11)'
          if (param === 0x9245) return 'Google Inc.'
          return 0
        }),
        createShader: vi.fn(),
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
    if (contextId === '2d') {
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
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      }
    }
    return originalGetContext.call(this, contextId, options)
  }
}

// matchMedia 在 jsdom 中不可用，提供最小 mock 以支持 prefers-reduced-motion 测试
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

// jsdom 在 opaque origin（about:blank）下不暴露 localStorage，提供最小内存实现
// 以支持 zustand persist 中间件及直接访问 localStorage 的测试（如 useProjectsWindStore）
if (typeof window !== 'undefined') {
  let hasLocalStorage = false
  try {
    hasLocalStorage = window.localStorage != null
  } catch {
    hasLocalStorage = false
  }
  if (!hasLocalStorage) {
    const store = new Map()
    const localStorageMock = {
      get length() {
        return store.size
      },
      key: (i) => Array.from(store.keys())[i] ?? null,
      getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
      setItem: (k, v) => {
        store.set(String(k), String(v))
      },
      removeItem: (k) => {
        store.delete(String(k))
      },
      clear: () => {
        store.clear()
      },
    }
    Object.defineProperty(window, 'localStorage', {
      writable: true,
      configurable: true,
      value: localStorageMock,
    })
    globalThis.localStorage = localStorageMock
  }
}

// Service Worker 在 jsdom 中不可用，提供最小 mock
const serviceWorkerListeners = new Map()
Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  configurable: true,
  value: {
    register: vi.fn(() =>
      Promise.resolve({
        scope: '/',
        update: vi.fn(),
        unregister: vi.fn(),
      })
    ),
    ready: Promise.resolve({
      scope: '/',
      active: null,
    }),
    controller: null,
    addEventListener: (event, handler) => {
      serviceWorkerListeners.set(event, handler)
    },
    __triggerMessage: (data) => {
      const handler = serviceWorkerListeners.get('message')
      if (handler) handler({ data })
    },
  },
})
