import { describe, it, expect } from 'vitest'

describe('vite-plugin-observability', () => {
  it('exports observabilityPlugin function', async () => {
    const 模块 = await import('./可观测性Vite插件')
    expect(typeof 模块.可观测性插件).toBe('function')
  })

  it('returns a Plugin with correct name', async () => {
    const 模块 = await import('./可观测性Vite插件')
    const 插件 = 模块.可观测性插件()
    expect(插件.name).toBe('vite-plugin-observability')
    expect(typeof 插件.configureServer).toBe('function')
  })
})
